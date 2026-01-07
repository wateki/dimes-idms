import React from 'react';
import { Menu, Bell, WifiOff, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from './Breadcrumbs';
import { ProjectSwitcher } from './ProjectSwitcher';
import { UserMenu } from './UserMenu';
import { useDashboard } from '@/contexts/DashboardContext';
import { useContext } from 'react';
import { FormContext } from '@/contexts/FormContext';
import { useTour } from '@/contexts/TourContext';

export function Header() {
  const { setSidebarOpen } = useDashboard();
  const { startTour } = useTour();
  
  // Safely access FormContext - it might not be available in all layouts
  const formContext = useContext(FormContext);
  const isOnline = formContext?.isOnline ?? true;
  const syncStatus = formContext?.syncStatus ?? { 
    pendingItems: 0, 
    isSyncing: false, 
    failedItems: 0, 
    lastSyncTime: null, 
    syncProgress: 0 
  };

  return (
    <header className="bg-background border-b border-border">
      <div className="flex items-center justify-between p-4">
        {/* Left side - Menu button and breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </Button>
          
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
          </div>
        </div>
        
        {/* Right side - Notifications and user menu */}
        <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
          {/* Offline indicator */}
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-xs">
              <WifiOff className="h-3 w-3" />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}
          
          {/* Pending sync indicator */}
          {isOnline && syncStatus.pendingItems > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
              <span>{syncStatus.pendingItems} pending</span>
            </div>
          )}
          
          {/* Help/Tour button */}
          <button 
            type="button"
            className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            onClick={startTour}
            title="Start guided tour"
          >
            <span className="text-sm">❔</span>
          </button>
          
          {/* Notification button */}
          <button 
            type="button"
            className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <span className="text-sm">🔔</span>
          </button>
          
          <UserMenu />
        </div>
      </div>
    </header>
  );
}