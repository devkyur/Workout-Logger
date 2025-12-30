import { supabase } from '@/shared/lib/supabase'
import type {
  WorkoutLog,
  WorkoutSet,
  InsertWorkoutLog,
  InsertWorkoutSet,
  Exercise,
  Category,
} from '@/shared/lib/database.types'
import type { WorkoutLogWithSets, DaySummary } from '@/entities/workout/types'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export function useWorkout() {
  // 카테고리 목록 조회
  async function fetchCategories(): Promise<Category[]> {
    const { data, error: err } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')

    if (err) throw err
    return data ?? []
  }

  // 운동 종목 조회 (카테고리 필터 선택적)
  async function fetchExercises(categoryId?: string): Promise<Exercise[]> {
    let query = supabase.from('exercises').select('*').order('name')

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error: err } = await query
    if (err) throw err
    return data ?? []
  }

  // 월별 운동 기록 요약 조회 (캘린더용)
  async function fetchMonthSummary(year: number, month: number): Promise<DaySummary[]> {
    const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')

    const { data, error: err } = await supabase
      .from('workout_logs')
      .select(`
        date,
        exercises!inner (
          categories!inner (
            name
          )
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)

    if (err) throw err
    if (!data) return []

    // 날짜별로 그룹핑
    const summaryMap = new Map<string, Set<string>>()

    data.forEach((log: any) => {
      const categoryName = log.exercises?.categories?.name
      if (!categoryName) return

      if (!summaryMap.has(log.date)) {
        summaryMap.set(log.date, new Set())
      }
      summaryMap.get(log.date)!.add(categoryName)
    })

    // DaySummary 배열로 변환
    const result: DaySummary[] = []
    summaryMap.forEach((categories, date) => {
      result.push({
        date,
        categories: Array.from(categories),
        exerciseCount: categories.size,
      })
    })

    return result
  }

  // 특정 날짜 운동 기록 상세 조회
  async function fetchDayWorkouts(date: string): Promise<WorkoutLogWithSets[]> {
    const { data, error: err } = await supabase
      .from('workout_logs')
      .select(`
        *,
        exercises (*),
        workout_sets (*)
      `)
      .eq('date', date)
      .order('created_at')

    if (err) throw err
    if (!data) return []

    return data.map((log: any) => ({
      ...log,
      exercise: log.exercises,
      sets: log.workout_sets?.sort((a: WorkoutSet, b: WorkoutSet) => a.set_number - b.set_number) ?? [],
    }))
  }

  // 운동 기록 저장
  async function saveWorkoutLog(
    log: InsertWorkoutLog,
    sets: Omit<InsertWorkoutSet, 'workout_log_id'>[]
  ): Promise<WorkoutLog> {
    // 1. workout_log 저장
    const { data: savedLog, error: logError } = await supabase
      .from('workout_logs')
      .insert(log)
      .select()
      .single()

    if (logError) throw logError

    // 2. workout_sets 저장
    if (sets.length > 0) {
      const setsWithLogId = sets.map((set) => ({
        ...set,
        workout_log_id: savedLog.id,
      }))

      const { error: setsError } = await supabase
        .from('workout_sets')
        .insert(setsWithLogId)

      if (setsError) throw setsError
    }

    return savedLog
  }

  // 운동 기록 삭제
  async function deleteWorkoutLog(logId: string): Promise<void> {
    // workout_sets는 CASCADE로 자동 삭제 (DB 설정 필요)
    const { error: err } = await supabase
      .from('workout_logs')
      .delete()
      .eq('id', logId)

    if (err) throw err
  }

  // 운동 기록 수정
  async function updateWorkoutLog(
    logId: string,
    updates: Partial<WorkoutLog>,
    newSets?: Omit<InsertWorkoutSet, 'workout_log_id'>[]
  ): Promise<void> {
    // 1. workout_log 업데이트
    const { error: logError } = await supabase
      .from('workout_logs')
      .update(updates)
      .eq('id', logId)

    if (logError) throw logError

    // 2. 세트 교체 (기존 삭제 후 새로 추가)
    if (newSets) {
      await supabase.from('workout_sets').delete().eq('workout_log_id', logId)

      if (newSets.length > 0) {
        const setsWithLogId = newSets.map((set) => ({
          ...set,
          workout_log_id: logId,
        }))

        const { error: setsError } = await supabase
          .from('workout_sets')
          .insert(setsWithLogId)

        if (setsError) throw setsError
      }
    }
  }

  return {
    fetchCategories,
    fetchExercises,
    fetchMonthSummary,
    fetchDayWorkouts,
    saveWorkoutLog,
    deleteWorkoutLog,
    updateWorkoutLog,
  }
}
