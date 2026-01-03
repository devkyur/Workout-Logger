<script setup lang="ts">
import { computed } from 'vue'
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon } from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import type { SessionExerciseWithSets } from '@/entities/workout/types'

interface Props {
  sessionExercise: SessionExerciseWithSets
}

const props = defineProps<Props>()
const emit = defineEmits<{
  delete: []
  edit: []
}>()

function handleCardClick(event: Event) {
  // 삭제 버튼 클릭 시에는 edit 이벤트 발생 안 함
  const target = event.target as HTMLElement
  if (target.closest('ion-button')) return
  emit('edit')
}

const exerciseName = computed(() => props.sessionExercise.exercise?.name ?? '알 수 없는 운동')

const setsDisplay = computed(() => {
  return props.sessionExercise.sets.map((set) => {
    if (set.duration_seconds) {
      const mins = Math.floor(set.duration_seconds / 60)
      const secs = set.duration_seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return `${set.weight ?? '-'}kg × ${set.reps ?? '-'}회`
  })
})

const totalVolume = computed(() => {
  return props.sessionExercise.sets.reduce((acc, set) => {
    if (set.weight && set.reps) {
      return acc + set.weight * set.reps
    }
    return acc
  }, 0)
})
</script>

<template>
  <ion-card class="workout-card" button @click="handleCardClick">
    <ion-card-header>
      <div class="card-header-content">
        <ion-card-title class="exercise-name">{{ exerciseName }}</ion-card-title>
        <ion-button fill="clear" color="danger" size="small" @click="emit('delete')">
          <ion-icon :icon="trashOutline" />
        </ion-button>
      </div>
    </ion-card-header>

    <ion-card-content>
      <div class="sets-container">
        <div v-for="(display, index) in setsDisplay" :key="index" class="set-item">
          <span class="set-number">{{ index + 1 }}</span>
          <span class="set-value">{{ display }}</span>
        </div>
      </div>

      <div v-if="totalVolume > 0" class="volume">
        총 볼륨: {{ totalVolume.toLocaleString() }}kg
      </div>

      <p v-if="sessionExercise.memo" class="memo">{{ sessionExercise.memo }}</p>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.workout-card {
  margin: 0;
}

.card-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exercise-name {
  font-size: 16px;
}

.sets-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.set-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--ion-color-light);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
}

.set-number {
  color: var(--ion-color-medium);
  font-size: 11px;
}

.set-value {
  font-weight: 500;
}

.volume {
  font-size: 12px;
  color: var(--ion-color-primary);
  margin-bottom: 8px;
}

.memo {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid var(--ion-color-light);
}
</style>
