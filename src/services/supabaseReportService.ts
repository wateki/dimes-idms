import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';
import { saveAs } from 'file-saver';

type Report = Database['public']['Tables']['reports']['Row'];

export interface ReportFile {
  id: string;
  title: string;
  description: string;
  type: string;
  fileUrl: string;
  fileSize: string;
  status: string;
  createdAt: string;
}

export interface ReportUploadData {
  title?: string;
  description?: string;
  category?: string;
  reportType?: string;
  activityId?: string;
  reportFrequency?: 'weekly' | 'bimonthly' | 'monthly' | 'quarterly' | 'bi-annual' | 'annual' | 'adhoc';
}

export interface ReportUploadResponse {
  success: boolean;
  data: ReportFile;
  error?: string;
}

export interface ReportListResponse {
  success: boolean;
  data: ReportFile[];
  error?: string;
}

class SupabaseReportService {
  private formatReport(report: Report): ReportFile {
    return {
      id: report.id,
      title: report.title,
      description: report.description || '',
      type: report.type,
      fileUrl: report.fileUrl || '',
      fileSize: report.fileSize || '0',
      status: report.status,
      createdAt: report.createdAt,
    };
  }

  async getReports(projectId: string): Promise<ReportListResponse> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('projectId', projectId)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch reports');
    }

    return {
      success: true,
      data: (data || []).map(report => this.formatReport(report)),
    };
  }

  async getReport(projectId: string, reportId: string): Promise<ReportFile> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('projectId', projectId)
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Report not found');
    }

    return this.formatReport(data);
  }

  async updateReport(
    projectId: string,
    reportId: string,
    updateData: { title?: string; description?: string; category?: string }
  ): Promise<ReportFile> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const updatePayload: any = {
      updatedBy: userProfile.id,
      updatedAt: new Date().toISOString(),
    };

    if (updateData.title) updatePayload.title = updateData.title;
    if (updateData.description !== undefined) updatePayload.description = updateData.description;
    // Note: category is not directly in reports table, it's in report_workflows

    const { data, error } = await supabase
      .from('reports')
      .update(updatePayload)
      .eq('id', reportId)
      .eq('projectId', projectId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update report');
    }

    return this.formatReport(data);
  }

  async deleteReportFile(projectId: string, reportId: string): Promise<void> {
    // Get report to find file URL
    const report = await this.getReport(projectId, reportId);

    // Delete file from storage if it exists
    if (report.fileUrl) {
      const { error: storageError } = await supabase.storage
        .from('reports')
        .remove([report.fileUrl]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete report record from database
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .eq('projectId', projectId);

    if (error) {
      throw new Error(error.message || 'Failed to delete report');
    }
  }

  // File upload using Supabase Storage
  async uploadReportFile(
    projectId: string,
    file: File,
    reportData: ReportUploadData
  ): Promise<ReportUploadResponse> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Generate filename
    let finalFilename = file.name;
    if (reportData.title && reportData.title.trim()) {
      const extension = file.name.split('.').pop() || '';
      const titleWithoutExt = reportData.title.endsWith(`.${extension}`)
        ? reportData.title.slice(0, -extension.length - 1)
        : reportData.title;
      const cleanTitle = titleWithoutExt
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      finalFilename = `${cleanTitle}.${extension}`;
    }

    // Generate storage path: reports/{projectId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const storagePath = `reports/${projectId}/${timestamp}-${finalFilename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reports')
      .upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || 'Failed to upload file to storage');
    }

    // Get public URL (or create signed URL if bucket is private)
    const { data: urlData } = supabase.storage
      .from('reports')
      .getPublicUrl(storagePath);

    // Create report record in database
    const now = new Date().toISOString();
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        projectId,
        title: reportData.title || file.name,
        description: reportData.description || `Uploaded report: ${file.name}`,
        type: (reportData.reportType || 'ADHOC') as Database['public']['Enums']['ReportType'],
        fileUrl: storagePath, // Store the storage path
        fileSize: file.size.toString(),
        status: 'DRAFT' as Database['public']['Enums']['ReportStatus'],
        createdBy: userProfile.id,
        updatedBy: userProfile.id,
        createdAt: now,
        updatedAt: now,
      } as Database['public']['Tables']['reports']['Insert'])
      .select()
      .single();

    if (reportError || !report) {
      // Rollback: delete uploaded file if database insert fails
      await supabase.storage.from('reports').remove([storagePath]);
      throw new Error(reportError?.message || 'Failed to create report record');
    }

    return {
      success: true,
      data: this.formatReport(report),
    };
  }

  // Download file from Supabase Storage
  async downloadReportFile(projectId: string, reportId: string): Promise<void> {
    const report = await this.getReport(projectId, reportId);

    if (!report.fileUrl) {
      throw new Error('Report file URL not found');
    }

    // Get file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('reports')
      .download(report.fileUrl);

    if (error || !data) {
      throw new Error(error?.message || 'Failed to download file');
    }

    // Get filename from report title or fileUrl
    const fileName = report.title || report.fileUrl.split('/').pop() || `report-${reportId}`;
    saveAs(data, fileName);
  }

  async getPreviewUrl(projectId: string, reportId: string): Promise<string> {
    const report = await this.getReport(projectId, reportId);

    if (!report.fileUrl) {
      throw new Error('Report file URL not found');
    }

    // Get public URL or create signed URL
    const { data } = supabase.storage
      .from('reports')
      .getPublicUrl(report.fileUrl);

    // If bucket is private, create a signed URL (valid for 1 hour)
    const { data: signedData } = await supabase.storage
      .from('reports')
      .createSignedUrl(report.fileUrl, 3600);

    return signedData?.signedUrl || data.publicUrl;
  }
}

export const supabaseReportService = new SupabaseReportService();

