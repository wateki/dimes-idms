-- Seed script for default admin user
-- This creates the profile in public.users
-- You'll need to create the Supabase Auth user separately and then link them

-- First, ensure we have the global-admin role
DO $$
DECLARE
  admin_role_id TEXT;
BEGIN
  -- Check if global-admin role exists, if not create it
  SELECT id INTO admin_role_id FROM roles WHERE name = 'global-admin' LIMIT 1;
  
  IF admin_role_id IS NULL THEN
    -- Create global-admin role if it doesn't exist
    INSERT INTO roles (id, name, description, level, "isActive", "createdAt", "updatedAt")
    VALUES (
      'admin_role_' || gen_random_uuid()::text,
      'global-admin',
      'Global Administrator with full system access',
      1,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO admin_role_id;
  END IF;
  
  RAISE NOTICE 'Admin role ID: %', admin_role_id;
END $$;

-- Note: To complete the setup:
-- 1. Create a user in Supabase Auth dashboard (Authentication > Users > Add User)
--    - Email: admin@icsafrica.org
--    - Password: admin123 (or your preferred password)
--    - Auto Confirm: Yes
-- 2. After creating the auth user, note the auth user ID (UUID)
-- 3. Run the following SQL to create the profile and link it:
--
-- INSERT INTO users (
--   id,
--   email,
--   "firstName",
--   "lastName",
--   "passwordHash",
--   "isActive",
--   "auth_user_id",
--   "createdAt",
--   "updatedAt"
-- ) VALUES (
--   gen_random_uuid()::text,
--   'admin@icsafrica.org',
--   'Admin',
--   'User',
--   '', -- passwordHash not needed when using Supabase Auth
--   true,
--   '<AUTH_USER_ID_FROM_STEP_2>', -- Replace with actual auth user ID
--   NOW(),
--   NOW()
-- );
--
-- 4. Then assign the global-admin role:
--
-- INSERT INTO user_roles (
--   id,
--   "userId",
--   "roleId",
--   "isActive",
--   "createdAt",
--   "updatedAt"
-- )
-- SELECT
--   gen_random_uuid()::text,
--   u.id,
--   r.id,
--   true,
--   NOW(),
--   NOW()
-- FROM users u
-- CROSS JOIN roles r
-- WHERE u.email = 'admin@icsafrica.org'
--   AND r.name = 'global-admin';

