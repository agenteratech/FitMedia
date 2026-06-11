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
import { useRouter } from 'expo-router';
import { ChevronLeft, MailCheck } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { Input, Button, Card } from '../../src/components/primitives';
import { colors, spacing, typography, radius } from '../../src/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { sendPasswordReset } = useAuthStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    const err = await sendPasswordReset(email);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.confirmContainer}>
          <View style={styles.confirmIcon}>
            <MailCheck size={32} color={colors.success} strokeWidth={1.75} />
          </View>
          <Text style={[styles.title, styles.centerText]}>Check your email</Text>
          <Text style={[styles.subtitle, styles.centerText]}>
            If an account exists for {email.trim()}, we've sent a link to reset your password.
            Follow it to choose a new password.
          </Text>
          <Button
            label="Back to Sign In"
            fullWidth
            onPress={() => router.replace('/auth/login')}
          />
        </View>
      </SafeAreaView>
    );
  }

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
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color={colors.ink2} strokeWidth={1.75} />
          </Pressable>

          <Card padding="comfortable" style={styles.card}>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>
              Enter your registered email and we'll send you a link to reset your password.
            </Text>

            <View style={styles.fields}>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              label={loading ? 'Sending…' : 'Send Reset Link'}
              fullWidth
              disabled={loading}
              onPress={handleSubmit}
            />
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remembered it?</Text>
            <Pressable hitSlop={8} onPress={() => router.replace('/auth/login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
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
  backBtn: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing['2xl'],
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
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

  // Sent confirmation
  confirmContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.lg,
    alignItems: 'center',
  } satisfies ViewStyle,
  confirmIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  } satisfies ViewStyle,
  centerText: { textAlign: 'center' } satisfies TextStyle,
});
