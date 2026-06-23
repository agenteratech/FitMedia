import { supabase } from '../supabase';

export type PostType = 'text' | 'workout' | 'pr' | 'achievement' | 'photo';

export type WorkoutPostMeta = {
  workoutType?: string;
  totalVolumeKg?: number;
  totalExercises?: number;
  totalSets?: number;
  durationMinutes?: number | null;
};

/**
 * Ensures a public profile row exists for the user. The DB trigger + backfill
 * normally handle this, but composing a post upserts defensively so a missing
 * row never blocks posting.
 */
export async function ensureProfile(userId: string, displayName?: string | null): Promise<void> {
  await supabase
    .from('profiles')
    .upsert(
      { user_id: userId, display_name: displayName?.trim() || 'Athlete' },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
}

export async function createPost(params: {
  userId: string;
  type: PostType;
  caption: string;
  workoutId?: string | null;
  meta?: WorkoutPostMeta;
}): Promise<{ error: string | null }> {
  const { userId, type, caption, workoutId, meta } = params;
  const { error } = await supabase.from('posts').insert({
    user_id: userId,
    type,
    caption: caption.trim() || null,
    workout_id: workoutId ?? null,
    meta: (meta ?? {}) as Record<string, unknown>,
  });
  return { error: error?.message ?? null };
}

export async function deletePost(postId: string, userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function setLike(postId: string, userId: string, liked: boolean): Promise<void> {
  if (liked) {
    await supabase.from('post_likes').upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
  } else {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  }
}

export async function setSave(postId: string, userId: string, saved: boolean): Promise<void> {
  if (saved) {
    await supabase.from('post_saves').upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
  } else {
    await supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', userId);
  }
}

export async function addComment(postId: string, userId: string, body: string): Promise<{ error: string | null }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: 'Comment is empty.' };
  const { error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: userId, body: trimmed });
  return { error: error?.message ?? null };
}

export async function setFollow(followerId: string, followingId: string, follow: boolean): Promise<void> {
  if (follow) {
    await supabase.from('follows').upsert(
      { follower_id: followerId, following_id: followingId },
      { onConflict: 'follower_id,following_id', ignoreDuplicates: true },
    );
  } else {
    await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);
  }
}
