import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '@/types/dashboard';
import { authAPI } from '@/lib/api/auth';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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

  const isAuthenticated = !!user && !!session;

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
    
    // Listen to auth state changes
    const { data: { subscription } } = authAPI.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session) {
        setSession(session);
        // Fetch user profile
        try {
          const userProfile = await authAPI.getProfile();
          setUser(userProfile);
        } catch (error) {
          console.error('Error fetching user profile after sign in:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
        // Fetch user profile
        try {
          const userProfile = await authAPI.getProfile();
          console.log('AuthContext - user profile loaded, setting user and session');
          setUser(userProfile);
        } catch (error) {
          console.error('AuthContext - Error fetching user profile:', error);
          // Session exists but profile fetch failed - clear session
          await authAPI.logout();
          setSession(null);
        }
      }
    } catch (error) {
      console.error('AuthContext - Error initializing auth:', error);
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
