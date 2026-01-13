# Email Templates

This directory contains custom email templates for Supabase Auth email notifications.

## Confirmation Email Template

**File:** `confirmation.html`

A professional, responsive HTML email template for email confirmation during the organization signup process.

### Features

- ✅ Fully responsive design (mobile-friendly)
- ✅ Inline CSS for maximum email client compatibility
- ✅ Table-based layout for Outlook compatibility
- ✅ Professional branding with blue gradient header
- ✅ Clear call-to-action button
- ✅ Security information and expiration notice
- ✅ Proper footer with links and contact information

### Template Variables

Supabase automatically replaces these variables in the template:

- `{{ .ConfirmationURL }}` - The confirmation link that users must click
- `{{ .Email }}` - The user's email address
- `{{ .SiteURL }}` - Your site URL (configured in Supabase dashboard)

### Configuration

The template is configured in `supabase/config.toml`:

```toml
[auth.email.template.confirmation]
subject = "Confirm Your Email Address - DIMES IDMS"
content_path = "./templates/confirmation.html"
```

## Password Reset Email Template

**File:** `reset_password.html`

A professional, responsive HTML email template for password reset requests. Matches the platform's emerald green design system.

### Features

- ✅ Fully responsive design (mobile-friendly)
- ✅ Inline CSS for maximum email client compatibility
- ✅ Table-based layout for Outlook compatibility
- ✅ Professional branding with emerald green gradient header (#10b981 to #059669)
- ✅ Clear call-to-action button
- ✅ Security information and expiration notice (1 hour expiry)
- ✅ Proper footer with links and contact information
- ✅ Matches platform design system colors

### Template Variables

Supabase automatically replaces these variables in the template:

- `{{ .ConfirmationURL }}` - The password reset link that users must click
- `{{ .Email }}` - The user's email address
- `{{ .SiteURL }}` - Your site URL (configured in Supabase dashboard)

### Configuration

The template is configured in `supabase/config.toml`:

```toml
[auth.email.template.recovery]
subject = "Reset Your Password - DIMES IDMS"
content_path = "./templates/reset_password.html"
```

### Applying Changes

After updating the template or config:

1. **Local Development:** Restart your Supabase local instance:
   ```bash
   supabase stop
   supabase start
   ```

2. **Production:** The template will be used automatically when deployed, or you may need to restart the Supabase service depending on your deployment method.

### Email Client Compatibility

This template is tested and compatible with:
- Gmail (Web, iOS, Android)
- Outlook (2016, 2019, Office 365, Web)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- Thunderbird
- Most modern email clients

### Customization

To customize the template:

1. Edit `confirmation.html` directly
2. Maintain inline CSS (don't use `<style>` tags in `<head>`)
3. Keep table-based layout structure
4. Test in multiple email clients before deploying
5. Ensure all colors have sufficient contrast for accessibility

### Testing

Before deploying to production:

1. Test the email in multiple email clients
2. Verify the confirmation link works correctly
3. Check mobile responsiveness
4. Ensure images (if added) have proper alt text
5. Validate HTML syntax

### Notes

- The template uses inline styles for maximum compatibility
- Outlook-specific code is included via MSO conditional comments
- All links should be absolute URLs
- Keep total email size under 100 KB for best deliverability
- Password reset template uses emerald green colors (#10b981, #059669) matching the platform design system
- Both templates follow the same structure for consistency


