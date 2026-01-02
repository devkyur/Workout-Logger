import { supabase } from '@/shared/lib/supabase'
import type {
  WorkoutSession,
  SessionExercise,
  ExerciseSet,
  InsertExerciseSet,
  Exercise,
  Category,
} from '@/shared/lib/database.types'
import type {
  WorkoutSessionWithExercises,
  DaySummary,
} from '@/entities/workout/types'
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
      .from('workout_sessions')
      .select(`
        date,
        session_exercises!inner (
          exercises!inner (
            categories!inner (
              name
            )
          )
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)

    if (err) throw err
    if (!data) return []

    // 날짜별로 그룹핑
    const summaryMap = new Map<string, Set<string>>()

    data.forEach((session: any) => {
      session.session_exercises?.forEach((se: any) => {
        const categoryName = se.exercises?.categories?.name
        if (!categoryName) return

        if (!summaryMap.has(session.date)) {
          summaryMap.set(session.date, new Set())
        }
        summaryMap.get(session.date)!.add(categoryName)
      })
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

  // 특정 날짜 세션 조회
  async function fetchDaySession(date: string): Promise<WorkoutSessionWithExercises | null> {
    const { data, error: err } = await supabase
      .from('workout_sessions')
      .select(`
        *,
        session_exercises (
          *,
          exercises (*),
          exercise_sets (*)
        )
      `)
      .eq('date', date)
      .single()

    if (err) {
      if (err.code === 'PGRST116') return null // No rows returned
      throw err
    }
    if (!data) return null

    return {
      ...data,
      exercises:
        data.session_exercises
          ?.sort((a: any, b: any) => a.order_num - b.order_num)
          .map((se: any) => ({
            ...se,
            exercise: se.exercises,
            sets:
              se.exercise_sets?.sort(
                (a: ExerciseSet, b: ExerciseSet) => a.set_number - b.set_number
              ) ?? [],
          })) ?? [],
    }
  }

  // 세션 생성 또는 조회
  async function getOrCreateSession(userId: string, date: string): Promise<WorkoutSession> {
    // 먼저 기존 세션 확인
    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    if (existing) return existing

    // 없으면 새로 생성
    const { data: newSession, error } = await supabase
      .from('workout_sessions')
      .insert({ user_id: userId, date })
      .select()
      .single()

    if (error) throw error
    return newSession
  }

  // 세션에 운동 추가 (기존 운동이면 세트만 추가)
  async function addExerciseToSession(
    sessionId: string,
    exerciseId: string,
    sets: Omit<InsertExerciseSet, 'session_exercise_id'>[],
    memo?: string | null
  ): Promise<SessionExercise> {
    // 기존에 같은 운동이 있는지 확인
    const { data: existingExercise } = await supabase
      .from('session_exercises')
      .select('*, exercise_sets(*)')
      .eq('session_id', sessionId)
      .eq('exercise_id', exerciseId)
      .single()

    if (existingExercise) {
      // 기존 운동에 세트 추가
      const maxSetNumber = Math.max(
        0,
        ...(existingExercise.exercise_sets?.map((s: ExerciseSet) => s.set_number) ?? [0])
      )

      const newSets = sets.map((set, idx) => ({
        ...set,
        session_exercise_id: existingExercise.id,
        set_number: maxSetNumber + idx + 1,
      }))

      if (newSets.length > 0) {
        const { error } = await supabase.from('exercise_sets').insert(newSets)
        if (error) throw error
      }

      // 메모 업데이트 (새 메모가 있으면 기존 메모에 추가)
      if (memo) {
        await supabase
          .from('session_exercises')
          .update({ memo: existingExercise.memo ? `${existingExercise.memo}\n${memo}` : memo })
          .eq('id', existingExercise.id)
      }

      return existingExercise
    }

    // 새 운동 추가
    // order_num 계산
    const { data: exercises } = await supabase
      .from('session_exercises')
      .select('order_num')
      .eq('session_id', sessionId)
      .order('order_num', { ascending: false })
      .limit(1)

    const orderNum = (exercises?.[0]?.order_num ?? 0) + 1

    const { data: newExercise, error: exError } = await supabase
      .from('session_exercises')
      .insert({
        session_id: sessionId,
        exercise_id: exerciseId,
        order_num: orderNum,
        memo: memo || null,
      })
      .select()
      .single()

    if (exError) throw exError

    // 세트 추가
    if (sets.length > 0) {
      const setsWithId = sets.map((set, idx) => ({
        ...set,
        session_exercise_id: newExercise.id,
        set_number: idx + 1,
      }))

      const { error: setsError } = await supabase.from('exercise_sets').insert(setsWithId)
      if (setsError) throw setsError
    }

    return newExercise
  }

  // 세션 운동 삭제
  async function deleteSessionExercise(sessionExerciseId: string): Promise<void> {
    const { error } = await supabase
      .from('session_exercises')
      .delete()
      .eq('id', sessionExerciseId)

    if (error) throw error
  }

  // 빈 세션 삭제 (운동이 없는 세션 정리용)
  async function deleteEmptySession(sessionId: string): Promise<void> {
    const { data: exercises } = await supabase
      .from('session_exercises')
      .select('id')
      .eq('session_id', sessionId)
      .limit(1)

    if (!exercises || exercises.length === 0) {
      await supabase.from('workout_sessions').delete().eq('id', sessionId)
    }
  }

  // 세트 업데이트
  async function updateExerciseSets(
    sessionExerciseId: string,
    newSets: Omit<InsertExerciseSet, 'session_exercise_id'>[]
  ): Promise<void> {
    // 기존 세트 삭제
    await supabase.from('exercise_sets').delete().eq('session_exercise_id', sessionExerciseId)

    // 새 세트 추가
    if (newSets.length > 0) {
      const setsWithId = newSets.map((set, idx) => ({
        ...set,
        session_exercise_id: sessionExerciseId,
        set_number: idx + 1,
      }))

      const { error } = await supabase.from('exercise_sets').insert(setsWithId)
      if (error) throw error
    }
  }

  // 세션 메모 업데이트
  async function updateSessionMemo(sessionId: string, memo: string): Promise<void> {
    const { error } = await supabase
      .from('workout_sessions')
      .update({ memo })
      .eq('id', sessionId)

    if (error) throw error
  }

  return {
    // 기존 함수
    fetchCategories,
    fetchExercises,
    fetchMonthSummary,

    // 새 함수들
    fetchDaySession,
    getOrCreateSession,
    addExerciseToSession,
    deleteSessionExercise,
    deleteEmptySession,
    updateExerciseSets,
    updateSessionMemo,
  }
}
