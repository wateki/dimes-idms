import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to detect if this is a first-time user
 * A first-time user is someone who has never completed the tour
 */
export function useFirstTimeUser() {
  const { user, isAuthenticated } = useAuth();
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if user has completed the tour
      const tourCompleted = localStorage.getItem(`tour_completed_${user.id}`);
      const isFirst = !tourCompleted;
      
      setIsFirstTime(isFirst);
      setChecked(true);
      
      console.log('[First Time User] Check result:', {
        userId: user.id,
        tourCompleted,
        isFirstTime: isFirst,
      });
    }
  }, [isAuthenticated, user]);

  const markTourCompleted = () => {
    if (user) {
      localStorage.setItem(`tour_completed_${user.id}`, 'true');
      setIsFirstTime(false);
    }
  };

  return { isFirstTime, checked, markTourCompleted };
}
