import React from 'react';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { Link, useLocation } from 'react-router-dom';
import { Target, Activity, Users, Settings, Folder, Circle, CheckCircle2, Flag, FileText, Plus, ClipboardList, X, DollarSign, MessageSquare, Database, BookOpen, Edit3, Archive, RotateCcw, Building2, CreditCard, BarChart3, FileSearch, Info, TrendingUp, FileBarChart, Wallet, Image, Map, Layers, HardDrive, UserCircle, UserCog, Settings2 } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createEnhancedPermissionManager } from '@/lib/permissions';


export function ProSidebar() {
  const { setSidebarOpen } = useDashboard();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { organization } = useOrganization();
  const location = useLocation();
  
  // Always call hooks in the same order
  const projectsContext = useProjects();
  
  // Create enhanced permission manager
  const permissionManager = createEnhancedPermissionManager({
    user,
    isAuthenticated,
    isLoading: authLoading
  });
  
  const { 
    projects, 
    isLoading,
    getAllProjectsForUser,
    archiveProject,
    restoreProject,
    refreshProjects,
  } = projectsContext;
  
  // Early return if auth is loading
  if (authLoading) {
    return (
      <div className="w-[270px] bg-gray-50 border-r border-gray-200 h-screen flex items-center justify-center">
        <div className="text-center text-sm text-gray-500">
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  // Early return if user is not loaded or doesn't exist
  if (!user) {
    return (
      <div className="w-[270px] bg-gray-50 border-r border-gray-200 h-screen flex items-center justify-center">
        <div className="text-center text-sm text-gray-500">
          <p>Loading user...</p>
        </div>
      </div>
    );
  }
  
  // Use centralized permission manager
  const isAdmin = () => permissionManager.isGlobalAdmin();
  const isRegionalCoordinator = () => {
    const roleNames = (user?.roles || []).map(r => r.roleName);
    return roleNames.includes('coordinator-tanzania') || roleNames.includes('coordinator-cote-divoire');
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleArchiveProject = async (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to archive "${projectName}"? The project will no longer be accessible, but all data will be preserved.`)) {
      try {
        console.log('🔄 [ProSidebar] Starting archive operation for project:', projectId);
        const updatedProject = await archiveProject(projectId);
        console.log('✅ [ProSidebar] Archive operation completed:', {
          projectId: updatedProject.id,
          newStatus: updatedProject.status
        });
        // No need to call refreshProjects() - archiveProject already updates the state
        handleCloseSidebar();
      } catch (error) {
        console.error('❌ [ProSidebar] Error archiving project:', error);
        alert('Failed to archive project. Please try again.');
      }
    }
  };

  const handleRestoreProject = async (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to restore "${projectName}"? The project will become active again.`)) {
      try {
        console.log('🔄 [ProSidebar] Starting restore operation for project:', projectId);
        const updatedProject = await restoreProject(projectId);
        console.log('✅ [ProSidebar] Restore operation completed:', {
          projectId: updatedProject.id,
          newStatus: updatedProject.status
        });
        // No need to call refreshProjects() - restoreProject already updates the state
        handleCloseSidebar();
      } catch (error) {
        console.error('❌ [ProSidebar] Error restoring project:', error);
        alert('Failed to restore project. Please try again.');
      }
    }
  };

  // Get accessible projects for the current user
  const accessibleProjects = getAllProjectsForUser();
  
  // Debug: Log project statuses to verify they're being passed correctly
  if (accessibleProjects.length > 0) {
    console.log('📋 [ProSidebar] Accessible projects with statuses:', 
      accessibleProjects.map(p => ({ id: p.id, name: p.name, status: p.status }))
    );
  }

  try {
    return (
      <Sidebar 
        width="270px"
        backgroundColor="#f8fafc"
        rootStyles={{
          borderRight: '1px solid #e2e8f0',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="flex flex-col h-full max-h-screen">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {organization?.logoUrl ? (
                  <img
                    src={organization.logoUrl}
                    alt={organization.name || 'Organization logo'}
                    className="h-8 w-8 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-gray-800 truncate">
                    {organization?.name || 'ICS Dashboard'}
                  </h2>
                  {organization?.subscriptionTier && (() => {
                    const tier = organization.subscriptionTier.toLowerCase();
                    const getTierBadgeStyle = () => {
                      switch (tier) {
                        case 'free':
                          return 'bg-gray-100 text-gray-700 border-gray-300';
                        case 'basic':
                          return 'bg-blue-100 text-blue-700 border-blue-300';
                        case 'professional':
                        case 'pro':
                          return 'bg-green-100 text-green-700 border-green-300';
                        case 'enterprise':
                          return 'bg-purple-100 text-purple-700 border-purple-300';
                        default:
                          return 'bg-gray-100 text-gray-700 border-gray-300';
                      }
                    };
                    const getTierDisplayName = () => {
                      switch (tier) {
                        case 'free':
                          return 'FREE PLAN';
                        case 'basic':
                          return 'BASIC PLAN';
                        case 'professional':
                        case 'pro':
                          return 'PRO PLAN';
                        case 'enterprise':
                          return 'ENTERPRISE PLAN';
                        default:
                          return `${tier.toUpperCase()} PLAN`;
                      }
                    };
                    return (
                      <Link 
                        to="/dashboard/organization" 
                        onClick={handleCloseSidebar}
                        className="flex-shrink-0"
                      >
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${getTierBadgeStyle()}`}
                        >
                          {getTierDisplayName()}
                        </Badge>
                      </Link>
                    );
                  })()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseSidebar}
                className="md:hidden flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <Menu>
              {/* Global Menu */}
             <SubMenu 
                label="Global" 
            icon={<Users className="h-4 w-4" />}
            className="text-sm"
            >
                {/* Goals */}
              <MenuItem 
                  icon={<Flag className="h-4 w-4" />} 
            component={<Link to="/dashboard" onClick={handleCloseSidebar} />}
            className="text-sm"
          >
                  Goals
          </MenuItem>
                
                {/* Strategic Plan - Expandable */}
            {isAdmin() && (
              <SubMenu 
                label="Strategic Plan" 
                icon={<BookOpen className="h-4 w-4" />}
                className="text-sm"
              >
                <MenuItem 
                  component={<Link to="/dashboard/strategic-plan/create" onClick={handleCloseSidebar} />}
                  className="text-sm"
                >
                      Create Organizational Plan
                </MenuItem>
                <MenuItem 
                  component={<Link to="/dashboard/strategic-plan/edit" onClick={handleCloseSidebar} />}
                  className="text-sm"
                >
                      Edit Organizational Plan
                </MenuItem>
              </SubMenu>
            )}
                
                {/* Feedback & Submissions - Expandable */}
            <SubMenu 
                  label="Feedback & Submissions" 
              icon={<MessageSquare className="h-4 w-4" />}
              className="text-sm"
            >
              <MenuItem 
                component={<Link to="/dashboard/feedback" onClick={handleCloseSidebar} />}
                className="text-sm"
              >
                Submit Feedback
              </MenuItem>
              <MenuItem 
                component={<Link to="/dashboard/feedback/submissions" onClick={handleCloseSidebar} />}
                className="text-sm"
              >
                View Submissions
              </MenuItem>
            </SubMenu>
          </SubMenu>

              {/* Projects Section - Independent */}
              <SubMenu 
                label="Projects" 
                icon={<Folder className="h-4 w-4" />}
                className="text-sm"
              >
                {/* Create Project (admin only) */}
                {isAdmin() && (
                  <MenuItem 
                    icon={<Plus className="h-4 w-4" />} 
                    component={<Link to="/dashboard/projects/create" onClick={handleCloseSidebar} />}
                    className="text-sm"
                  >
                    Create Project
                  </MenuItem>
                )}
                
                {/* Projects List */}
                {isLoading ? (
                  <MenuItem className="text-sm text-gray-500">
                    Loading projects...
                  </MenuItem>
                ) : accessibleProjects.length === 0 ? (
                  <MenuItem className="text-sm text-gray-500">
                    No projects available
                  </MenuItem>
                ) : (() => {
                  // Filter projects based on regional coordinator if needed
                  const filteredProjects = isRegionalCoordinator() 
                    ? accessibleProjects.filter((project: any) => {
                        const country = ((project && (project as any).country) ? (project as any).country : '').toLowerCase();
                        const rcTz = (user?.roles || []).some(r => r.roleName === 'coordinator-tanzania');
                        const rcCi = (user?.roles || []).some(r => r.roleName === 'coordinator-cote-divoire');
                        if (rcTz) return country.includes('tanzania') || country.includes('tz');
                        if (rcCi) return country.includes('côte') || country.includes('cote') || country.includes('ivoire');
                        return true;
                      })
                    : accessibleProjects;
                  
                  // Separate projects into active and archived
                  const activeProjects = filteredProjects.filter((project: any) => project.status !== 'ARCHIVED');
                  const archivedProjects = filteredProjects.filter((project: any) => project.status === 'ARCHIVED');
                  
                  // Helper function to render project menu
                  const renderProjectMenu = (project: any) => {
                    // Safety check for project object
                    if (!project || !project.id || !project.name) {
                      console.warn('Invalid project object:', project);
                      return null;
                    }
                    
                    return (
                      <SubMenu 
                        key={project.id} 
                        label={project.name.toUpperCase()}
                        className="text-sm"
                      >
                        {/* Background (Overview) */}
                        <MenuItem 
                          icon={<Info className="h-4 w-4" />}
                          component={<Link to={`/dashboard/projects/${project.id}`} onClick={handleCloseSidebar} />}
                          className="text-sm"
                        >
                          Background
                        </MenuItem>
                        
                        {/* ToC Tracker - Expandable with Outcomes, Outputs, Activities, Sub-activities */}
                        {permissionManager.canAccessProject(project.id, 'read') && (
                          <SubMenu 
                            label="ToC Tracker" 
                            icon={<TrendingUp className="h-4 w-4" />}
                            className="text-sm"
                          >
                          <MenuItem 
                            component={<Link to={`/dashboard/projects/${project.id}/outcomes`} onClick={handleCloseSidebar} />}
                            className="text-sm"
                          >
                            Outcomes
                          </MenuItem>
                          <MenuItem 
                            component={<Link to={`/dashboard/projects/${project.id}/outputs`} onClick={handleCloseSidebar} />}
                            className="text-sm"
                          >
                            Outputs
                          </MenuItem>
                          <MenuItem 
                            component={<Link to={`/dashboard/projects/${project.id}/activities`} onClick={handleCloseSidebar} />}
                            className="text-sm"
                          >
                            Activities
                          </MenuItem>
                            <MenuItem 
                              component={<Link to={`/dashboard/projects/${project.id}/subactivities`} onClick={handleCloseSidebar} />}
                              className="text-sm"
                            >
                              Sub-activities
                            </MenuItem>
                          </SubMenu>
                        )}
                        
                        {/* KPI Tracker */}
                        {permissionManager.canAccessProjectComponent(project.id, 'kpis', 'read') && (
                          <MenuItem 
                            icon={<FileBarChart className="h-4 w-4" />}
                            component={<Link to={`/dashboard/projects/${project.id}/kpi`} onClick={handleCloseSidebar} />}
                            className="text-sm"
                          >
                            KPI Tracker
                          </MenuItem>
                        )}
                        
                        {/* Forms Management */}
                        {permissionManager.canViewForms(project.id) && (
                          <MenuItem 
                            icon={<FileText className="h-4 w-4" />}
                            component={<Link to={`/dashboard/projects/${project.id}/forms`} onClick={handleCloseSidebar} />}
                            className="text-sm"
                          >
                            Forms Management
                          </MenuItem>
                        )}
                        
                        {/* Budget Tracker */}
                        {permissionManager.canAccessProjectComponent(project.id, 'finance', 'read') && (
                          <MenuItem 
                            icon={<Wallet className="h-4 w-4" />}
                            component={<Link to={`/dashboard/projects/${project.id}/financial`} onClick={handleCloseSidebar} />}
                            className="text-sm"
                          >
                            Budget Tracker
                          </MenuItem>
                        )}
                        
                        {/* Media */}
                        {permissionManager.canAccessProject(project.id, 'read') && (
                          <MenuItem 
                            icon={<Image className="h-4 w-4" />}
                            component={<Link to={`/dashboard/projects/${project.id}/media`} onClick={handleCloseSidebar} />}
                            className="text-sm"
                          >
                            Media
                          </MenuItem>
                        )}
                        
                        {/* Reports */}
                        {permissionManager.canAccessProjectComponent(project.id, 'reports', 'read') && (
                          <MenuItem 
                            icon={<FileText className="h-4 w-4" />}
                            component={<Link to={`/dashboard/projects/${project.id}/reports`} onClick={handleCloseSidebar} />}
                            className="text-sm"
                          >
                            Reports
                          </MenuItem>
                        )}
                        
                        {/* Data Imports - Expandable with Kobo */}
                        {permissionManager.canAccessProjectComponent(project.id, 'kobo', 'read') && (
                          <SubMenu 
                            label="Data Imports" 
                            icon={<HardDrive className="h-4 w-4" />}
                            className="text-sm"
                          >
                            <MenuItem 
                              component={<Link to={`/dashboard/projects/${project.id}/kobo-data`} onClick={handleCloseSidebar} />}
                              className="text-sm"
                            >
                              Kobo
                          </MenuItem>
                          </SubMenu>
                        )}
                        
                        {/* Maps */}
                        {permissionManager.canAccessProject(project.id, 'read') && (
                          <MenuItem 
                            icon={<Map className="h-4 w-4" />}
                            component={<Link to={`/dashboard/projects/${project.id}/maps`} onClick={handleCloseSidebar} />}
                            className="text-sm"
                          >
                            Maps
                          </MenuItem>
                        )}
                        
                        {/* Edit Project (admin only) */}
                        {isAdmin() && (
                          <MenuItem 
                            icon={<Edit3 className="h-4 w-4" />}
                            component={<Link to={`/dashboard/projects/${project.id}/edit`} onClick={handleCloseSidebar} />}
                            className="text-sm"
                          >
                            Edit Project
                          </MenuItem>
                        )}
                        
                        {/* Archive/Restore Project (admin only) */}
                        {isAdmin() && (
                          <MenuItem 
                            onClick={(e) => {
                              e.preventDefault();
                              console.log('🖱️ [ProSidebar] Archive/Restore clicked:', {
                                projectId: project.id,
                                projectName: project.name,
                                currentStatus: project.status
                              });
                              if (project.status === 'ARCHIVED') {
                                handleRestoreProject(project.id, project.name);
                              } else {
                                handleArchiveProject(project.id, project.name);
                              }
                            }}
                            className="text-sm"
                          >
                            {(() => {
                              const isArchived = project.status === 'ARCHIVED';
                              console.log(`🔍 [ProSidebar] Rendering menu item for project ${project.id}:`, {
                                status: project.status,
                                isArchived,
                                willShow: isArchived ? 'Restore' : 'Archive'
                              });
                              return isArchived ? (
                                <>
                                  <RotateCcw className="w-4 h-4 mr-2 inline" />
                                  Restore Project
                                </>
                              ) : (
                                <>
                                  <Archive className="w-4 h-4 mr-2 inline" />
                                  Archive Project
                                </>
                              );
                            })()}
                          </MenuItem>
                        )}
                      </SubMenu>
                    );
                  };
                  
                  return (
                    <>
                      {/* Active Projects Section */}
                      {activeProjects.length > 0 && (
                        <>
                          <MenuItem 
                            className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2 mt-2 mb-1 pointer-events-none"
                            style={{ cursor: 'default' }}
                          >
                            Active Projects
                          </MenuItem>
                          {activeProjects.map(renderProjectMenu)}
                        </>
                      )}
                      
                      {/* Archived Projects Section */}
                      {archivedProjects.length > 0 && (
                        <>
                          <MenuItem 
                            className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2 mt-4 mb-1 pointer-events-none"
                            style={{ cursor: 'default' }}
                          >
                            Archived Projects
                          </MenuItem>
                          {archivedProjects.map(renderProjectMenu)}
                        </>
                      )}
                    </>
                  );
                })()}
              </SubMenu>
              
              {/* Organization Admin section - Only for global admins */}
              {isAdmin() && (
                <SubMenu 
                  label="Account Management" 
                  icon={<FileText className="h-4 w-4" />}
                  className="text-sm"
                >
                   <MenuItem 
                    component={<Link to="/dashboard/organization/team" onClick={handleCloseSidebar} />}
                    className="text-sm"
                    icon={<Users className="h-4 w-4" />}
                  >
                    Team Management
                  </MenuItem>

                  <MenuItem 
                    component={<Link to="/dashboard/organization/subscription" onClick={handleCloseSidebar} />}
                    className="text-sm"
                    icon={<CreditCard className="h-4 w-4" />}
                  >
                    Subscription & Billing
                  </MenuItem>
                  <MenuItem 
                    component={<Link to="/dashboard/organization" onClick={handleCloseSidebar} />}
                    className="text-sm"
                    icon={<Database className="h-4 w-4" />}
                  >
                    Usage & Limits
                  </MenuItem>
                  
                  <MenuItem 
                    component={<Link to="/dashboard/organization/settings" onClick={handleCloseSidebar} />}
                    className="text-sm"
                    icon={<Settings2 className="h-4 w-4" />}
                  >
                    Settings
                  </MenuItem>
                 
                 
                
                </SubMenu>
              )}
              
              {/* Settings section - Personal Settings */}
              { (
                <SubMenu 
                  label="My profile" 
                  icon={<UserCircle className="h-4 w-4" />}
                  className="text-sm"
                >
                    <MenuItem 
                      component={<Link to="/dashboard/admin/settings" onClick={handleCloseSidebar} />}
                      className="text-sm"
                    icon={<UserCog className="h-4 w-4" />}
                    >
                    Personal Settings
                    </MenuItem>
                </SubMenu>
              )}
            </Menu>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <div className="text-xs text-gray-500">
              <p>Logged in as: {user.firstName} {user.lastName}</p>
              <p>Role: {user.roles?.[0]?.roleName || 'No role assigned'}</p>
            </div>
          </div>
        </div>
      </Sidebar>
    );
  } catch (error) {
    console.error('Error rendering sidebar:', error);
    return (
      <div className="w-[270px] bg-gray-50 border-r border-gray-200 h-screen flex items-center justify-center">
        <div className="text-center text-sm text-red-500">
          <p>Error loading sidebar</p>
          <p className="text-xs mt-1">Please refresh the page</p>
        </div>
      </div>
    );
  }
}