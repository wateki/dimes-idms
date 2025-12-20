import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { useNotification } from '@/hooks/useNotification';

export function Settings() {
  const { user, changePassword: changePasswordAuth } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [name, setName] = useState(user ? `${user.firstName} ${user.lastName}` : '');
  const [email, setEmail] = useState(user?.email || '');
  const [orgName, setOrgName] = useState('ICS Organization');
  const [theme, setTheme] = useState('light');
  const [logo, setLogo] = useState<File | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const isGlobalAdmin = user?.roles.some(role => role.roleName === 'GLOBAL_ADMIN');

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePasswordAuth(currentPassword, newPassword);
      
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Show success notification
      showSuccess(
        'Password Changed Successfully',
        'Your password has been updated. Please use your new password for future logins.'
      );
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password');
      
      // Show error notification
      showError(
        'Failed to Change Password',
        error.message || 'An unexpected error occurred while changing your password. Please try again.'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-sm font-medium mb-1">Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" />
          <Button variant="default">Save Profile</Button>
        </CardContent>
      </Card>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password *</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                onClick={() => setShowCurrentPassword(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password *</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                onClick={() => setShowNewPassword(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {passwordError && (
            <p className="text-sm text-red-500">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-green-500">{passwordSuccess}</p>
          )}

          <Button 
            variant="default" 
            onClick={handleChangePassword}
            disabled={passwordLoading}
          >
            {passwordLoading ? 'Changing Password...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>
      {isGlobalAdmin && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>Organization Preferences</CardTitle>
              <CardDescription>Manage organization-wide settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block text-sm font-medium mb-1">Organization Name</label>
              <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Organization name" />
              <label className="block text-sm font-medium mb-1">Logo</label>
              <Input type="file" onChange={e => setLogo(e.target.files ? e.target.files[0] : null)} />
              
              <Button variant="default">Save Organization Settings</Button>
            </CardContent>
          </Card>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>System</CardTitle>
              <CardDescription>System-level actions and audit logs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline">Export Data</Button>
              <Button variant="outline">View Audit Logs</Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 