import type {
  Category,
  Exercise,
  WorkoutSession,
  SessionExercise,
  ExerciseSet,
  Routine,
  RoutineExercise,
  RoutineSet,
} from '@/shared/lib/database.types'

// Re-export for convenience
export type {
  Category,
  Exercise,
  WorkoutSession,
  SessionExercise,
  ExerciseSet,
  Routine,
  RoutineExercise,
  RoutineSet,
}

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

// 이전 운동 기록 (세트 입력 시 참조용)
export interface PreviousExerciseRecord {
  date: string
  sets: ExerciseSet[]
  memo: string | null
}

// 루틴 확장 타입: 세트 정보를 포함한 루틴 운동
export interface RoutineExerciseWithSets extends RoutineExercise {
  sets: RoutineSet[]
  exercise?: Exercise
}

// 루틴 확장 타입: 전체 루틴 정보 (운동 + 세트 포함)
export interface RoutineWithExercises extends Routine {
  exercises: RoutineExerciseWithSets[]
}

// 루틴 세트 입력용 타입
export interface RoutineSetInput {
  set_number: number
  weight?: number | null
  reps?: number | null
  duration_seconds?: number | null
}
