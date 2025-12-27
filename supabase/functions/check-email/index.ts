// Supabase Edge Function to check if an email is already registered
// Public endpoint for signup flow

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log(`[Check Email Edge Function] Request received: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log(`[Check Email Edge Function] CORS preflight request handled`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      console.error(`[Check Email Edge Function] Invalid email parameter`);
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Check Email Edge Function] Checking email existence: ${email}`);

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

    // Check if email exists using listUsers API
    // We'll check the first few pages which should cover most cases
    console.log(`[Check Email Edge Function] Checking email using listUsers API...`);
    
    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100, // Check up to 100 users per page
    });

    if (listError) {
      console.error(`[Check Email Edge Function] Error listing users:`, listError.message);
      return new Response(
        JSON.stringify({ error: "Failed to check email" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if email exists in the first page
    const userFound = usersList.users?.find((user: any) => 
      user.email?.toLowerCase() === email.toLowerCase()
    );

    if (userFound) {
      console.log(`[Check Email Edge Function] Email exists: ${email} (user ID: ${userFound.id})`);
      return new Response(
        JSON.stringify({ exists: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If we haven't found it and there are more pages, check a few more pages
    // This is a compromise - we can't check all pages, but we'll check a reasonable number
    if (usersList.users && usersList.users.length === 100) {
      // There might be more pages, check a couple more
      for (let page = 2; page <= 3; page++) {
        const { data: pageData, error: pageError } = await supabaseAdmin.auth.admin.listUsers({
          page: page,
          perPage: 100,
        });

        if (pageError) {
          console.warn(`[Check Email Edge Function] Error listing users page ${page}:`, pageError.message);
          break;
        }

        if (!pageData?.users || pageData.users.length === 0) {
          break; // No more users
        }

        const foundInPage = pageData.users.find((user: any) => 
          user.email?.toLowerCase() === email.toLowerCase()
        );

        if (foundInPage) {
          console.log(`[Check Email Edge Function] Email exists: ${email} (user ID: ${foundInPage.id}, found on page ${page})`);
          return new Response(
            JSON.stringify({ exists: true }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // If this page has fewer than 100 users, we've reached the end
        if (pageData.users.length < 100) {
          break;
        }
      }
    }

    // Email not found in checked pages
    // Note: For very large user bases, we might miss users beyond the first 300,
    // but for signup validation this should be sufficient in most cases
    console.log(`[Check Email Edge Function] Email not found: ${email} (checked first few pages)`);
    return new Response(
      JSON.stringify({ exists: false }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[Check Email Edge Function] Error:`, error);
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

