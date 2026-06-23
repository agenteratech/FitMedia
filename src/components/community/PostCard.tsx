import React from 'react';
import { View, Text, Pressable, Share, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Trophy, Dumbbell, Medal, ChevronRight } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { Card } from '../primitives';
import type { FeedPost } from '../../../hooks/useFeed';
import { colors, spacing, typography, numericStyle, radius } from '@/theme';

function grouped(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TYPE_BADGE: Record<string, { label: string; icon: any } | null> = {
  text: null,
  photo: null,
  workout: { label: 'Workout', icon: Dumbbell },
  pr: { label: 'New PR', icon: Trophy },
  achievement: { label: 'Achievement', icon: Medal },
};

export interface PostCardProps {
  post: FeedPost;
  isOwn: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onOpenComments: () => void;
  onOpenWorkout?: () => void;
  onDelete?: () => void;
}

export function PostCard({ post, isOwn, onToggleLike, onToggleSave, onOpenComments, onOpenWorkout, onDelete }: PostCardProps) {
  const badge = TYPE_BADGE[post.type];
  const meta = post.meta ?? {};
  const showWorkout = post.type === 'workout' && (meta.totalExercises != null || meta.totalVolumeKg != null);

  const handleShare = () => {
    const who = post.author.displayName;
    const text = post.caption ? `${who}: ${post.caption}` : `${who} shared an update on FitMedia`;
    Share.share({ message: text }).catch(() => {});
  };

  return (
    <Card padding="none" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar name={post.author.displayName} uri={post.author.avatarUrl} size={42} />
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>{post.author.displayName}</Text>
          <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
        </View>
        {badge ? (
          <View style={styles.badge}>
            <badge.icon size={12} color={colors.accent} strokeWidth={2} />
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
        ) : null}
        {isOwn && onDelete ? (
          <Pressable onPress={onDelete} hitSlop={10} style={styles.moreBtn}>
            <MoreHorizontal size={18} color={colors.ink4} strokeWidth={1.75} />
          </Pressable>
        ) : null}
      </View>

      {/* Caption */}
      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

      {/* Workout summary */}
      {showWorkout ? (
        <Pressable
          onPress={isOwn ? onOpenWorkout : undefined}
          disabled={!isOwn || !onOpenWorkout}
          style={({ pressed }) => [styles.workoutCard, pressed && isOwn ? styles.workoutPressed : null]}
        >
          <View style={styles.workoutIcon}>
            <Dumbbell size={18} color={colors.accent} strokeWidth={1.75} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutTitle} numberOfLines={1}>{meta.workoutType || 'Workout'}</Text>
            <Text style={[styles.workoutMeta, numericStyle]} numberOfLines={1}>
              {meta.totalExercises != null ? `${meta.totalExercises} exercises` : ''}
              {meta.totalVolumeKg != null ? `  ·  ${grouped(meta.totalVolumeKg)} kg` : ''}
              {meta.durationMinutes != null ? `  ·  ${meta.durationMinutes} min` : ''}
            </Text>
          </View>
          {isOwn && onOpenWorkout ? <ChevronRight size={16} color={colors.ink4} strokeWidth={1.75} /> : null}
        </Pressable>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={onToggleLike} hitSlop={8}>
          <Heart
            size={20}
            color={post.likedByMe ? colors.alert : colors.ink3}
            fill={post.likedByMe ? colors.alert : 'transparent'}
            strokeWidth={1.75}
          />
          {post.likeCount > 0 ? <Text style={[styles.actionCount, numericStyle]}>{post.likeCount}</Text> : null}
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={onOpenComments} hitSlop={8}>
          <MessageCircle size={20} color={colors.ink3} strokeWidth={1.75} />
          {post.commentCount > 0 ? <Text style={[styles.actionCount, numericStyle]}>{post.commentCount}</Text> : null}
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={handleShare} hitSlop={8}>
          <Share2 size={19} color={colors.ink3} strokeWidth={1.75} />
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable style={styles.actionBtn} onPress={onToggleSave} hitSlop={8}>
          <Bookmark
            size={20}
            color={post.savedByMe ? colors.accent : colors.ink3}
            fill={post.savedByMe ? colors.accent : 'transparent'}
            strokeWidth={1.75}
          />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md } satisfies ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md } satisfies ViewStyle,
  headerText: { flex: 1 } satisfies ViewStyle,
  name: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  time: { ...(typography.caption as TextStyle), color: colors.ink3, marginTop: 1 } satisfies TextStyle,
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  } satisfies ViewStyle,
  badgeText: { ...(typography.label as TextStyle), fontSize: 10, color: colors.accent } satisfies TextStyle,
  moreBtn: { paddingLeft: spacing.xs } satisfies ViewStyle,
  caption: { ...(typography.body as TextStyle), color: colors.ink1 } satisfies TextStyle,

  // Workout summary card
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSunk,
    borderRadius: radius.input,
    padding: spacing.md,
  } satisfies ViewStyle,
  workoutPressed: { opacity: 0.7 } satisfies ViewStyle,
  workoutIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  workoutInfo: { flex: 1 } satisfies ViewStyle,
  workoutTitle: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  workoutMeta: { ...(typography.caption as TextStyle), color: colors.ink3, marginTop: 1 } satisfies TextStyle,

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  } satisfies ViewStyle,
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs } satisfies ViewStyle,
  actionCount: { ...(typography.caption as TextStyle), color: colors.ink2 } satisfies TextStyle,
});
