<script setup lang="ts">
import { IonCard, IonCardContent } from '@ionic/vue'
import type { StreakData } from '@/composables/useStats'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

defineProps<{
  streak: StreakData | null
  loading?: boolean
}>()

const weekdayLabels = ['월', '화', '수', '목', '금', '토', '일']

function formatMaxStreakDate(date: string | null): string {
  if (!date) return ''
  return format(parseISO(date), 'yyyy.MM', { locale: ko })
}
</script>

<template>
  <ion-card class="streak-card">
    <ion-card-content>
      <template v-if="loading">
        <div class="skeleton-text" style="width: 60%; height: 24px;"></div>
        <div class="skeleton-text" style="width: 100%; height: 32px; margin-top: 12px;"></div>
        <div class="skeleton-text" style="width: 40%; height: 16px; margin-top: 12px;"></div>
      </template>

      <template v-else-if="streak">
        <div class="streak-header">
          <span class="fire-icon">🔥</span>
          <span class="streak-text">
            현재 <span class="streak-count">{{ streak.currentStreak }}일</span> 연속 운동 중!
          </span>
        </div>

        <div class="weekday-grid">
          <div
            v-for="(done, index) in streak.weekdays"
            :key="index"
            class="weekday-item"
          >
            <div class="weekday-box" :class="{ filled: done }"></div>
            <span class="weekday-label">{{ weekdayLabels[index] }}</span>
          </div>
        </div>

        <div v-if="streak.maxStreak > 0" class="max-streak">
          <span class="trophy-icon">🏆</span>
          최장 기록: {{ streak.maxStreak }}일
          <span v-if="streak.maxStreakDate" class="max-streak-date">
            ({{ formatMaxStreakDate(streak.maxStreakDate) }})
          </span>
        </div>
      </template>

      <template v-else>
        <div class="empty-state">
          <p>운동 기록이 없습니다.</p>
        </div>
      </template>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.streak-card {
  margin: 0;
  --background: var(--ion-card-background, #1c1c1e);
}

.streak-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.fire-icon {
  font-size: 1.5rem;
}

.streak-text {
  font-size: 1rem;
  color: var(--ion-text-color);
}

.streak-count {
  color: var(--ion-color-success);
  font-weight: 700;
}

.weekday-grid {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.weekday-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.weekday-box {
  width: 100%;
  aspect-ratio: 1;
  max-width: 40px;
  border-radius: 6px;
  background: var(--ion-color-medium-shade);
  transition: background-color 0.2s;
}

.weekday-box.filled {
  background: var(--ion-color-success);
}

.weekday-label {
  font-size: 0.75rem;
  color: var(--ion-color-medium);
}

.max-streak {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--ion-color-medium);
}

.trophy-icon {
  font-size: 1rem;
}

.max-streak-date {
  color: var(--ion-color-medium-tint);
}

.empty-state {
  text-align: center;
  color: var(--ion-color-medium);
  padding: 16px 0;
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
