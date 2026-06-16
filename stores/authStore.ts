import { create } from 'zustand';
import * as Linking from 'expo-linking';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { deleteJSON, storageKeys } from '../lib/storage';

export type AuthState = {
  session: Session | null;
  user: User | null;
  onboardingComplete: boolean | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  confirmationPending: boolean;
  /** True while a password-recovery session is active (user came from a reset email). */
  passwordRecovery: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Sends a password-reset email. Returns an error message, or null on success. */
  sendPasswordReset: (email: string) => Promise<string | null>;
  /** Sets a new password for the recovering user. Returns an error message, or null on success. */
  updatePassword: (newPassword: string) => Promise<string | null>;
  clearPasswordRecovery: () => void;
  clearError: () => void;
  setOnboardingComplete: () => void;
};

let authSubscription: { unsubscribe: () => void } | null = null;

/** Shared onAuthStateChange handler — used by both init() and ensureAuthListener(). */
function createAuthHandler(
  set: (partial: Partial<AuthState>) => void,
) {
  return async (event: string, session: import('@supabase/supabase-js').Session | null) => {
    try {
      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, onboardingComplete: null, error: null, passwordRecovery: false });
        return;
      }
      if (event === 'PASSWORD_RECOVERY') {
        set({ session, user: session?.user ?? null, passwordRecovery: true, error: null });
        return;
      }
      if (event === 'SIGNED_IN') {
        const user = session?.user ?? null;
        const onboardingComplete = user ? await fetchOnboardingStatus(user.id) : null;
        set({ session, user, onboardingComplete, error: null });
        return;
      }
      // TOKEN_REFRESHED, INITIAL_SESSION, etc. just sync session.
      set({ session, user: session?.user ?? null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh auth state.';
      set({
        session,
        user: session?.user ?? null,
        onboardingComplete: false,
        error: message,
      });
    }
  };
}

/** Registers the onAuthStateChange listener if it isn't already active. */
function ensureAuthListener(set: (partial: Partial<AuthState>) => void) {
  if (authSubscription) return;
  const { data: authData } = supabase.auth.onAuthStateChange(createAuthHandler(set) as any);
  authSubscription = authData.subscription;
}

async function fetchOnboardingStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('onboarding_complete')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.onboarding_complete ?? false;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  onboardingComplete: null,
  loading: false,
  error: null,
  initialized: false,
  confirmationPending: false,
  passwordRecovery: false,

  init: async () => {
    if (get().initialized) return;

    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        set({ error: error.message });
      }

      const session = data?.session ?? null;
      const user = session?.user ?? null;
      const onboardingComplete = user ? await fetchOnboardingStatus(user.id) : null;

      set({
        session,
        user,
        onboardingComplete,
        loading: false,
        initialized: true,
      });

      ensureAuthListener(set);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize auth.';
      set({
        error: message,
        loading: false,
        initialized: true,
      });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    // Update store directly from the response — do not rely solely on
    // onAuthStateChange, which may not be subscribed if the user previously
    // signed out within the same JS session without a cold restart.
    const session = data.session;
    const user = data.user;
    if (session && user) {
      try {
        const onboardingComplete = await fetchOnboardingStatus(user.id);
        set({ session, user, onboardingComplete, error: null, loading: false });
      } catch {
        set({ session, user, onboardingComplete: false, loading: false });
      }
    } else {
      set({ loading: false });
    }

    // Re-register the auth listener if signOut() removed it earlier this session.
    ensureAuthListener(set);
  },

  signUp: async (email, password) => {
    set({ loading: true, error: null, confirmationPending: false });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ error: error.message, loading: false });
      return;
    }
    // Supabase returns session=null when email confirmation is required.
    // The SIGNED_IN event won't fire until the user clicks the link.
    if (!data.session && data.user) {
      set({ loading: false, confirmationPending: true });
      return;
    }
    // Auto-confirmed (email confirmation disabled in Supabase) — onAuthStateChange handles the rest.
    set({ loading: false });
  },

  signOut: async () => {
    set({ loading: true, error: null });

    // Clear this user's cached daily score before the session is gone
    const currentUser = get().user;
    if (currentUser) {
      const today = new Date().toISOString().slice(0, 10);
      deleteJSON(storageKeys.dailyScore(currentUser.id, today));
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ error: error.message, loading: false });
      return;
    }
    // onAuthStateChange SIGNED_OUT handler clears state, but set here too for immediacy
    set({ session: null, user: null, onboardingComplete: null, loading: false });
    // Clean up subscription so it can be re-created on next init
    authSubscription?.unsubscribe();
    authSubscription = null;
  },

  sendPasswordReset: async (email) => {
    const trimmed = email.trim();
    if (!trimmed) return 'Please enter your email address.';
    // Basic shape check so we give a friendly message before hitting the network.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'Please enter a valid email address.';
    }
    const redirectTo = Linking.createURL('/auth/reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
    return error?.message ?? null;
  },

  updatePassword: async (newPassword) => {
    if (!newPassword || newPassword.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return error.message;
    set({ passwordRecovery: false });
    return null;
  },

  clearPasswordRecovery: () => set({ passwordRecovery: false }),

  clearError: () => set({ error: null }),

  setOnboardingComplete: () => set({ onboardingComplete: true }),
}));
