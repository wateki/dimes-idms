// Environment configuration
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ,
  NODE_ENV: import.meta.env.VITE_NODE_ENV || 'development',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
} as const;

export default config;


