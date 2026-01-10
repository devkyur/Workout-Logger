<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  // IonSegment,
  // IonSegmentButton,
  // IonLabel,
  toastController,
} from '@ionic/vue'
import { useAuth } from '@/composables/useAuth'
import {
  useStats,
  type StreakData,
  type PRRecord,
  type MonthlySummary,
  type HeatmapData,
  type BalanceData,
  type ProgressData,
  type WeeklyGoal,
} from '@/composables/useStats'
import { format, subMonths } from 'date-fns'
import StreakCard from '../components/StreakCard.vue'
import PRCard from '../components/PRCard.vue'
import MonthlySummaryCard from '../components/MonthlySummaryCard.vue'
import HeatmapCalendar from '../components/HeatmapCalendar.vue'
import BalanceChart from '../components/BalanceChart.vue'
import ProgressChart from '../components/ProgressChart.vue'
import WeeklyGoalCard from '../components/WeeklyGoalCard.vue'

const { user } = useAuth()
const {
  fetchStreak,
  fetchPRs,
  fetchMonthlySummary,
  fetchHeatmapData,
  fetchBalanceData,
  fetchProgressData,
  fetchUserExercises,
  fetchWeeklyGoal,
  saveWeeklyGoal,
} = useStats()

type PeriodFilter = '1m' | '3m' | '6m' | '1y' | 'all'

const periodFilter = ref<PeriodFilter>('1m')
const loading = ref(true)
const streakData = ref<StreakData | null>(null)
const prRecords = ref<PRRecord[]>([])
const monthlySummary = ref<MonthlySummary | null>(null)
const heatmapData = ref<HeatmapData[]>([])
const balanceData = ref<BalanceData[]>([])
const userExercises = ref<{ id: number; name: string }[]>([])
const progressData = ref<ProgressData | null>(null)
const weeklyGoal = ref<WeeklyGoal | null>(null)
const progressLoading = ref(false)
const selectedExerciseId = ref<number | null>(null)
const progressPeriod = ref('3m')

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

// 기간 필터 (추후 수정 예정)
// const periodOptions = [
//   { value: '1m', label: '이번 달' },
//   { value: '3m', label: '3개월' },
//   { value: '6m', label: '6개월' },
//   { value: '1y', label: '1년' },
//   { value: 'all', label: '전체' },
// ]

const dateRange = computed(() => {
  const end = new Date()
  const endStr = format(end, 'yyyy-MM-dd')

  switch (periodFilter.value) {
    case '1m':
      return { start: format(subMonths(end, 1), 'yyyy-MM-dd'), end: endStr }
    case '3m':
      return { start: format(subMonths(end, 3), 'yyyy-MM-dd'), end: endStr }
    case '6m':
      return { start: format(subMonths(end, 6), 'yyyy-MM-dd'), end: endStr }
    case '1y':
      return { start: format(subMonths(end, 12), 'yyyy-MM-dd'), end: endStr }
    case 'all':
    default:
      return { start: undefined, end: endStr }
  }
})

const progressDateRange = computed(() => {
  const end = new Date()
  const endStr = format(end, 'yyyy-MM-dd')

  switch (progressPeriod.value) {
    case '1m':
      return { start: format(subMonths(end, 1), 'yyyy-MM-dd'), end: endStr }
    case '3m':
      return { start: format(subMonths(end, 3), 'yyyy-MM-dd'), end: endStr }
    case '6m':
      return { start: format(subMonths(end, 6), 'yyyy-MM-dd'), end: endStr }
    case '1y':
      return { start: format(subMonths(end, 12), 'yyyy-MM-dd'), end: endStr }
    default:
      return { start: format(subMonths(end, 3), 'yyyy-MM-dd'), end: endStr }
  }
})

const hasAnyData = computed(() => {
  if (loading.value) return true
  return (
    (streakData.value && streakData.value.currentStreak > 0) ||
    prRecords.value.length > 0 ||
    (monthlySummary.value && monthlySummary.value.workoutDays > 0) ||
    heatmapData.value.length > 0 ||
    balanceData.value.length > 0 ||
    userExercises.value.length > 0
  )
})

async function loadStats() {
  if (!user.value) return

  loading.value = true
  try {
    const [streak, prs, summary, heatmap, balance, exercises, goal] = await Promise.all([
      fetchStreak(user.value.id),
      fetchPRs(user.value.id, 3),
      fetchMonthlySummary(user.value.id, currentYear, currentMonth),
      fetchHeatmapData(user.value.id, currentYear, currentMonth),
      fetchBalanceData(user.value.id, dateRange.value.start, dateRange.value.end),
      fetchUserExercises(user.value.id),
      fetchWeeklyGoal(user.value.id),
    ])

    streakData.value = streak
    prRecords.value = prs
    monthlySummary.value = summary
    heatmapData.value = heatmap
    balanceData.value = balance
    userExercises.value = exercises
    weeklyGoal.value = goal
  } catch (error) {
    console.error('Failed to load stats:', error)
  } finally {
    loading.value = false
  }
}

async function loadBalanceData() {
  if (!user.value) return

  try {
    balanceData.value = await fetchBalanceData(
      user.value.id,
      dateRange.value.start,
      dateRange.value.end
    )
  } catch (error) {
    console.error('Failed to load balance data:', error)
  }
}

async function loadProgressData() {
  if (!user.value || !selectedExerciseId.value) return

  progressLoading.value = true
  try {
    progressData.value = await fetchProgressData(
      user.value.id,
      selectedExerciseId.value,
      progressDateRange.value.start,
      progressDateRange.value.end
    )
  } catch (error) {
    console.error('Failed to load progress data:', error)
  } finally {
    progressLoading.value = false
  }
}

async function handleExerciseChange(exerciseId: number) {
  selectedExerciseId.value = exerciseId
  await loadProgressData()
}

async function handleProgressPeriodChange(period: string) {
  progressPeriod.value = period
  await loadProgressData()
}

async function handleSaveGoal(targetValue: number) {
  if (!user.value) return

  try {
    await saveWeeklyGoal(user.value.id, targetValue)
    weeklyGoal.value = await fetchWeeklyGoal(user.value.id)

    const toast = await toastController.create({
      message: '목표가 저장되었습니다.',
      duration: 2000,
      position: 'bottom',
    })
    toast.present()
  } catch (error) {
    console.error('Failed to save goal:', error)
    const toast = await toastController.create({
      message: '목표 저장에 실패했습니다.',
      duration: 2000,
      position: 'bottom',
      color: 'danger',
    })
    toast.present()
  }
}

watch(periodFilter, () => {
  loadBalanceData()
})

onMounted(() => {
  loadStats()
})
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>통계</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <template v-if="hasAnyData || loading">
        <!-- 기간 필터 (추후 수정 예정)
        <ion-segment v-model="periodFilter" class="period-filter">
          <ion-segment-button
            v-for="option in periodOptions"
            :key="option.value"
            :value="option.value"
          >
            <ion-label>{{ option.label }}</ion-label>
          </ion-segment-button>
        </ion-segment>
        -->

        <div class="stats-container">
          <!-- 주간 목표 (Phase 3) -->
          <WeeklyGoalCard
            :goal="weeklyGoal"
            :loading="loading"
            @save="handleSaveGoal"
          />

          <StreakCard :streak="streakData" :loading="loading" />
          <PRCard :records="prRecords" :loading="loading" />
          <MonthlySummaryCard
            :summary="monthlySummary"
            :year="currentYear"
            :month="currentMonth"
            :loading="loading"
          />

          <!-- 종목별 성장 그래프 (Phase 3) -->
          <ProgressChart
            :exercises="userExercises"
            :progress-data="progressData"
            :loading="progressLoading"
            @exercise-change="handleExerciseChange"
            @period-change="handleProgressPeriodChange"
          />

          <HeatmapCalendar
            :data="heatmapData"
            :year="currentYear"
            :month="currentMonth"
            :loading="loading"
          />
          <BalanceChart :data="balanceData" :loading="loading" />
        </div>
      </template>

      <template v-else>
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <p class="empty-title">아직 통계를 보여드리기엔</p>
          <p class="empty-title">데이터가 부족해요!</p>
          <p class="empty-subtitle">
            첫 운동을 기록하면<br />
            여기에 멋진 그래프가 나타나요
          </p>
          <router-link to="/tabs/home" class="empty-button">
            운동 기록하러 가기
          </router-link>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.period-filter {
  margin-bottom: 16px;
  --background: var(--ion-card-background, #1c1c1e);
}

.period-filter ion-segment-button {
  --color: var(--ion-color-medium);
  --color-checked: var(--ion-color-primary);
  --indicator-color: var(--ion-color-primary);
  min-width: 0;
  font-size: 0.8125rem;
}

.stats-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 32px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 24px;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ion-text-color);
  margin: 0;
  line-height: 1.5;
}

.empty-subtitle {
  font-size: 0.9375rem;
  color: var(--ion-color-medium);
  margin: 16px 0 24px;
  line-height: 1.6;
}

.empty-button {
  display: inline-block;
  padding: 12px 24px;
  background: var(--ion-color-primary);
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}

.empty-button:hover {
  opacity: 0.9;
}
</style>
