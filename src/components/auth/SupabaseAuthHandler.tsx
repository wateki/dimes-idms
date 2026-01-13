import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

/**
 * Component to handle Supabase authentication redirects from email confirmation links
 * Supabase redirects use hash fragments (#access_token=... or #error=...) instead of query params
 */
export function SupabaseAuthHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleHashFragment = async () => {
      // Check if there's a hash fragment in the URL
      const hash = window.location.hash;
      
      if (!hash) {
        return;
      }

      console.log('[Supabase Auth Handler] Processing hash fragment:', hash);

      // Parse hash fragment (format: #key=value&key2=value2)
      const hashParams = new URLSearchParams(hash.substring(1));
      
      // Check for error in hash
      const error = hashParams.get('error');
      const errorCode = hashParams.get('error_code');
      const errorDescription = hashParams.get('error_description');
      
      if (error) {
        console.error('[Supabase Auth Handler] Error from hash:', { error, errorCode, errorDescription });
        
        // Handle specific error cases
        if (errorCode === 'otp_expired' || error === 'access_denied') {
          // Link expired or invalid - redirect to signup with error message
          const errorMsg = errorDescription 
            ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
            : 'Email link is invalid or has expired. Please request a new confirmation email.';
          
          // Try to extract orgId from the current path or redirect to signup
          const currentPath = location.pathname;
          let redirectPath = '/signup';
          
          // If we're on the signup/complete page or root, try to preserve orgId
          if (currentPath === '/signup/complete' || currentPath === '/') {
            const searchParams = new URLSearchParams(location.search);
            const orgId = searchParams.get('orgId');
            if (orgId) {
              redirectPath = `/signup?error=expired&orgId=${orgId}&message=${encodeURIComponent(errorMsg)}`;
            } else {
              redirectPath = `/signup?error=expired&message=${encodeURIComponent(errorMsg)}`;
            }
          } else {
            redirectPath = `/signup?error=expired&message=${encodeURIComponent(errorMsg)}`;
          }
          
          // Clear the hash and redirect
          window.history.replaceState(null, '', redirectPath);
          navigate(redirectPath, { replace: true });
          return;
        }
        
        // For other errors, redirect to signup with error
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        navigate(`/signup?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || 'An error occurred')}`, { replace: true });
        return;
      }

      // Check for access_token (successful email confirmation or password reset)
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      // Handle password reset redirects
      if (accessToken && type === 'recovery') {
        console.log('[Supabase Auth Handler] Password reset link detected');
        
        // Set the session from the hash
        try {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });
          
          if (setSessionError) {
            console.error('[Supabase Auth Handler] Error setting session for password reset:', setSessionError);
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            navigate('/forgot-password?error=invalid_link', { replace: true });
            return;
          }
          
          // Clear the hash and redirect to reset password page
          window.history.replaceState(null, '', '/reset-password');
          navigate('/reset-password', { replace: true });
        } catch (err) {
          console.error('[Supabase Auth Handler] Error processing password reset:', err);
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          navigate('/forgot-password?error=reset_failed', { replace: true });
        }
        return;
      }
      
      if (accessToken && type === 'signup') {
        console.log('[Supabase Auth Handler] Email confirmation successful');
        
        // Exchange the hash for a session
        try {
          const { data, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('[Supabase Auth Handler] Error getting session:', sessionError);
            // Try to set the session from the hash
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || '',
            });
            
            if (setSessionError) {
              console.error('[Supabase Auth Handler] Error setting session:', setSessionError);
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              navigate('/signup?error=session_failed', { replace: true });
              return;
            }
          }
          
          // Get the user to check if email is confirmed
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user?.email_confirmed_at) {
            // Email is confirmed - check if we're on /signup/complete or root
            const currentPath = location.pathname;
            const searchParams = new URLSearchParams(location.search);
            let orgId = searchParams.get('orgId');
            
            // If on root path, try to get orgId from hash or redirect URL
            if (currentPath === '/' && !orgId) {
              // Try to extract orgId from the redirect URL if it was in the emailRedirectTo
              // The emailRedirectTo was: /signup/complete?orgId=${organizationId}
              // But Supabase might have redirected to root, so we need to check the session metadata
              const sessionData = await supabase.auth.getSession();
              if (sessionData.data?.session?.user?.user_metadata?.organizationId) {
                orgId = sessionData.data.session.user.user_metadata.organizationId;
              }
            }
            
            // Clear the hash
            const redirectPath = currentPath === '/' ? (orgId ? `/signup/complete?orgId=${orgId}` : '/signup?step=2') : (orgId ? `/signup/complete?orgId=${orgId}` : window.location.pathname + window.location.search);
            window.history.replaceState(null, '', redirectPath);
            
            if (currentPath === '/signup/complete' && orgId) {
              // Already on complete page, let it handle the redirect
              // Just refresh to trigger the completeSignup
              window.location.reload();
            } else if (orgId) {
              // Redirect to complete signup page
              navigate(`/signup/complete?orgId=${orgId}`, { replace: true });
            } else {
              // No orgId, redirect to signup step 2 (plan selection)
              navigate('/signup?step=2', { replace: true });
            }
          } else {
            // Email not confirmed yet, wait a bit and check again
            setTimeout(async () => {
              const { data: { user: retryUser } } = await supabase.auth.getUser();
              if (retryUser?.email_confirmed_at) {
                const searchParams = new URLSearchParams(location.search);
                let orgId = searchParams.get('orgId');
                
                // Try to get orgId from user metadata if not in URL
                if (!orgId) {
                  const sessionData = await supabase.auth.getSession();
                  if (sessionData.data?.session?.user?.user_metadata?.organizationId) {
                    orgId = sessionData.data.session.user.user_metadata.organizationId;
                  }
                }
                
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                if (orgId) {
                  navigate(`/signup/complete?orgId=${orgId}`, { replace: true });
                } else {
                  navigate('/signup?step=2', { replace: true });
                }
              }
            }, 1000);
          }
        } catch (err) {
          console.error('[Supabase Auth Handler] Error processing confirmation:', err);
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          navigate('/signup?error=confirmation_failed', { replace: true });
        }
      }
    };

    handleHashFragment();
  }, [navigate, location]);

  return null; // This component doesn't render anything
}
