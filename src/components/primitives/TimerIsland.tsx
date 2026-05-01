import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Pause, Play, SkipForward } from 'lucide-react-native';
import { colors, radius, spacing, shadows, typography, numericStyle } from '@/theme';

export interface TimerIslandProps {
  timeRemaining: number;
  totalTime: number;
  exerciseLabel: string;
  setLabel: string;
  onPause: () => void;
  onSkip: () => void;
  onAddTime: (delta: number) => void;
  isPaused?: boolean;
}

const RING_SIZE = 40;
const RING_STROKE = 3;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

const SPRING = { damping: 18, stiffness: 200 };

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * TimerIsland — floating rest timer.
 * Collapsed: 200×64. Expanded: 320×96.
 * Floats 96px above safe area, centered horizontally.
 * Use Reanimated withSpring for width/height transitions.
 */
export function TimerIsland({
  timeRemaining,
  totalTime,
  exerciseLabel,
  setLabel,
  onPause,
  onSkip,
  onAddTime,
  isPaused = false,
}: TimerIslandProps) {
  const [expanded, setExpanded] = useState(false);
  const animWidth = useSharedValue(200);
  const animHeight = useSharedValue(64);

  const toggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    animWidth.value = withSpring(next ? 320 : 200, SPRING);
    animHeight.value = withSpring(next ? 96 : 64, SPRING);
  }, [expanded, animWidth, animHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: animWidth.value,
    height: animHeight.value,
  }));

  const progress = totalTime > 0 ? 1 - timeRemaining / totalTime : 0;
  const dashOffset = RING_CIRC * (1 - progress);

  return (
    <Pressable onPress={toggle} style={styles.wrapper}>
      <Animated.View style={[styles.island, animatedStyle, shadows.timer]}>
        {expanded ? (
          <View style={styles.expandedLayout}>
            {/* Top row */}
            <View style={styles.expandedTop}>
              <Ring dashOffset={dashOffset} />
              <View style={styles.expandedTimeBlock}>
                <Text style={[styles.timeText, numericStyle]}>{formatTime(timeRemaining)}</Text>
                <Text style={styles.exerciseText} numberOfLines={1}>{exerciseLabel}</Text>
              </View>
              <Text style={styles.setLabel} numberOfLines={1}>{setLabel}</Text>
            </View>
            {/* Bottom row */}
            <View style={styles.expandedBottom}>
              <Pressable style={styles.controlBtn} onPress={() => onAddTime(-15)}>
                <Text style={styles.controlText}>-15</Text>
              </Pressable>
              <Pressable style={[styles.controlBtn, styles.skipBtn]} onPress={onSkip}>
                <SkipForward size={16} color={colors.ink2} strokeWidth={1.75} />
                <Text style={styles.controlText}>Skip</Text>
              </Pressable>
              <Pressable style={styles.controlBtn} onPress={() => onAddTime(15)}>
                <Text style={styles.controlText}>+15</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.collapsedLayout}>
            <Ring dashOffset={dashOffset} />
            <Text style={[styles.timeText, numericStyle]}>{formatTime(timeRemaining)}</Text>
            <Pressable style={styles.pauseBtn} onPress={onPause}>
              {isPaused
                ? <Play size={18} color={colors.ink1} strokeWidth={1.75} />
                : <Pause size={18} color={colors.ink1} strokeWidth={1.75} />
              }
            </Pressable>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function Ring({ dashOffset }: { dashOffset: number }) {
  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      {/* Track */}
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        stroke={colors.surfaceSunk}
        strokeWidth={RING_STROKE}
        fill="none"
      />
      {/* Progress */}
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        stroke={colors.accent}
        strokeWidth={RING_STROKE}
        fill="none"
        strokeDasharray={RING_CIRC}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  } satisfies ViewStyle,
  island: {
    backgroundColor: colors.surface,
    borderRadius: radius.timer,
    overflow: 'hidden',
    justifyContent: 'center',
  } satisfies ViewStyle,
  collapsedLayout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  } satisfies ViewStyle,
  timeText: {
    ...(typography.subheading as TextStyle),
    flex: 1,
    color: colors.ink1,
  } satisfies TextStyle,
  pauseBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  expandedLayout: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'space-between',
  } satisfies ViewStyle,
  expandedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  } satisfies ViewStyle,
  expandedTimeBlock: {
    flex: 1,
  } satisfies ViewStyle,
  exerciseText: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  setLabel: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  expandedBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } satisfies ViewStyle,
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
  } satisfies ViewStyle,
  skipBtn: {
    paddingHorizontal: spacing.lg,
  } satisfies ViewStyle,
  controlText: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.ink2,
    fontSize: 13,
  } satisfies TextStyle,
});
