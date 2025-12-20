# Admin User Creation Script

This script creates a default admin user for the IDMS dashboard.

## Prerequisites

1. Get your Supabase Service Role Key:
   - Go to Supabase Dashboard
   - Select your project
   - Go to Settings > API
   - Copy the `service_role` key (NOT the anon key)

## Setup

1. Add the service role key to your environment:

   **Option A: Add to .env file**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

   **Option B: Set as environment variable**
   ```bash
   # Windows PowerShell
   $env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
   
   # Windows CMD
   set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   
   # Linux/Mac
   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

2. Make sure `VITE_SUPABASE_URL` is set in your `.env` file

## Run the Script

```bash
node scripts/create-admin.js
```

Or with inline environment variable:

```bash
# Windows PowerShell
$env:SUPABASE_SERVICE_ROLE_KEY="your_key"; node scripts/create-admin.js

# Linux/Mac
SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/create-admin.js
```

## Default Credentials

After running the script, you can log in with:

- **Email**: `admin@icsafrica.org`
- **Password**: `admin123`

⚠️ **Important**: Change the password after first login!

## What the Script Does

1. Creates a user in Supabase Auth
2. Creates a profile in `public.users` linked via `auth_user_id`
3. Creates the `global-admin` role if it doesn't exist
4. Assigns the `global-admin` role to the user

## Troubleshooting

- **"Missing SUPABASE_SERVICE_ROLE_KEY"**: Make sure you've set the environment variable
- **"User already registered"**: The auth user already exists. The script will use the existing user and update the profile.
- **"Profile already exists"**: The profile exists but will be updated with the correct information.

