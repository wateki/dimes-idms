import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { config } from '@/config/env';

export interface OrganizationSignupRequest {
  // Admin user info
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  
  // Organization info
  organizationName: string;
  organizationDomain?: string;
  subscriptionTier: 'free' | 'basic' | 'professional' | 'enterprise';
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
    
    // Set subscription limits based on tier
    const tierLimits: Record<string, { maxUsers: number; maxProjects: number }> = {
      free: { maxUsers: 5, maxProjects: 3 },
      basic: { maxUsers: 25, maxProjects: 20 },
      professional: { maxUsers: 100, maxProjects: -1 }, // -1 means unlimited
      enterprise: { maxUsers: -1, maxProjects: -1 },
    };

    const limits = tierLimits[request.subscriptionTier] || tierLimits.free;

    const organizationId = crypto.randomUUID();
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: organizationId,
        name: request.organizationName,
        slug: slug,
        domain: request.organizationDomain || null,
        subscriptionTier: request.subscriptionTier,
        subscriptionStatus: request.subscriptionTier === 'free' ? 'active' : 'trialing',
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

    // Note: User needs to confirm email before we can create profile
    // We'll handle profile creation in a separate endpoint after email confirmation

    // Return early - user needs to confirm email before we can create profile
    // Profile creation will happen after email confirmation via completeSignup
    return {
      organizationId: organization.id,
      userId: '', // Will be set after email confirmation
      authUserId: authUserId,
    };
  }

  /**
   * Complete organization signup after email confirmation
   * This should be called after the user confirms their email
   */
  async completeSignup(organizationId: string): Promise<OrganizationSignupResponse> {
    console.log('[Organization Signup] Completing signup for organization:', organizationId);

    // Get current authenticated user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      throw new Error('User not authenticated. Please confirm your email first.');
    }

    const authUserId = authUser.id;
    const userMetadata = authUser.user_metadata || {};
    const firstName = userMetadata.firstName || '';
    const lastName = userMetadata.lastName || '';

    console.log('[Organization Signup] Creating user profile for authenticated user:', authUserId);

    // Step 1: Verify organization exists and get it
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      throw new Error('Organization not found');
    }

    // Step 2: Check if user profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (existingProfile) {
      console.log('[Organization Signup] User profile already exists:', existingProfile.id);
      return {
        organizationId: organization.id,
        userId: existingProfile.id,
        authUserId: authUserId,
      };
    }

    // Step 3: Create user profile linked to organization
    console.log('[Organization Signup] Creating user profile...');
    const now = new Date().toISOString();
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        auth_user_id: authUserId,
        email: authUser.email || '',
        firstName: firstName,
        lastName: lastName,
        passwordHash: '', // Not used with Supabase Auth
        organizationid: organization.id,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['users']['Insert'])
      .select()
      .single();

    if (profileError || !userProfile) {
      console.error('[Organization Signup] Failed to create user profile:', profileError);
      // Clean up organization if profile creation fails
      try {
        await supabase.from('organizations').delete().eq('id', organization.id);
        console.log('[Organization Signup] Cleaned up organization after profile creation failure');
      } catch (cleanupError) {
        console.error('[Organization Signup] Failed to cleanup organization:', cleanupError);
      }
      throw new Error(profileError?.message || 'Failed to create user profile');
    }

    console.log('[Organization Signup] User profile created:', userProfile.id);

    // Step 6: Assign global admin role to the user
    console.log('[Organization Signup] Assigning global admin role...');
    // Get the global admin role for this organization
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'global-admin')
      .eq('organizationid', organization.id)
      .eq('isActive', true)
      .single();

    if (roleError || !adminRole) {
      console.warn('[Organization Signup] Global admin role not found, skipping role assignment');
      // Continue without role assignment - user can be assigned later
    } else {
      const { error: assignError } = await supabase
        .from('user_roles')
        .insert({
          id: crypto.randomUUID(),
          userId: userProfile.id,
          roleId: adminRole.id,
          organizationid: organization.id,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        } as unknown as Database['public']['Tables']['user_roles']['Insert']);

      if (assignError) {
        console.warn('[Organization Signup] Failed to assign admin role:', assignError);
        // Continue without role assignment - user can be assigned later
      } else {
        console.log('[Organization Signup] Admin role assigned successfully');
      }
    }

    // Step 4: Create subscription record if not free tier
    const subscriptionTier = organization.subscriptionTier || 'free';
    if (subscriptionTier !== 'free') {
      console.log('[Organization Signup] Creating subscription record...');
      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month trial

      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          id: crypto.randomUUID(),
          organizationId: organization.id,
          tier: subscriptionTier,
          status: 'trialing',
          currentPeriodStart: periodStart.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          createdAt: now,
          updatedAt: now,
        } as unknown as Database['public']['Tables']['subscriptions']['Insert']);

      if (subError) {
        console.warn('[Organization Signup] Failed to create subscription record:', subError);
        // Continue - subscription can be created later
      } else {
        console.log('[Organization Signup] Subscription record created');
      }
    }

    console.log('[Organization Signup] Organization signup completed successfully');

    return {
      organizationId: organization.id,
      userId: userProfile.id,
      authUserId: authUserId,
    };
  }
}

export const supabaseOrganizationSignupService = new SupabaseOrganizationSignupService();

