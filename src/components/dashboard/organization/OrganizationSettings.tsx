import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabaseOrganizationService, UpdateOrganizationRequest } from '@/services/supabaseOrganizationService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useNotification } from '@/hooks/useNotification';
import { Upload, Save, Building2 } from 'lucide-react';
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

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setSlug(organization.slug);
      setDomain(organization.domain || '');
      setLogoUrl(organization.logoUrl || '');
      setLogoPreview(organization.logoUrl || null);
    }
  }, [organization]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!organization) return;

    try {
      setSaving(true);

      // TODO: Upload logo file to storage if logoFile is set
      // For now, we'll just use the logoUrl
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        // In a real implementation, upload to Supabase Storage
        // const { data, error } = await supabase.storage
        //   .from('organization-logos')
        //   .upload(`${organization.id}/${logoFile.name}`, logoFile);
        // if (!error && data) {
        //   finalLogoUrl = data.path;
        // }
        showError('Logo upload not yet implemented');
        return;
      }

      const updates: UpdateOrganizationRequest = {
        name: name.trim(),
        slug: slug.trim(),
        domain: domain.trim() || undefined,
        logoUrl: finalLogoUrl || undefined,
      };

      await supabaseOrganizationService.updateOrganization(updates);
      await refreshOrganization();
      showSuccess('Organization settings updated successfully');
    } catch (error: any) {
      console.error('Failed to update organization:', error);
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
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
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
                  <div className="relative w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
                    <img
                      src={logoPreview}
                      alt="Organization logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <Building2 className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                <div className="w-full">
                  <Label htmlFor="logo" className="cursor-pointer">
                    <div className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                      <Upload className="h-4 w-4 mr-2" />
                      <span className="text-sm">Upload Logo</span>
                    </div>
                  </Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>

                {logoUrl && !logoFile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLogoUrl('');
                      setLogoPreview(null);
                    }}
                  >
                    Remove Logo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
