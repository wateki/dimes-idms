import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Loader2, Building2, Users, Target, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

export function GuidedSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const steps: SetupStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Your Organization',
      description: 'Let\'s get you started with a quick setup guide',
      icon: <Building2 className="h-6 w-6" />,
      completed: currentStep > 0,
    },
    {
      id: 'team',
      title: 'Invite Your Team',
      description: 'Add team members to collaborate on projects',
      icon: <Users className="h-6 w-6" />,
      completed: currentStep > 1,
    },
    {
      id: 'projects',
      title: 'Create Your First Project',
      description: 'Set up a project to start tracking your work',
      icon: <Target className="h-6 w-6" />,
      completed: currentStep > 2,
    },
    {
      id: 'settings',
      title: 'Configure Settings',
      description: 'Customize your organization settings',
      icon: <Settings className="h-6 w-6" />,
      completed: currentStep > 3,
    },
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setLoading(true);
    // Redirect to dashboard
    navigate('/dashboard');
  };

  const handleAction = (stepId: string) => {
    switch (stepId) {
      case 'team':
        navigate('/dashboard/organization/team');
        break;
      case 'projects':
        navigate('/dashboard/projects/create');
        break;
      case 'settings':
        navigate('/dashboard/organization/settings');
        break;
      default:
        handleNext();
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Welcome to Your Organization!</h1>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      step.completed
                        ? 'bg-green-600 text-white'
                        : index === currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.completed ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 transition-colors ${
                      step.completed ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Current step content */}
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-100 rounded-full">
                {currentStepData.icon}
              </div>
            </div>
            <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
            <CardDescription className="text-base mt-2">
              {currentStepData.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step-specific content */}
            {currentStepData.id === 'welcome' && (
              <div className="space-y-4 text-center">
                <p className="text-muted-foreground">
                  Great! Your organization account has been created successfully.
                </p>
                <p className="text-muted-foreground">
                  This quick setup guide will help you get started with the platform.
                </p>
              </div>
            )}

            {currentStepData.id === 'team' && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-center">
                  Start by inviting team members to your organization. You can manage roles and permissions for each member.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> You can skip this step and invite team members later from the Team Management page.
                  </p>
                </div>
              </div>
            )}

            {currentStepData.id === 'projects' && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-center">
                  Create your first project to start organizing and tracking your work. Projects help you manage goals, activities, and outcomes.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> You can create multiple projects and organize them by country or region.
                  </p>
                </div>
              </div>
            )}

            {currentStepData.id === 'settings' && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-center">
                  Configure your organization settings including contact information, logo, and preferences.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> You can update these settings anytime from the Organization Settings page.
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleSkip}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Skip Setup
              </Button>
              <Button
                onClick={() => {
                  if (['team', 'projects', 'settings'].includes(currentStepData.id)) {
                    handleAction(currentStepData.id);
                  } else {
                    handleNext();
                  }
                }}
                className="flex-1"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : currentStep === steps.length - 1 ? (
                  'Go to Dashboard'
                ) : (
                  <>
                    {['team', 'projects', 'settings'].includes(currentStepData.id) ? 'Open' : 'Next'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

