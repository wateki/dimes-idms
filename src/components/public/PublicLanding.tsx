import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Users, 
  BarChart3, 
  Globe,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PublicLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="mx-auto mb-6">
            <Globe className="w-20 h-20 text-blue-600 mx-auto" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ICS Data Collection Platform
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Access and fill out data collection forms for various development projects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Data Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Fill out surveys and forms to contribute to development projects and research.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Community Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Your responses help improve programs and services in your community.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <BarChart3 className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Real-time Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Data is analyzed in real-time to inform decision-making and program improvements.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-2xl mx-auto">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> If you have a specific form link, please use it directly. 
              If you're looking for a particular survey, please contact the project administrator.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                If you're having trouble accessing a form or need assistance, please contact your project coordinator.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• Make sure you have the correct form link</p>
                <p>• Check that the form hasn't expired</p>
                <p>• Ensure you have a stable internet connection</p>
                <p>• Contact support if you encounter technical issues</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

