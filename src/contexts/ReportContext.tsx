import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Report, 
  ReportApprovalWorkflow, 
  ReportApprovalStep, 
  ReportComment, 
  ReportNotification,
  User 
} from '@/types/dashboard';
import { 
  createApprovalWorkflow,
  approveStep,
  rejectStep,
  addCommentToStep,
  skipStep,
  getCurrentStep,
  getPendingReviewsForUser,
  getSubmittedReportsPendingReview,
  createPendingReviewNotification
} from '@/lib/reportWorkflowUtils';

interface ReportContextType {
  // Reports state
  reports: Report[];
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;
  updateReport: (reportId: string, updates: Partial<Report>) => void;
  deleteReport: (reportId: string) => void;
  
  // Workflow operations
  approveReportStep: (reportId: string, stepId: string, userId: string, userName: string, comment?: string) => void;
  rejectReportStep: (reportId: string, stepId: string, userId: string, userName: string, comment: string) => void;
  addCommentToReportStep: (reportId: string, stepId: string, userId: string, userName: string, userRole: string, comment: string) => void;
  skipReportStep: (reportId: string, stepId: string, userId: string, userName: string, reason: string) => void;
  
  // Query functions
  getPendingReviewsForUser: (userId: string, userRole: string) => Report[];
  getSubmittedReportsPendingReview: (userId: string) => Report[];
  getReportById: (reportId: string) => Report | undefined;
  getReportsByProject: (projectId: string) => Report[];
  
  // Notifications
  notifications: ReportNotification[];
  addNotification: (notification: ReportNotification) => void;
  markNotificationAsRead: (notificationId: string) => void;
  clearNotifications: () => void;
  
  // Create new report with workflow
  createReportWithWorkflow: (reportData: Omit<Report, 'id' | 'approvalWorkflow' | 'currentAuthLevel' | 'isPendingReview'>, users: User[]) => Report;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

interface ReportProviderProps {
  children: ReactNode;
}

export function ReportProvider({ children }: ReportProviderProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [notifications, setNotifications] = useState<ReportNotification[]>([]);

  // Load reports from localStorage on mount
  useEffect(() => {
    const savedReports = localStorage.getItem('reports');
    if (savedReports) {
      try {
        const parsedReports = JSON.parse(savedReports);
        setReports(parsedReports);
      } catch (error) {
        console.error('Error loading reports from localStorage:', error);
      }
    } else {
      // No reports data available - will be loaded when reports API is implemented
      setReports([]);
    }
  }, []);

  // Save reports to localStorage whenever reports change
  useEffect(() => {
    localStorage.setItem('reports', JSON.stringify(reports));
  }, [reports]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('reportNotifications');
    if (savedNotifications) {
      try {
        const parsedNotifications = JSON.parse(savedNotifications);
        setNotifications(parsedNotifications);
      } catch (error) {
        console.error('Error loading notifications from localStorage:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever notifications change
  useEffect(() => {
    localStorage.setItem('reportNotifications', JSON.stringify(notifications));
  }, [notifications]);

  const addReport = (report: Report) => {
    setReports(prev => [...prev, report]);
  };

  const updateReport = (reportId: string, updates: Partial<Report>) => {
    setReports(prev => prev.map(report => 
      report.id === reportId ? { ...report, ...updates } : report
    ));
  };

  const deleteReport = (reportId: string) => {
    setReports(prev => prev.filter(report => report.id !== reportId));
  };

  const getReportById = (reportId: string) => {
    return reports.find(report => report.id === reportId);
  };

  const getReportsByProject = (projectId: string) => {
    return reports.filter(report => report.projectId === projectId);
  };

  const createReportWithWorkflow = (
    reportData: Omit<Report, 'id' | 'approvalWorkflow' | 'currentAuthLevel' | 'isPendingReview'>, 
    users: User[]
  ): Report => {
    const reportId = `report-${Date.now()}`;
    const workflow = createApprovalWorkflow(
      reportId,
      reportData.projectId,
      reportData.uploadedBy,
      users
    );

    const newReport: Report = {
      ...reportData,
      id: reportId,
      approvalWorkflow: workflow,
      currentAuthLevel: 'branch-admin',
      isPendingReview: true,
      currentReviewerId: workflow.steps[0]?.assignedUserId,
      nextReviewerId: workflow.steps[1]?.assignedUserId
    };

    addReport(newReport);

    // Create notification for the first reviewer
    if (workflow.steps[0]?.assignedUserId) {
      const notification = createPendingReviewNotification(newReport, workflow.steps[0].assignedUserId);
      addNotification(notification);
    }

    return newReport;
  };

  const approveReportStep = (reportId: string, stepId: string, userId: string, userName: string, comment?: string) => {
    const report = getReportById(reportId);
    if (!report) return;

    const updatedWorkflow = approveStep(report.approvalWorkflow, stepId, userId, userName, comment);
    const currentStep = getCurrentStep(updatedWorkflow);
    
    // Update the report
    updateReport(reportId, {
      approvalWorkflow: updatedWorkflow,
      currentAuthLevel: updatedWorkflow.status === 'approved' ? 'approved' : currentStep?.requiredRole || 'branch-admin',
      isPendingReview: updatedWorkflow.status !== 'approved',
      currentReviewerId: currentStep?.assignedUserId,
      nextReviewerId: updatedWorkflow.steps.find(step => step.stepNumber === (currentStep?.stepNumber || 0) + 1)?.assignedUserId
    });

    // Create notification for next reviewer if workflow is still in progress
    if (updatedWorkflow.status === 'in-progress' && currentStep?.assignedUserId) {
      const notification = createPendingReviewNotification(report, currentStep.assignedUserId);
      addNotification(notification);
    }
  };

  const rejectReportStep = (reportId: string, stepId: string, userId: string, userName: string, comment: string) => {
    const report = getReportById(reportId);
    if (!report) return;

    const updatedWorkflow = rejectStep(report.approvalWorkflow, stepId, userId, userName, comment);
    
    updateReport(reportId, {
      approvalWorkflow: updatedWorkflow,
      isPendingReview: false
    });
  };

  const addCommentToReportStep = (reportId: string, stepId: string, userId: string, userName: string, userRole: string, comment: string) => {
    const report = getReportById(reportId);
    if (!report) return;

    const updatedWorkflow = addCommentToStep(report.approvalWorkflow, stepId, userId, userName, userRole, comment);
    
    updateReport(reportId, {
      approvalWorkflow: updatedWorkflow
    });
  };

  const skipReportStep = (reportId: string, stepId: string, userId: string, userName: string, reason: string) => {
    const report = getReportById(reportId);
    if (!report) return;

    const updatedWorkflow = skipStep(report.approvalWorkflow, stepId, userId, userName, reason);
    const currentStep = getCurrentStep(updatedWorkflow);
    
    updateReport(reportId, {
      approvalWorkflow: updatedWorkflow,
      currentAuthLevel: updatedWorkflow.status === 'approved' ? 'approved' : currentStep?.requiredRole || 'branch-admin',
      isPendingReview: updatedWorkflow.status !== 'approved',
      currentReviewerId: currentStep?.assignedUserId,
      nextReviewerId: updatedWorkflow.steps.find(step => step.stepNumber === (currentStep?.stepNumber || 0) + 1)?.assignedUserId
    });

    // Create notification for next reviewer if workflow is still in progress
    if (updatedWorkflow.status === 'in-progress' && currentStep?.assignedUserId) {
      const notification = createPendingReviewNotification(report, currentStep.assignedUserId);
      addNotification(notification);
    }
  };

  const addNotification = (notification: ReportNotification) => {
    setNotifications(prev => [...prev, notification]);
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId ? { ...notification, isRead: true } : notification
    ));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const contextValue: ReportContextType = {
    reports,
    setReports,
    addReport,
    updateReport,
    deleteReport,
    approveReportStep,
    rejectReportStep,
    addCommentToReportStep,
    skipReportStep,
    getPendingReviewsForUser: (userId: string, userRole: string) => {
      // Create a minimal User object for compatibility
      const mockUser: User = {
        id: userId,
        organizationId: '',
        email: '',
        firstName: '',
        lastName: '',
        isActive: true,
        lastLoginAt: '',
        createdAt: '',
        updatedAt: '',
        roles: [{ 
          id: '1', 
          roleName: userRole as any, 
          level: 1, 
          isActive: true 
        }],
        projectAccess: [],
        permissions: []
      };
      return getPendingReviewsForUser(reports, mockUser);
    },
    getSubmittedReportsPendingReview: (userId: string) => 
      getSubmittedReportsPendingReview(reports, userId),
    getReportById,
    getReportsByProject,
    notifications,
    addNotification,
    markNotificationAsRead,
    clearNotifications,
    createReportWithWorkflow
  };

  return (
    <ReportContext.Provider value={contextValue}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReport() {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return context;
}
