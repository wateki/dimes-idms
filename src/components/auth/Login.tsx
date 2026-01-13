import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';

interface LoginProps {}

export const Login: React.FC<LoginProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, isLoading } = useAuth();
  
  // Get the 'next' (preferred) or legacy 'returnTo' parameter from URL and validate it
  let rawNext = searchParams.get('next') || searchParams.get('returnTo');
  if (!rawNext && typeof window !== 'undefined') {
    // Fallback to window.location.search parsing to handle edge cases
    const sp = new URLSearchParams(window.location.search);
    rawNext = sp.get('next') || sp.get('returnTo');
  }
  
  // Debug logging
  console.log('Login component - nextUrl from searchParams:', rawNext);
  console.log('Login component - all search params:', Object.fromEntries(searchParams.entries()));
  
  // Validate and sanitize the next URL to prevent open redirects
  const isValidNextUrl = (url: string): boolean => {
    // Only allow relative URLs (starting with /) and not login page
    return url.startsWith('/') && !url.startsWith('//') && url !== '/login';
  };
  
  const decodedNext = rawNext ? decodeURIComponent(rawNext) : null;
  console.log('Login component - decoded URL:', decodedNext);
  
  const safeNextUrl = decodedNext && isValidNextUrl(decodedNext) ? decodedNext : null;
  console.log('Login component - safeNextUrl:', safeNextUrl);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // If there's a safe 'next' URL, redirect there, otherwise go to dashboard
      const redirectUrl = safeNextUrl && safeNextUrl !== '/login' ? safeNextUrl : '/dashboard';
      console.log('Login component - user authenticated, redirecting to:', redirectUrl);
      console.log('Login component - safeNextUrl was:', safeNextUrl);
      navigate(redirectUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, safeNextUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Prevent auto-login if user hasn't explicitly interacted with the form
    // This prevents browser autofill from triggering automatic login
    if (!hasUserInteracted) {
      return;
    }

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Redirect will happen automatically via useEffect when isAuthenticated changes
        // The useEffect will handle the 'next' URL parameter
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setHasUserInteracted(true);
  };

  // Demo credentials for testing


  return (
    <div 
      className="min-h-screen w-screen flex items-center justify-center bg-grid-pattern p-4"
      style={{
        backgroundImage: `
          linear-gradient(to bottom, var(--gradient-start), var(--gradient-middle), var(--gradient-end)),
          linear-gradient(0deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent),
          linear-gradient(90deg, transparent 24%, var(--grid-color) 25%, var(--grid-color) 26%, transparent 27%, transparent 74%, var(--grid-color) 75%, var(--grid-color) 76%, transparent 77%, transparent)
        `,
        backgroundSize: '100% 100%, 120px 120px, 120px 120px'
      }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Main Login Form */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <img src="/logo.png" alt="ICS Logo" className="h-12 w-auto mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-gray-900">DIMES Login</CardTitle>
            <p className="text-sm text-gray-600">Sign in to your account</p>
           
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setHasUserInteracted(true);
                    }}
                    onFocus={() => setHasUserInteracted(true)}
                    className="pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setHasUserInteracted(true);
                    }}
                    onFocus={() => setHasUserInteracted(true)}
                    className="pl-10 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-emerald-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !hasUserInteracted}
                onClick={() => setHasUserInteracted(true)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Accounts */}
{/*         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Demo Accounts</CardTitle>
            <p className="text-sm text-gray-600">Click any account to auto-fill credentials</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {demoCredentials.map((credential, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start text-left h-auto p-3"
                onClick={() => handleDemoLogin(credential.email, credential.password)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">{credential.email}</span>
                  <span className="text-xs text-gray-500">{credential.role}</span>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card> */}

        {/* Help Text */}
       {/*  <div className="text-center text-sm text-gray-600">
          <p>This is a demo application. Use the demo accounts above to explore different user roles.</p>
        </div> */}
        
        {/* Signup Link */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Don't have an organization account?{' '}
            <a href="/signup" className="text-emerald-600 hover:underline font-medium">
              Create one now
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 