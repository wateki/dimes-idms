import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, User, Shield, Building, Globe, Key, Settings } from 'lucide-react';
import { User as UserType, Role, RoleAssignment } from '@/services/userManagementService';
import { useProjects } from '@/contexts/ProjectsContext';
import { toast } from '@/hooks/use-toast';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserType | null;
  onSubmit: (userId: string, userData: any) => Promise<void>;
  roles: Role[];
}

export function EditUserDialog({ open, onOpenChange, user, onSubmit, roles }: EditUserDialogProps) {
  const { projects } = useProjects();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    isActive: true,
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
      });
      
      // Convert user roles to role assignments (`role.id` is user_roles row id; `roleId` is FK to roles)
      const assignments: RoleAssignment[] = user.roles.map((role) => {
        const resolvedRoleId =
          role.roleId ||
          roles.find((r) => r.name === role.roleName)?.id ||
          '';
        return {
          roleId: resolvedRoleId,
          projectId: role.projectId || '',
          country: role.country || '',
        };
      });
      setRoleAssignments(assignments);
      
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setErrors({});
      setActiveTab('basic');
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';

    // Only validate password if it's being changed
    if (passwordData.newPassword) {
      if (passwordData.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validateForm()) return;

    setLoading(true);
    try {
      const updateData: any = {
        ...formData,
        roleAssignments: roleAssignments.length > 0 ? roleAssignments : undefined,
      };

      // Only include password if it's being changed
      if (passwordData.newPassword) {
        updateData.newPassword = passwordData.newPassword;
      }

      await onSubmit(user.id, updateData);

      toast({ title: 'User updated', description: 'Changes were saved successfully.' });

      // Reset password fields
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user';
      console.error('Failed to update user:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const addRoleAssignment = () => {
    setRoleAssignments([...roleAssignments, { roleId: '', projectId: '', country: '' }]);
  };

  const removeRoleAssignment = (index: number) => {
    setRoleAssignments(roleAssignments.filter((_, i) => i !== index));
  };

  const updateRoleAssignment = (index: number, field: keyof RoleAssignment, value: string) => {
    const updated = [...roleAssignments];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-populate country when project is selected
    if (field === 'projectId' && value && value !== 'none') {
      const selectedProject = projects.find(p => p.id === value);
      if (selectedProject) {
        updated[index].country = selectedProject.country;
      }
    } else if (field === 'projectId' && (value === 'none' || !value)) {
      // Clear country when no project is selected
      updated[index].country = '';
    }
    
    setRoleAssignments(updated);
  };

  const getRoleBadgeVariant = (level: number) => {
    if (level <= 2) return 'destructive';
    if (level <= 4) return 'default';
    return 'secondary';
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit User: {user.firstName} {user.lastName}
          </DialogTitle>
          <DialogDescription>
            Update user information, roles, and permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="password" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Password
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Roles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className={errors.firstName ? 'border-red-500' : ''}
                      />
                      {errors.firstName && (
                        <p className="text-sm text-red-500">{errors.firstName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className={errors.lastName ? 'border-red-500' : ''}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-red-500">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-sm text-muted-foreground">
                      Email address cannot be changed
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">User is active</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Change Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      Leave password fields empty to keep the current password unchanged.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className={errors.newPassword ? 'border-red-500' : ''}
                      />
                      {errors.newPassword && (
                        <p className="text-sm text-red-500">{errors.newPassword}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className={errors.confirmPassword ? 'border-red-500' : ''}
                      />
                      {errors.confirmPassword && (
                        <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Role Assignments
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRoleAssignment}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Role
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {roleAssignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No roles assigned. Click "Add Role" to assign roles to this user.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {roleAssignments.map((assignment, index) => {
                        const selectedRole = roles.find(r => r.id === assignment.roleId);
                        return (
                          <div key={index} className="border rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Role Assignment {index + 1}</h4>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRoleAssignment(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <Label>Role *</Label>
                              <Select
                                value={assignment.roleId}
                                onValueChange={(value) => updateRoleAssignment(index, 'roleId', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={getRoleBadgeVariant(role.level)} className="text-xs">
                                          Level {role.level}
                                        </Badge>
                                        <span>{role.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedRole && (
                                <p className="text-sm text-muted-foreground">
                                  {selectedRole.description}
                                </p>
                              )}
                            </div>

                            {selectedRole && selectedRole.level >= 4 && (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    Project (Optional)
                                  </Label>
                                  <Select
                                    value={assignment.projectId || 'none'}
                                    onValueChange={(value) => updateRoleAssignment(index, 'projectId', value === 'none' ? '' : value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">No project</SelectItem>
                                      {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                          <div className="flex items-center gap-2">
                                            <span>{project.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {project.country}
                                            </Badge>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {assignment.projectId && assignment.country && (
                                  <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                      <Globe className="h-4 w-4" />
                                      Country
                                    </Label>
                                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                      <Badge variant="secondary">{assignment.country}</Badge>
                                      <span className="text-sm text-muted-foreground">
                                        (Auto-selected from project)
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
