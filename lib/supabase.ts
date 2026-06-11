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
