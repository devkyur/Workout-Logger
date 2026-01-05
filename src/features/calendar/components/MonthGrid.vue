<script setup lang="ts">
import { computed } from 'vue'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from 'date-fns'
import type { DaySummary } from '@/entities/workout/types'
import DayCell from './DayCell.vue'

interface Props {
  year: number
  month: number
  summary: DaySummary[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  selectDate: [date: string]
}>()

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const calendarDays = computed(() => {
  const monthStart = startOfMonth(new Date(props.year, props.month - 1))
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  return days.map((date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const daySummary = props.summary.find((s) => s.date === dateStr)

    return {
      date,
      dateStr,
      day: date.getDate(),
      dayOfWeek: date.getDay(),
      isCurrentMonth: isSameMonth(date, monthStart),
      isToday: isToday(date),
      summary: daySummary,
    }
  })
})

function handleDateClick(dateStr: string) {
  emit('selectDate', dateStr)
}
</script>

<template>
  <div class="calendar-grid">
    <div class="weekday-header">
      <div
        v-for="day in WEEKDAYS"
        :key="day"
        class="weekday"
        :class="{
          'weekend': day === '일' || day === '토',
          'sunday': day === '일',
        }"
      >
        {{ day }}
      </div>
    </div>

    <div class="days-grid">
      <DayCell
        v-for="dayInfo in calendarDays"
        :key="dayInfo.dateStr"
        :day="dayInfo.day"
        :day-of-week="dayInfo.dayOfWeek"
        :is-current-month="dayInfo.isCurrentMonth"
        :is-today="dayInfo.isToday"
        :summary="dayInfo.summary"
        @click="handleDateClick(dayInfo.dateStr)"
      />
    </div>
  </div>
</template>

<style scoped>
.calendar-grid {
  padding: 16px;
  margin: 12px;
  background: var(--ion-card-background, var(--ion-background-color));
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.weekday {
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--ion-color-medium);
}

.weekday.sunday {
  color: var(--ion-color-danger);
}

.weekday.weekend:not(.sunday) {
  color: var(--ion-color-primary);
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
</style>
