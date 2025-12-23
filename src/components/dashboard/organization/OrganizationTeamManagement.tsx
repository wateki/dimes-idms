import React from 'react';
import { UserManagement } from '@/components/dashboard/UserManagement';

/**
 * Organization Team Management Component
 * 
 * This component wraps the existing UserManagement component
 * which already filters users by organizationId through the service layer.
 * No additional changes needed as the service handles organization scoping.
 */
export function OrganizationTeamManagement() {
  return (
    <div className="p-6">
      
      <UserManagement />
    </div>
  );
}
