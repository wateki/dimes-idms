/**
 * Script to create a default admin user
 * 
 * This script:
 * 1. Creates a user in Supabase Auth
 * 2. Creates a profile in public.users linked via auth_user_id
 * 3. Assigns the global-admin role
 * 
 * Run with: npx tsx scripts/create-admin-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../src/config/env';

const supabaseUrl = config.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to set this

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const ADMIN_EMAIL = 'admin@icsafrica.org';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_FIRST_NAME = 'Admin';
const ADMIN_LAST_NAME = 'User';

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user in Supabase Auth...');
    
    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: ADMIN_FIRST_NAME,
        last_name: ADMIN_LAST_NAME,
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      // If user already exists, try to get it
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists in Auth, fetching existing user...');
        const { data: existingUser } = await supabase.auth.admin.getUserByEmail(ADMIN_EMAIL);
        if (existingUser?.user) {
          authData.user = existingUser.user;
        } else {
          throw authError;
        }
      } else {
        throw authError;
      }
    }

    if (!authData.user) {
      throw new Error('Failed to create or retrieve auth user');
    }

    const authUserId = authData.user.id;
    console.log('✅ Auth user created/found:', authUserId);

    // Step 2: Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id, auth_user_id')
      .eq('auth_user_id', authUserId)
      .single();

    let userId: string;

    if (existingProfile) {
      console.log('⚠️  Profile already exists, updating...');
      userId = existingProfile.id;
      
      // Update existing profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email: ADMIN_EMAIL,
          firstName: ADMIN_FIRST_NAME,
          lastName: ADMIN_LAST_NAME,
          isActive: true,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Step 3: Create profile in public.users
      console.log('👤 Creating user profile...');
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          email: ADMIN_EMAIL,
          firstName: ADMIN_FIRST_NAME,
          lastName: ADMIN_LAST_NAME,
          passwordHash: '', // Not needed with Supabase Auth
          isActive: true,
          auth_user_id: authUserId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (profileError) {
        throw profileError;
      }

      userId = profileData.id;
      console.log('✅ Profile created:', userId);
    }

    // Step 4: Get or create global-admin role
    console.log('🔑 Setting up admin role...');
    let { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'global-admin')
      .single();

    if (!roleData) {
      // Create global-admin role if it doesn't exist
      const { data: newRole, error: roleError } = await supabase
        .from('roles')
        .insert({
          name: 'global-admin',
          description: 'Global Administrator with full system access',
          level: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (roleError) {
        throw roleError;
      }
      roleData = newRole;
      console.log('✅ Created global-admin role');
    }

    const roleId = roleData.id;

    // Step 5: Assign global-admin role to user
    const { data: existingUserRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('userId', userId)
      .eq('roleId', roleId)
      .single();

    if (!existingUserRole) {
      const { error: userRoleError } = await supabase
        .from('user_roles')
        .insert({
          userId: userId,
          roleId: roleId,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      if (userRoleError) {
        throw userRoleError;
      }
      console.log('✅ Assigned global-admin role to user');
    } else {
      console.log('⚠️  User already has global-admin role');
    }

    console.log('\n🎉 Admin user setup complete!');
    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n⚠️  Please change the password after first login!');

  } catch (error: any) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();

