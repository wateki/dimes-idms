import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useAuth } from './AuthContext';

interface TourContextType {
  run: boolean;
  stepIndex: number;
  steps: Step[];
  startTour: () => void;
  stopTour: () => void;
  resetTour: () => void;
  handleJoyrideCallback: (data: CallBackProps) => void;
  tourCompleted: boolean;
  openMenu: string | null;
  setOpenMenu: (menu: string | null) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Check if user has completed the tour before
  useEffect(() => {
    if (user) {
      const completed = localStorage.getItem(`tour_completed_${user.id}`);
      setTourCompleted(completed === 'true');
    }
  }, [user]);

  // Tour steps configuration
  const steps: Step[] = [
    // Welcome step
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-gray-900">Welcome to DIMES System! 🎉</h3>
          <p className="text-gray-700">
            Let's take a quick tour to help you get started with the platform. 
            We'll walk you through the essential features to help you manage your organization effectively.
          </p>
          <p className="text-sm text-gray-600">
            This tour will take approximately 3-4 minutes. You can exit anytime by pressing ESC or clicking "Skip Tour".
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    
    // Dashboard Overview
    {
      target: '[data-tour="dashboard-overview"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Dashboard Overview</h3>
          <p className="text-gray-700">
            This is your main dashboard. Here you'll see an overview of all your projects, 
            goals, and key performance indicators at a glance.
          </p>
          <p className="text-sm text-gray-600">
            The dashboard provides real-time insights into your organization's activities and progress.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    
    // Global Menu
    {
      target: '[data-tour="global-menu"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Global Menu</h3>
          <p className="text-gray-700">
            The Global menu contains organization-wide features including Goals, Strategic Plan, 
            and Feedback & Submissions that apply across all projects.
          </p>
        </div>
      ),
      placement: 'right-start',
      disableBeacon: true,
    },
    
    // Goals
    {
      target: '[data-tour="goals-menu"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Organizational Goals</h3>
          <p className="text-gray-700">
            View and manage your organization's strategic goals and track progress 
            across all projects. This gives you a high-level view of your organization's objectives.
          </p>
        </div>
      ),
      placement: 'right-start',
      disableBeacon: true,
    },
    
    // Strategic Plan
    {
      target: '[data-tour="strategic-plan-menu"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Strategic Plan</h3>
          <p className="text-gray-700">
            Create and manage your organization's strategic plan. Link strategic goals 
            to specific activities and track implementation progress.
          </p>
          <p className="text-sm text-gray-600">
            This helps align all projects with your organization's strategic direction.
          </p>
        </div>
      ),
      placement: 'right-start',
      disableBeacon: true,
    },
    
    // Feedback & Submissions
    {
      target: '[data-tour="feedback-menu"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Feedback & Submissions</h3>
          <p className="text-gray-700">
            Collect and manage feedback from stakeholders. View submissions, track resolution status, 
            and communicate with feedback providers.
          </p>
          <p className="text-sm text-gray-600">
            The feedback system helps you stay connected with your stakeholders and improve your programs.
          </p>
        </div>
      ),
      placement: 'right-start',
      disableBeacon: true,
    },
    
    // Projects Menu
    {
      target: '[data-tour="projects-menu"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Projects</h3>
          <p className="text-gray-700">
            This is where you'll find all your projects. Each project has its own set of features 
            for managing activities, forms, reports, budgets, and more.
          </p>
          <p className="text-sm text-gray-600">
            Click on a project to expand and see all available features.
          </p>
        </div>
      ),
      placement: 'right-start',
      disableBeacon: true,
    },
    
    // Project Features - ToC Tracker
    {
      target: '[data-tour="project-toc"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Theory of Change Tracker</h3>
          <p className="text-gray-700">
            Track your project's Theory of Change with Outcomes, Outputs, Activities, and Sub-activities. 
            This hierarchical structure helps you monitor progress at every level.
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Outcomes: High-level changes you want to achieve</li>
            <li>Outputs: Deliverables from your activities</li>
            <li>Activities: Actions to produce outputs</li>
            <li>Sub-activities: Detailed breakdown of activities</li>
          </ul>
        </div>
      ),
      placement: 'right-start',
      disableBeacon: true,
    },
    
    // Forms Management
    {
      target: '[data-tour="project-forms"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Forms Management</h3>
          <p className="text-gray-700">
            Create, manage, and deploy custom data collection forms. View responses, 
            export data, and analyze submissions with built-in analytics.
          </p>
          <p className="text-sm text-gray-600">
            Forms can be filled online or using the DIMES Collect mobile app for offline data collection.
          </p>
        </div>
      ),
      placement: 'right-start',
      disableBeacon: true,
    },
    
    // Budget Tracker
    {
      target: '[data-tour="project-budget"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Budget Tracker</h3>
          <p className="text-gray-700">
            Track project finances, monitor spending, and manage budgets for each activity. 
            Get real-time visibility into financial status and budget utilization.
          </p>
          <p className="text-sm text-gray-600">
            View budget vs. actual spending across all project activities.
          </p>
        </div>
      ),
      placement: 'right-start',
      disableBeacon: true,
    },
    
    // Team Management
    {
      target: '[data-tour="team-management"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Team Management</h3>
          <p className="text-gray-700">
            Manage your organization's team members, assign roles, and control access permissions. 
            Add users, update their information, and manage who has access to which projects.
          </p>
          <p className="text-sm text-gray-600">
            Proper team management ensures the right people have access to the right information.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      floaterProps: {
        disableFlip: true,
        placement: 'right',
      },
    },
    
    // Subscription & Billing
    {
      target: '[data-tour="subscription-billing"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Subscription & Billing</h3>
          <p className="text-gray-700">
            Manage your subscription plan and billing information. View your current plan, 
            upgrade or downgrade, and access payment history and invoices.
          </p>
          <p className="text-sm text-gray-600">
            Keep your subscription up to date to ensure uninterrupted access to all features.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      floaterProps: {
        disableFlip: true,
        placement: 'right',
      },
    },
    
    // Usage & Limits
    {
      target: '[data-tour="usage-limits"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Usage & Limits</h3>
          <p className="text-gray-700">
            Monitor your organization's resource usage against your plan limits. Track the number of 
            users, projects, and storage consumed.
          </p>
          <p className="text-sm text-gray-600">
            Stay informed about your usage to avoid hitting limits and plan upgrades accordingly.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      floaterProps: {
        disableFlip: true,
        placement: 'right',
      },
    },
    
    // Tour Complete
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-gray-900">Tour Complete! 🎊</h3>
          <p className="text-gray-700">
            You've completed the guided tour! You're now familiar with the essential features of DIMES System.
          </p>
          <p className="text-sm text-gray-600">
            Remember, you can always access the help documentation or restart this tour from the help menu. 
            Happy organizing!
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ];

  const startTour = useCallback(() => {
    setRun(true);
    setStepIndex(0);
    setOpenMenu(null);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const resetTour = useCallback(() => {
    setStepIndex(0);
    setRun(false);
    setTourCompleted(false);
    if (user) {
      localStorage.removeItem(`tour_completed_${user.id}`);
    }
    setOpenMenu(null);
  }, [user]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, index, action, type } = data;
    
    console.log('[Tour] Joyride callback:', { status, index, action, type });

    // Handle tour completion
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setTourCompleted(true);
      if (user) {
        localStorage.setItem(`tour_completed_${user.id}`, 'true');
      }
      setOpenMenu(null);
      return;
    }

    // Handle step changes
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      // Open/close menus based on the step
      // Steps: 0=Welcome, 1=Dashboard, 2-5=Global, 6-9=Projects, 10-12=Account, 13=Complete
      if (nextStepIndex >= 2 && nextStepIndex <= 5) {
        // Steps 2-5 are in the Global menu
        setOpenMenu('global');
      } else if (nextStepIndex >= 6 && nextStepIndex <= 9) {
        // Steps 6-9 are in the Projects menu
        setOpenMenu('projects');
      } else if (nextStepIndex >= 10 && nextStepIndex <= 12) {
        // Steps 10-12 are in Account Management (Team, Subscription, Usage)
        setOpenMenu('account');
      } else {
        setOpenMenu(null);
      }
      
      setStepIndex(nextStepIndex);
    }
  }, []);

  const value: TourContextType = {
    run,
    stepIndex,
    steps,
    startTour,
    stopTour,
    resetTour,
    handleJoyrideCallback,
    tourCompleted,
    openMenu,
    setOpenMenu,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
