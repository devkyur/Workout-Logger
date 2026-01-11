import { supabase } from '@/shared/lib/supabase'
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, parseISO } from 'date-fns'

export interface StreakData {
  currentStreak: number
  maxStreak: number
  maxStreakDate: string | null
  weekdays: boolean[] // 이번 주 월~일 운동 여부
}

export interface PRRecord {
  exerciseId: number
  exerciseName: string
  weight: number
  date: string
}

export interface MonthlySummary {
  workoutDays: number
  totalDays: number
  totalVolume: number
  totalSets: number
  prevWorkoutDays: number | null
  prevTotalVolume: number | null
}

export interface HeatmapData {
  date: string
  setCount: number
}

export interface BalanceData {
  categoryId: number
  categoryName: string
  setCount: number
  percentage: number
}

export interface ProgressDataPoint {
  date: string
  estimated1RM: number
}

export interface ProgressData {
  exerciseId: number
  exerciseName: string
  dataPoints: ProgressDataPoint[]
  current1RM: number | null
  previous1RM: number | null
  changeKg: number | null
  changePercent: number | null
}

export interface WeeklyGoal {
  id: number
  targetValue: number
  currentValue: number
  percentage: number
}

// 1RM 계산 (Epley 공식)
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  if (reps === 0 || weight === 0) return 0
  return Math.round(weight * (1 + reps / 30))
}

export function useStats() {
  // 스트릭 계산
  async function fetchStreak(userId: string): Promise<StreakData> {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) throw error

    const dates = data?.map(d => d.date) ?? []
    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

    // 현재 스트릭 계산 (오늘 또는 어제부터 시작)
    let currentStreak = 0
    if (dates.length > 0) {
      const startDate = dates[0] === today ? today : dates[0] === yesterday ? yesterday : null

      if (startDate) {
        currentStreak = 1
        let checkDate = startDate

        for (let i = 1; i < dates.length; i++) {
          const prevDay = format(subDays(parseISO(checkDate), 1), 'yyyy-MM-dd')
          if (dates[i] === prevDay) {
            currentStreak++
            checkDate = prevDay
          } else {
            break
          }
        }
      }
    }

    // 최장 스트릭 계산
    let maxStreak = 0
    let maxStreakDate: string | null = null
    let tempStreak = 0
    let tempStreakStart: string | null = null

    const sortedDates = [...dates].sort()
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1
        tempStreakStart = sortedDates[i]
      } else {
        const prevDate = parseISO(sortedDates[i - 1])
        const currDate = parseISO(sortedDates[i])
        const diff = differenceInDays(currDate, prevDate)

        if (diff === 1) {
          tempStreak++
        } else {
          if (tempStreak > maxStreak) {
            maxStreak = tempStreak
            maxStreakDate = tempStreakStart
          }
          tempStreak = 1
          tempStreakStart = sortedDates[i]
        }
      }
    }
    // 마지막 스트릭 확인
    if (tempStreak > maxStreak) {
      maxStreak = tempStreak
      maxStreakDate = tempStreakStart
    }

    // 이번 주 운동 여부 (월~일)
    const weekdays: boolean[] = []
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = 일요일
    const monday = subDays(now, dayOfWeek === 0 ? 6 : dayOfWeek - 1)

    for (let i = 0; i < 7; i++) {
      const day = format(subDays(monday, -i), 'yyyy-MM-dd')
      weekdays.push(dates.includes(day))
    }

    return {
      currentStreak,
      maxStreak: Math.max(maxStreak, currentStreak),
      maxStreakDate,
      weekdays,
    }
  }

  // PR 조회 (상위 N개)
  async function fetchPRs(userId: string, limit = 3): Promise<PRRecord[]> {
    const { data, error } = await supabase
      .from('exercise_sets')
      .select(`
        weight,
        session_exercises!inner (
          exercise_id,
          exercises!inner (
            name
          ),
          workout_sessions!inner (
            user_id,
            date
          )
        )
      `)
      .eq('session_exercises.workout_sessions.user_id', userId)
      .not('weight', 'is', null)
      .gt('weight', 0)
      .order('weight', { ascending: false })

    if (error) throw error
    if (!data) return []

    // 운동별 최고 기록만 추출
    const prMap = new Map<number, PRRecord>()

    for (const set of data as any[]) {
      const exerciseId = set.session_exercises.exercise_id
      const weight = set.weight
      const date = set.session_exercises.workout_sessions.date
      const exerciseName = set.session_exercises.exercises.name

      if (!prMap.has(exerciseId) || prMap.get(exerciseId)!.weight < weight) {
        prMap.set(exerciseId, {
          exerciseId,
          exerciseName,
          weight,
          date,
        })
      }
    }

    // 무게 내림차순 정렬 후 상위 N개 반환
    return Array.from(prMap.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)
  }

  // 월간 요약
  async function fetchMonthlySummary(
    userId: string,
    year: number,
    month: number
  ): Promise<MonthlySummary> {
    const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
    const totalDays = new Date(year, month, 0).getDate()

    // 이번 달 데이터
    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select(`
        id,
        date,
        session_exercises (
          exercise_sets (
            weight,
            reps
          )
        )
      `)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (sessionsError) throw sessionsError

    let workoutDays = 0
    let totalVolume = 0
    let totalSets = 0

    const uniqueDates = new Set<string>()

    for (const session of sessions ?? []) {
      uniqueDates.add(session.date)
      for (const se of (session.session_exercises ?? []) as any[]) {
        for (const set of se.exercise_sets ?? []) {
          totalSets++
          if (set.weight && set.reps) {
            totalVolume += set.weight * set.reps
          }
        }
      }
    }

    workoutDays = uniqueDates.size

    // 지난 달 데이터
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const prevStartDate = format(startOfMonth(new Date(prevYear, prevMonth - 1)), 'yyyy-MM-dd')
    const prevEndDate = format(endOfMonth(new Date(prevYear, prevMonth - 1)), 'yyyy-MM-dd')

    const { data: prevSessions, error: prevError } = await supabase
      .from('workout_sessions')
      .select(`
        id,
        date,
        session_exercises (
          exercise_sets (
            weight,
            reps
          )
        )
      `)
      .eq('user_id', userId)
      .gte('date', prevStartDate)
      .lte('date', prevEndDate)

    let prevWorkoutDays: number | null = null
    let prevTotalVolume: number | null = null

    if (!prevError && prevSessions) {
      const prevUniqueDates = new Set<string>()
      let prevVolume = 0

      for (const session of prevSessions) {
        prevUniqueDates.add(session.date)
        for (const se of (session.session_exercises ?? []) as any[]) {
          for (const set of se.exercise_sets ?? []) {
            if (set.weight && set.reps) {
              prevVolume += set.weight * set.reps
            }
          }
        }
      }

      prevWorkoutDays = prevUniqueDates.size
      prevTotalVolume = prevVolume
    }

    return {
      workoutDays,
      totalDays,
      totalVolume,
      totalSets,
      prevWorkoutDays,
      prevTotalVolume,
    }
  }

  // 히트맵 데이터 (날짜별 세트 수)
  async function fetchHeatmapData(
    userId: string,
    year: number,
    month: number
  ): Promise<HeatmapData[]> {
    const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('workout_sessions')
      .select(`
        date,
        session_exercises (
          exercise_sets (id)
        )
      `)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) throw error
    if (!data) return []

    const heatmapMap = new Map<string, number>()

    for (const session of data as any[]) {
      let setCount = 0
      for (const se of session.session_exercises ?? []) {
        setCount += se.exercise_sets?.length ?? 0
      }
      heatmapMap.set(session.date, (heatmapMap.get(session.date) ?? 0) + setCount)
    }

    return Array.from(heatmapMap.entries()).map(([date, setCount]) => ({
      date,
      setCount,
    }))
  }

  // 부위별 밸런스 데이터
  async function fetchBalanceData(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<BalanceData[]> {
    let query = supabase
      .from('exercise_sets')
      .select(`
        id,
        session_exercises!inner (
          exercises!inner (
            category_id,
            categories!inner (
              id,
              name
            )
          ),
          workout_sessions!inner (
            user_id,
            date
          )
        )
      `)
      .eq('session_exercises.workout_sessions.user_id', userId)

    if (startDate) {
      query = query.gte('session_exercises.workout_sessions.date', startDate)
    }
    if (endDate) {
      query = query.lte('session_exercises.workout_sessions.date', endDate)
    }

    const { data, error } = await query

    if (error) throw error
    if (!data) return []

    // 카테고리별 세트 수 집계
    const categoryMap = new Map<number, { name: string; count: number }>()

    for (const set of data as any[]) {
      const categoryId = set.session_exercises.exercises.category_id
      const categoryName = set.session_exercises.exercises.categories.name

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, { name: categoryName, count: 0 })
      }
      categoryMap.get(categoryId)!.count++
    }

    const totalSets = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.count, 0)

    return Array.from(categoryMap.entries())
      .map(([categoryId, { name, count }]) => ({
        categoryId,
        categoryName: name,
        setCount: count,
        percentage: totalSets > 0 ? Math.round((count / totalSets) * 100) : 0,
      }))
      .sort((a, b) => b.setCount - a.setCount)
  }

  // 종목별 성장 그래프 데이터
  async function fetchProgressData(
    userId: string,
    exerciseId: number,
    startDate?: string,
    endDate?: string
  ): Promise<ProgressData | null> {
    let query = supabase
      .from('exercise_sets')
      .select(`
        weight,
        reps,
        session_exercises!inner (
          exercise_id,
          exercises!inner (
            id,
            name
          ),
          workout_sessions!inner (
            user_id,
            date
          )
        )
      `)
      .eq('session_exercises.workout_sessions.user_id', userId)
      .eq('session_exercises.exercise_id', exerciseId)
      .not('weight', 'is', null)
      .not('reps', 'is', null)
      .gt('weight', 0)
      .gt('reps', 0)

    if (startDate) {
      query = query.gte('session_exercises.workout_sessions.date', startDate)
    }
    if (endDate) {
      query = query.lte('session_exercises.workout_sessions.date', endDate)
    }

    const { data, error } = await query

    if (error) throw error
    if (!data || data.length === 0) return null

    // 날짜별 최고 1RM 계산
    const dateMap = new Map<string, number>()
    let exerciseName = ''

    for (const set of data as any[]) {
      const date = set.session_exercises.workout_sessions.date
      exerciseName = set.session_exercises.exercises.name
      const estimated1RM = calculate1RM(set.weight, set.reps)

      if (!dateMap.has(date) || dateMap.get(date)! < estimated1RM) {
        dateMap.set(date, estimated1RM)
      }
    }

    // 날짜 정렬
    const sortedDates = Array.from(dateMap.keys()).sort()
    const dataPoints: ProgressDataPoint[] = sortedDates.map(date => ({
      date,
      estimated1RM: dateMap.get(date)!,
    }))

    // 현재/이전 1RM 및 변화량 계산
    const lastPoint = dataPoints[dataPoints.length - 1]
    const secondLastPoint = dataPoints[dataPoints.length - 2]
    const current1RM = lastPoint?.estimated1RM ?? null
    const previous1RM = secondLastPoint?.estimated1RM ?? null

    let changeKg: number | null = null
    let changePercent: number | null = null

    if (current1RM !== null && previous1RM !== null) {
      changeKg = current1RM - previous1RM
      changePercent = previous1RM > 0 ? Math.round((changeKg / previous1RM) * 100 * 10) / 10 : 0
    }

    return {
      exerciseId,
      exerciseName,
      dataPoints,
      current1RM,
      previous1RM,
      changeKg,
      changePercent,
    }
  }

  // 사용자가 기록한 운동 목록 조회 (성장 그래프 운동 선택용)
  async function fetchUserExercises(userId: string): Promise<{ id: number; name: string }[]> {
    const { data, error } = await supabase
      .from('session_exercises')
      .select(`
        exercise_id,
        exercises!inner (
          id,
          name
        ),
        workout_sessions!inner (
          user_id
        )
      `)
      .eq('workout_sessions.user_id', userId)

    if (error) throw error
    if (!data) return []

    // 중복 제거
    const exerciseMap = new Map<number, string>()
    for (const se of data as any[]) {
      exerciseMap.set(se.exercises.id, se.exercises.name)
    }

    return Array.from(exerciseMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }

  // 주간 목표 조회
  async function fetchWeeklyGoal(userId: string): Promise<WeeklyGoal | null> {
    // 이번 주 운동 횟수 계산
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = subDays(now, dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    const sunday = subDays(monday, -6)

    const startDate = format(monday, 'yyyy-MM-dd')
    const endDate = format(sunday, 'yyyy-MM-dd')

    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (sessionsError) throw sessionsError

    const currentValue = new Set(sessions?.map(s => s.date) ?? []).size

    // 목표 조회 (테이블이 없을 수 있으므로 try-catch)
    let goalData = null
    try {
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('goal_type', 'weekly_workouts')
        .maybeSingle()

      if (!error) goalData = data
    } catch {
      // user_goals 테이블이 없는 경우 무시
    }

    // 목표가 없으면 기본값
    if (!goalData) {
      return {
        id: 0,
        targetValue: 5,
        currentValue,
        percentage: Math.min(Math.round((currentValue / 5) * 100), 100),
      }
    }

    return {
      id: goalData.id,
      targetValue: goalData.target_value,
      currentValue,
      percentage: Math.min(Math.round((currentValue / goalData.target_value) * 100), 100),
    }
  }

  // 주간 목표 저장/업데이트
  async function saveWeeklyGoal(userId: string, targetValue: number): Promise<void> {
    const { error } = await supabase
      .from('user_goals')
      .upsert(
        {
          user_id: userId,
          goal_type: 'weekly_workouts',
          target_value: targetValue,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,goal_type',
        }
      )

    if (error) throw error
  }

  return {
    fetchStreak,
    fetchPRs,
    fetchMonthlySummary,
    fetchHeatmapData,
    fetchBalanceData,
    fetchProgressData,
    fetchUserExercises,
    fetchWeeklyGoal,
    saveWeeklyGoal,
  }
}
