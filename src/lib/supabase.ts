import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://uazfzmuvunmhnjdfxbbi.supabase.co';
const DEFAULT_KEY = 'sb_publishable_Kbhrasv4jWCwnd52QRvprQ_1bJ-EDpe';

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
let activeSession: Session | null = null;

export function setActiveSession(session: Session | null): void {
  activeSession = session;
}

export function getStoredSessionFromLocalStorage(): Session | null {
  if (activeSession) return activeSession;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.access_token === 'string' && parsed.user?.id) {
            return parsed as Session;
          }
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

export function clearLocalAuthStorage(): void {
  activeSession = null;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('sb-') || k === 'supabase.auth.token')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore storage errors
  }
}

// Fetch wrapper with 10s AbortController timeout so mobile sockets never hang initializePromise indefinitely
const fetchWithTimeout: typeof fetch = async (input, init) => {
  if (init?.signal) {
    return fetch(input, init);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

function reinitClient(): SupabaseClient {
  const { url, key, isPlaceholder } = getStoredConfig();
  const client = isPlaceholder
    ? createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy', {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        global: {
          fetch: fetchWithTimeout,
        },
      })
    : createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        global: {
          fetch: fetchWithTimeout,
        },
      });

  // Bypass GoTrueClient initializePromise bottleneck when activeSession or valid localStorage session is available
  const origGetSession = client.auth.getSession.bind(client.auth);
  client.auth.getSession = async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    if (activeSession && (!activeSession.expires_at || activeSession.expires_at > nowSec + 15)) {
      return { data: { session: activeSession }, error: null };
    }
    const stored = getStoredSessionFromLocalStorage();
    if (stored && stored.expires_at && stored.expires_at > nowSec + 15) {
      activeSession = stored;
      return { data: { session: stored }, error: null };
    }
    try {
      const fallbackTimer = new Promise<{ data: { session: null }; error: null }>((resolve) =>
        setTimeout(() => {
          resolve({ data: { session: null }, error: null });
        }, 8000)
      );
      const res = await Promise.race([origGetSession(), fallbackTimer]);
      if (res.data?.session) {
        activeSession = res.data.session;
      }
      return res;
    } catch {
      return { data: { session: null }, error: null };
    }
  };

  supabaseInstance = client;
  return supabaseInstance;
}

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    return reinitClient();
  }
  return supabaseInstance;
}
