import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

/**
 * Entry point — decides where to send the user based on auth state.
 * The root layout shows a loading overlay until `initialized = true`,
 * so this component never renders a redirect prematurely.
 */
export default function Index() {
  const { session, onboardingComplete, initialized } = useAuthStore();

  // Still loading — layout overlay is covering the screen, stay blank
  if (!initialized) return null;

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  if (onboardingComplete === false) {
    return <Redirect href="/onboarding/basic-info" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
