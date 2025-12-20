/**
 * Script to create default admin user
 * 
 * Usage:
 * 1. Set SUPABASE_SERVICE_ROLE_KEY in your environment or .env file
 * 2. Run: node scripts/create-admin.js
 * 
 * Or run with inline env:
 * SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/create-admin.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env file if it exists
try {
  const envPath = join(__dirname, '..', '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (e) {
  // .env file doesn't exist, that's okay
}

// Get Supabase URL from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing VITE_SUPABASE_URL');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Get it from: Supabase Dashboard > Project Settings > API > service_role key');
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
      email_confirm: true,
      user_metadata: {
        first_name: ADMIN_FIRST_NAME,
        last_name: ADMIN_LAST_NAME,
      }
    });

    let authUserId;

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
        console.log('⚠️  User already exists in Auth, fetching existing user...');
        const { data: existingUser } = await supabase.auth.admin.getUserByEmail(ADMIN_EMAIL);
        if (existingUser?.user) {
          authUserId = existingUser.user.id;
          console.log('✅ Found existing auth user:', authUserId);
        } else {
          throw new Error('User exists but could not be retrieved: ' + authError.message);
        }
      } else {
        throw authError;
      }
    } else {
      authUserId = authData.user.id;
      console.log('✅ Auth user created:', authUserId);
    }

    // Step 2: Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id, auth_user_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    let userId;

    if (existingProfile) {
      console.log('⚠️  Profile already exists, updating...');
      userId = existingProfile.id;
      
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
      console.log('✅ Profile updated');
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

    // Step 4: Get global-admin role
    console.log('🔑 Setting up admin role...');
    let { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'global-admin')
      .maybeSingle();

    if (roleError && roleError.code !== 'PGRST116') {
      throw roleError;
    }

    if (!roleData) {
      // Create global-admin role if it doesn't exist
      const { data: newRole, error: createRoleError } = await supabase
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

      if (createRoleError) {
        throw createRoleError;
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
      .maybeSingle();

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

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message || error);
    if (error.details) {
      console.error('   Details:', error.details);
    }
    process.exit(1);
  }
}

createAdminUser();

