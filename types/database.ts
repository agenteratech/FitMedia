export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          height_cm: number | null;
          weight_kg: number | null;
          age: number | null;
          gender: Database['public']['Enums']['gender'] | null;
          fitness_level: Database['public']['Enums']['fitness_level'] | null;
          goal: Database['public']['Enums']['goal'] | null;
          avg_sleep_hours: number | null;
          diet_consistency: Database['public']['Enums']['diet_consistency'] | null;
          preferred_units: 'metric' | 'imperial';
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          age?: number | null;
          gender?: Database['public']['Enums']['gender'] | null;
          fitness_level?: Database['public']['Enums']['fitness_level'] | null;
          goal?: Database['public']['Enums']['goal'] | null;
          avg_sleep_hours?: number | null;
          diet_consistency?: Database['public']['Enums']['diet_consistency'] | null;
          preferred_units?: 'metric' | 'imperial';
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          age?: number | null;
          gender?: Database['public']['Enums']['gender'] | null;
          fitness_level?: Database['public']['Enums']['fitness_level'] | null;
          goal?: Database['public']['Enums']['goal'] | null;
          avg_sleep_hours?: number | null;
          diet_consistency?: Database['public']['Enums']['diet_consistency'] | null;
          preferred_units?: 'metric' | 'imperial';
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          force: string | null;
          level: string | null;
          mechanic: string | null;
          equipment: string | null;
          primary_muscles: string[];
          secondary_muscles: string[];
          instructions: string[];
          exercise_type: string;
          images: string[];
          body_part: string | null;
          is_custom: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          force?: string | null;
          level?: string | null;
          mechanic?: string | null;
          equipment?: string | null;
          primary_muscles?: string[];
          secondary_muscles?: string[];
          instructions?: string[];
          exercise_type?: string;
          images?: string[];
          body_part?: string | null;
          is_custom?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          force?: string | null;
          level?: string | null;
          mechanic?: string | null;
          equipment?: string | null;
          primary_muscles?: string[];
          secondary_muscles?: string[];
          instructions?: string[];
          exercise_type?: string;
          images?: string[];
          body_part?: string | null;
          is_custom?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_categories: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          icon: string | null;
          description: string | null;
          target_muscles: string[] | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          icon?: string | null;
          description?: string | null;
          target_muscles?: string[] | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          icon?: string | null;
          description?: string | null;
          target_muscles?: string[] | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_category_exercises: {
        Row: {
          id: string;
          category_id: string;
          exercise_id: string;
          is_default: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          category_id: string;
          exercise_id: string;
          is_default?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          category_id?: string;
          exercise_id?: string;
          is_default?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      user_routines: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
          last_used_at: string | null;
          use_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
          last_used_at?: string | null;
          use_count?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
          last_used_at?: string | null;
          use_count?: number;
        };
        Relationships: [];
      };
      user_routine_exercises: {
        Row: {
          id: string;
          routine_id: string;
          exercise_id: string;
          order_index: number;
          default_sets: number;
          default_reps: number;
          default_rir: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          routine_id: string;
          exercise_id: string;
          order_index?: number;
          default_sets?: number;
          default_reps?: number;
          default_rir?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          routine_id?: string;
          exercise_id?: string;
          order_index?: number;
          default_sets?: number;
          default_reps?: number;
          default_rir?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          workout_type: string;
          routine_id: string | null;
          category_id: string | null;
          score_earned: number;
          duration_minutes: number | null;
          total_volume_kg: number;
          total_sets: number;
          total_exercises: number;
          body_parts_hit: Json;
          started_at: string | null;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_type: string;
          routine_id?: string | null;
          category_id?: string | null;
          score_earned?: number;
          duration_minutes?: number | null;
          total_volume_kg?: number;
          total_sets?: number;
          total_exercises?: number;
          body_parts_hit?: Json;
          started_at?: string | null;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workout_type?: string;
          routine_id?: string | null;
          category_id?: string | null;
          score_earned?: number;
          duration_minutes?: number | null;
          total_volume_kg?: number;
          total_sets?: number;
          total_exercises?: number;
          body_parts_hit?: Json;
          started_at?: string | null;
          completed_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_exercises: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string | null;
          exercise_name: string;
          exercise_target: string | string[] | null;
          order_index: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_id?: string | null;
          exercise_name: string;
          exercise_target?: string | string[] | null;
          order_index: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_id?: string;
          exercise_id?: string | null;
          exercise_name?: string;
          exercise_target?: string | string[] | null;
          order_index?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_sets: {
        Row: {
          id: string;
          workout_exercise_id: string;
          set_number: number;
          weight_kg: number;
          reps: number;
          rir: number | null;
          rpe: number | null;
          set_type: Database['public']['Enums']['set_type'];
          duration_seconds: number | null;
          distance_meters: number | null;
          is_pr: boolean;
          is_completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_exercise_id: string;
          set_number: number;
          weight_kg?: number;
          reps?: number;
          rir?: number | null;
          rpe?: number | null;
          set_type?: Database['public']['Enums']['set_type'];
          duration_seconds?: number | null;
          distance_meters?: number | null;
          is_pr?: boolean;
          is_completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_exercise_id?: string;
          set_number?: number;
          weight_kg?: number;
          reps?: number;
          rir?: number | null;
          rpe?: number | null;
          set_type?: Database['public']['Enums']['set_type'];
          duration_seconds?: number | null;
          distance_meters?: number | null;
          is_pr?: boolean;
          is_completed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      diet_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          meal_type: Database['public']['Enums']['meal_type'] | null;
          description: string | null;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fats_g: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          meal_type?: Database['public']['Enums']['meal_type'] | null;
          description?: string | null;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fats_g?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          meal_type?: Database['public']['Enums']['meal_type'] | null;
          description?: string | null;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fats_g?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      sleep_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          hours: number;
          quality: Database['public']['Enums']['sleep_quality'] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          hours: number;
          quality?: Database['public']['Enums']['sleep_quality'] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          hours?: number;
          quality?: Database['public']['Enums']['sleep_quality'] | null;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_scores: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          workout_score: number;
          diet_score: number;
          sleep_score: number;
          balance_score: number;
          total_score: number;
          body_part_scores: Json;
          insights: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          workout_score?: number;
          diet_score?: number;
          sleep_score?: number;
          balance_score?: number;
          total_score?: number;
          body_part_scores?: Json;
          insights?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          workout_score?: number;
          diet_score?: number;
          sleep_score?: number;
          balance_score?: number;
          total_score?: number;
          body_part_scores?: Json;
          insights?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      muscle_stats: {
        Row: {
          id: string;
          user_id: string;
          muscle_group: 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';
          current_stat: number;
          all_time_max: number;
          last_trained_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          muscle_group: 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';
          current_stat?: number;
          all_time_max?: number;
          last_trained_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          muscle_group?: 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';
          current_stat?: number;
          all_time_max?: number;
          last_trained_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      personal_records: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string;
          weight_kg: number;
          reps: number;
          achieved_at: string;
          workout_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_id: string;
          weight_kg: number;
          reps: number;
          achieved_at?: string;
          workout_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_id?: string;
          weight_kg?: number;
          reps?: number;
          achieved_at?: string;
          workout_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      initial_strength: {
        Row: {
          id: string;
          user_id: string;
          push_exercise: string | null;
          push_weight_kg: number | null;
          push_reps: number | null;
          pull_exercise: string | null;
          pull_weight_kg: number | null;
          pull_reps: number | null;
          legs_exercise: string | null;
          legs_weight_kg: number | null;
          legs_reps: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          push_exercise?: string | null;
          push_weight_kg?: number | null;
          push_reps?: number | null;
          pull_exercise?: string | null;
          pull_weight_kg?: number | null;
          pull_reps?: number | null;
          legs_exercise?: string | null;
          legs_weight_kg?: number | null;
          legs_reps?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          push_exercise?: string | null;
          push_weight_kg?: number | null;
          push_reps?: number | null;
          pull_exercise?: string | null;
          pull_weight_kg?: number | null;
          pull_reps?: number | null;
          legs_exercise?: string | null;
          legs_weight_kg?: number | null;
          legs_reps?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_streaks: {
        Row: {
          user_id: string;
          display_name: string;
          current_streak: number;
          longest_streak: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string;
          current_streak?: number;
          longest_streak?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string;
          current_streak?: number;
          longest_streak?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          username: string | null;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          post_count: number;
          follower_count: number;
          following_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          username?: string | null;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          post_count?: number;
          follower_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          username?: string | null;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          post_count?: number;
          follower_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          type: 'text' | 'workout' | 'pr' | 'achievement' | 'photo';
          caption: string | null;
          image_url: string | null;
          workout_id: string | null;
          meta: Json;
          like_count: number;
          comment_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: 'text' | 'workout' | 'pr' | 'achievement' | 'photo';
          caption?: string | null;
          image_url?: string | null;
          workout_id?: string | null;
          meta?: Json;
          like_count?: number;
          comment_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'text' | 'workout' | 'pr' | 'achievement' | 'photo';
          caption?: string | null;
          image_url?: string | null;
          workout_id?: string | null;
          meta?: Json;
          like_count?: number;
          comment_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      post_likes: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: { post_id: string; user_id: string; created_at?: string };
        Update: { post_id?: string; user_id?: string; created_at?: string };
        Relationships: [];
      };
      post_comments: {
        Row: { id: string; post_id: string; user_id: string; body: string; created_at: string };
        Insert: { id?: string; post_id: string; user_id: string; body: string; created_at?: string };
        Update: { id?: string; post_id?: string; user_id?: string; body?: string; created_at?: string };
        Relationships: [];
      };
      post_saves: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: { post_id: string; user_id: string; created_at?: string };
        Update: { post_id?: string; user_id?: string; created_at?: string };
        Relationships: [];
      };
      follows: {
        Row: { follower_id: string; following_id: string; created_at: string };
        Insert: { follower_id: string; following_id: string; created_at?: string };
        Update: { follower_id?: string; following_id?: string; created_at?: string };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      gender: 'male' | 'female' | 'other';
      fitness_level: 'beginner' | 'intermediate' | 'advanced';
      goal: 'bulk' | 'cut' | 'maintain';
      diet_consistency: 'consistent' | 'somewhat' | 'not_tracking';
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      sleep_quality: 'good' | 'okay' | 'poor';
      set_type: 'warmup' | 'normal' | 'dropset' | 'failure' | 'amrap';
    };
    CompositeTypes: {};
  };
};
