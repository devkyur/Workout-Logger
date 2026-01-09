<script setup lang="ts">
import { computed } from 'vue'
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon } from '@ionic/vue'
import { createOutline, trashOutline } from 'ionicons/icons'
import type { RoutineWithExercises } from '@/entities/workout/types'

interface Props {
  routine: RoutineWithExercises
}

const props = defineProps<Props>()
const emit = defineEmits<{
  edit: []
  delete: []
}>()

const exerciseSummary = computed(() => {
  if (props.routine.exercises.length === 0) {
    return '운동이 없습니다'
  }
  return props.routine.exercises
    .map((e) => e.exercise?.name ?? '알 수 없음')
    .join(', ')
})

const exerciseCount = computed(() => props.routine.exercises.length)

const totalSets = computed(() =>
  props.routine.exercises.reduce((acc, e) => acc + e.sets.length, 0)
)
</script>

<template>
  <ion-card class="routine-card">
    <ion-card-header>
      <div class="card-header-content">
        <div class="title-section">
          <ion-card-title>{{ routine.name }}</ion-card-title>
          <p v-if="routine.description" class="description">{{ routine.description }}</p>
        </div>
        <div class="actions">
          <ion-button fill="clear" size="small" @click="emit('edit')">
            <ion-icon :icon="createOutline" />
          </ion-button>
          <ion-button fill="clear" size="small" color="danger" @click="emit('delete')">
            <ion-icon :icon="trashOutline" />
          </ion-button>
        </div>
      </div>
    </ion-card-header>

    <ion-card-content>
      <p class="exercise-summary">{{ exerciseSummary }}</p>
      <div class="stats">
        <span class="stat">{{ exerciseCount }}개 운동</span>
        <span class="stat">{{ totalSets }}세트</span>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.routine-card {
  margin: 0;
}

.card-header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.title-section {
  flex: 1;
}

ion-card-title {
  font-size: 18px;
}

.description {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 4px 0 0;
}

.actions {
  display: flex;
  gap: 0;
}

.exercise-summary {
  font-size: 14px;
  color: var(--ion-color-medium-shade);
  margin: 0 0 12px;
  line-height: 1.4;
}

.stats {
  display: flex;
  gap: 16px;
}

.stat {
  font-size: 13px;
  color: var(--ion-color-primary);
  font-weight: 500;
}
</style>
