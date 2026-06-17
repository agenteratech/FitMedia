import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

/**
 * AsyncStorage adapter for Supabase auth session persistence.
 * Works in both Expo Go and native dev builds (unlike MMKV which requires a
 * native build and would silently fall back to in-memory storage in Expo Go,
 * causing the user to be logged out on every app restart).
 */
const asyncAuthStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export const supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: asyncAuthStorage,
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
