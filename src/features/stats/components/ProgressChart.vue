<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import type { ProgressData } from '@/composables/useStats'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const props = defineProps<{
  exercises: { id: number; name: string }[]
  progressData: ProgressData | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'exerciseChange', exerciseId: number): void
  (e: 'periodChange', period: string): void
}>()

const selectedExerciseId = ref<number | null>(null)
const selectedPeriod = ref('3m')

const periodOptions = [
  { value: '1m', label: '1개월' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: '1y', label: '1년' },
]

// 첫 번째 운동 자동 선택
watch(
  () => props.exercises,
  (exercises) => {
    if (exercises.length > 0 && !selectedExerciseId.value) {
      const firstExercise = exercises[0]
      if (firstExercise) {
        selectedExerciseId.value = firstExercise.id
        emit('exerciseChange', firstExercise.id)
      }
    }
  },
  { immediate: true }
)

watch(selectedExerciseId, (id) => {
  if (id) emit('exerciseChange', id)
})

watch(selectedPeriod, (period) => {
  emit('periodChange', period)
})

const chartData = computed(() => {
  if (!props.progressData || props.progressData.dataPoints.length === 0) {
    return {
      labels: [],
      datasets: [],
    }
  }

  return {
    labels: props.progressData.dataPoints.map((p) =>
      format(parseISO(p.date), 'M/d', { locale: ko })
    ),
    datasets: [
      {
        label: '1RM 추정치',
        data: props.progressData.dataPoints.map((p) => p.estimated1RM),
        borderColor: 'rgba(76, 175, 80, 1)',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(76, 175, 80, 1)',
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context: any) => `${context.raw}kg`,
      },
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.6)',
      },
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.6)',
        callback: (value: any) => `${value}kg`,
      },
    },
  },
}

function formatChange(value: number | null, suffix: string): string {
  if (value === null) return '-'
  if (value > 0) return `+${value}${suffix}`
  if (value < 0) return `${value}${suffix}`
  return `0${suffix}`
}

function getChangeClass(value: number | null): string {
  if (value === null) return ''
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return ''
}
</script>

<template>
  <ion-card class="progress-card">
    <ion-card-header>
      <ion-card-title class="card-title">
        <span class="title-icon">📈</span>
        종목별 성장 추이
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <!-- 운동 선택 -->
      <ion-select
        v-model="selectedExerciseId"
        interface="action-sheet"
        placeholder="운동을 선택하세요"
        class="exercise-select"
        :disabled="exercises.length === 0"
        :interface-options="{ cssClass: 'hide-cancel-button' }"
      >
        <ion-select-option
          v-for="exercise in exercises"
          :key="exercise.id"
          :value="exercise.id"
        >
          {{ exercise.name }}
        </ion-select-option>
      </ion-select>

      <!-- 기간 선택 -->
      <ion-segment v-model="selectedPeriod" class="period-segment">
        <ion-segment-button
          v-for="option in periodOptions"
          :key="option.value"
          :value="option.value"
        >
          <ion-label>{{ option.label }}</ion-label>
        </ion-segment-button>
      </ion-segment>

      <template v-if="loading">
        <div class="chart-skeleton"></div>
      </template>

      <template v-else-if="progressData && progressData.dataPoints.length > 0">
        <!-- 그래프 -->
        <div class="chart-container">
          <Line :data="chartData" :options="chartOptions" />
        </div>

        <!-- 변화량 표시 -->
        <div class="change-summary">
          <span class="change-label">지난 기록 대비:</span>
          <span :class="['change-value', getChangeClass(progressData.changeKg)]">
            {{ formatChange(progressData.changeKg, 'kg') }}
          </span>
          <span :class="['change-percent', getChangeClass(progressData.changePercent)]">
            ({{ formatChange(progressData.changePercent, '%') }})
          </span>
        </div>
      </template>

      <template v-else-if="exercises.length === 0">
        <div class="empty-state">
          <p>운동 기록이 없습니다.</p>
        </div>
      </template>

      <template v-else>
        <div class="empty-state">
          <p>선택한 운동의 기록이 없습니다.</p>
        </div>
      </template>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.progress-card {
  margin: 0;
  --background: var(--ion-card-background, #1c1c1e);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
}

.title-icon {
  font-size: 1.25rem;
}

.exercise-select {
  --background: var(--ion-color-step-100, rgba(255, 255, 255, 0.1));
  --padding-start: 12px;
  --padding-end: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.period-segment {
  margin-bottom: 16px;
  --background: var(--ion-color-step-50, rgba(255, 255, 255, 0.05));
}

.period-segment ion-segment-button {
  --color: var(--ion-color-medium);
  --color-checked: var(--ion-color-primary);
  --indicator-color: var(--ion-color-primary);
  min-width: 0;
  font-size: 0.75rem;
}

.chart-container {
  height: 200px;
  margin-bottom: 16px;
}

.change-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--ion-color-step-50, rgba(255, 255, 255, 0.05));
  border-radius: 8px;
}

.change-label {
  font-size: 0.875rem;
  color: var(--ion-color-medium);
}

.change-value {
  font-size: 1rem;
  font-weight: 700;
}

.change-percent {
  font-size: 0.875rem;
}

.change-value.positive,
.change-percent.positive {
  color: var(--ion-color-success);
}

.change-value.negative,
.change-percent.negative {
  color: var(--ion-color-danger);
}

.empty-state {
  text-align: center;
  color: var(--ion-color-medium);
  padding: 32px 0;
}

.chart-skeleton {
  height: 200px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--ion-color-medium-shade) 25%, var(--ion-color-medium) 50%, var(--ion-color-medium-shade) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
