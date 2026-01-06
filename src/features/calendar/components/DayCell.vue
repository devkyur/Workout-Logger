<script setup lang="ts">
import { computed } from 'vue'
import type { DaySummary } from '@/entities/workout/types'

interface Props {
  day: number
  dayOfWeek: number // 0=일요일, 6=토요일
  isCurrentMonth: boolean
  isToday: boolean
  isSelected?: boolean
  summary?: DaySummary
}

const props = defineProps<Props>()

const hasWorkout = computed(() => !!props.summary && props.summary.categories.length > 0)
const isSunday = computed(() => props.dayOfWeek === 0)
const isSaturday = computed(() => props.dayOfWeek === 6)
</script>

<template>
  <div
    class="day-cell"
    :class="{
      'other-month': !isCurrentMonth,
      'today': isToday,
      'selected': isSelected,
      'sunday': isSunday,
      'saturday': isSaturday,
    }"
  >
    <span class="day-number">{{ day }}</span>
    <span v-if="hasWorkout" class="workout-dot"></span>
  </div>
</template>

<style scoped>
.day-cell {
  aspect-ratio: 1;
  min-height: 44px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: background-color 0.15s;
}

.day-cell:active {
  background: var(--ion-color-light-shade);
  border-radius: 50%;
}

.day-cell.other-month {
  opacity: 0.3;
}

.day-number {
  font-size: 15px;
  font-weight: 400;
  color: var(--ion-text-color);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.15s;
  line-height: 1;
  padding-top: 1px; /* 시각적 중앙 보정 */
  box-sizing: border-box;
}

/* 오늘: 흰색 배경 + 검은 글씨 */
.day-cell.today .day-number {
  background: #fff;
  color: #000;
  font-weight: 600;
}

/* 선택: 옅은 회색 배경 */
.day-cell.selected .day-number {
  background: rgba(255, 255, 255, 0.15);
  font-weight: 500;
}

/* 오늘이면서 선택된 경우: 오늘 스타일 우선 */
.day-cell.today.selected .day-number {
  background: #fff;
  color: #000;
}

.day-cell.sunday .day-number {
  color: var(--ion-color-danger);
}

.day-cell.saturday .day-number {
  color: var(--ion-color-primary);
}

.day-cell.today.sunday .day-number,
.day-cell.today.saturday .day-number {
  color: #000;
}

.day-cell.selected.sunday .day-number,
.day-cell.selected.saturday .day-number {
  color: var(--ion-color-danger);
}

.day-cell.selected.saturday .day-number {
  color: var(--ion-color-primary);
}

.workout-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ion-color-success);
  position: absolute;
  bottom: 4px;
}

.day-cell.today .workout-dot {
  background: var(--ion-color-success);
}
</style>
