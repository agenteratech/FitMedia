import React, { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Sheet, Button } from './primitives';
import { colors, spacing, typography } from '@/theme';

// expo-audio is a NATIVE module. It is imported only inside VoiceLogBody, which
// we load lazily here — so the Logs tab (which always mounts this component)
// never touches expo-audio on load. This makes the screen safe to ship via OTA
// to any SDK 54 binary, including older builds that don't bundle expo-audio:
// such builds simply fail the lazy import and show the fallback below, instead
// of crashing the whole tab.
const VoiceLogBody = React.lazy(() => import('./VoiceLogBody'));

export interface VoiceLogSheetProps {
  visible: boolean;
  date: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Voice meal logging — an always-mounted bottom sheet (matches the AddFoodSheet
 * / LogSleepSheet pattern). The Sheet itself is always mounted so its open/close
 * animation lifecycle is preserved; only the audio-dependent body is mounted
 * while the sheet is visible.
 */
export function VoiceLogSheet({ visible, date, userId, onClose, onSaved }: VoiceLogSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      snapPoints={['85%']}
      scrollable
      scrollContentStyle={styles.scroll}
    >
      <VoiceLoadBoundary onClose={onClose}>
        <Suspense fallback={<CenteredSpinner />}>
          {visible ? (
            <VoiceLogBody date={date} userId={userId} onClose={onClose} onSaved={onSaved} />
          ) : null}
        </Suspense>
      </VoiceLoadBoundary>
    </Sheet>
  );
}

function CenteredSpinner() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

function VoiceUnavailable({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Voice Logging Unavailable</Text>
      <Text style={styles.sub}>
        Voice logging needs the latest app version. Please update the app, then try again.
        You can still add food manually.
      </Text>
      <Button label="Close" fullWidth onPress={onClose} />
    </View>
  );
}

/** Catches a failed lazy load of the audio body (e.g. native module missing). */
class VoiceLoadBoundary extends React.Component<
  { onClose: () => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[VoiceLogSheet] failed to load voice body:', error);
  }
  render() {
    if (this.state.hasError) return <VoiceUnavailable onClose={this.props.onClose} />;
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['4xl'],
    gap: spacing.md,
  } satisfies ViewStyle,
  center: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing['4xl'],
  } satisfies ViewStyle,
  title: {
    ...(typography.heading as TextStyle),
    textAlign: 'center',
  } satisfies TextStyle,
  sub: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
    marginBottom: spacing.md,
  } satisfies TextStyle,
});
