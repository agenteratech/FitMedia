import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { addComment as addCommentWrite } from '../lib/community/posts';

export type PostComment = {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  author: { displayName: string; avatarUrl: string | null };
};

type CommentRow = { id: string; user_id: string; body: string; created_at: string };

export function useComments(postId?: string) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!postId) { setComments([]); setLoading(false); return; }
    setLoading(true);

    const { data } = await supabase
      .from('post_comments')
      .select('id, user_id, body, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    const rows = ((data ?? []) as unknown) as CommentRow[];
    const authorIds = Array.from(new Set(rows.map((r) => r.user_id)));

    const profileMap = new Map<string, { displayName: string; avatarUrl: string | null }>();
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', authorIds);
      ((profiles ?? []) as any[]).forEach((p) =>
        profileMap.set(p.user_id, { displayName: p.display_name ?? 'Athlete', avatarUrl: p.avatar_url ?? null }),
      );
    }

    setComments(
      rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        body: r.body,
        createdAt: r.created_at,
        author: profileMap.get(r.user_id) ?? { displayName: 'Athlete', avatarUrl: null },
      })),
    );
    setLoading(false);
  }, [postId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const submit = useCallback(
    async (body: string): Promise<boolean> => {
      if (!user || !postId) return false;
      setSubmitting(true);
      const { error } = await addCommentWrite(postId, user.id, body);
      setSubmitting(false);
      if (error) return false;
      await fetchComments();
      return true;
    },
    [user, postId, fetchComments],
  );

  return { comments, loading, submitting, submit, refresh: fetchComments };
}
