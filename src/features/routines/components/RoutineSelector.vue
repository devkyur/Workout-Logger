<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonList,
  IonItem,
  IonLabel,
  modalController,
} from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import { useRoutine } from '@/composables/useRoutine'
import type { RoutineWithExercises } from '@/entities/workout/types'

const { fetchRoutines } = useRoutine()

const routines = ref<RoutineWithExercises[]>([])
const loading = ref(true)

async function loadRoutines() {
  loading.value = true
  try {
    routines.value = await fetchRoutines()
  } catch (e) {
    console.error('Failed to load routines:', e)
  } finally {
    loading.value = false
  }
}

function closeModal() {
  modalController.dismiss(null, 'cancel')
}

function selectRoutine(routine: RoutineWithExercises) {
  modalController.dismiss(routine, 'select')
}

function formatExercises(routine: RoutineWithExercises): string {
  return routine.exercises.map((e) => e.exercise?.name ?? '알 수 없음').join(', ')
}

onMounted(loadRoutines)
</script>

<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>루틴 선택</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="closeModal">
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div v-if="loading" class="loading-container">
      <ion-spinner name="crescent" />
    </div>

    <template v-else>
      <div v-if="routines.length === 0" class="empty-state">
        <p>저장된 루틴이 없습니다</p>
        <p class="hint">설정 > 나의 루틴에서 루틴을 만들어보세요</p>
      </div>

      <ion-list v-else>
        <ion-item
          v-for="routine in routines"
          :key="routine.id"
          button
          :disabled="routine.exercises.length === 0"
          @click="selectRoutine(routine)"
        >
          <ion-label>
            <h2>{{ routine.name }}</h2>
            <p>{{ formatExercises(routine) }}</p>
            <p class="stats">
              {{ routine.exercises.length }}개 운동 ·
              {{ routine.exercises.reduce((acc, e) => acc + e.sets.length, 0) }}세트
            </p>
          </ion-label>
        </ion-item>
      </ion-list>
    </template>
  </ion-content>
</template>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.empty-state {
  text-align: center;
  padding: 40px 16px;
}

.empty-state p {
  color: var(--ion-color-medium);
  margin: 0 0 8px;
}

.empty-state .hint {
  font-size: 13px;
}

ion-item h2 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

ion-item p {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 0;
}

ion-item .stats {
  font-size: 12px;
  color: var(--ion-color-primary);
  margin-top: 4px;
}
</style>
