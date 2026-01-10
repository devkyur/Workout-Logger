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
          id: number
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: number
          name: string
          slug: string
          sort_order: number
        }
        Update: {
          id?: number
          name?: string
          slug?: string
          sort_order?: number
        }
      }
      exercises: {
        Row: {
          id: number
          category_id: number
          name: string
          is_custom: boolean
          created_by: string | null // UUID (auth.users 참조)
          created_at: string
        }
        Insert: {
          id?: number
          category_id: number
          name: string
          is_custom?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          category_id?: number
          name?: string
          is_custom?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
      workout_sessions: {
        Row: {
          id: number
          user_id: string // UUID (auth.users 참조)
          date: string
          memo: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          date: string
          memo?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          date?: string
          memo?: string | null
          created_at?: string
        }
      }
      session_exercises: {
        Row: {
          id: number
          session_id: number
          exercise_id: number
          order_num: number
          memo: string | null
          created_at: string
        }
        Insert: {
          id?: number
          session_id: number
          exercise_id: number
          order_num?: number
          memo?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          session_id?: number
          exercise_id?: number
          order_num?: number
          memo?: string | null
          created_at?: string
        }
      }
      exercise_sets: {
        Row: {
          id: number
          session_exercise_id: number
          set_number: number
          weight: number | null
          reps: number | null
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: number
          session_exercise_id: number
          set_number: number
          weight?: number | null
          reps?: number | null
          duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          session_exercise_id?: number
          set_number?: number
          weight?: number | null
          reps?: number | null
          duration_seconds?: number | null
          created_at?: string
        }
      }
      routines: {
        Row: {
          id: number
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      routine_exercises: {
        Row: {
          id: number
          routine_id: number
          exercise_id: number
          order_num: number
          created_at: string
        }
        Insert: {
          id?: number
          routine_id: number
          exercise_id: number
          order_num?: number
          created_at?: string
        }
        Update: {
          id?: number
          routine_id?: number
          exercise_id?: number
          order_num?: number
          created_at?: string
        }
      }
      routine_sets: {
        Row: {
          id: number
          routine_exercise_id: number
          set_number: number
          weight: number | null
          reps: number | null
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: number
          routine_exercise_id: number
          set_number: number
          weight?: number | null
          reps?: number | null
          duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          routine_exercise_id?: number
          set_number?: number
          weight?: number | null
          reps?: number | null
          duration_seconds?: number | null
          created_at?: string
        }
      }
      user_goals: {
        Row: {
          id: number
          user_id: string
          goal_type: string
          target_value: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          goal_type?: string
          target_value?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          goal_type?: string
          target_value?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// 편의 타입
export type Category = Database['public']['Tables']['categories']['Row']
export type Exercise = Database['public']['Tables']['exercises']['Row']
export type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row']
export type SessionExercise = Database['public']['Tables']['session_exercises']['Row']
export type ExerciseSet = Database['public']['Tables']['exercise_sets']['Row']

// Insert 타입
export type InsertWorkoutSession = Database['public']['Tables']['workout_sessions']['Insert']
export type InsertSessionExercise = Database['public']['Tables']['session_exercises']['Insert']
export type InsertExerciseSet = Database['public']['Tables']['exercise_sets']['Insert']

// 루틴 타입
export type Routine = Database['public']['Tables']['routines']['Row']
export type RoutineExercise = Database['public']['Tables']['routine_exercises']['Row']
export type RoutineSet = Database['public']['Tables']['routine_sets']['Row']
export type InsertRoutine = Database['public']['Tables']['routines']['Insert']
export type InsertRoutineExercise = Database['public']['Tables']['routine_exercises']['Insert']
export type InsertRoutineSet = Database['public']['Tables']['routine_sets']['Insert']

// 목표 타입
export type UserGoal = Database['public']['Tables']['user_goals']['Row']
export type InsertUserGoal = Database['public']['Tables']['user_goals']['Insert']
export type UpdateUserGoal = Database['public']['Tables']['user_goals']['Update']
