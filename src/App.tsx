import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { FormProvider } from '@/contexts/FormContext';
import { ReportProvider } from '@/contexts/ReportContext';
import { ProjectsProvider } from '@/contexts/ProjectsContext';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { TourProvider } from '@/contexts/TourContext';
import { NotificationContainer } from '@/components/ui/notification';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlobalOverview } from '@/components/dashboard/GlobalOverview';
import { ProjectOverview } from '@/components/dashboard/ProjectOverview';
import { KPIAnalytics } from '@/components/dashboard/KPIAnalytics';
import Login from '@/components/auth/Login';
import { OrganizationSignup } from '@/components/auth/OrganizationSignup';
import { ConfirmEmail } from '@/components/auth/ConfirmEmail';
import { CompleteSignup } from '@/components/auth/CompleteSignup';
import { GuidedSetup } from '@/components/auth/GuidedSetup';
import { ForgotPassword } from '@/components/auth/ForgotPassword';
import { ResetPassword } from '@/components/auth/ResetPassword';
import { SupabaseAuthHandler } from '@/components/auth/SupabaseAuthHandler';
import { OutcomesDetails } from '@/components/dashboard/OutcomesDetails';
import { OutputsDetails } from '@/components/dashboard/OutputsDetails';
import { Reports } from '@/components/dashboard/Reports';
import { KoboData } from '@/components/dashboard/KoboData';
import { Maps } from '@/components/dashboard/Maps';
import { Media } from '@/components/dashboard/Media';
import Financial from '@/components/dashboard/Financial';
import { UserManagement } from '@/components/dashboard/UserManagement';
import { Settings } from '@/components/dashboard/Settings';
import { OrganizationSettings } from '@/components/dashboard/organization/OrganizationSettings';
import { OrganizationTeamManagement } from '@/components/dashboard/organization/OrganizationTeamManagement';
import { OrganizationSubscription } from '@/components/dashboard/organization/OrganizationSubscription';
import { PlansPricing } from '@/components/dashboard/organization/PlansPricing';
import { OrganizationUsage } from '@/components/dashboard/organization/OrganizationUsage';
import { OrganizationAuditLogs } from '@/components/dashboard/organization/OrganizationAuditLogs';
import { Activities } from '@/components/dashboard/Activities';
import { Subactivities } from '@/components/dashboard/Subactivities';
import { ProjectCreationWizard } from '@/components/dashboard/ProjectCreationWizard';
import { FormRoutes } from '@/components/dashboard/FormRoutes';
import { GoalDetails } from '@/components/dashboard/GoalDetails';
import { StrategicPlanCreate } from '@/components/dashboard/StrategicPlanCreate';
import { StrategicPlanEdit } from '@/components/dashboard/StrategicPlanEdit';
import { Profile } from '@/components/dashboard/Profile';
import { PublicFormFiller } from '@/components/public/PublicFormFiller';
import { PublicLanding } from '@/components/public/PublicLanding';
import { LandingPage } from '@/components/public/LandingPage';
import { AboutPage } from '@/components/public/AboutPage';
import { FeaturesPage } from '@/components/public/FeaturesPage';
import { PricingPage } from '@/components/public/PricingPage';
import { SupportPage } from '@/components/public/SupportPage';
import { ContactPage } from '@/components/public/ContactPage';
import { PublicFeedbackSubmission } from '@/components/public/PublicFeedbackSubmission';
import { ProjectsApiTest } from '@/components/dashboard/ProjectsApiTest';
import { FeedbackRoutes } from '@/components/dashboard/feedback/FeedbackRoutes';
// New all-outcomes and all-outputs pages will be created as OutcomesDetails and OutputsDetails
import { Toaster as ShadToaster } from '@/components/ui/toaster';
import { createEnhancedPermissionManager } from '@/lib/permissions';
import { Analytics } from '@vercel/analytics/react';


function ProtectedRoute({ roles }: { roles?: string[] }) {
  const { user, isAuthenticated, isLoading, isRefreshing } = useAuth();
  const location = useLocation();

  // Define public routes where auth checks should not apply
  const isPublicRoute = (path: string) => {
    return (
      path === '/login' ||
      path === '/forgot-password' ||
      path === '/reset-password' ||
      path === '/' ||
      path === '/signup' ||
      path.startsWith('/signup/') ||
      path.startsWith('/fill/') ||
      path.startsWith('/embed/') ||
      path.match(/^\/feedback\/[^/]+\/submit$/)
    );
  };
  
  console.log('ProtectedRoute - authentication state:', { isAuthenticated, isLoading, isRefreshing, user: !!user });
  console.log('ProtectedRoute - current location:', location.pathname + location.search);

  // Skip auth checks entirely for public routes
  if (isPublicRoute(location.pathname)) {
    return <Outlet />;
  }
  
  // Show loading spinner if initializing or refreshing session
  if (isLoading || isRefreshing) {
    console.log('ProtectedRoute - still loading or refreshing, showing spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // Don't redirect to login for public routes
    if (isPublicRoute(location.pathname)) {
      return <Outlet />;
    }
    
    // Capture the current URL and redirect to login with next parameter
    const currentPath = location.pathname + location.search;
    const loginUrl = `/login?next=${encodeURIComponent(currentPath)}`;
    console.log('ProtectedRoute - user not authenticated, redirecting to login with next:', currentPath);
    console.log('ProtectedRoute - encoded login URL:', loginUrl);
    return <Navigate to={loginUrl} replace />;
  }
  
  if (roles && user?.roles) {
    const userRoles = user.roles.map(r => r.roleName);
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return <Outlet />;
}

function ProjectPermissionRoute({ check } : { check: (permissionManager: ReturnType<typeof createEnhancedPermissionManager>, projectId: string) => boolean }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { projectId } = useParams();
  const location = useLocation();
  const permissionManager = createEnhancedPermissionManager({ user, isAuthenticated, isLoading });

  if (!projectId) return <Navigate to="/dashboard" replace />;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const allowed = check(permissionManager, projectId);
  return allowed ? <Outlet /> : <Navigate to={`/dashboard/projects/${projectId}`} replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <OrganizationProvider>
          <NotificationProvider>
            <AppWithNotifications />
          </NotificationProvider>
        </OrganizationProvider>
      </AuthProvider>
    </Router>
  );
}

function AppWithNotifications() {
  const { notifications, removeNotification } = useNotifications();
  
  return (
    <>
      <SupabaseAuthHandler />
        <Routes>
          {/* Public routes - no context providers that require auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/contact" element={<ContactPage />} />
          
          {/* Organization signup routes */}
          <Route path="/signup" element={<OrganizationSignup />} />
          <Route path="/signup/confirm-email" element={<ConfirmEmail />} />
          <Route path="/signup/complete" element={<CompleteSignup />} />
          <Route path="/signup/setup" element={
            <AuthProvider>
              <OrganizationProvider>
                <GuidedSetup />
              </OrganizationProvider>
            </AuthProvider>
          } />
          
          {/* Public form filling routes - need FormProvider for form functionality */}
          <Route path="/fill/:formId" element={
            <FormProvider>
              <PublicFormFiller />
            </FormProvider>
          } />
          <Route path="/embed/:formId" element={
            <FormProvider>
              <PublicFormFiller isEmbedded={true} />
            </FormProvider>
          } />
          
          {/* Public feedback submission route with organization ID */}
          <Route path="/feedback/:organizationId/submit" element={
            <PublicFeedbackSubmission />
          } />
          
          {/* Authenticated routes - wrapped in dashboard context providers */}
          <Route path="/dashboard/*" element={
            <DashboardProvider>
              <ProjectsProvider>
                <FormProvider>
                  <ReportProvider>
                    <TourProvider>
                    <Routes>
                      <Route element={<ProtectedRoute />}>
                        <Route element={<DashboardLayout />}>
                          <Route index element={<GlobalOverview />} />
                          <Route path="api-test" element={<ProjectsApiTest />} />
                          <Route path="profile" element={<Profile />} />
                          <Route path="settings" element={<Settings />} />
                          {/* Organizational Goals routes */}
                          <Route path="goals/:goalId" element={<GoalDetails />} />
                          <Route path="goals/:goalId/subgoals/:subGoalId" element={<GoalDetails />} />
                          {/* Organization routes */}
                          <Route path="strategic-plan/create" element={<StrategicPlanCreate />} />
                          <Route path="strategic-plan/edit" element={<StrategicPlanEdit />} />
                          <Route path="feedback/*" element={<FeedbackRoutes projectId="organization" projectName="ICS Organization" />} />
                          {/* Admin-only project creation */}
                          <Route path="projects/create" element={<ProtectedRoute roles={['global-admin', 'country-admin', 'project-admin']} />}>
                            <Route index element={<ProjectCreationWizard />} />
                          </Route>
                          <Route path="projects/:projectId/edit" element={<ProtectedRoute roles={['global-admin', 'country-admin', 'project-admin']} />}>
                            <Route index element={<ProjectCreationWizard />} />
                          </Route>
                          <Route path="projects/:projectId" element={<ProjectOverview />} />
                          <Route path="projects/:projectId/kpi" element={<ProjectPermissionRoute check={(pm, pid) => pm.canAccessProjectComponent(pid, 'kpis', 'read')} />}>
                            <Route index element={<KPIAnalytics />} />
                          </Route>
                          <Route path="projects/:projectId/outcomes" element={<OutcomesDetails />} />
                          <Route path="projects/:projectId/outputs" element={<OutputsDetails />} />
                          <Route path="projects/:projectId/activities" element={<Activities />} />
                          <Route path="projects/:projectId/subactivities" element={<Subactivities />} />
                          <Route path="projects/:projectId/reports" element={<ProjectPermissionRoute check={(pm, pid) => pm.canAccessProjectComponent(pid, 'reports', 'read')} />}>
                            <Route index element={<Reports />} />
                          </Route>
                          <Route path="projects/:projectId/kobo-data" element={<KoboData />} />
                          <Route path="projects/:projectId/maps" element={<Maps />} />
                          <Route path="projects/:projectId/financial" element={<ProjectPermissionRoute check={(pm, pid) => pm.canAccessProjectComponent(pid, 'finance', 'read')} />}>
                            <Route index element={<Financial />} />
                          </Route>
                          <Route path="projects/:projectId/media" element={<Media />} />
                          {/* Project Forms - nested routing */}
                          {/* <Route path="projects/:projectId/forms/*" element={<ProjectPermissionRoute check={(pm, pid) => pm.canViewForms(pid)} />}>
                            <Route path="*" element={<FormRoutes />} />
                          </Route> */}
                          <Route path="projects/:projectId/forms/*" >
                            <Route path="*" element={<FormRoutes />} />
                          </Route>
                          {/* Admin-only routes */}
                          <Route path="admin/users" element={<ProtectedRoute roles={['global-admin']} />}> 
                            <Route index element={<UserManagement />} />
                          </Route>
                          <Route path="admin/settings" element={<ProtectedRoute roles={['global-admin']} />}> 
                            <Route index element={<Settings />} />
                          </Route>
                          {/* Organization Admin routes */}
                          <Route path="organization" element={<ProtectedRoute roles={['global-admin']} />}>
                            <Route index element={<OrganizationUsage />} />
                            <Route path="settings" element={<OrganizationSettings />} />
                            <Route path="team" element={<OrganizationTeamManagement />} />
                            <Route path="subscription" element={<OrganizationSubscription />} />
                            <Route path="plans" element={<PlansPricing />} />
                            <Route path="usage" element={<OrganizationUsage />} />
                            <Route path="audit-logs" element={<OrganizationAuditLogs />} />
                          </Route>
                        </Route>
                      </Route>
                    </Routes>
                    </TourProvider>
                  </ReportProvider>
                </FormProvider>
              </ProjectsProvider>
            </DashboardProvider>
          } />
        </Routes>
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      <ShadToaster />
      <Analytics />
    </>
  );
}

export default App;