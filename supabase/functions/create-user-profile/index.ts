// Supabase Edge Function to create user profile after email confirmation
// This function is called after the user confirms their email address
// It creates the user profile and assigns the global-admin role

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log(`[Create User Profile Edge Function] Request received: ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log(`[Create User Profile Edge Function] CORS preflight request handled`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header (JWT token from authenticated user)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(`[Create User Profile Edge Function] Missing authorization header`);
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract JWT token from Authorization header (Bearer <token>)
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      console.error(`[Create User Profile Edge Function] Invalid authorization header format`);
      return new Response(
        JSON.stringify({ error: "Invalid authorization header format" }),
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
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is authenticated
    console.log(`[Create User Profile Edge Function] Verifying user authentication...`);
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !authUser) {
      console.error(`[Create User Profile Edge Function] Authentication failed:`, authError);
      return new Response(
        JSON.stringify({ error: "Authentication failed. Please confirm your email first." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Create User Profile Edge Function] User authenticated: ${authUser.id}`);

    // Check if user profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, organizationid')
      .eq('auth_user_id', authUser.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected for new users
      console.error(`[Create User Profile Edge Function] Error checking for existing profile:`, checkError);
      return new Response(
        JSON.stringify({ error: "Failed to check for existing profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (existingProfile) {
      console.log(`[Create User Profile Edge Function] User profile already exists: ${existingProfile.id}`);
      return new Response(
        JSON.stringify({
          success: true,
          userId: existingProfile.id,
          organizationId: existingProfile.organizationid,
          message: "Profile already exists",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get organization ID from user metadata (stored during signup)
    const userMetadata = authUser.user_metadata || {};
    const organizationId = userMetadata.organizationId;

    if (!organizationId) {
      console.error(`[Create User Profile Edge Function] Organization ID not found in user metadata`);
      return new Response(
        JSON.stringify({ error: "Organization ID not found. Please contact support." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Create User Profile Edge Function] Organization ID: ${organizationId}`);

    // Verify organization exists
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      console.error(`[Create User Profile Edge Function] Organization not found:`, orgError);
      console.error(`[Create User Profile Edge Function] Searched for organization ID: ${organizationId}`);
      console.error(`[Create User Profile Edge Function] User metadata:`, JSON.stringify(userMetadata));
      
      // If organization doesn't exist, this is a critical error
      // The organization should have been created during signup
      // Return a detailed error to help debug
      return new Response(
        JSON.stringify({ 
          error: "Organization not found. The organization may have been deleted or never created. Please contact support or try signing up again.",
          details: {
            organizationId: organizationId,
            authUserId: authUser.id,
            email: authUser.email,
          }
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Create User Profile Edge Function] Organization found: ${organization.name}`);

    // Get user metadata
    const firstName = userMetadata.firstName || '';
    const lastName = userMetadata.lastName || '';
    const email = authUser.email || '';

    // Create user profile
    console.log(`[Create User Profile Edge Function] Creating user profile...`);
    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        auth_user_id: authUser.id,
        email: email,
        firstName: firstName,
        lastName: lastName,
        passwordHash: '', // Not used with Supabase Auth
        organizationid: organization.id,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (profileError || !userProfile) {
      console.error(`[Create User Profile Edge Function] Failed to create user profile:`, profileError);
      return new Response(
        JSON.stringify({ error: profileError?.message || "Failed to create user profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Create User Profile Edge Function] User profile created: ${userProfile.id}`);

    // Create or get global-admin role for the organization
    console.log(`[Create User Profile Edge Function] Ensuring global-admin role exists...`);
    let adminRoleId: string;
    
    const { data: existingRole, error: roleCheckError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'global-admin')
      .eq('organizationid', organization.id)
      .eq('isActive', true)
      .single();

    if (existingRole) {
      adminRoleId = existingRole.id;
      console.log(`[Create User Profile Edge Function] Global-admin role found: ${adminRoleId}`);
    } else {
      // Create global-admin role for this organization
      console.log(`[Create User Profile Edge Function] Creating global-admin role...`);
      const { data: newRole, error: createRoleError } = await supabaseAdmin
        .from('roles')
        .insert({
          id: crypto.randomUUID(),
          name: 'global-admin',
          description: 'Global Administrator with full system access',
          level: 1,
          organizationid: organization.id,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .select('id')
        .single();

      if (createRoleError || !newRole) {
        console.error(`[Create User Profile Edge Function] Failed to create global-admin role:`, createRoleError);
        return new Response(
          JSON.stringify({ error: createRoleError?.message || "Failed to create global-admin role" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      adminRoleId = newRole.id;
      console.log(`[Create User Profile Edge Function] Global-admin role created: ${adminRoleId}`);
    }

    // Assign global-admin role to the user
    console.log(`[Create User Profile Edge Function] Assigning global-admin role to user...`);
    const { error: assignError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        id: crypto.randomUUID(),
        userId: userProfile.id,
        roleId: adminRoleId,
        organizationid: organization.id,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

    if (assignError) {
      console.error(`[Create User Profile Edge Function] Failed to assign admin role:`, assignError);
      return new Response(
        JSON.stringify({ error: assignError?.message || "Failed to assign global-admin role" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Create User Profile Edge Function] Global-admin role assigned successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        userId: userProfile.id,
        organizationId: organization.id,
        message: "User profile created successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[Create User Profile Edge Function] Error:`, error);
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

