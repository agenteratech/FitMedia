import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Input, Button, Card } from '../../src/components/primitives';
import { colors, spacing, typography } from '../../src/theme';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signUp, loading, error, clearError } = useAuthStore();

  const handleSubmit = async () => {
    clearError();
    await signUp(email.trim(), password);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <Text style={styles.brandName}>Fitmedia</Text>
          </View>

          <Card padding="comfortable" style={styles.card}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start your fitness journey today.</Text>

            <View style={styles.fields}>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              label={loading ? 'Creating…' : 'Create Account'}
              fullWidth
              disabled={loading}
              onPress={handleSubmit}
            />
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/auth/login" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.footerLink}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg } satisfies ViewStyle,
  kav: { flex: 1 } satisfies ViewStyle,
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
    justifyContent: 'center',
  } satisfies ViewStyle,
  brand: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  } satisfies ViewStyle,
  brandName: {
    ...(typography.display as TextStyle),
    color: colors.accent,
  } satisfies TextStyle,
  card: { gap: spacing.md } satisfies ViewStyle,
  title: { ...(typography.heading as TextStyle) } satisfies TextStyle,
  subtitle: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  fields: { gap: spacing.sm } satisfies ViewStyle,
  errorText: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
    textAlign: 'center',
  } satisfies TextStyle,
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  } satisfies ViewStyle,
  footerText: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  footerLink: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.accent,
  } satisfies TextStyle,
});
