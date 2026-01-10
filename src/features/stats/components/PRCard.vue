<script setup lang="ts">
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/vue'
import type { PRRecord } from '@/composables/useStats'
import { format, parseISO } from 'date-fns'

defineProps<{
  records: PRRecord[]
  loading?: boolean
}>()

function formatDate(date: string): string {
  return format(parseISO(date), 'yyyy.MM.dd')
}
</script>

<template>
  <ion-card class="pr-card">
    <ion-card-header>
      <ion-card-title class="card-title">
        <span class="title-icon">🏆</span>
        나의 PR
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <template v-if="loading">
        <div v-for="i in 3" :key="i" class="pr-item skeleton">
          <div class="skeleton-text" style="width: 40%; height: 18px;"></div>
          <div class="skeleton-text" style="width: 20%; height: 18px;"></div>
          <div class="skeleton-text" style="width: 25%; height: 14px;"></div>
        </div>
      </template>

      <template v-else-if="records.length > 0">
        <div v-for="record in records" :key="record.exerciseId" class="pr-item">
          <span class="exercise-name">{{ record.exerciseName }}</span>
          <span class="weight">{{ record.weight }}kg</span>
          <span class="date">{{ formatDate(record.date) }}</span>
        </div>
      </template>

      <template v-else>
        <div class="empty-state">
          <p>아직 기록된 PR이 없습니다.</p>
        </div>
      </template>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.pr-card {
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

.pr-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--ion-color-step-100, rgba(255, 255, 255, 0.1));
}

.pr-item:last-child {
  border-bottom: none;
}

.exercise-name {
  flex: 1;
  font-size: 0.9375rem;
  color: var(--ion-text-color);
}

.weight {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ion-color-success);
  margin-right: 16px;
}

.date {
  font-size: 0.8125rem;
  color: var(--ion-color-medium);
}

.empty-state {
  text-align: center;
  color: var(--ion-color-medium);
  padding: 16px 0;
}

.pr-item.skeleton {
  display: flex;
  justify-content: space-between;
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
