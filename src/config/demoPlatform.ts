/**
 * Public marketing "Explore Platform" demo sign-in.
 * Set both in `.env` (not committed): VITE_DEMO_PLATFORM_EMAIL, VITE_DEMO_PLATFORM_PASSWORD
 */
const rawEmail = import.meta.env.VITE_DEMO_PLATFORM_EMAIL;
const rawPassword = import.meta.env.VITE_DEMO_PLATFORM_PASSWORD;

const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
const password = typeof rawPassword === 'string' ? rawPassword : '';

export const demoPlatformLogin = {
  email,
  password,
} as const;

export function isDemoPlatformLoginConfigured(): boolean {
  return email.length > 0 && password.length > 0;
}
