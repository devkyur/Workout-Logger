<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
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
  toastController,
  alertController,
} from '@ionic/vue'
import { closeOutline, addOutline } from 'ionicons/icons'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useWorkout } from '@/composables/useWorkout'
import { useAuth } from '@/composables/useAuth'
import type { WorkoutSessionWithExercises } from '@/entities/workout/types'
import WorkoutCard from './WorkoutCard.vue'
import ExerciseSelector from '@/features/exercise-selector/components/ExerciseSelector.vue'
import SetInputModal from './SetInputModal.vue'

interface Props {
  date: string
}

const props = defineProps<Props>()

const { user } = useAuth()
const {
  fetchDaySession,
  getOrCreateSession,
  addExerciseToSession,
  deleteSessionExercise,
  deleteEmptySession,
} = useWorkout()

const loading = ref(true)
const session = ref<WorkoutSessionWithExercises | null>(null)
const showExerciseSelector = ref(false)

const formattedDate = computed(() =>
  format(parseISO(props.date), 'M월 d일 (EEEE)', { locale: ko })
)

// 해당 날짜에 이미 기록된 운동 ID 목록
const existingExerciseIds = computed(
  () => new Set(session.value?.exercises.map((e) => e.exercise_id) ?? [])
)

async function loadSession() {
  loading.value = true
  try {
    session.value = await fetchDaySession(props.date)
  } catch (e) {
    console.error('Failed to load session:', e)
  } finally {
    loading.value = false
  }
}

function closeModal(role?: string) {
  modalController.dismiss(null, role)
}

async function handleExerciseSelected(exerciseId: string) {
  showExerciseSelector.value = false

  // 이미 해당 운동이 있는지 확인
  const existingExercise = session.value?.exercises.find(
    (e) => e.exercise_id === exerciseId
  )

  // 세트 입력 모달 열기
  const modal = await modalController.create({
    component: SetInputModal,
    componentProps: {
      exerciseId,
      existingSets: existingExercise?.sets ?? [],
      isAddingToExisting: !!existingExercise,
    },
    breakpoints: [0, 0.75],
    initialBreakpoint: 0.75,
  })

  await modal.present()

  const { data, role } = await modal.onWillDismiss()

  if (role === 'save' && data) {
    try {
      // 세션이 없으면 생성
      let currentSession = session.value
      if (!currentSession) {
        const newSession = await getOrCreateSession(user.value!.id, props.date)
        currentSession = { ...newSession, exercises: [] }
      }

      // 운동 및 세트 추가
      await addExerciseToSession(
        currentSession.id,
        exerciseId,
        data.sets,
        data.memo || null
      )

      const toast = await toastController.create({
        message: existingExercise ? '세트가 추가되었습니다' : '운동 기록이 저장되었습니다',
        duration: 1500,
        color: 'success',
      })
      await toast.present()

      await loadSession()
    } catch (e: any) {
      const toast = await toastController.create({
        message: e.message || '저장에 실패했습니다',
        duration: 2000,
        color: 'danger',
      })
      await toast.present()
    }
  }
}

async function handleDeleteExercise(sessionExerciseId: string) {
  const alert = await alertController.create({
    header: '삭제 확인',
    message: '이 운동 기록을 삭제하시겠습니까?',
    buttons: [
      { text: '취소', role: 'cancel' },
      {
        text: '삭제',
        role: 'destructive',
        handler: async () => {
          try {
            await deleteSessionExercise(sessionExerciseId)

            // 세션에 운동이 없으면 세션도 삭제
            if (session.value) {
              await deleteEmptySession(session.value.id)
            }

            await loadSession()

            const toast = await toastController.create({
              message: '삭제되었습니다',
              duration: 1500,
            })
            await toast.present()
          } catch (e: any) {
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

onMounted(loadSession)
</script>

<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ formattedDate }}</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="closeModal('saved')">
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <div v-if="loading" class="loading-container">
      <ion-spinner name="crescent" />
    </div>

    <template v-else>
      <!-- 운동 기록 목록 -->
      <div v-if="session && session.exercises.length > 0" class="workout-list">
        <WorkoutCard
          v-for="exercise in session.exercises"
          :key="exercise.id"
          :session-exercise="exercise"
          @delete="handleDeleteExercise(exercise.id)"
        />
      </div>

      <div v-else class="empty-state">
        <p>기록된 운동이 없습니다</p>
        <p class="hint">+ 버튼을 눌러 운동을 추가하세요</p>
      </div>

      <!-- 운동 종목 선택기 -->
      <ExerciseSelector
        v-if="showExerciseSelector"
        :existing-exercise-ids="existingExerciseIds"
        @select="handleExerciseSelected"
        @close="showExerciseSelector = false"
      />
    </template>

    <!-- 운동 추가 FAB -->
    <ion-fab vertical="bottom" horizontal="end" :style="{ position: 'absolute', bottom: '10vh', right: '16px' }">
      <ion-fab-button @click="showExerciseSelector = true">
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.workout-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 80px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--ion-color-medium);
}

.empty-state p {
  margin: 0;
}

.empty-state .hint {
  font-size: 14px;
  margin-top: 8px;
}
</style>
