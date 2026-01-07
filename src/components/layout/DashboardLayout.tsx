import React from 'react';
import { Outlet } from 'react-router-dom';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { Header } from './Header';
import { ProSidebar } from "./ProSidebar";
import { useDashboard } from '@/contexts/DashboardContext';
import { OfflineSyncIndicator } from '../dashboard/OfflineSyncIndicator';
import { useTour } from '@/contexts/TourContext';

export function DashboardLayout() {
  const { sidebarOpen, setSidebarOpen } = useDashboard();
  const { run, steps, stepIndex, handleJoyrideCallback } = useTour();

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        callback={handleJoyrideCallback}
        continuous
        scrollToFirstStep
        showProgress
        showSkipButton
        disableScrolling={false}
        disableOverlayClose
        spotlightClicks
        floaterProps={{
          disableAnimation: true,
          hideArrow: false,
          offset: 15,
          placement: 'right',
          styles: {
            floater: {
              filter: 'none',
            },
          },
        }}
        styles={{
          options: {
            primaryColor: '#10b981',
            textColor: '#1f2937',
            backgroundColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            arrowColor: '#ffffff',
            zIndex: 10000,
            width: 380,
          },
          tooltip: {
            borderRadius: 12,
            padding: 20,
            maxWidth: 400,
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          tooltipContent: {
            padding: '10px 0',
          },
          buttonNext: {
            backgroundColor: '#10b981',
            fontSize: 14,
            padding: '10px 20px',
            borderRadius: 6,
            fontWeight: 500,
          },
          buttonBack: {
            color: '#6b7280',
            fontSize: 14,
            marginRight: 10,
          },
          buttonSkip: {
            color: '#6b7280',
            fontSize: 14,
          },
          spotlight: {
            borderRadius: 8,
          },
        }}
        locale={{
          back: 'Previous',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip Tour',
        }}
      />
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <ProSidebar />
      </div>
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 lg:p-8 w-full" data-tour="dashboard-overview">
          <OfflineSyncIndicator />
          <Outlet />
        </main>
      </div>
    </div>
    </>
  );
}