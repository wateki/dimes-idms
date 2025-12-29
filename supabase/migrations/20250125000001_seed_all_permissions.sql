-- Seed all system permissions
-- This migration seeds all permissions that will be managed via UI
-- Global-admin users automatically get access to all projects in their organization
-- (handled in application logic, not via user_project_access seeding)

-- Note: Forms, Kobo, and Permissions permissions are already seeded via other migrations
-- This migration adds the remaining permissions from auth-seed.ts

-- User Management Permissions
INSERT INTO "public"."permissions" ("id", "name", "description", "resource", "action", "scope", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'users:create', 'Create users', 'users', 'create', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'users:read', 'Read users', 'users', 'read', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'users:update', 'Update users', 'users', 'update', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'users:delete', 'Delete users', 'users', 'delete', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'users:read-own', 'Read own user data', 'users', 'read', 'own', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'users:update-own', 'Update own user data', 'users', 'update', 'own', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'users:create-project', 'Create users within project scope', 'users', 'create', 'project', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'users:read-project', 'Read users within project scope', 'users', 'read', 'project', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'users:update-project', 'Update users within project scope', 'users', 'update', 'project', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'users:delete-project', 'Delete users within project scope', 'users', 'delete', 'project', true, NOW(), NOW())
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "resource" = EXCLUDED."resource",
  "action" = EXCLUDED."action",
  "scope" = EXCLUDED."scope",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Project Management Permissions
INSERT INTO "public"."permissions" ("id", "name", "description", "resource", "action", "scope", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'projects:create', 'Create projects', 'projects', 'create', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'projects:read', 'Read projects', 'projects', 'read', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'projects:update', 'Update projects', 'projects', 'update', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'projects:delete', 'Delete projects', 'projects', 'delete', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'projects:read-regional', 'Read regional projects', 'projects', 'read', 'regional', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'projects:update-regional', 'Update regional projects', 'projects', 'update', 'regional', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'projects:read-project', 'Read project data', 'projects', 'read', 'project', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'projects:update-project', 'Update project data', 'projects', 'update', 'project', true, NOW(), NOW())
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "resource" = EXCLUDED."resource",
  "action" = EXCLUDED."action",
  "scope" = EXCLUDED."scope",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Finance Management Permissions
INSERT INTO "public"."permissions" ("id", "name", "description", "resource", "action", "scope", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'finance:read', 'Read finance data', 'finance', 'read', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'finance:update', 'Update finance data', 'finance', 'update', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'finance:read-regional', 'Read regional finance data', 'finance', 'read', 'regional', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'finance:update-regional', 'Update regional finance data', 'finance', 'update', 'regional', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'finance:read-project', 'Read project finance data', 'finance', 'read', 'project', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'finance:update-project', 'Update project finance data', 'finance', 'update', 'project', true, NOW(), NOW())
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "resource" = EXCLUDED."resource",
  "action" = EXCLUDED."action",
  "scope" = EXCLUDED."scope",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- KPI Management Permissions
INSERT INTO "public"."permissions" ("id", "name", "description", "resource", "action", "scope", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'kpis:read', 'Read KPIs', 'kpis', 'read', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'kpis:update', 'Update KPIs', 'kpis', 'update', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'kpis:read-regional', 'Read regional KPIs', 'kpis', 'read', 'regional', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'kpis:update-regional', 'Update regional KPIs', 'kpis', 'update', 'regional', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'kpis:read-project', 'Read project KPIs', 'kpis', 'read', 'project', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'kpis:update-project', 'Update project KPIs', 'kpis', 'update', 'project', true, NOW(), NOW())
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "resource" = EXCLUDED."resource",
  "action" = EXCLUDED."action",
  "scope" = EXCLUDED."scope",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Reports Management Permissions
INSERT INTO "public"."permissions" ("id", "name", "description", "resource", "action", "scope", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'reports:create', 'Create reports', 'reports', 'create', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'reports:read', 'Read reports', 'reports', 'read', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'reports:update', 'Update reports', 'reports', 'update', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'reports:delete', 'Delete reports', 'reports', 'delete', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'reports:read-regional', 'Read regional reports', 'reports', 'read', 'regional', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'reports:create-regional', 'Create regional reports', 'reports', 'create', 'regional', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'reports:read-project', 'Read project reports', 'reports', 'read', 'project', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'reports:create-project', 'Create project reports', 'reports', 'create', 'project', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'reports:update-project', 'Update project reports', 'reports', 'update', 'project', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'reports:delete-project', 'Delete project reports', 'reports', 'delete', 'project', true, NOW(), NOW())
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "resource" = EXCLUDED."resource",
  "action" = EXCLUDED."action",
  "scope" = EXCLUDED."scope",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Analytics Permissions
INSERT INTO "public"."permissions" ("id", "name", "description", "resource", "action", "scope", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'analytics:read', 'Read analytics', 'analytics', 'read', 'global', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'analytics:read-regional', 'Read regional analytics', 'analytics', 'read', 'regional', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'analytics:read-project', 'Read project analytics', 'analytics', 'read', 'project', true, NOW(), NOW())
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "resource" = EXCLUDED."resource",
  "action" = EXCLUDED."action",
  "scope" = EXCLUDED."scope",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Log the number of permissions created
DO $$
DECLARE
    permission_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO permission_count
    FROM permissions;
    
    RAISE NOTICE 'Total permissions in system: %', permission_count;
END $$;

