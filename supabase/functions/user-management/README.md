# User Management Edge Function

This Supabase Edge Function handles user management operations that require Admin API access, such as creating and deleting users in Supabase Auth.

## Operations

### 1. Create Auth User (`create_auth_user`)

Creates a new user in Supabase Auth using the Admin API, which allows:
- Bypassing email confirmation
- Setting user metadata
- Creating users programmatically

**Request:**
```json
{
  "action": "create_auth_user",
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "emailConfirmed": true,
  "roleAssignments": [
    {
      "roleId": "role-id",
      "projectId": "project-id",
      "country": "Kenya"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "authUserId": "auth-user-id",
  "email": "user@example.com"
}
```

### 2. Delete Auth User (`delete_auth_user`)

Deletes a user from Supabase Auth using the Admin API.

**Request:**
```json
{
  "action": "delete_auth_user",
  "userId": "user-profile-id",
  "authUserId": "auth-user-id" // Optional, will be looked up if not provided
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auth user deleted successfully"
}
```

## Environment Variables

This function requires the following environment variables (set in Supabase dashboard):

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (admin access)
- `SUPABASE_ANON_KEY`: Your Supabase anon key (for client verification)

## Deployment

Deploy this function using the Supabase CLI:

```bash
supabase functions deploy user-management
```

## Security

- The function verifies the requesting user is authenticated
- **Permission checks:**
  - `users:create` permission required for creating users
  - `users:delete` permission required for deleting users
  - Checks both direct user permissions and role-based permissions
- Uses service role key only for admin operations
- Prevents self-deletion
- Validates all inputs

### Permission Checking

The function checks permissions in the following order:
1. Direct user permissions (`user_permissions` table)
2. Role-based permissions (`role_permissions` via `user_roles`)

If a user has a direct permission with `isGranted: false`, it will override role permissions.

## Usage in Frontend

Call this function from your frontend service:

```typescript
const response = await supabase.functions.invoke('user-management', {
  body: {
    action: 'create_auth_user',
    email: 'user@example.com',
    password: 'password',
    firstName: 'John',
    lastName: 'Doe',
    emailConfirmed: true
  }
});
```

