import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { setLike, setSave, type PostType, type WorkoutPostMeta } from '../lib/community/posts';

export type FeedScope = 'all' | 'following';

export type FeedAuthor = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  username: string | null;
};

export type FeedPost = {
  id: string;
  userId: string;
  type: PostType;
  caption: string | null;
  imageUrl: string | null;
  workoutId: string | null;
  meta: WorkoutPostMeta;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: FeedAuthor;
  likedByMe: boolean;
  savedByMe: boolean;
};

const PAGE_SIZE = 20;

type PostRow = {
  id: string;
  user_id: string;
  type: PostType;
  caption: string | null;
  image_url: string | null;
  workout_id: string | null;
  meta: WorkoutPostMeta | null;
  like_count: number;
  comment_count: number;
  created_at: string;
};

export function useFeed(scope: FeedScope = 'all') {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const page = useRef(0);

  const hydrate = useCallback(
    async (rows: PostRow[]): Promise<FeedPost[]> => {
      if (rows.length === 0) return [];
      const authorIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const postIds = rows.map((r) => r.id);

      const [profilesRes, likesRes, savesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, avatar_url, username').in('user_id', authorIds),
        user
          ? supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds)
          : Promise.resolve({ data: [] as { post_id: string }[] }),
        user
          ? supabase.from('post_saves').select('post_id').eq('user_id', user.id).in('post_id', postIds)
          : Promise.resolve({ data: [] as { post_id: string }[] }),
      ]);

      const profileMap = new Map<string, FeedAuthor>();
      ((profilesRes.data ?? []) as any[]).forEach((p) =>
        profileMap.set(p.user_id, {
          userId: p.user_id,
          displayName: p.display_name ?? 'Athlete',
          avatarUrl: p.avatar_url ?? null,
          username: p.username ?? null,
        }),
      );
      const likedSet = new Set(((likesRes.data ?? []) as { post_id: string }[]).map((r) => r.post_id));
      const savedSet = new Set(((savesRes.data ?? []) as { post_id: string }[]).map((r) => r.post_id));

      return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        caption: r.caption,
        imageUrl: r.image_url,
        workoutId: r.workout_id,
        meta: r.meta ?? {},
        likeCount: r.like_count,
        commentCount: r.comment_count,
        createdAt: r.created_at,
        author: profileMap.get(r.user_id) ?? {
          userId: r.user_id,
          displayName: 'Athlete',
          avatarUrl: null,
          username: null,
        },
        likedByMe: likedSet.has(r.id),
        savedByMe: savedSet.has(r.id),
      }));
    },
    [user],
  );

  const fetchPage = useCallback(
    async (pageNum: number, mode: 'initial' | 'refresh' | 'more') => {
      if (!user) {
        setPosts([]);
        setLoading(false);
        return;
      }
      if (mode === 'initial') setLoading(true);
      else if (mode === 'refresh') setRefreshing(true);
      else setLoadingMore(true);
      setError(null);

      // Following scope: limit to followed authors (empty → no posts).
      let followingIds: string[] | null = null;
      if (scope === 'following') {
        const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        followingIds = ((data ?? []) as { following_id: string }[]).map((r) => r.following_id);
        if (followingIds.length === 0) {
          setPosts([]);
          setHasMore(false);
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
          return;
        }
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('posts')
        .select('id, user_id, type, caption, image_url, workout_id, meta, like_count, comment_count, created_at')
        .order('created_at', { ascending: false })
        .range(from, to);
      if (followingIds) query = query.in('user_id', followingIds);

      const { data, error } = await query;

      if (error) {
        setError(error.message);
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }

      const rows = ((data ?? []) as unknown) as PostRow[];
      const hydrated = await hydrate(rows);

      setPosts((prev) => (mode === 'more' ? [...prev, ...hydrated] : hydrated));
      setHasMore(rows.length === PAGE_SIZE);
      page.current = pageNum;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [user, scope, hydrate],
  );

  useEffect(() => {
    page.current = 0;
    setHasMore(true);
    fetchPage(0, 'initial');
  }, [fetchPage]);

  const refresh = useCallback(() => fetchPage(0, 'refresh'), [fetchPage]);
  const loadMore = useCallback(() => {
    if (loadingMore || loading || refreshing || !hasMore) return;
    fetchPage(page.current + 1, 'more');
  }, [loadingMore, loading, refreshing, hasMore, fetchPage]);

  const toggleLike = useCallback(
    (postId: string) => {
      if (!user) return;
      let nextLiked = false;
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          nextLiked = !p.likedByMe;
          return { ...p, likedByMe: nextLiked, likeCount: Math.max(0, p.likeCount + (nextLiked ? 1 : -1)) };
        }),
      );
      setLike(postId, user.id, nextLiked).catch(() => {});
    },
    [user],
  );

  const toggleSave = useCallback(
    (postId: string) => {
      if (!user) return;
      let nextSaved = false;
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          nextSaved = !p.savedByMe;
          return { ...p, savedByMe: nextSaved };
        }),
      );
      setSave(postId, user.id, nextSaved).catch(() => {});
    },
    [user],
  );

  return { posts, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore, toggleLike, toggleSave };
}
