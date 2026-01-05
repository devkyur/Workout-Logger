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
  min-height: 44px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: background-color 0.15s;
  border-radius: 50%;
}

.day-cell:active {
  background: var(--ion-color-light-shade);
}

.day-cell.other-month {
  opacity: 0.3;
}

.day-cell.today {
  background: var(--ion-color-primary);
}

.day-cell.today .day-number {
  color: #fff;
  font-weight: 600;
}

.day-number {
  font-size: 15px;
  font-weight: 400;
  color: var(--ion-text-color);
}

.day-cell.sunday .day-number {
  color: var(--ion-color-danger);
}

.day-cell.saturday .day-number {
  color: var(--ion-color-primary);
}

.day-cell.today.sunday .day-number,
.day-cell.today.saturday .day-number {
  color: #fff;
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
  background: rgba(255, 255, 255, 0.9);
}
</style>
