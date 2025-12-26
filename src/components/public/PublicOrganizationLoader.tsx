import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Organization } from '@/contexts/OrganizationContext';
import type { Database } from '@/types/supabase';

type OrganizationRow = Database['public']['Tables']['organizations']['Row'];

interface PublicOrganizationContextType {
  organization: Organization | null;
  loading: boolean;
  error: string | null;
}

const PublicOrganizationContext = createContext<PublicOrganizationContextType | undefined>(undefined);

interface PublicOrganizationLoaderProps {
  organizationId: string;
  children: ReactNode;
}

/**
 * Public organization loader that can fetch organization data without authentication
 * Used for public pages like feedback submission
 */
export function PublicOrganizationLoader({ organizationId, children }: PublicOrganizationLoaderProps) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrganization = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .eq('isActive', true)
          .single();

        if (fetchError) {
          throw new Error(fetchError.message || 'Failed to load organization');
        }

        if (data) {
          const row = data as OrganizationRow;
          const org: Organization = {
            id: row.id,
            name: row.name,
            slug: row.slug,
            domain: row.domain ?? null,
            logoUrl: row.logoUrl ?? null,
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
    };

    if (organizationId) {
      loadOrganization();
    } else {
      setError('Organization ID is required');
      setLoading(false);
    }
  }, [organizationId]);

  const value: PublicOrganizationContextType = {
    organization,
    loading,
    error,
  };

  return (
    <PublicOrganizationContext.Provider value={value}>
      {children}
    </PublicOrganizationContext.Provider>
  );
}

export function usePublicOrganization(): PublicOrganizationContextType {
  const context = useContext(PublicOrganizationContext);
  if (!context) {
    throw new Error('usePublicOrganization must be used within PublicOrganizationLoader');
  }
  return context;
}

