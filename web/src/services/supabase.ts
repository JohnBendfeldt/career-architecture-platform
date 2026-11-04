import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xudbpjhloclfrirzexhu.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZGJwamhsb2NsZnJpcnpleGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3NDEyNjQsImV4cCI6MjEwOTMxNzI2NH0.CkPqJLHHuR0EvByPksI17zAZOG_BkTzY146e_EAPtLg';
const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '94546603563-ji27od7ra7iqkh76o2o90u8504me4dki.apps.googleusercontent.com';
const GOOGLE_NONCE_STORAGE_KEY = 'cap_google_oauth_nonce';

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getSupabaseAnonKey(): string {
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }
  try {
    const stored = localStorage.getItem('cap_supabase_anon_key')?.trim();
    if (stored) return stored;
  } catch {
    // ignore storage errors
  }
  return defaultAnonKey;
}

export function setSupabaseAnonKey(key: string): void {
  try {
    localStorage.setItem('cap_supabase_anon_key', key.trim());
  } catch {
    // ignore storage errors
  }
}

const initialAnonKey = getSupabaseAnonKey();

export const isSupabaseConfigured = Boolean(supabaseUrl && initialAnonKey);

export let supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, initialAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getOrInitSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;
  const key = getSupabaseAnonKey();
  if (supabaseUrl && key) {
    supabase = createClient(supabaseUrl, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return supabase;
  }
  return null;
}

export type SupportedOAuthProvider = 'github' | 'google' | 'azure';

export async function signInWithProvider(provider: SupportedOAuthProvider) {
  const client = getOrInitSupabaseClient();
  if (!client) {
    return { error: new Error('Missing VITE_SUPABASE_ANON_KEY in web/.env (or local configuration).') };
  }

  const redirectTo = window.location.origin;

  // Use direct Google OIDC redirect to window.location.origin so Google displays
  // "johnbendfeldt.com" / "Career Architecture Platform" instead of "*.supabase.co"
  if (provider === 'google' && googleClientId) {
    try {
      const rawNonce = crypto.randomUUID();
      sessionStorage.setItem(GOOGLE_NONCE_STORAGE_KEY, rawNonce);
      const hashedNonce = await sha256Hex(rawNonce);

      const params = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectTo,
        response_type: 'id_token',
        scope: 'openid email profile',
        nonce: hashedNonce,
        prompt: 'select_account',
      });

      window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
      return { data: { provider: 'google', url: redirectTo }, error: null };
    } catch {
      // Fallback to standard Supabase OAuth if crypto.subtle is unavailable
    }
  }

  return await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      scopes: provider === 'github' ? 'read:user user:email' : provider === 'azure' ? 'email profile openid' : undefined,
    },
  });
}

export async function consumeGoogleIdTokenFromHash(): Promise<void> {
  if (typeof window === 'undefined' || !window.location.hash) return;
  const rawHash = window.location.hash.substring(1);
  if (!rawHash.includes('id_token=')) return;

  const params = new URLSearchParams(rawHash);
  const idToken = params.get('id_token');
  // Ignore if this is already a Supabase session callback with access_token
  if (!idToken || params.get('access_token')) return;

  const client = getOrInitSupabaseClient();
  if (!client) return;

  const rawNonce = sessionStorage.getItem(GOOGLE_NONCE_STORAGE_KEY) || undefined;
  sessionStorage.removeItem(GOOGLE_NONCE_STORAGE_KEY);

  // Clean hash from browser address bar
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

  const { error } = await client.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    nonce: rawNonce,
  });

  if (error && rawNonce) {
    // Fallback in case "Skip nonce check" or raw nonce is configured in Supabase
    await client.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
  }
}

export async function signOutFromSupabase() {
  const client = getOrInitSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}
