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
  selectedDate?: string | null
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

// 행 수 계산 (4, 5, 6줄)
const rowCount = computed(() => Math.ceil(calendarDays.value.length / 7))

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

    <div
      class="days-grid"
      :class="`rows-${rowCount}`"
    >
      <DayCell
        v-for="dayInfo in calendarDays"
        :key="dayInfo.dateStr"
        :day="dayInfo.day"
        :day-of-week="dayInfo.dayOfWeek"
        :is-current-month="dayInfo.isCurrentMonth"
        :is-today="dayInfo.isToday"
        :is-selected="dayInfo.dateStr === selectedDate"
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
  column-gap: 2px;
  row-gap: 2px;
  /* 5줄 기준 높이 고정 (셀 높이는 컨테이너 너비/7 기준) */
  --cell-size: calc((100vw - 56px) / 7); /* 100vw - padding(16*2) - margin(12*2) */
  height: calc(var(--cell-size) * 5 + 2px * 4);
  align-content: start;
}

/* 4줄: 행 간격 넓혀서 균등 분포 */
.days-grid.rows-4 {
  row-gap: calc((var(--cell-size) + 8px) / 3);
}

/* 6줄: gap 줄여서 맞춤 */
.days-grid.rows-6 {
  row-gap: 0;
}
</style>
