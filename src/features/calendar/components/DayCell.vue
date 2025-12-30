<script setup lang="ts">
import { computed } from 'vue'
import type { DaySummary } from '@/entities/workout/types'

interface Props {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  summary?: DaySummary
}

const props = defineProps<Props>()

const displayCategories = computed(() => {
  if (!props.summary) return null

  const cats = props.summary.categories
  if (cats.length === 0) return null
  if (cats.length <= 2) return cats.join(' · ')

  return `${cats.slice(0, 2).join(' · ')} 외 ${cats.length - 2}종목`
})

const hasWorkout = computed(() => !!props.summary && props.summary.categories.length > 0)
</script>

<template>
  <div
    class="day-cell"
    :class="{
      'other-month': !isCurrentMonth,
      'today': isToday,
      'has-workout': hasWorkout,
    }"
  >
    <span class="day-number">{{ day }}</span>

    <div v-if="displayCategories" class="workout-badge">
      {{ displayCategories }}
    </div>
  </div>
</template>

<style scoped>
.day-cell {
  aspect-ratio: 1;
  min-height: 60px;
  padding: 4px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--ion-color-light);
  transition: background-color 0.2s;
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

.day-cell.has-workout {
  background: var(--ion-color-primary-tint);
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.today .day-number {
  color: var(--ion-color-primary);
  font-weight: 700;
}

.workout-badge {
  font-size: 9px;
  color: var(--ion-color-primary-shade);
  text-align: center;
  line-height: 1.2;
  word-break: keep-all;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
