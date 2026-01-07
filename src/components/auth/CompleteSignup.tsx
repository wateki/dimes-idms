import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabaseOrganizationSignupService } from '@/services/supabaseOrganizationSignupService';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function CompleteSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get('orgId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const completeSignup = async () => {
      if (!orgId) {
        setError('Organization ID is missing');
        setLoading(false);
        return;
      }

      try {
        console.log('[Complete Signup] Completing organization signup for:', orgId);
        const result = await supabaseOrganizationSignupService.completeSignup(orgId);
        console.log('[Complete Signup] Signup completed:', result);

        // Redirect to pricing/plan selection step (step 2) with organization ID
        navigate(`/signup?step=2&orgId=${result.organizationId}`);
      } catch (err: any) {
        console.error('[Complete Signup] Error completing signup:', err);
        setError(err.message || 'Failed to complete signup. Please try again.');
        setLoading(false);
      }
    };

    completeSignup();
  }, [orgId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-semibold">Completing your signup...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please wait while we set up your account
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:underline"
              >
                Go to Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null; // Should not reach here
}

