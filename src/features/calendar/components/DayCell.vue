<script setup lang="ts">
import { computed } from 'vue'
import type { DaySummary } from '@/entities/workout/types'

interface Props {
  day: number
  dayOfWeek: number // 0=일요일, 6=토요일
  isCurrentMonth: boolean
  isToday: boolean
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
  min-height: 48px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-light);
  transition: background-color 0.2s;
  position: relative;
}

.day-cell:active {
  background: var(--ion-color-light-shade);
}

.day-cell.other-month {
  opacity: 0.4;
}

.day-cell.today {
  border: 2px solid var(--ion-color-primary);
}

.day-number {
  font-size: 14px;
  font-weight: 500;
}

.day-cell.sunday .day-number {
  color: var(--ion-color-danger);
}

.day-cell.saturday .day-number {
  color: var(--ion-color-primary);
}

.today .day-number {
  font-weight: 700;
}

.workout-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ion-color-success);
  position: absolute;
  bottom: 6px;
}
</style>
