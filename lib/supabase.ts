import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { storage } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

/**
 * Storage adapter that persists the Supabase auth session in MMKV.
 *
 * Without this, supabase-js has nowhere to write the session on React Native
 * (there is no localStorage), so `persistSession` silently falls back to
 * in-memory storage and the user is logged out on every app restart.
 * MMKV is synchronous and returns strings, which satisfies the adapter contract.
 */
const mmkvAuthStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => {
    storage.set(key, value);
  },
  removeItem: (key: string): void => {
    storage.delete(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: mmkvAuthStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/**
 * On React Native, supabase-js cannot refresh the access token on its own
 * timer reliably — it must be told when the app is foregrounded. Without this,
 * an expired access token is never refreshed, so the stored session is treated
 * as invalid on the next cold start and the user appears logged out.
 *
 * Start refreshing while the app is active; stop when backgrounded.
 */
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
  // Kick it off immediately for the initial foreground.
  supabase.auth.startAutoRefresh();
}
