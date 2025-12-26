import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';

type OrganizationRow = Database['public']['Tables']['organizations']['Row'];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  logoUrl?: string | null;
  settings: Record<string, any>;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  subscriptionExpiresAt?: string | null;
  maxUsers: number | null;
  maxProjects: number | null;
  isActive: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy?: string | null;
}

interface OrganizationContextType {
  organization: Organization | null;
  organizationId: string | null;
  loading: boolean;
  error: string | null;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganization = useCallback(async (orgId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .eq('isActive', true)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to load organization');
      }

      if (data) {
        // Map database row to Organization interface
        const row = data as OrganizationRow;
        const org: Organization = {
          id: row.id,
          name: row.name,
          slug: row.slug,
          domain: row.domain,
          logoUrl: row.logoUrl,
          settings: (row.settings as Record<string, any>) || {},
          subscriptionTier: row.subscriptionTier,
          subscriptionStatus: row.subscriptionStatus,
          subscriptionExpiresAt: row.subscriptionExpiresAt,
          maxUsers: row.maxUsers,
          maxProjects: row.maxProjects,
          isActive: row.isActive,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          createdBy: row.createdBy,
        };
        setOrganization(org);
      } else {
        setError('Organization not found');
        setOrganization(null);
      }
    } catch (err: any) {
      console.error('Error loading organization:', err);
      setError(err.message || 'Failed to load organization');
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load organization when user is available
  useEffect(() => {
    if (user?.organizationId) {
      loadOrganization(user.organizationId);
    } else if (user && !user.organizationId) {
      // User exists but has no organizationId - this shouldn't happen but handle gracefully
      console.warn('User has no organizationId');
      setError('User is not associated with an organization');
      setLoading(false);
    } else {
      // No user yet
      setLoading(false);
    }
  }, [user, loadOrganization]);

  const refreshOrganization = useCallback(async () => {
    if (user?.organizationId) {
      await loadOrganization(user.organizationId);
    }
  }, [user?.organizationId, loadOrganization]);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        organizationId: organization?.id || null,
        loading,
        error,
        refreshOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}

