import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabaseOrganizationService, UpdateOrganizationRequest } from '@/services/supabaseOrganizationService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useNotification } from '@/hooks/useNotification';
import { Upload, Save, Building2, Phone, Mail, MapPin, X, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function OrganizationSettings() {
  const { organization, refreshOrganization, loading: orgLoading } = useOrganization();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Contact information state
  const [emergencyHotline, setEmergencyHotline] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setSlug(organization.slug);
      setDomain(organization.domain || '');
      setLogoUrl(organization.logoUrl || '');
      setLogoPreview(organization.logoUrl || null);
      
      // Load contact information from settings
      const settings = organization.settings || {};
      setEmergencyHotline(settings.emergencyHotline || '');
      setEmergencyEmail(settings.emergencyEmail || '');
      setFeedbackEmail(settings.feedbackEmail || '');
      setOfficeAddress(settings.officeAddress || '');
    }
  }, [organization]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[Organization Settings] Logo file selected:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`,
      });

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        console.error('[Organization Settings] Invalid file type:', file.type);
        showError('Invalid file type. Please upload an image file (JPEG, PNG, GIF, WebP, or SVG).');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        console.error('[Organization Settings] File size exceeds limit:', `${(file.size / 1024).toFixed(2)} KB`);
        showError('File size exceeds 5MB limit. Please upload a smaller image.');
        return;
      }

      console.log('[Organization Settings] File validation passed, creating preview...');
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('[Organization Settings] Preview created successfully');
        setLogoPreview(reader.result as string);
      };
      reader.onerror = (error) => {
        console.error('[Organization Settings] Failed to create preview:', error);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    console.log('[Organization Settings] handleSave called');
    
    if (!organization) {
      console.error('[Organization Settings] No organization found, cannot save');
      return;
    }

    const saveStartTime = Date.now();
    console.log('[Organization Settings] Starting save process...');
    console.log('[Organization Settings] Organization ID:', organization.id);
    console.log('[Organization Settings] Has logoFile:', !!logoFile);
    console.log('[Organization Settings] Current logoUrl:', logoUrl);

    try {
      setSaving(true);

      // Upload logo file to storage if logoFile is set
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        console.log('[Organization Settings] Logo file detected, starting upload process...');
        console.log('[Organization Settings] Logo file details:', {
          name: logoFile.name,
          type: logoFile.type,
          size: logoFile.size,
        });
        try {
          setLoading(true);
          console.log('[Organization Settings] Calling uploadLogo service method...');
          const uploadStartTime = Date.now();
          finalLogoUrl = await supabaseOrganizationService.uploadLogo(logoFile);
          const uploadDuration = Date.now() - uploadStartTime;
          console.log(`[Organization Settings] Logo upload completed successfully in ${uploadDuration}ms`);
          console.log('[Organization Settings] Received logo URL:', finalLogoUrl);
          setLogoFile(null); // Clear the file after successful upload
          console.log('[Organization Settings] Logo file cleared from state');
        } catch (error: any) {
          console.error('[Organization Settings] Logo upload error caught:', error);
          console.error('[Organization Settings] Error stack:', error.stack);
          console.error('[Organization Settings] Error details:', {
            message: error.message,
            name: error.name,
            cause: error.cause,
          });
          showError(error.message || 'Failed to upload logo');
          setSaving(false);
          setLoading(false);
        return;
        } finally {
          setLoading(false);
          console.log('[Organization Settings] Upload process finished, loading set to false');
        }
      } else if (logoUrl) {
        console.log('[Organization Settings] No new logo file, using existing logo URL:', logoUrl);
      } else {
        console.log('[Organization Settings] No logo file and no existing logo URL');
      }

      // Merge settings to preserve existing settings
      const currentSettings = organization.settings || {};
      const updatedSettings = {
        ...currentSettings,
        emergencyHotline: emergencyHotline.trim() || undefined,
        emergencyEmail: emergencyEmail.trim() || undefined,
        feedbackEmail: feedbackEmail.trim() || undefined,
        officeAddress: officeAddress.trim() || undefined,
      };

      const updates: UpdateOrganizationRequest = {
        name: name.trim(),
        slug: slug.trim(),
        domain: domain.trim() || undefined,
        logoUrl: finalLogoUrl || undefined,
        settings: updatedSettings,
      };

      console.log('[Organization Settings] Updating organization with:', {
        name: updates.name,
        domain: updates.domain,
        hasLogoUrl: !!updates.logoUrl,
        logoUrl: updates.logoUrl,
        settingsKeys: Object.keys(updatedSettings),
      });

      const updateStartTime = Date.now();
      await supabaseOrganizationService.updateOrganization(updates);
      const updateDuration = Date.now() - updateStartTime;
      console.log(`[Organization Settings] Organization update completed in ${updateDuration}ms`);

      console.log('[Organization Settings] Refreshing organization data...');
      await refreshOrganization();
      
      const totalDuration = Date.now() - saveStartTime;
      console.log(`[Organization Settings] Save process completed successfully in ${totalDuration}ms`);
      showSuccess('Organization settings updated successfully');
    } catch (error: any) {
      const totalDuration = Date.now() - saveStartTime;
      console.error(`[Organization Settings] Save process failed after ${totalDuration}ms:`, error);
      showError(error.message || 'Failed to update organization settings');
    } finally {
      setSaving(false);
    }
  };

  if (orgLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Organization not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization's profile and settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Profile</CardTitle>
              <CardDescription>
                Update your organization's basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="organization-slug"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Slug cannot be changed after creation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Custom Domain (Optional)</Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Custom domain for your organization
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={saving || loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : loading ? 'Uploading...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Configure contact details displayed in feedback forms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergency-hotline" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Emergency Hotline
                </Label>
                <Input
                  id="emergency-hotline"
                  value={emergencyHotline}
                  onChange={(e) => setEmergencyHotline(e.target.value)}
                  placeholder="+1 (555) 911-HELP"
                />
                <p className="text-xs text-muted-foreground">
                  Phone number for emergency contacts
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Emergency Email
                </Label>
                <Input
                  id="emergency-email"
                  type="email"
                  value={emergencyEmail}
                  onChange={(e) => setEmergencyEmail(e.target.value)}
                  placeholder="emergency@example.org"
                />
                <p className="text-xs text-muted-foreground">
                  Email address for emergency contacts
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Feedback Email
                </Label>
                <Input
                  id="feedback-email"
                  type="email"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  placeholder="feedback@example.org"
                />
                <p className="text-xs text-muted-foreground">
                  Email address for general inquiries and feedback
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="office-address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Office Address
                </Label>
                <Input
                  id="office-address"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  placeholder="Local community center"
                />
                <p className="text-xs text-muted-foreground">
                  Physical address or location description
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={saving || loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : loading ? 'Uploading...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logo Upload */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Organization Logo</CardTitle>
              <CardDescription>
                Upload your organization's logo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                {logoPreview ? (
                   <div className="relative w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden group">
                    <img
                      src={logoPreview}
                      alt="Organization logo"
                      className="w-full h-full object-cover"
                    />
                     {loading && (
                       <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                         <Loader2 className="h-6 w-6 text-white animate-spin" />
                       </div>
                     )}
                    {!logoFile && logoUrl && (
                      <button
                    onClick={async () => {
                      console.log('[Organization Settings] Removing logo...');
                      try {
                        setLoading(true);
                        const deleteStartTime = Date.now();
                        await supabaseOrganizationService.deleteLogo();
                        const deleteDuration = Date.now() - deleteStartTime;
                        console.log(`[Organization Settings] Logo deletion completed in ${deleteDuration}ms`);
                        setLogoUrl('');
                        setLogoPreview(null);
                        await refreshOrganization();
                        console.log('[Organization Settings] Logo removed successfully');
                        showSuccess('Logo removed successfully');
                      } catch (error: any) {
                        console.error('[Organization Settings] Logo removal failed:', error);
                        showError(error.message || 'Failed to remove logo');
                      } finally {
                        setLoading(false);
                      }
                    }}
                        disabled={loading || saving}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Remove logo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <Building2 className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                <div className="w-full">
                  <Label htmlFor="logo" className="cursor-pointer">
                    <div className={`flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${(loading || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span className="text-sm">Uploading...</span>
                        </>
                      ) : (
                        <>
                      <Upload className="h-4 w-4 mr-2" />
                          <span className="text-sm">{logoFile ? 'Change Logo' : 'Upload Logo'}</span>
                        </>
                      )}
                    </div>
                  </Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={handleLogoChange}
                    className="hidden"
                    disabled={loading || saving}
                  />
                </div>

                {logoFile && (
                  <div className="w-full space-y-2">
                    <p className="text-xs text-muted-foreground text-center">
                      New logo selected. Click "Save" to upload.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSave}
                        disabled={loading || saving}
                        className="flex-1"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : saving ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-3 w-3 mr-2" />
                            Save Logo
                          </>
                        )}
                      </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(logoUrl || null);
                    }}
                        disabled={loading || saving}
                        className="flex-1"
                  >
                        <X className="h-3 w-3 mr-2" />
                        Cancel
                  </Button>
                    </div>
                  </div>
                )}
                
                {logoUrl && !logoFile && (
                  <p className="text-xs text-muted-foreground text-center">
                    Current logo is active
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
