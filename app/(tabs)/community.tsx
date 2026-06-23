import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Crown, Trophy, Users, Target, Flame } from 'lucide-react-native';
import { useFeed, type FeedScope, type FeedPost } from '../../hooks/useFeed';
import { useLeaderboard, type LeaderboardEntry } from '../../hooks/useLeaderboard';
import { useAuthStore } from '../../stores/authStore';
import { deletePost } from '../../lib/community/posts';
import { PostCard } from '../../src/components/community/PostCard';
import { Avatar } from '../../src/components/community/Avatar';
import { colors, spacing, typography, numericStyle, radius } from '../../src/theme';

const TABS = ['Feed', 'Following', 'Leaderboard', 'Challenges'] as const;
type CommunityTab = (typeof TABS)[number];

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<CommunityTab>('Feed');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={typography.heading}>Community</Text>
      </View>

      {/* Sub-tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t} style={styles.tab} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]} numberOfLines={1}>{t}</Text>
            <View style={[styles.tabUnderline, tab === t && styles.tabUnderlineActive]} />
          </Pressable>
        ))}
      </View>

      {tab === 'Feed' && <FeedList scope="all" bottomInset={insets.bottom} />}
      {tab === 'Following' && <FeedList scope="following" bottomInset={insets.bottom} />}
      {tab === 'Leaderboard' && <LeaderboardView bottomInset={insets.bottom} />}
      {tab === 'Challenges' && <ChallengesView bottomInset={insets.bottom} />}
    </SafeAreaView>
  );
}

// ── Feed ─────────────────────────────────────────────────────────────────────
function FeedList({ scope, bottomInset }: { scope: FeedScope; bottomInset: number }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { posts, loading, refreshing, loadingMore, hasMore, refresh, loadMore, toggleLike, toggleSave } = useFeed(scope);

  // Keep counts fresh after returning from create-post / comments.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const storyAuthors = useMemo(() => {
    const seen = new Set<string>();
    const out: FeedPost['author'][] = [];
    for (const p of posts) {
      if (p.userId === user?.id || seen.has(p.userId)) continue;
      seen.add(p.userId);
      out.push(p.author);
      if (out.length >= 12) break;
    }
    return out;
  }, [posts, user]);

  const handleDelete = (post: FeedPost) => {
    if (!user) return;
    Alert.alert('Delete Post', 'Delete this post? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePost(post.id, user.id);
          refresh();
        },
      },
    ]);
  };

  const renderHeader = () =>
    scope === 'all' ? (
      <View style={styles.storiesWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesRow}>
          <Pressable style={styles.story} onPress={() => router.push('/(modals)/create-post')}>
            <View style={styles.storyAddRing}>
              <Plus size={22} color={colors.accent} strokeWidth={2} />
            </View>
            <Text style={styles.storyName} numberOfLines={1}>Your story</Text>
          </Pressable>
          {storyAuthors.map((a) => (
            <View key={a.userId} style={styles.story}>
              <Avatar name={a.displayName} uri={a.avatarUrl} size={56} ring />
              <Text style={styles.storyName} numberOfLines={1}>{a.displayName.split(' ')[0]}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    ) : null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            isOwn={item.userId === user?.id}
            onToggleLike={() => toggleLike(item.id)}
            onToggleSave={() => toggleSave(item.id)}
            onOpenComments={() => router.push({ pathname: '/(modals)/post-comments', params: { postId: item.id } })}
            onOpenWorkout={
              item.workoutId
                ? () => router.push({ pathname: '/(modals)/workout-detail', params: { workoutId: item.workoutId as string } })
                : undefined
            }
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 120 }]}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" color={colors.ink3} style={{ marginVertical: spacing.lg }} /> : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Users size={28} color={colors.ink4} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>{scope === 'following' ? 'No posts from people you follow' : 'No posts yet'}</Text>
            <Text style={styles.emptyText}>
              {scope === 'following'
                ? 'Follow other athletes to see their workouts, PRs and progress here.'
                : 'Be the first to share a workout, PR or update with the community.'}
            </Text>
          </View>
        }
      />

      {/* Compose FAB */}
      <Pressable
        style={[styles.fab, { bottom: bottomInset + 104 }]}
        onPress={() => router.push('/(modals)/create-post')}
        accessibilityLabel="Create post"
      >
        <Plus size={24} color={colors.surface} strokeWidth={2.25} />
      </Pressable>
    </View>
  );
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
function LeaderboardView({ bottomInset }: { bottomInset: number }) {
  const { entries, currentUser, loading } = useLeaderboard(50);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Trophy size={28} color={colors.ink4} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>No rankings yet</Text>
        <Text style={styles.emptyText}>Log workouts to build a streak and climb the leaderboard.</Text>
      </View>
    );
  }

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  // Order podium visually as 2 · 1 · 3.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as LeaderboardEntry[];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.lbCaption}>Ranked by current workout streak</Text>

      {/* Podium */}
      <View style={styles.podium}>
        {podiumOrder.map((e) => {
          const isFirst = e.rank === 1;
          return (
            <View key={e.userId} style={[styles.podiumCol, isFirst && styles.podiumFirst]}>
              {isFirst ? <Crown size={20} color={colors.accent} strokeWidth={2} style={{ marginBottom: 2 }} /> : null}
              <Avatar name={e.displayName} size={isFirst ? 64 : 52} ring={isFirst} />
              <Text style={styles.podiumName} numberOfLines={1}>{e.isCurrentUser ? 'You' : e.displayName.split(' ')[0]}</Text>
              <View style={styles.podiumStreak}>
                <Flame size={12} color={colors.accent} strokeWidth={2} />
                <Text style={[styles.podiumStreakText, numericStyle]}>{e.currentStreak}</Text>
              </View>
              <View style={[styles.podiumRankBadge, isFirst && styles.podiumRankBadgeFirst]}>
                <Text style={styles.podiumRankText}>{e.rank}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Rest of the list */}
      {rest.map((e) => (
        <LeaderboardRow key={e.userId} entry={e} />
      ))}

      {currentUser ? (
        <View style={styles.yourRank}>
          <Text style={styles.yourRankLabel}>Your rank</Text>
          <LeaderboardRow entry={currentUser} highlight />
        </View>
      ) : null}
    </ScrollView>
  );
}

function LeaderboardRow({ entry, highlight }: { entry: LeaderboardEntry; highlight?: boolean }) {
  return (
    <View style={[styles.lbRow, (highlight || entry.isCurrentUser) && styles.lbRowMe]}>
      <Text style={[styles.lbRank, numericStyle]}>{entry.rank}</Text>
      <Avatar name={entry.displayName} size={36} />
      <Text style={styles.lbName} numberOfLines={1}>{entry.isCurrentUser ? 'You' : entry.displayName}</Text>
      <View style={styles.lbStreak}>
        <Flame size={13} color={colors.accent} strokeWidth={2} />
        <Text style={[styles.lbStreakText, numericStyle]}>{entry.currentStreak}</Text>
      </View>
    </View>
  );
}

// ── Challenges (Phase 2 placeholder) ─────────────────────────────────────────
function ChallengesView({ bottomInset }: { bottomInset: number }) {
  return (
    <View style={[styles.centered, { paddingBottom: bottomInset + 96 }]}>
      <View style={styles.emptyIcon}>
        <Target size={28} color={colors.ink4} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>Challenges are coming soon</Text>
      <Text style={styles.emptyText}>
        Push-up, steps, protein and sleep challenges with XP rewards are on the way. Keep logging to be ready.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg } satisfies ViewStyle,
  header: { paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md } satisfies ViewStyle,

  // Sub-tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  } satisfies ViewStyle,
  tab: { flex: 1, alignItems: 'center', paddingTop: spacing.xs } satisfies ViewStyle,
  tabLabel: { ...(typography.caption as TextStyle), color: colors.ink3, paddingBottom: spacing.sm } satisfies TextStyle,
  tabLabelActive: { color: colors.accent, fontFamily: typography.bodyMedium.fontFamily } satisfies TextStyle,
  tabUnderline: { height: 2, width: '70%', backgroundColor: 'transparent', borderRadius: 2 } satisfies ViewStyle,
  tabUnderlineActive: { backgroundColor: colors.accent } satisfies ViewStyle,

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing['2xl'] } satisfies ViewStyle,
  listContent: { paddingHorizontal: spacing['2xl'], paddingTop: spacing.lg } satisfies ViewStyle,

  // Stories
  storiesWrap: { marginBottom: spacing.lg, marginHorizontal: -spacing['2xl'] } satisfies ViewStyle,
  storiesRow: { paddingHorizontal: spacing['2xl'], gap: spacing.lg } satisfies ViewStyle,
  story: { alignItems: 'center', gap: spacing.xs, width: 64 } satisfies ViewStyle,
  storyAddRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  storyName: { ...(typography.caption as TextStyle), fontSize: 11, color: colors.ink2 } satisfies TextStyle,

  // Empty
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing['4xl'], paddingHorizontal: spacing.lg } satisfies ViewStyle,
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  emptyTitle: { ...(typography.subheading as TextStyle), textAlign: 'center' } satisfies TextStyle,
  emptyText: { ...(typography.caption as TextStyle), color: colors.ink3, textAlign: 'center' } satisfies TextStyle,

  // FAB
  fab: {
    position: 'absolute',
    right: spacing['2xl'],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  } satisfies ViewStyle,

  // Leaderboard
  lbCaption: { ...(typography.caption as TextStyle), color: colors.ink3, marginBottom: spacing.lg, textAlign: 'center' } satisfies TextStyle,
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  } satisfies ViewStyle,
  podiumCol: { alignItems: 'center', gap: spacing.xs, flex: 1 } satisfies ViewStyle,
  podiumFirst: { marginBottom: spacing.md } satisfies ViewStyle,
  podiumName: { ...(typography.bodyMedium as TextStyle), fontSize: 13 } satisfies TextStyle,
  podiumStreak: { flexDirection: 'row', alignItems: 'center', gap: 3 } satisfies ViewStyle,
  podiumStreakText: { ...(typography.caption as TextStyle), color: colors.ink2 } satisfies TextStyle,
  podiumRankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  podiumRankBadgeFirst: { backgroundColor: colors.accentSoft } satisfies ViewStyle,
  podiumRankText: { ...(typography.label as TextStyle), fontSize: 11, color: colors.ink2 } satisfies TextStyle,

  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.input,
  } satisfies ViewStyle,
  lbRowMe: { backgroundColor: colors.accentSoft } satisfies ViewStyle,
  lbRank: { ...(typography.bodyMedium as TextStyle), color: colors.ink3, width: 24, textAlign: 'center' } satisfies TextStyle,
  lbName: { ...(typography.body as TextStyle), flex: 1 } satisfies TextStyle,
  lbStreak: { flexDirection: 'row', alignItems: 'center', gap: 3 } satisfies ViewStyle,
  lbStreakText: { ...(typography.bodyMedium as TextStyle), color: colors.ink2 } satisfies TextStyle,

  yourRank: { marginTop: spacing.lg, gap: spacing.xs } satisfies ViewStyle,
  yourRankLabel: { ...(typography.label as TextStyle), color: colors.ink3, paddingHorizontal: spacing.md } satisfies TextStyle,
});
