import { createClient } from '@supabase/supabase-js';

let browserClient;

export function hasSupabaseBrowserConfig() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function getSupabaseBrowserClient() {
  if (!hasSupabaseBrowserConfig()) return null;
  if (!browserClient) {
    browserClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    );
  }
  return browserClient;
}

export async function apiFetch(path, options = {}) {
  const { supabase = getSupabaseBrowserClient(), ...fetchOptions } = options;
  if (!supabase) throw new Error('Account service is not connected yet.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again.');

  const response = await fetch(path, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status})`);
  return payload;
}

export async function sendMagicLink(email) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Account service is not connected yet.');
  const redirectTo = typeof window === 'undefined' ? undefined : `${window.location.origin}/plus`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}
