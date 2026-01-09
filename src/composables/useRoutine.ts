import { supabase } from '@/shared/lib/supabase'
import type {
  Routine,
  RoutineExercise,
  RoutineSet,
  InsertRoutine,
  InsertRoutineExercise,
  InsertRoutineSet,
} from '@/shared/lib/database.types'
import type {
  RoutineWithExercises,
  RoutineSetInput,
} from '@/entities/workout/types'

export function useRoutine() {
  // 전체 루틴 목록 조회 (운동 + 세트 포함)
  async function fetchRoutines(): Promise<RoutineWithExercises[]> {
    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        routine_exercises (
          *,
          exercises (*),
          routine_sets (*)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!data) return []

    return data.map((routine: any) => ({
      ...routine,
      exercises:
        routine.routine_exercises
          ?.sort((a: any, b: any) => a.order_num - b.order_num)
          .map((re: any) => ({
            ...re,
            exercise: re.exercises,
            sets:
              re.routine_sets?.sort(
                (a: RoutineSet, b: RoutineSet) => a.set_number - b.set_number
              ) ?? [],
          })) ?? [],
    }))
  }

  // 단일 루틴 조회
  async function fetchRoutine(id: number): Promise<RoutineWithExercises | null> {
    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        routine_exercises (
          *,
          exercises (*),
          routine_sets (*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    if (!data) return null

    return {
      ...data,
      exercises:
        (data as any).routine_exercises
          ?.sort((a: any, b: any) => a.order_num - b.order_num)
          .map((re: any) => ({
            ...re,
            exercise: re.exercises,
            sets:
              re.routine_sets?.sort(
                (a: RoutineSet, b: RoutineSet) => a.set_number - b.set_number
              ) ?? [],
          })) ?? [],
    }
  }

  // 루틴 생성
  async function createRoutine(
    userId: string,
    name: string,
    description?: string
  ): Promise<Routine> {
    const { data, error } = await supabase
      .from('routines')
      .insert({
        user_id: userId,
        name,
        description: description || null,
      } as InsertRoutine)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 루틴 수정
  async function updateRoutine(
    id: number,
    updates: { name?: string; description?: string | null }
  ): Promise<void> {
    const { error } = await supabase
      .from('routines')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }

  // 루틴 삭제
  async function deleteRoutine(id: number): Promise<void> {
    const { error } = await supabase.from('routines').delete().eq('id', id)
    if (error) throw error
  }

  // 루틴에 운동 추가
  async function addExerciseToRoutine(
    routineId: number,
    exerciseId: number,
    sets: RoutineSetInput[]
  ): Promise<RoutineExercise> {
    // order_num 계산
    const { data: existingExercises } = await supabase
      .from('routine_exercises')
      .select('order_num')
      .eq('routine_id', routineId)
      .order('order_num', { ascending: false })
      .limit(1)

    const orderNum = (existingExercises?.[0]?.order_num ?? 0) + 1

    // 루틴 운동 추가
    const { data: routineExercise, error: reError } = await supabase
      .from('routine_exercises')
      .insert({
        routine_id: routineId,
        exercise_id: exerciseId,
        order_num: orderNum,
      } as InsertRoutineExercise)
      .select()
      .single()

    if (reError) throw reError

    // 세트 추가
    if (sets.length > 0) {
      const setsData: InsertRoutineSet[] = sets.map((set, idx) => ({
        routine_exercise_id: routineExercise.id,
        set_number: idx + 1,
        weight: set.weight,
        reps: set.reps,
        duration_seconds: set.duration_seconds,
      }))

      const { error: setsError } = await supabase
        .from('routine_sets')
        .insert(setsData)

      if (setsError) throw setsError
    }

    return routineExercise
  }

  // 루틴 운동 세트 업데이트
  async function updateRoutineExerciseSets(
    routineExerciseId: number,
    sets: RoutineSetInput[]
  ): Promise<void> {
    // 기존 세트 삭제
    await supabase
      .from('routine_sets')
      .delete()
      .eq('routine_exercise_id', routineExerciseId)

    // 새 세트 추가
    if (sets.length > 0) {
      const setsData: InsertRoutineSet[] = sets.map((set, idx) => ({
        routine_exercise_id: routineExerciseId,
        set_number: idx + 1,
        weight: set.weight,
        reps: set.reps,
        duration_seconds: set.duration_seconds,
      }))

      const { error } = await supabase.from('routine_sets').insert(setsData)
      if (error) throw error
    }
  }

  // 루틴에서 운동 삭제
  async function removeExerciseFromRoutine(
    routineExerciseId: number
  ): Promise<void> {
    const { error } = await supabase
      .from('routine_exercises')
      .delete()
      .eq('id', routineExerciseId)

    if (error) throw error
  }

  // 루틴 운동 순서 변경
  async function reorderRoutineExercises(
    routineId: number,
    orderedIds: number[]
  ): Promise<void> {
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('routine_exercises')
        .update({ order_num: index + 1 })
        .eq('id', id)
        .eq('routine_id', routineId)
    )

    await Promise.all(updates)
  }

  // 특정 운동이 포함된 루틴 목록 조회
  async function getRoutinesByExercise(
    exerciseId: number
  ): Promise<RoutineWithExercises[]> {
    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        routine_exercises!inner (
          *,
          exercises (*),
          routine_sets (*)
        )
      `)
      .eq('routine_exercises.exercise_id', exerciseId)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!data) return []

    return data.map((routine: any) => ({
      ...routine,
      exercises:
        routine.routine_exercises
          ?.sort((a: any, b: any) => a.order_num - b.order_num)
          .map((re: any) => ({
            ...re,
            exercise: re.exercises,
            sets:
              re.routine_sets?.sort(
                (a: RoutineSet, b: RoutineSet) => a.set_number - b.set_number
              ) ?? [],
          })) ?? [],
    }))
  }

  // 루틴을 세션에 적용 (모든 운동 추가)
  async function applyRoutineToSession(
    routine: RoutineWithExercises,
    sessionId: number,
    existingExerciseIds: Set<number>
  ): Promise<{ added: number; skipped: number }> {
    let added = 0
    let skipped = 0

    // 기존 세션의 최대 order_num 조회
    const { data: existingSessionExercises } = await supabase
      .from('session_exercises')
      .select('order_num')
      .eq('session_id', sessionId)
      .order('order_num', { ascending: false })
      .limit(1)

    let orderNum = existingSessionExercises?.[0]?.order_num ?? 0

    for (const routineExercise of routine.exercises) {
      // 이미 있는 운동은 건너뛰기
      if (existingExerciseIds.has(routineExercise.exercise_id)) {
        skipped++
        continue
      }

      orderNum++

      // 세션 운동 추가
      const { data: sessionExercise, error: seError } = await supabase
        .from('session_exercises')
        .insert({
          session_id: sessionId,
          exercise_id: routineExercise.exercise_id,
          order_num: orderNum,
        })
        .select()
        .single()

      if (seError) throw seError

      // 세트 추가
      if (routineExercise.sets.length > 0) {
        const setsData = routineExercise.sets.map((set, idx) => ({
          session_exercise_id: sessionExercise.id,
          set_number: idx + 1,
          weight: set.weight,
          reps: set.reps,
          duration_seconds: set.duration_seconds,
        }))

        const { error: setsError } = await supabase
          .from('exercise_sets')
          .insert(setsData)

        if (setsError) throw setsError
      }

      added++
    }

    return { added, skipped }
  }

  return {
    fetchRoutines,
    fetchRoutine,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    addExerciseToRoutine,
    updateRoutineExerciseSets,
    removeExerciseFromRoutine,
    reorderRoutineExercises,
    getRoutinesByExercise,
    applyRoutineToSession,
  }
}
