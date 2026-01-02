import type {
  Category,
  Exercise,
  WorkoutSession,
  SessionExercise,
  ExerciseSet,
} from '@/shared/lib/database.types'

// Re-export for convenience
export type { Category, Exercise, WorkoutSession, SessionExercise, ExerciseSet }

// 확장 타입: 세트 정보를 포함한 세션 운동
export interface SessionExerciseWithSets extends SessionExercise {
  sets: ExerciseSet[]
  exercise?: Exercise
}

// 확장 타입: 전체 세션 정보 (운동 + 세트 포함)
export interface WorkoutSessionWithExercises extends WorkoutSession {
  exercises: SessionExerciseWithSets[]
}

// 캘린더 날짜별 요약
export interface DaySummary {
  date: string
  categories: string[]
  exerciseCount: number
}
