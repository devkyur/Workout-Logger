import type { Category, Exercise, WorkoutLog, WorkoutSet } from '@/shared/lib/database.types'

// Re-export for convenience
export type { Category, Exercise, WorkoutLog, WorkoutSet }

// 확장 타입: 세트 정보를 포함한 운동 기록
export interface WorkoutLogWithSets extends WorkoutLog {
  sets: WorkoutSet[]
  exercise?: Exercise
}

// 캘린더 날짜별 요약
export interface DaySummary {
  date: string
  categories: string[]
  exerciseCount: number
}
