import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://XXXX.supabase.co';
const DEFAULT_KEY = 'PASTE_PUBLISHABLE_KEY';

export function cleanSupabaseUrl(raw: string): string {
  if (!raw) return '';
  let str = raw.trim().replace(/^["']|["']$/g, '');

  // Handle case where user copied dashboard URL from browser:
  // e.g. https://supabase.com/dashboard/project/abcxyz123...
  const dashboardMatch = str.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    str = `https://${str}`;
  }

  try {
    const parsed = new URL(str);
    // Strip trailing slashes and subpaths like /auth/v1, /rest/v1
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return str.replace(/\/+$/, '');
  }
}

export function cleanSupabaseKey(raw: string): string {
  if (!raw) return '';
  return raw.trim().replace(/^["']|["']$/g, '');
}

export function getStoredConfig(): { url: string; key: string; isPlaceholder: boolean } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  const localUrl = localStorage.getItem('custom_supabase_url');
  const localKey = localStorage.getItem('custom_supabase_key');

  const rawUrl = (localUrl || envUrl || DEFAULT_URL).trim();
  const rawKey = (localKey || envKey || DEFAULT_KEY).trim();

  const url = cleanSupabaseUrl(rawUrl);
  const key = cleanSupabaseKey(rawKey);

  const isPlaceholder =
    !url ||
    url.includes('XXXX') ||
    !url.startsWith('https://') ||
    !key ||
    key.includes('PASTE_PUBLISHABLE_KEY');

  return { url, key, isPlaceholder };
}

export function saveStoredConfig(rawUrl: string, rawKey: string): void {
  const url = cleanSupabaseUrl(rawUrl);
  const key = cleanSupabaseKey(rawKey);
  localStorage.setItem('custom_supabase_url', url);
  localStorage.setItem('custom_supabase_key', key);
  reinitClient();
}

export function resetStoredConfig(): void {
  localStorage.removeItem('custom_supabase_url');
  localStorage.removeItem('custom_supabase_key');
  reinitClient();
}

let supabaseInstance: SupabaseClient | null = null;

function reinitClient(): SupabaseClient {
  const { url, key, isPlaceholder } = getStoredConfig();
  if (isPlaceholder) {
    // Return dummy client to avoid crashes prior to configuration
    supabaseInstance = createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy', {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } else {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseInstance;
}

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    return reinitClient();
  }
  return supabaseInstance;
}
