import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Shield,
  Globe,
  Building,
  User as UserIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { userManagementService, User, Role, QueryUsersRequest } from '@/services/userManagementService';
import { CreateUserDialog } from './user-management/CreateUserDialog';
import { CreateRoleDialog } from './user-management/CreateRoleDialog';
import { EditUserDialog } from './user-management/EditUserDialog';
import { UserDetailsDialog } from './user-management/UserDetailsDialog';
import { RoleManagement } from './user-management/RoleManagement';

export function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);

  if (!user) return null;

  // Load users and roles
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [searchTerm, activeFilter, pagination.page]);

  const loadUsers = async () => {
    const startTime = Date.now();
    console.log('[User Management Component] loadUsers called:', { searchTerm, activeFilter, page: pagination.page });
    try {
      setLoading(true);
      const params: QueryUsersRequest = {
        search: searchTerm || undefined,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
        page: pagination.page,
        limit: pagination.limit,
      };
      
      const response = await userManagementService.getUsers(params);
      const duration = Date.now() - startTime;
      console.log(`[User Management Component] loadUsers completed in ${duration}ms: ${response.users.length} user(s) loaded, total: ${response.pagination.total}`);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[User Management Component] Failed to load users after ${duration}ms:`, error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    const startTime = Date.now();
    console.log('[User Management Component] loadRoles called');
    try {
      const rolesData = await userManagementService.getAvailableRoles();
      const duration = Date.now() - startTime;
      console.log(`[User Management Component] loadRoles completed in ${duration}ms: ${rolesData.length} role(s) loaded`);
      setRoles(rolesData);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[User Management Component] Failed to load roles after ${duration}ms:`, error);
    }
  };

  const handleCreateUser = async (userData: any) => {
    const startTime = Date.now();
    console.log('[User Management Component] handleCreateUser called:', { email: userData.email, firstName: userData.firstName, lastName: userData.lastName });
    try {
      await userManagementService.createUser(userData);
      const duration = Date.now() - startTime;
      console.log(`[User Management Component] handleCreateUser completed in ${duration}ms: User created successfully`);
      setCreateDialogOpen(false);
      loadUsers(); // Refresh the list
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[User Management Component] Failed to create user after ${duration}ms:`, error);
      throw error;
    }
  };

  const handleUpdateUser = async (userId: string, userData: any) => {
    const startTime = Date.now();
    console.log(`[User Management Component] handleUpdateUser called: ${userId}`, { updateFields: Object.keys(userData) });
    try {
      await userManagementService.updateUser(userId, userData);
      const duration = Date.now() - startTime;
      console.log(`[User Management Component] handleUpdateUser completed in ${duration}ms: User updated successfully`);
      setEditDialogOpen(false);
      setSelectedUser(null);
      loadUsers(); // Refresh the list
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[User Management Component] Failed to update user after ${duration}ms:`, error);
      throw error;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    const userName = userToDelete ? `${userToDelete.firstName} ${userToDelete.lastName}` : 'this user';
    
    console.log(`[User Management Component] handleDeleteUser called: ${userId} (${userName})`);
    
    if (window.confirm(`Are you sure you want to delete ${userName}? This will deactivate their account and remove their access.`)) {
      const startTime = Date.now();
      try {
        await userManagementService.deleteUser(userId);
        const duration = Date.now() - startTime;
        console.log(`[User Management Component] handleDeleteUser completed in ${duration}ms: User deleted successfully`);
        loadUsers(); // Refresh the list
        // Show success message
        alert(`User ${userName} has been successfully deleted.`);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`[User Management Component] Failed to delete user after ${duration}ms:`, error);
        // Show error message
        alert(`Failed to delete user: ${error.message || 'An unexpected error occurred'}`);
      }
    } else {
      console.log(`[User Management Component] handleDeleteUser cancelled by user`);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const getRoleBadgeVariant = (level: number) => {
    if (level <= 2) return 'destructive'; // Global admin, director
    if (level <= 4) return 'default'; // Regional coordinators
    return 'secondary'; // Project roles
  };

  const getAccessLevelBadge = (accessLevel: string) => {
    switch (accessLevel) {
      case 'admin': return <Badge variant="destructive">Admin</Badge>;
      case 'write': return <Badge variant="default">Write</Badge>;
      case 'read': return <Badge variant="secondary">Read</Badge>;
      default: return <Badge variant="outline">{accessLevel}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Team Management
          </h1>
          <p className="text-muted-foreground">
            Manage team members, roles, and permissions across the organization
          </p>
        </div>
        {activeTab === 'users' ? (
          <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        ) : (
          <Button onClick={() => setCreateRoleOpen(true)} className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Add Role
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Status Filter</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setActiveFilter('all')}
                      className={activeFilter === 'all' ? 'bg-accent' : ''}
                    >
                      All Users
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setActiveFilter('active')}
                      className={activeFilter === 'active' ? 'bg-accent' : ''}
                    >
                      Active Only
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setActiveFilter('inactive')}
                      className={activeFilter === 'inactive' ? 'bg-accent' : ''}
                    >
                      Inactive Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users ({pagination.total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Project Access</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.slice(0, 2).map((role) => (
                              <Badge 
                                key={role.id} 
                                variant={getRoleBadgeVariant(role.level)}
                                className="text-xs"
                              >
                                {role.roleName}
                              </Badge>
                            ))}
                            {user.roles.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.roles.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.projectAccess.slice(0, 2).map((access) => (
                              <div key={access.projectId} className="flex items-center gap-1">
                                <Building className="h-3 w-3 text-muted-foreground" />
                                {getAccessLevelBadge(access.accessLevel)}
                              </div>
                            ))}
                            {user.projectAccess.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.projectAccess.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt 
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDetailsDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} users
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <RoleManagement roles={roles} onRolesChange={loadRoles} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateUser}
        roles={roles}
      />

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSubmit={handleUpdateUser}
        roles={roles}
      />

      <UserDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        user={selectedUser}
      />

      <CreateRoleDialog
        open={createRoleOpen}
        onOpenChange={setCreateRoleOpen}
        onCreated={loadRoles}
      />
    </div>
  );
}