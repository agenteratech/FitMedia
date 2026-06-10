import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, ChevronRight, Bell, BellOff } from 'lucide-react-native';
import { TUTORIAL_STEPS, COMPANION_NAME } from '../../../lib/companion/messages';
import { requestNotificationPermissions, scheduleNotifications } from '../../../lib/companion/notifications';
import { colors, spacing, typography, radius } from '../../theme';
import type { Personality } from '../../../lib/companion/messages';

// ── Companion avatar ──────────────────────────────────────────────────────────

function CompanionAvatar({ size = 64 }: { size?: number }) {
  return (
    <View
      style={[
        avatarStyles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Sparkles size={size * 0.42} color={colors.accent} strokeWidth={1.75} />
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: {
    backgroundColor: colors.accentSoft,
    borderWidth: 2.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
});

// ── Tutorial ──────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  personality: Personality;
  categories: Record<string, boolean>;
  onComplete: (notificationsGranted: boolean) => void;
}

const TOTAL_STEPS = TUTORIAL_STEPS.length;

export function CompanionTutorial({ visible, personality, categories, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [showPermission, setShowPermission] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Slide-up animation for the card.
  const slideAnim  = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(0);
      setShowPermission(false);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 380,
          delay: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          delay: 80,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(60);
      opacityAnim.setValue(0);
    }
  }, [visible, slideAnim, opacityAnim]);

  // Animate on each step change.
  const animateStep = useCallback(() => {
    opacityAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      animateStep();
    } else {
      setShowPermission(true);
      animateStep();
    }
  }, [step, animateStep]);

  const handleSkip = useCallback(() => {
    setShowPermission(true);
    animateStep();
  }, [animateStep]);

  const handleEnableNotifications = useCallback(async () => {
    setRequesting(true);
    const granted = await requestNotificationPermissions();
    if (granted) {
      await scheduleNotifications(personality, categories as Record<'workout' | 'diet' | 'sleep' | 'streak', boolean>);
    }
    setRequesting(false);
    onComplete(granted);
  }, [personality, categories, onComplete]);

  const handleMaybeLater = useCallback(() => {
    onComplete(false);
  }, [onComplete]);

  if (!visible) return null;

  const currentStep = TUTORIAL_STEPS[step];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Animated card */}
        <Animated.View
          style={[
            styles.card,
            {
              paddingBottom: insets.bottom + spacing.xl,
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <CompanionAvatar size={68} />
          </View>

          {/* Aria label */}
          <Text style={styles.ariaLabel}>{COMPANION_NAME}</Text>

          {!showPermission ? (
            <>
              {/* Feature badge */}
              {currentStep.feature ? (
                <View style={styles.featureBadge}>
                  <Text style={styles.featureBadgeText}>{currentStep.feature}</Text>
                </View>
              ) : null}

              {/* Title + message */}
              <Text style={styles.stepTitle}>{currentStep.title}</Text>
              <Text style={styles.stepMessage}>{currentStep.message}</Text>

              {/* Progress dots */}
              <View style={styles.dots}>
                {TUTORIAL_STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === step && styles.dotActive]}
                  />
                ))}
              </View>

              {/* Buttons */}
              <View style={styles.btnRow}>
                <Pressable
                  style={styles.skipBtn}
                  onPress={handleSkip}
                  hitSlop={8}
                >
                  <Text style={styles.skipLabel}>Skip</Text>
                </Pressable>
                <Pressable style={styles.nextBtn} onPress={handleNext}>
                  <Text style={styles.nextLabel}>
                    {step < TOTAL_STEPS - 1 ? 'Next' : "Let's go"}
                  </Text>
                  <ChevronRight size={16} color={colors.surface} strokeWidth={2.5} />
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {/* Notification permission step */}
              <Text style={styles.stepTitle}>Stay consistent ✨</Text>
              <Text style={styles.stepMessage}>
                {"Want better results? Allow notifications so I can remind you about workouts, meals, sleep, and your daily goals. I promise not to spam you."}
              </Text>

              <View style={styles.notifBtnCol}>
                <Pressable
                  style={[styles.nextBtn, styles.nextBtnFull, requesting && styles.btnDisabled]}
                  onPress={handleEnableNotifications}
                  disabled={requesting}
                >
                  <Bell size={17} color={colors.surface} strokeWidth={2} />
                  <Text style={styles.nextLabel}>
                    {requesting ? 'Enabling…' : 'Enable Notifications'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.skipBtn, styles.maybeLaterBtn]}
                  onPress={handleMaybeLater}
                  disabled={requesting}
                >
                  <BellOff size={15} color={colors.ink3} strokeWidth={1.75} />
                  <Text style={styles.skipLabel}>Maybe Later</Text>
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 9, 0.72)',
    justifyContent: 'flex-end',
  } satisfies ViewStyle,

  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
    alignItems: 'center',
  } satisfies ViewStyle,

  avatarWrap: {
    position: 'absolute',
    top: -38,
    alignSelf: 'center',
  } satisfies ViewStyle,

  ariaLabel: {
    ...(typography.label as TextStyle),
    color: colors.accent,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  } satisfies TextStyle,

  featureBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.xs,
  } satisfies ViewStyle,
  featureBadgeText: {
    ...(typography.label as TextStyle),
    color: colors.accent,
  } satisfies TextStyle,

  stepTitle: {
    ...(typography.subheading as TextStyle),
    textAlign: 'center',
    marginBottom: spacing.xs,
  } satisfies TextStyle,

  stepMessage: {
    ...(typography.body as TextStyle),
    color: colors.ink2,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: spacing.sm,
  } satisfies TextStyle,

  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  } satisfies ViewStyle,
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceSunk,
  } satisfies ViewStyle,
  dotActive: {
    backgroundColor: colors.accent,
    width: 18,
  } satisfies ViewStyle,

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.md,
  } satisfies ViewStyle,

  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  } satisfies ViewStyle,
  skipLabel: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,

  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.button,
  } satisfies ViewStyle,
  nextBtnFull: {
    width: '100%',
    justifyContent: 'center',
  } satisfies ViewStyle,
  nextLabel: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.surface,
  } satisfies TextStyle,

  notifBtnCol: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  } satisfies ViewStyle,
  maybeLaterBtn: {
    justifyContent: 'center',
    width: '100%',
  } satisfies ViewStyle,

  btnDisabled: { opacity: 0.6 } satisfies ViewStyle,
});
