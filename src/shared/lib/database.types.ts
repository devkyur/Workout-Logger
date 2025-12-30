export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
      }
      exercises: {
        Row: {
          id: string
          category_id: string
          name: string
          is_custom: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          is_custom?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          is_custom?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
      workout_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          exercise_id: string
          memo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          exercise_id: string
          memo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          exercise_id?: string
          memo?: string | null
          created_at?: string
        }
      }
      workout_sets: {
        Row: {
          id: string
          workout_log_id: string
          set_number: number
          weight: number | null
          reps: number | null
          duration_seconds: number | null
        }
        Insert: {
          id?: string
          workout_log_id: string
          set_number: number
          weight?: number | null
          reps?: number | null
          duration_seconds?: number | null
        }
        Update: {
          id?: string
          workout_log_id?: string
          set_number?: number
          weight?: number | null
          reps?: number | null
          duration_seconds?: number | null
        }
      }
    }
  }
}

// 편의 타입
export type Category = Database['public']['Tables']['categories']['Row']
export type Exercise = Database['public']['Tables']['exercises']['Row']
export type WorkoutLog = Database['public']['Tables']['workout_logs']['Row']
export type WorkoutSet = Database['public']['Tables']['workout_sets']['Row']

// Insert 타입
export type InsertWorkoutLog = Database['public']['Tables']['workout_logs']['Insert']
export type InsertWorkoutSet = Database['public']['Tables']['workout_sets']['Insert']
