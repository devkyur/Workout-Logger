<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonFab,
  IonFabButton,
  modalController,
  alertController,
  toastController,
} from '@ionic/vue'
import { chevronBackOutline, addOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import { useRoutine } from '@/composables/useRoutine'
import type { RoutineWithExercises } from '@/entities/workout/types'
import RoutineCard from '../components/RoutineCard.vue'
import RoutineEditor from '../components/RoutineEditor.vue'

const router = useRouter()
const { fetchRoutines, deleteRoutine } = useRoutine()

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

function goBack() {
  router.back()
}

async function openRoutineEditor(routine?: RoutineWithExercises) {
  const modal = await modalController.create({
    component: RoutineEditor,
    componentProps: {
      routine: routine || null,
    },
  })

  await modal.present()

  const { role } = await modal.onWillDismiss()

  if (role === 'saved') {
    await loadRoutines()
  }
}

async function handleEdit(routine: RoutineWithExercises) {
  await openRoutineEditor(routine)
}

async function handleDelete(routine: RoutineWithExercises) {
  const alert = await alertController.create({
    header: '루틴 삭제',
    message: `"${routine.name}" 루틴을 삭제하시겠습니까?`,
    buttons: [
      { text: '취소', role: 'cancel' },
      {
        text: '삭제',
        role: 'destructive',
        handler: async () => {
          try {
            await deleteRoutine(routine.id)
            await loadRoutines()
            const toast = await toastController.create({
              message: '루틴이 삭제되었습니다',
              duration: 1500,
            })
            await toast.present()
          } catch (e) {
            const toast = await toastController.create({
              message: '삭제에 실패했습니다',
              duration: 2000,
              color: 'danger',
            })
            await toast.present()
          }
        },
      },
    ],
  })

  await alert.present()
}

onMounted(loadRoutines)
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <ion-icon :icon="chevronBackOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
        <ion-title>나의 루틴</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" />
      </div>

      <template v-else>
        <div v-if="routines.length === 0" class="empty-state">
          <p>저장된 루틴이 없습니다</p>
          <ion-button fill="outline" @click="openRoutineEditor()">
            <ion-icon slot="start" :icon="addOutline" />
            첫 루틴 만들기
          </ion-button>
        </div>

        <div v-else class="routines-list">
          <RoutineCard
            v-for="routine in routines"
            :key="routine.id"
            :routine="routine"
            @edit="handleEdit(routine)"
            @delete="handleDelete(routine)"
          />
        </div>
      </template>

      <ion-fab v-if="routines.length > 0" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="openRoutineEditor()">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  text-align: center;
}

.empty-state p {
  color: var(--ion-color-medium);
  margin-bottom: 16px;
}

.routines-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 80px;
}
</style>
