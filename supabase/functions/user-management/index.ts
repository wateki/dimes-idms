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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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
      }
    );

    // Verify the requesting user is authenticated
    const {
      data: { user: requestingUser },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the requesting user's profile to check permissions
    const { data: requestingProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("auth_user_id", requestingUser.id)
      .eq("isActive", true)
      .single();

    if (profileError || !requestingProfile) {
      return new Response(
        JSON.stringify({ error: "User profile not found or inactive" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Helper function to check if user has a specific permission
    const hasPermission = async (permissionName: string): Promise<boolean> => {
      // Get permission by name
      const { data: permission } = await supabaseAdmin
        .from("permissions")
        .select("id")
        .eq("name", permissionName)
        .eq("isActive", true)
        .single();

      if (!permission) {
        return false;
      }

      // Check direct user permissions
      const { data: userPermission } = await supabaseAdmin
        .from("user_permissions")
        .select("isGranted")
        .eq("userId", requestingProfile.id)
        .eq("permissionId", permission.id)
        .eq("isActive", true)
        .single();

      if (userPermission) {
        return userPermission.isGranted;
      }

      // Check role permissions
      const { data: userRoles } = await supabaseAdmin
        .from("user_roles")
        .select("roleId")
        .eq("userId", requestingProfile.id)
        .eq("isActive", true);

      if (!userRoles || userRoles.length === 0) {
        return false;
      }

      const roleIds = userRoles.map((ur) => ur.roleId);

      const { data: rolePermissions } = await supabaseAdmin
        .from("role_permissions")
        .select("permissionId")
        .in("roleId", roleIds)
        .eq("permissionId", permission.id)
        .eq("isActive", true)
        .limit(1);

      return (rolePermissions?.length ?? 0) > 0;
    };

    const { action, ...payload } = await req.json();

    switch (action) {
      case "create_auth_user": {
        // Check permission: users:create
        const canCreate = await hasPermission("users:create");
        if (!canCreate) {
          return new Response(
            JSON.stringify({ error: "Insufficient permissions: users:create required" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const createData = payload as CreateUserRequest;

        // Validate required fields
        if (!createData.email || !createData.password || !createData.firstName || !createData.lastName) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id, email")
          .eq("email", createData.email)
          .single();

        if (existingUser) {
          return new Response(
            JSON.stringify({ error: "User with this email already exists" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Create user in Supabase Auth using Admin API
        const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
          email: createData.email,
          password: createData.password,
          email_confirm: createData.emailConfirmed ?? true, // Auto-confirm email for admin-created users
          user_metadata: {
            firstName: createData.firstName,
            lastName: createData.lastName,
          },
        });

        if (createAuthError || !authUser.user) {
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
        // Check permission: users:delete
        const canDelete = await hasPermission("users:delete");
        if (!canDelete) {
          return new Response(
            JSON.stringify({ error: "Insufficient permissions: users:delete required" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const deleteData = payload as DeleteUserRequest;

        if (!deleteData.userId && !deleteData.authUserId) {
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
          const { data: userProfile } = await supabaseAdmin
            .from("users")
            .select("auth_user_id")
            .eq("id", deleteData.userId)
            .single();

          if (!userProfile?.auth_user_id) {
            return new Response(
              JSON.stringify({ error: "User not found or no auth user ID" }),
              {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          authUserId = userProfile.auth_user_id;
        }

        // Prevent self-deletion
        if (authUserId === requestingUser.id) {
          return new Response(
            JSON.stringify({ error: "Cannot delete your own account" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Delete user from Supabase Auth using Admin API
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
          authUserId!
        );

        if (deleteAuthError) {
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
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    console.error("Error in user-management function:", error);
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

