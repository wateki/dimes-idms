import { supabaseReportService } from './supabaseReportService';
import type {
  ReportFile,
  ReportUploadData,
  ReportUploadResponse,
  ReportListResponse,
} from './supabaseReportService';

// Re-export types for backwards compatibility
export type {
  ReportFile,
  ReportUploadData,
  ReportUploadResponse,
  ReportListResponse,
};

class ReportService {
  async uploadReportFile(
    projectId: string,
    file: File,
    reportData: ReportUploadData
  ): Promise<ReportUploadResponse> {
    return supabaseReportService.uploadReportFile(projectId, file, reportData);
  }

  async getReports(projectId: string): Promise<ReportListResponse> {
    return supabaseReportService.getReports(projectId);
  }

  async getReport(projectId: string, reportId: string): Promise<ReportFile> {
    return supabaseReportService.getReport(projectId, reportId);
  }

  async downloadReportFile(projectId: string, reportId: string): Promise<void> {
    return supabaseReportService.downloadReportFile(projectId, reportId);
  }

  async getPreviewUrl(projectId: string, reportId: string): Promise<string> {
    return supabaseReportService.getPreviewUrl(projectId, reportId);
  }

  async updateReport(
    projectId: string,
    reportId: string,
    updateData: { title?: string; description?: string; category?: string }
  ): Promise<ReportFile> {
    return supabaseReportService.updateReport(projectId, reportId, updateData);
  }

  async deleteReportFile(projectId: string, reportId: string): Promise<void> {
    return supabaseReportService.deleteReportFile(projectId, reportId);
  }
}

export const reportService = new ReportService();
