# Deployment Guide for User Management Edge Function

## Prerequisites

1. Supabase CLI installed: `npm install -g supabase`
2. Logged in to Supabase: `supabase login`
3. Linked to your project: `supabase link --project-ref <your-project-ref>`

## Environment Variables

Set the following secrets in your Supabase project:

```bash
# Get your service role key from Supabase Dashboard > Settings > API
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

The following are automatically available:
- `SUPABASE_URL` - Automatically set by Supabase
- `SUPABASE_ANON_KEY` - Automatically set by Supabase

## Deploy

```bash
# Deploy the function
supabase functions deploy user-management

# Or deploy with specific project
supabase functions deploy user-management --project-ref <your-project-ref>
```

## Test Locally

```bash
# Start Supabase locally
supabase start

# Serve the function locally
supabase functions serve user-management

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/user-management' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "action": "create_auth_user",
    "email": "test@example.com",
    "password": "testpassword123",
    "firstName": "Test",
    "lastName": "User",
    "emailConfirmed": true
  }'
```

## Verify Deployment

After deployment, verify the function is available:

```bash
supabase functions list
```

You should see `user-management` in the list.

## Troubleshooting

1. **Function not found**: Make sure you've deployed the function and it's in the correct directory structure
2. **Permission denied**: Verify the service role key is set correctly
3. **CORS errors**: The function includes CORS headers, but verify your frontend is calling it correctly


