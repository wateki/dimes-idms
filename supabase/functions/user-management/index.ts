// Supabase Edge Function for User Management
// Handles operations that require Admin API access (creating/deleting auth users)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  emailConfirmed?: boolean;
  roleAssignments?: Array<{
    roleId: string;
    projectId?: string;
    country?: string;
  }>;
}

interface DeleteUserRequest {
  userId: string;
  authUserId?: string;
}

serve(async (req) => {
  const requestStartTime = Date.now();
  console.log(`[User Management Edge Function] Request received: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log(`[User Management Edge Function] CORS preflight request handled`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(`[User Management Edge Function] Missing authorization header`);
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`[User Management Edge Function] Authorization header present`);

    // Extract JWT token from Authorization header (Bearer <token>)
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      console.error(`[User Management Edge Function] Invalid authorization header format`);
      return new Response(
        JSON.stringify({ error: "Invalid authorization header format" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[User Management Edge Function] JWT token extracted (length: ${token.length})`);

    // Create Supabase client with service role key (admin access)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create regular client to verify the requesting user's session
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is authenticated by passing the token directly
    console.log(`[User Management Edge Function] Verifying requesting user authentication...`);
    const {
      data: { user: requestingUser },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !requestingUser) {
      console.error(`[User Management Edge Function] Authentication failed:`, authError?.message || 'No user returned');
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[User Management Edge Function] Requesting user authenticated: ${requestingUser.id} (${requestingUser.email})`);

    // Get the requesting user's profile to check permissions
    console.log(`[User Management Edge Function] Fetching requesting user profile...`);
    const { data: requestingProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("auth_user_id", requestingUser.id)
      .eq("isActive", true)
      .single();

    if (profileError || !requestingProfile) {
      console.error(`[User Management Edge Function] User profile not found or inactive:`, profileError?.message || 'No profile returned');
      return new Response(
        JSON.stringify({ error: "User profile not found or inactive" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[User Management Edge Function] Requesting user profile found: ${requestingProfile.id} (organization: ${requestingProfile.organizationid || 'N/A'})`);

    // Helper function to check if user has a specific permission
    const hasPermission = async (permissionName: string): Promise<boolean> => {
      console.log(`[User Management Edge Function] Checking permission: ${permissionName} for user ${requestingProfile.id}`);
      
      // Get permission by name
      const { data: permission } = await supabaseAdmin
        .from("permissions")
        .select("id")
        .eq("name", permissionName)
        .eq("isActive", true)
        .single();

      if (!permission) {
        console.log(`[User Management Edge Function] Permission '${permissionName}' not found or inactive`);
        return false;
      }

      console.log(`[User Management Edge Function] Permission '${permissionName}' found with ID: ${permission.id}`);

      // Check direct user permissions
      const { data: userPermission } = await supabaseAdmin
        .from("user_permissions")
        .select("isGranted")
        .eq("userId", requestingProfile.id)
        .eq("permissionId", permission.id)
        .eq("isActive", true)
        .single();

      if (userPermission) {
        console.log(`[User Management Edge Function] Direct user permission found: isGranted=${userPermission.isGranted}`);
        return userPermission.isGranted;
      }

      // Check role permissions
      const { data: userRoles } = await supabaseAdmin
        .from("user_roles")
        .select("roleId")
        .eq("userId", requestingProfile.id)
        .eq("isActive", true);

      if (!userRoles || userRoles.length === 0) {
        console.log(`[User Management Edge Function] No active roles found for user ${requestingProfile.id}`);
        return false;
      }

      const roleIds = userRoles.map((ur) => ur.roleId);
      console.log(`[User Management Edge Function] Checking role permissions for ${roleIds.length} role(s): ${roleIds.join(', ')}`);

      const { data: rolePermissions } = await supabaseAdmin
        .from("role_permissions")
        .select("permissionId")
        .in("roleId", roleIds)
        .eq("permissionId", permission.id)
        .eq("isActive", true)
        .limit(1);

      const hasRolePermission = (rolePermissions?.length ?? 0) > 0;
      console.log(`[User Management Edge Function] Role permission check result: ${hasRolePermission}`);
      return hasRolePermission;
    };

    const { action, ...payload } = await req.json();
    console.log(`[User Management Edge Function] Processing action: ${action}`, { payloadKeys: Object.keys(payload) });

    switch (action) {
      case "create_auth_user": {
        console.log(`[User Management Edge Function] create_auth_user action started`);
        
        // Check permission: users:create
        const canCreate = await hasPermission("users:create");
        if (!canCreate) {
          console.error(`[User Management Edge Function] Permission denied: users:create required for user ${requestingProfile.id}`);
          return new Response(
            JSON.stringify({ error: "Insufficient permissions: users:create required" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(`[User Management Edge Function] Permission check passed for create_auth_user`);
        const createData = payload as CreateUserRequest;

        // Validate required fields
        if (!createData.email || !createData.password || !createData.firstName || !createData.lastName) {
          console.error(`[User Management Edge Function] Missing required fields:`, {
            email: !!createData.email,
            password: !!createData.password,
            firstName: !!createData.firstName,
            lastName: !!createData.lastName,
          });
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(`[User Management Edge Function] Validating user creation for email: ${createData.email}`);

        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id, email")
          .eq("email", createData.email)
          .single();

        if (existingUser) {
          console.error(`[User Management Edge Function] User already exists with email: ${createData.email} (ID: ${existingUser.id})`);
          return new Response(
            JSON.stringify({ error: "User with this email already exists" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(`[User Management Edge Function] No existing user found, creating auth user...`);
        // Create user in Supabase Auth using Admin API
        const createStartTime = Date.now();
        const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
          email: createData.email,
          password: createData.password,
          email_confirm: createData.emailConfirmed ?? true, // Auto-confirm email for admin-created users
          user_metadata: {
            firstName: createData.firstName,
            lastName: createData.lastName,
          },
        });
        const createDuration = Date.now() - createStartTime;

        if (createAuthError || !authUser.user) {
          console.error(`[User Management Edge Function] Failed to create auth user after ${createDuration}ms:`, createAuthError?.message || 'No user returned');
          return new Response(
            JSON.stringify({
              error: "Failed to create auth user",
              details: createAuthError?.message,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(`[User Management Edge Function] Auth user created successfully in ${createDuration}ms: ${authUser.user.id} (${authUser.user.email})`);
        const totalDuration = Date.now() - requestStartTime;
        console.log(`[User Management Edge Function] create_auth_user completed in ${totalDuration}ms`);

        // Return the auth user ID for the frontend to create the profile
        return new Response(
          JSON.stringify({
            success: true,
            authUserId: authUser.user.id,
            email: authUser.user.email,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      case "delete_auth_user": {
        console.log(`[User Management Edge Function] delete_auth_user action started`);
        
        // Check permission: users:delete
        const canDelete = await hasPermission("users:delete");
        if (!canDelete) {
          console.error(`[User Management Edge Function] Permission denied: users:delete required for user ${requestingProfile.id}`);
          return new Response(
            JSON.stringify({ error: "Insufficient permissions: users:delete required" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(`[User Management Edge Function] Permission check passed for delete_auth_user`);
        const deleteData = payload as DeleteUserRequest;
        console.log(`[User Management Edge Function] Delete request: userId=${deleteData.userId}, authUserId=${deleteData.authUserId}`);

        if (!deleteData.userId && !deleteData.authUserId) {
          console.error(`[User Management Edge Function] Missing user ID in delete request`);
          return new Response(
            JSON.stringify({ error: "Missing user ID" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Get the user profile to find auth_user_id
        let authUserId = deleteData.authUserId;
        if (!authUserId && deleteData.userId) {
          console.log(`[User Management Edge Function] Looking up auth_user_id for user profile: ${deleteData.userId}`);
          const { data: userProfile } = await supabaseAdmin
            .from("users")
            .select("auth_user_id")
            .eq("id", deleteData.userId)
            .single();

          if (!userProfile?.auth_user_id) {
            console.error(`[User Management Edge Function] User profile not found or missing auth_user_id: ${deleteData.userId}`);
            return new Response(
              JSON.stringify({ error: "User not found or no auth user ID" }),
              {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          authUserId = userProfile.auth_user_id;
          console.log(`[User Management Edge Function] Found auth_user_id: ${authUserId}`);
        }

        // Prevent self-deletion
        if (authUserId === requestingUser.id) {
          console.error(`[User Management Edge Function] Self-deletion attempted by user ${requestingUser.id}`);
          return new Response(
            JSON.stringify({ error: "Cannot delete your own account" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(`[User Management Edge Function] Deleting auth user: ${authUserId}`);
        // Delete user from Supabase Auth using Admin API
        const deleteStartTime = Date.now();
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
          authUserId!
        );
        const deleteDuration = Date.now() - deleteStartTime;

        if (deleteAuthError) {
          console.error(`[User Management Edge Function] Failed to delete auth user after ${deleteDuration}ms:`, deleteAuthError.message);
          return new Response(
            JSON.stringify({
              error: "Failed to delete auth user",
              details: deleteAuthError.message,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(`[User Management Edge Function] Auth user deleted successfully in ${deleteDuration}ms: ${authUserId}`);
        const totalDuration = Date.now() - requestStartTime;
        console.log(`[User Management Edge Function] delete_auth_user completed in ${totalDuration}ms`);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Auth user deleted successfully",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      default:
        console.error(`[User Management Edge Function] Invalid action: ${action}`);
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    const totalDuration = Date.now() - requestStartTime;
    console.error(`[User Management Edge Function] Error after ${totalDuration}ms:`, error);
    console.error(`[User Management Edge Function] Error details:`, error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : String(error));
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

