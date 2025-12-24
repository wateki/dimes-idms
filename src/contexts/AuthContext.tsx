import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '@/types/dashboard';
import { authAPI } from '@/lib/api/auth';
import type { Session } from '@supabase/supabase-js';
import { userProfileCache } from '@/services/userProfileCache';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isRefreshing: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: (preserveCurrentUrl?: boolean) => void;
  updateProfile: (updates: Partial<User>) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

interface LoginResult {
  success: boolean;
  error?: string;
  user?: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use ref to access current session in event listeners without causing re-renders
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  // Inactivity timer ref - stores the timeout ID
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Logout ref - will be set after logout function is defined
  const logoutRef = useRef<((preserveCurrentUrl?: boolean) => void) | null>(null);
  
  // Track if we're currently refreshing the session to prevent race conditions
  const isRefreshingRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Track the last known valid session to prevent clearing during temporary refresh failures
  const lastValidSessionRef = useRef<Session | null>(null);
  // Debounce timer for session validation failures
  const sessionValidationTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track last session refresh time to prevent excessive refreshes
  const lastRefreshTimeRef = useRef<number>(0);
  const SESSION_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

  const isAuthenticated = !!user && !!session;

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
    
    // Listen to auth state changes
    const { data: { subscription } } = authAPI.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session) {
        setSession(session);
        lastValidSessionRef.current = session;
        lastRefreshTimeRef.current = Date.now();
        // Fetch user profile and cache it
        try {
          const userProfile = await authAPI.getProfile();
          setUser(userProfile);
          // Update cache
          if (userProfile?.organizationId && session.user?.id) {
            userProfileCache.setCache(userProfile, userProfile.organizationId, session.user.id);
          }
        } catch (error) {
          console.error('Error fetching user profile after sign in:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        lastValidSessionRef.current = null;
        lastRefreshTimeRef.current = 0;
        // Clear cache on logout
        userProfileCache.clearCache();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session);
        lastValidSessionRef.current = session;
        lastRefreshTimeRef.current = Date.now();
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Refresh session periodically (every 15 minutes) and on visibility change (only if 15 min passed)
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const refreshSessionIfNeeded = async () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
      
      // Only refresh if 15 minutes have passed since last refresh
      if (timeSinceLastRefresh < SESSION_REFRESH_INTERVAL) {
        console.log(`AuthContext - Skipping refresh, only ${Math.round(timeSinceLastRefresh / 1000)}s since last refresh`);
        return;
      }

      if (isRefreshingRef.current) {
        return;
      }

      console.log('AuthContext - Refreshing session (15 min interval)');
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      lastRefreshTimeRef.current = now;
      
      try {
        // Refresh session by getting current session (Supabase handles refresh automatically)
        const currentSession = await authAPI.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          lastValidSessionRef.current = currentSession;
          
          // Verify user profile is still valid
          try {
            const userProfile = await authAPI.getProfile();
            setUser(userProfile);
          } catch (error) {
            console.error('AuthContext - Error refreshing user profile:', error);
            // Don't clear session if profile fetch fails - might be temporary network issue
          }
        } else {
          // Session not found - check if we had a valid session before
          if (lastValidSessionRef.current) {
            console.log('AuthContext - Session temporarily unavailable, restoring last valid session');
            // Restore the last valid session while we wait for refresh
            setSession(lastValidSessionRef.current);
            
            // Keep the last valid session for a short period to allow for network delays
            // Only clear if session is still invalid after a delay
            if (sessionValidationTimerRef.current) {
              clearTimeout(sessionValidationTimerRef.current);
            }
            
            sessionValidationTimerRef.current = setTimeout(async () => {
              // Re-check session after delay
              const recheckSession = await authAPI.getSession();
              if (!recheckSession) {
                console.log('AuthContext - Session still invalid after delay, clearing');
                setSession(null);
                setUser(null);
                lastValidSessionRef.current = null;
              } else {
                console.log('AuthContext - Session restored after delay');
                setSession(recheckSession);
                lastValidSessionRef.current = recheckSession;
                // Refresh user profile
                try {
                  const userProfile = await authAPI.getProfile();
                  setUser(userProfile);
                } catch (error) {
                  console.error('AuthContext - Error refreshing user profile after delay:', error);
                }
              }
              isRefreshingRef.current = false;
              setIsRefreshing(false);
            }, 2000); // Wait 2 seconds before clearing
          } else {
            // No previous valid session, clear immediately
            setSession(null);
            setUser(null);
            isRefreshingRef.current = false;
            setIsRefreshing(false);
          }
        }
      } catch (error) {
        console.error('AuthContext - Error refreshing session:', error);
        // On error, keep existing session if we had one
        if (!lastValidSessionRef.current && session) {
          lastValidSessionRef.current = session;
        }
      } finally {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }
    };

    // Handle visibility change - only refresh if 15 minutes have passed
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSessionIfNeeded();
      }
    };

    // Set up periodic refresh every 15 minutes
    const intervalId = setInterval(() => {
      refreshSessionIfNeeded();
    }, SESSION_REFRESH_INTERVAL);

    // Also check on visibility change (but will be throttled by refreshSessionIfNeeded)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sessionValidationTimerRef.current) {
        clearTimeout(sessionValidationTimerRef.current);
      }
    };
  }, [isAuthenticated]);

  // Auto-refresh session handling is done by Supabase Auth automatically

  // Inactivity detection - auto logout after 1 hour of inactivity
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear any existing timer if user is not authenticated
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    // Inactivity timeout: 1 hour (3600000 milliseconds)
    const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour

    // Function to reset the inactivity timer
    const resetInactivityTimer = () => {
      // Clear existing timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      // Set new timer
      inactivityTimerRef.current = setTimeout(() => {
        console.log('AuthContext - Inactivity timeout reached, logging out user');
        if (logoutRef.current) {
          logoutRef.current(true); // Preserve current URL for redirect
        }
      }, INACTIVITY_TIMEOUT);
    };

    // Initial timer setup
    resetInactivityTimer();

    // Events that indicate user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ];

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    // Cleanup function
    return () => {
      // Clear timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      // Remove event listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [isAuthenticated]); // Only run when authentication state changes

  const initializeAuth = async () => {
    console.log('AuthContext - initializeAuth called');
    
    try {
      // Get current session
      const currentSession = await authAPI.getSession();
      console.log('AuthContext - currentSession found:', !!currentSession);
      
      if (currentSession) {
        setSession(currentSession);
        lastValidSessionRef.current = currentSession;
        lastRefreshTimeRef.current = Date.now(); // Track initialization as refresh
        // Fetch user profile and cache it
        try {
          const userProfile = await authAPI.getProfile();
          console.log('AuthContext - user profile loaded, setting user and session');
          setUser(userProfile);
          // Update cache
          if (userProfile?.organizationId && currentSession.user?.id) {
            userProfileCache.setCache(userProfile, userProfile.organizationId, currentSession.user.id);
          }
        } catch (error) {
          console.error('AuthContext - Error fetching user profile:', error);
          // Session exists but profile fetch failed - only clear if it's a persistent error
          // Give it a retry first
          try {
            // Retry once after a short delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryProfile = await authAPI.getProfile();
            if (retryProfile) {
              setUser(retryProfile);
              // Update cache on retry success
              if (retryProfile?.organizationId && currentSession.user?.id) {
                userProfileCache.setCache(retryProfile, retryProfile.organizationId, currentSession.user.id);
              }
            } else {
              // Still failed, clear session and cache
              await authAPI.logout();
              setSession(null);
              setUser(null);
              userProfileCache.clearCache();
              lastValidSessionRef.current = null;
            }
          } catch (retryError) {
            console.error('AuthContext - Retry also failed, clearing session');
            await authAPI.logout();
            setSession(null);
            setUser(null);
            lastValidSessionRef.current = null;
          }
        }
      } else {
        // No session found - clear state
        setSession(null);
        setUser(null);
        lastValidSessionRef.current = null;
      }
    } catch (error) {
      console.error('AuthContext - Error initializing auth:', error);
      // On error, don't clear existing session if we had one
      // This prevents clearing valid sessions due to temporary network issues
    } finally {
      console.log('AuthContext - setting loading to false');
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setIsLoading(true);
    
    try {
      const result = await authAPI.login(email, password);
      
      if (result.success && result.data) {
        const { session: newSession, user: userProfile } = result.data;
        
        setSession(newSession);
        setUser(userProfile);
        
        return { success: true, user: userProfile };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed. Please try again.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (preserveCurrentUrl = false) => {
    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    // Sign out from Supabase
    authAPI.logout().catch(console.error);
    
    // Clear local state
    setSession(null);
    setUser(null);
    
    // If we want to preserve the current URL for redirect after login
    if (preserveCurrentUrl && typeof window !== 'undefined') {
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl !== '/login') {
        window.location.href = `/login?next=${encodeURIComponent(currentUrl)}`;
        return;
      }
    }
    
    // Default behavior: redirect to login without next parameter
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  // Update logout ref after logout function is defined
  logoutRef.current = logout;

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    try {
      const updatedUser = await authAPI.updateProfile(updates);
      setUser(updatedUser);
      // Refresh cache with updated profile
      if (updatedUser?.organizationId && session?.user?.id) {
        userProfileCache.setCache(updatedUser, updatedUser.organizationId, session.user.id);
      }
      return updatedUser;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await authAPI.changePassword(currentPassword, newPassword);
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated,
      isRefreshing,
      login,
      logout,
      updateProfile,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
