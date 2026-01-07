import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { config } from '@/config/env';

/**
 * Check if an email is already registered in Supabase Auth
 */
async function checkEmailExists(email: string): Promise<boolean> {
  console.log(`[Organization Signup] Checking if email exists: ${email}`);
  
  const edgeFunctionUrl = `${config.SUPABASE_URL}/functions/v1/check-email`;
  console.log(`[Organization Signup] Calling edge function: ${edgeFunctionUrl}`);

  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    console.error(`[Organization Signup] Edge function returned error: ${response.status} ${response.statusText}`);
    const errorText = await response.text();
    console.error(`[Organization Signup] Error response:`, errorText);
    throw new Error('Failed to check email existence. Please try again.');
  }

  const result = await response.json();
  
  // Validate response structure
  if (typeof result.exists !== 'boolean') {
    console.error(`[Organization Signup] Invalid response format:`, result);
    throw new Error('Invalid response from email check service. Please try again.');
  }
  
  console.log(`[Organization Signup] Email check result: exists=${result.exists}`);
  
  return result.exists === true;
}

export interface OrganizationSignupRequest {
  // Admin user info
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  
  // Organization info
  organizationName: string;
  organizationDomain?: string;
  subscriptionTier?: 'free' | 'basic' | 'professional' | 'enterprise'; // Optional, defaults to 'free'
}

export interface OrganizationSignupResponse {
  organizationId: string;
  userId: string;
  authUserId: string;
}

/**
 * Generate a URL-friendly slug from organization name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Check if a slug is already taken
 */
async function isSlugAvailable(slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error && error.code === 'PGRST116') {
    // No rows returned - slug is available
    return true;
  }

  return !data; // Return false if data exists (slug is taken)
}

/**
 * Generate a unique slug by appending numbers if needed
 */
async function generateUniqueSlug(baseName: string): Promise<string> {
  let baseSlug = generateSlug(baseName);
  let slug = baseSlug;
  let counter = 1;

  while (!(await isSlugAvailable(slug))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

class SupabaseOrganizationSignupService {
  /**
   * Check if an email is already registered
   */
  async checkEmailExists(email: string): Promise<boolean> {
    return checkEmailExists(email);
  }

  /**
   * Sign up a new organization with an admin user
   */
  async signupOrganization(request: OrganizationSignupRequest): Promise<OrganizationSignupResponse> {
    console.log('[Organization Signup] Starting organization signup:', { email: request.email, organizationName: request.organizationName });

    // Step 1: Generate unique slug
    console.log('[Organization Signup] Generating unique slug...');
    const slug = await generateUniqueSlug(request.organizationName);
    console.log('[Organization Signup] Generated slug:', slug);

    // Step 2: Create organization first (before user, so we can link user to org)
    console.log('[Organization Signup] Creating organization...');
    const now = new Date().toISOString();
    
    // Default to free tier if not specified
    const subscriptionTier = request.subscriptionTier || 'free';
    
    // Set subscription limits based on tier
    const tierLimits: Record<string, { maxUsers: number; maxProjects: number }> = {
      free: { maxUsers: 5, maxProjects: 3 },
      basic: { maxUsers: 25, maxProjects: 20 },
      professional: { maxUsers: 100, maxProjects: -1 }, // -1 means unlimited
      enterprise: { maxUsers: -1, maxProjects: -1 },
    };

    const limits = tierLimits[subscriptionTier] || tierLimits.free;

    const organizationId = crypto.randomUUID();
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: organizationId,
        name: request.organizationName,
        slug: slug,
        domain: request.organizationDomain || null,
        subscriptionTier: subscriptionTier, // Always start with free, can be updated later
        subscriptionStatus: 'active', // Always active for free tier initially
        maxUsers: limits.maxUsers,
        maxProjects: limits.maxProjects === -1 ? null : limits.maxProjects,
        isActive: true,
        settings: {},
        createdAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['organizations']['Insert'])
      .select()
      .single();

    if (orgError || !organization) {
      console.error('[Organization Signup] Failed to create organization:', orgError);
      throw new Error(orgError?.message || 'Failed to create organization');
    }

    console.log('[Organization Signup] Organization created:', organization.id);

    // Step 3: Create auth user via signUp
    console.log('[Organization Signup] Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: request.email,
      password: request.password,
      options: {
        data: {
          firstName: request.firstName,
          lastName: request.lastName,
          organizationId: organizationId, // Store org ID in metadata for linking later
        },
        emailRedirectTo: `${window.location.origin}/signup/complete?orgId=${organizationId}`,
        // Note: Also ensure this URL is added to Supabase Auth > URL Configuration > Redirect URLs
      },
    });

    if (authError) {
      console.error('[Organization Signup] Failed to create auth user:', authError);
      // Clean up organization if auth creation fails
      try {
        await supabase.from('organizations').delete().eq('id', organizationId);
        console.log('[Organization Signup] Cleaned up organization after auth creation failure');
      } catch (cleanupError) {
        console.error('[Organization Signup] Failed to cleanup organization:', cleanupError);
      }
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    if (!authData.user) {
      // Clean up organization if no user returned
      try {
        await supabase.from('organizations').delete().eq('id', organizationId);
      } catch (cleanupError) {
        console.error('[Organization Signup] Failed to cleanup organization:', cleanupError);
      }
      throw new Error('Failed to create auth user: No user returned');
    }

    const authUserId = authData.user.id;
    console.log('[Organization Signup] Auth user created:', authUserId);

    // Note: User profile will be created after email confirmation via edge function
    // This is called in completeSignup after the user confirms their email

    // Return with organization and auth user created
    // Profile and role assignment will happen after email confirmation
    return {
      organizationId: organization.id,
      userId: '', // Will be set after email confirmation
      authUserId: authUserId,
    };
  }

  /**
   * Complete organization signup after email confirmation
   * This calls the edge function to create the user profile
   */
  async completeSignup(organizationId: string): Promise<OrganizationSignupResponse> {
    console.log('[Organization Signup] Completing signup for organization:', organizationId);

    // Get current authenticated user
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      throw new Error('User not authenticated. Please confirm your email first.');
    }

    const authUserId = authUser.id;
    console.log('[Organization Signup] User authenticated:', authUserId);

    // Get session token for the edge function
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No session available. Please try logging in again.');
    }

    // Call edge function to create user profile
    const edgeFunctionUrl = `${config.SUPABASE_URL}/functions/v1/create-user-profile`;
    console.log('[Organization Signup] Calling edge function to create user profile...');

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': config.SUPABASE_ANON_KEY || '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Organization Signup] Edge function returned error:', response.status, errorText);
      let errorMessage = 'Failed to create user profile. Please try again.';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('[Organization Signup] Edge function response:', result);

    if (!result.success) {
      throw new Error(result.error || 'Failed to create user profile');
    }

    console.log('[Organization Signup] User profile created successfully');

    return {
      organizationId: result.organizationId || organizationId,
      userId: result.userId,
      authUserId: authUserId,
    };
  }

  /**
   * Update organization subscription tier
   * Can be called during signup before user is fully authenticated
   */
  async updateOrganizationSubscriptionTier(organizationId: string, subscriptionTier: 'free' | 'basic' | 'professional' | 'enterprise'): Promise<void> {
    console.log('[Organization Signup] Updating organization subscription tier:', { organizationId, subscriptionTier });

    // Set subscription limits based on tier
    const tierLimits: Record<string, { maxUsers: number; maxProjects: number }> = {
      free: { maxUsers: 5, maxProjects: 3 },
      basic: { maxUsers: 25, maxProjects: 20 },
      professional: { maxUsers: 100, maxProjects: -1 }, // -1 means unlimited
      enterprise: { maxUsers: -1, maxProjects: -1 },
    };

    const limits = tierLimits[subscriptionTier] || tierLimits.free;

    // Calculate expiration date: 14 days from now for free plan
    let subscriptionExpiresAt: string | null = null;
    if (subscriptionTier === 'free') {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 14);
      subscriptionExpiresAt = expirationDate.toISOString();
      console.log('[Organization Signup] Setting free plan expiration date to:', subscriptionExpiresAt);
    }

    const updateData: any = {
      subscriptionTier: subscriptionTier,
      subscriptionStatus: subscriptionTier === 'free' ? 'active' : 'trialing',
      maxUsers: limits.maxUsers,
      maxProjects: limits.maxProjects === -1 ? null : limits.maxProjects,
      updatedAt: new Date().toISOString(),
    };

    // Only set expiration date for free plan
    if (subscriptionExpiresAt) {
      updateData.subscriptionExpiresAt = subscriptionExpiresAt;
    }

    const { error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId);

    if (error) {
      console.error('[Organization Signup] Failed to update subscription tier:', error);
      throw new Error(error.message || 'Failed to update subscription tier');
    }

    console.log('[Organization Signup] Subscription tier updated successfully');
  }
}

export const supabaseOrganizationSignupService = new SupabaseOrganizationSignupService();

