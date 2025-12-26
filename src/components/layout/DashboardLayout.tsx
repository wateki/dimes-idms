import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { ProSidebar } from "./ProSidebar";
import { useDashboard } from '@/contexts/DashboardContext';
import { OfflineSyncIndicator } from '../dashboard/OfflineSyncIndicator';

export function DashboardLayout() {
  const { sidebarOpen, setSidebarOpen } = useDashboard();

  return (
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
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 lg:p-8 w-full">
          <OfflineSyncIndicator />
          <Outlet />
        </main>
      </div>
    </div>
  );
}