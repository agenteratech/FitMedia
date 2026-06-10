import { create } from 'zustand';
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
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  setOnboardingComplete: () => void;
};

let authSubscription: { unsubscribe: () => void } | null = null;

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

      if (!authSubscription) {
        const { data: authData } = supabase.auth.onAuthStateChange(async (event, session) => {
          try {
            if (event === 'SIGNED_OUT') {
              set({ session: null, user: null, onboardingComplete: null, error: null });
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
        });
        authSubscription = authData.subscription;
      }
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message, loading: false });
      return;
    }
    set({ loading: false });
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

  clearError: () => set({ error: null }),

  setOnboardingComplete: () => set({ onboardingComplete: true }),
}));
