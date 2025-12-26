import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';

export function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const orgId = searchParams.get('orgId');

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Mail className="h-16 w-16 text-blue-600" />
              <CheckCircle className="h-8 w-8 text-green-500 absolute -bottom-1 -right-1 bg-white rounded-full" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription className="text-base mt-2">
            We've sent a confirmation link to your email address
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Please check your inbox at
            </p>
            <p className="font-semibold text-lg">{email || 'your email address'}</p>
            <p className="text-sm text-muted-foreground">
              and click the confirmation link to activate your account.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-900">
              <strong>Didn't receive the email?</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes and try again</li>
            </ul>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              After confirming your email, you'll be redirected to complete your organization setup.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

