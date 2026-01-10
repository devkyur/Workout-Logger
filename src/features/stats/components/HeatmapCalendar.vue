<script setup lang="ts">
import { computed } from 'vue'
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/vue'
import type { HeatmapData } from '@/composables/useStats'
import { startOfMonth, endOfMonth, getDay, format, eachDayOfInterval, parseISO } from 'date-fns'

const props = defineProps<{
  data: HeatmapData[]
  year: number
  month: number
  loading?: boolean
}>()

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

// 월의 모든 날짜 생성
const calendarDays = computed(() => {
  const start = startOfMonth(new Date(props.year, props.month - 1))
  const end = endOfMonth(new Date(props.year, props.month - 1))
  const days = eachDayOfInterval({ start, end })

  // 데이터 맵 생성
  const dataMap = new Map<string, number>()
  for (const item of props.data) {
    dataMap.set(item.date, item.setCount)
  }

  // 첫 주 빈 칸 추가
  const firstDayOfWeek = getDay(start)
  const result: { date: string | null; day: number | null; setCount: number }[] = []

  for (let i = 0; i < firstDayOfWeek; i++) {
    result.push({ date: null, day: null, setCount: 0 })
  }

  for (const day of days) {
    const dateStr = format(day, 'yyyy-MM-dd')
    result.push({
      date: dateStr,
      day: day.getDate(),
      setCount: dataMap.get(dateStr) ?? 0,
    })
  }

  return result
})

function getIntensityClass(setCount: number): string {
  if (setCount === 0) return 'level-0'
  if (setCount <= 5) return 'level-1'
  if (setCount <= 15) return 'level-2'
  return 'level-3'
}
</script>

<template>
  <ion-card class="heatmap-card">
    <ion-card-header>
      <ion-card-title class="card-title">
        히트맵 캘린더
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <template v-if="loading">
        <div class="skeleton-grid">
          <div v-for="i in 35" :key="i" class="skeleton-cell"></div>
        </div>
      </template>

      <template v-else>
        <!-- 요일 헤더 -->
        <div class="weekday-header">
          <div v-for="label in weekdayLabels" :key="label" class="weekday-label">
            {{ label }}
          </div>
        </div>

        <!-- 날짜 그리드 -->
        <div class="calendar-grid">
          <div
            v-for="(cell, index) in calendarDays"
            :key="index"
            class="calendar-cell"
            :class="[cell.date ? getIntensityClass(cell.setCount) : 'empty']"
          >
            <span v-if="cell.day" class="day-number">{{ cell.day }}</span>
          </div>
        </div>

        <!-- 범례 -->
        <div class="legend">
          <div class="legend-item">
            <div class="legend-box level-0"></div>
            <span>없음</span>
          </div>
          <div class="legend-item">
            <div class="legend-box level-1"></div>
            <span>1-5 세트</span>
          </div>
          <div class="legend-item">
            <div class="legend-box level-2"></div>
            <span>6-15 세트</span>
          </div>
          <div class="legend-item">
            <div class="legend-box level-3"></div>
            <span>16+ 세트</span>
          </div>
        </div>
      </template>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.heatmap-card {
  margin: 0;
  --background: var(--ion-card-background, #1c1c1e);
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.weekday-label {
  text-align: center;
  font-size: 0.75rem;
  color: var(--ion-color-medium);
  padding: 4px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-cell {
  aspect-ratio: 1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--ion-text-color);
  position: relative;
}

.calendar-cell.empty {
  background: transparent;
}

.calendar-cell.level-0 {
  background: var(--ion-color-step-100, rgba(255, 255, 255, 0.1));
}

.calendar-cell.level-1 {
  background: rgba(76, 175, 80, 0.3);
}

.calendar-cell.level-2 {
  background: rgba(76, 175, 80, 0.6);
}

.calendar-cell.level-3 {
  background: rgba(76, 175, 80, 0.9);
}

.day-number {
  font-size: 0.6875rem;
  opacity: 0.8;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6875rem;
  color: var(--ion-color-medium);
}

.legend-box {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-box.level-0 {
  background: var(--ion-color-step-100, rgba(255, 255, 255, 0.1));
}

.legend-box.level-1 {
  background: rgba(76, 175, 80, 0.3);
}

.legend-box.level-2 {
  background: rgba(76, 175, 80, 0.6);
}

.legend-box.level-3 {
  background: rgba(76, 175, 80, 0.9);
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.skeleton-cell {
  aspect-ratio: 1;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--ion-color-medium-shade) 25%, var(--ion-color-medium) 50%, var(--ion-color-medium-shade) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
