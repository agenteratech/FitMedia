import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Input, Button, Card } from '../../src/components/primitives';
import { colors, spacing, typography } from '../../src/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword, clearPasswordRecovery, signOut } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const err = await updatePassword(password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.confirmContainer}>
          <Text style={[styles.title, styles.centerText]}>Password updated</Text>
          <Text style={[styles.subtitle, styles.centerText]}>
            Your password has been changed. Please sign in with your new password.
          </Text>
          <Button
            label="Go to Sign In"
            fullWidth
            onPress={async () => {
              clearPasswordRecovery();
              await signOut();
              router.replace('/auth/login');
            }}
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
          <View style={styles.brand}>
            <Text style={styles.brandName}>Fitmedia</Text>
          </View>

          <Card padding="comfortable" style={styles.card}>
            <Text style={styles.title}>Set a new password</Text>
            <Text style={styles.subtitle}>Choose a new password for your account.</Text>

            <View style={styles.fields}>
              <Input
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              <Input
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              label={loading ? 'Updating…' : 'Update Password'}
              fullWidth
              disabled={loading}
              onPress={handleSubmit}
            />
          </Card>
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
  confirmContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.lg,
    alignItems: 'center',
  } satisfies ViewStyle,
  centerText: { textAlign: 'center' } satisfies TextStyle,
});
