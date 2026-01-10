<script setup lang="ts">
import { computed } from 'vue'
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/vue'
import type { MonthlySummary } from '@/composables/useStats'

const props = defineProps<{
  summary: MonthlySummary | null
  year: number
  month: number
  loading?: boolean
}>()

function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR')
}

const comparison = computed(() => {
  if (!props.summary || props.summary.prevWorkoutDays === null || props.summary.prevTotalVolume === null) {
    return null
  }

  const daysDiff = props.summary.workoutDays - props.summary.prevWorkoutDays
  const volumeDiff = props.summary.prevTotalVolume > 0
    ? Math.round(((props.summary.totalVolume - props.summary.prevTotalVolume) / props.summary.prevTotalVolume) * 100)
    : 0

  return {
    daysDiff,
    volumeDiff,
  }
})

function formatDiff(diff: number, suffix: string): string {
  if (diff > 0) return `+${diff}${suffix}`
  if (diff < 0) return `${diff}${suffix}`
  return `0${suffix}`
}

function getDiffClass(diff: number): string {
  if (diff > 0) return 'positive'
  if (diff < 0) return 'negative'
  return 'neutral'
}
</script>

<template>
  <ion-card class="summary-card">
    <ion-card-header>
      <ion-card-title class="card-title">
        <span class="title-icon">📊</span>
        {{ year }}년 {{ month }}월
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <template v-if="loading">
        <div class="summary-grid skeleton">
          <div v-for="i in 3" :key="i" class="summary-item">
            <div class="skeleton-text" style="width: 50%; height: 14px;"></div>
            <div class="skeleton-text" style="width: 70%; height: 24px; margin-top: 8px;"></div>
          </div>
        </div>
      </template>

      <template v-else-if="summary">
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">운동 일수</span>
            <span class="value">
              {{ summary.workoutDays }}일
              <span class="sub-value">/ {{ summary.totalDays }}일</span>
            </span>
          </div>
          <div class="summary-item">
            <span class="label">총 볼륨</span>
            <span class="value">{{ formatNumber(summary.totalVolume) }} kg</span>
          </div>
          <div class="summary-item">
            <span class="label">총 세트</span>
            <span class="value">{{ summary.totalSets }} 세트</span>
          </div>
        </div>

        <div v-if="comparison" class="comparison">
          vs 지난달:
          <span :class="getDiffClass(comparison.daysDiff)">
            운동 {{ formatDiff(comparison.daysDiff, '일') }}
          </span>,
          <span :class="getDiffClass(comparison.volumeDiff)">
            볼륨 {{ formatDiff(comparison.volumeDiff, '%') }}
          </span>
        </div>
      </template>

      <template v-else>
        <div class="empty-state">
          <p>이번 달 운동 기록이 없습니다.</p>
        </div>
      </template>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.summary-card {
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 0.8125rem;
  color: var(--ion-color-medium);
}

.value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--ion-text-color);
}

.sub-value {
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--ion-color-medium);
}

.comparison {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--ion-color-step-100, rgba(255, 255, 255, 0.1));
  font-size: 0.8125rem;
  color: var(--ion-color-medium);
}

.comparison .positive {
  color: var(--ion-color-success);
}

.comparison .negative {
  color: var(--ion-color-danger);
}

.comparison .neutral {
  color: var(--ion-color-medium);
}

.empty-state {
  text-align: center;
  color: var(--ion-color-medium);
  padding: 16px 0;
}

.summary-grid.skeleton .summary-item {
  gap: 0;
}

.skeleton-text {
  background: linear-gradient(90deg, var(--ion-color-medium-shade) 25%, var(--ion-color-medium) 50%, var(--ion-color-medium-shade) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
