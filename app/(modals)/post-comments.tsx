import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Send, MessageCircle } from 'lucide-react-native';
import { useComments } from '../../hooks/useComments';
import { Avatar } from '../../src/components/community/Avatar';
import { colors, spacing, typography, radius } from '../../src/theme';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PostCommentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const { comments, loading, submitting, submit } = useComments(postId);
  const [draft, setDraft] = useState('');

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    const ok = await submit(body);
    if (!ok) setDraft(body); // restore on failure
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.title}>Comments</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.ink3} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <Avatar name={item.author.displayName} uri={item.author.avatarUrl} size={36} />
                <View style={styles.commentBody}>
                  <View style={styles.commentTop}>
                    <Text style={styles.commentName} numberOfLines={1}>{item.author.displayName}</Text>
                    <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentText}>{item.body}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <MessageCircle size={26} color={colors.ink4} strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyText}>No comments yet. Be the first to reply.</Text>
              </View>
            }
          />
        )}

        {/* Composer */}
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a comment…"
            placeholderTextColor={colors.ink3}
            style={styles.composerInput}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim() || submitting}
            style={[styles.sendBtn, (!draft.trim() || submitting) && styles.sendBtnDisabled]}
          >
            <Send size={18} color={colors.surface} strokeWidth={2} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg } satisfies ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  } satisfies ViewStyle,
  title: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' } satisfies ViewStyle,
  listContent: { padding: spacing['2xl'], gap: spacing.lg, flexGrow: 1 } satisfies ViewStyle,

  commentRow: { flexDirection: 'row', gap: spacing.md } satisfies ViewStyle,
  commentBody: { flex: 1, gap: 2 } satisfies ViewStyle,
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } satisfies ViewStyle,
  commentName: { ...(typography.bodyMedium as TextStyle), fontSize: 14, flexShrink: 1 } satisfies TextStyle,
  commentTime: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  commentText: { ...(typography.body as TextStyle), color: colors.ink1 } satisfies TextStyle,

  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing['4xl'] } satisfies ViewStyle,
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  emptyText: { ...(typography.caption as TextStyle), color: colors.ink3, textAlign: 'center' } satisfies TextStyle,

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  } satisfies ViewStyle,
  composerInput: {
    ...(typography.body as TextStyle),
    flex: 1,
    maxHeight: 120,
    color: colors.ink1,
    backgroundColor: colors.surfaceSunk,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  } satisfies TextStyle,
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  sendBtnDisabled: { backgroundColor: colors.ink4 } satisfies ViewStyle,
});
