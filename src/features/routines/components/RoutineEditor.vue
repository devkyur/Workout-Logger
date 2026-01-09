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
  IonInput,
  IonTextarea,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  modalController,
  toastController,
} from '@ionic/vue'
import { closeOutline, addOutline, trashOutline } from 'ionicons/icons'
import { useRoutine } from '@/composables/useRoutine'
import { useAuth } from '@/composables/useAuth'
import type { RoutineWithExercises, RoutineSetInput, Exercise } from '@/entities/workout/types'
import ExerciseSelector from '@/features/exercise-selector/components/ExerciseSelector.vue'
import RoutineSetEditor from './RoutineSetEditor.vue'

interface Props {
  routine?: RoutineWithExercises | null
}

interface RoutineExerciseInput {
  id?: number
  exerciseId: number
  exercise: Exercise
  sets: RoutineSetInput[]
}

const props = withDefaults(defineProps<Props>(), {
  routine: null,
})

const { user } = useAuth()
const {
  createRoutine,
  updateRoutine,
  addExerciseToRoutine,
  updateRoutineExerciseSets,
  removeExerciseFromRoutine,
} = useRoutine()

const loading = ref(false)
const saving = ref(false)
const name = ref('')
const description = ref('')
const exercises = ref<RoutineExerciseInput[]>([])

const isEditMode = computed(() => !!props.routine)
const modalTitle = computed(() => (isEditMode.value ? '루틴 수정' : '새 루틴'))
const canSave = computed(() => name.value.trim().length > 0)

const existingExerciseIds = computed(
  () => new Set(exercises.value.map((e) => e.exerciseId))
)

async function loadRoutineData() {
  if (!props.routine) return

  loading.value = true
  try {
    name.value = props.routine.name
    description.value = props.routine.description || ''
    exercises.value = props.routine.exercises.map((re) => ({
      id: re.id,
      exerciseId: re.exercise_id,
      exercise: re.exercise!,
      sets: re.sets.map((s) => ({
        set_number: s.set_number,
        weight: s.weight,
        reps: s.reps,
        duration_seconds: s.duration_seconds,
      })),
    }))
  } finally {
    loading.value = false
  }
}

async function openExerciseSelector() {
  const modal = await modalController.create({
    component: ExerciseSelector,
    componentProps: {
      existingExerciseIds: existingExerciseIds.value,
    },
  })

  await modal.present()

  const { data, role } = await modal.onWillDismiss()

  if (role === 'select' && data) {
    await openSetEditor(data.id, data as Exercise)
  }
}

async function openSetEditor(exerciseId: number, exercise: Exercise, existingIndex?: number) {
  const existingSets = existingIndex !== undefined ? exercises.value[existingIndex].sets : []

  const modal = await modalController.create({
    component: RoutineSetEditor,
    componentProps: {
      exercise,
      existingSets,
    },
    breakpoints: [0, 0.6],
    initialBreakpoint: 0.6,
  })

  await modal.present()

  const { data, role } = await modal.onWillDismiss()

  if (role === 'save' && data) {
    if (existingIndex !== undefined && exercises.value[existingIndex]) {
      exercises.value[existingIndex].sets = data.sets
    } else {
      exercises.value.push({
        exerciseId,
        exercise,
        sets: data.sets,
      })
    }
  }
}

function removeExercise(index: number) {
  exercises.value.splice(index, 1)
}

function formatSets(sets: RoutineSetInput[]): string {
  if (sets.length === 0) return '세트 없음'
  return sets
    .map((s) => {
      if (s.duration_seconds) {
        const mins = Math.floor(s.duration_seconds / 60)
        const secs = s.duration_seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
      }
      return `${s.weight ?? '-'}kg × ${s.reps ?? '-'}회`
    })
    .join(' / ')
}

function closeModal() {
  modalController.dismiss(null, 'cancel')
}

async function save() {
  if (!canSave.value || !user.value) return

  saving.value = true
  try {
    if (isEditMode.value && props.routine) {
      // 수정 모드
      await updateRoutine(props.routine.id, {
        name: name.value.trim(),
        description: description.value.trim() || null,
      })

      // 삭제된 운동 처리
      const currentIds = new Set(exercises.value.filter((e) => e.id).map((e) => e.id!))
      for (const re of props.routine.exercises) {
        if (!currentIds.has(re.id)) {
          await removeExerciseFromRoutine(re.id)
        }
      }

      // 기존 운동 세트 업데이트 및 새 운동 추가
      for (const ex of exercises.value) {
        if (ex.id) {
          await updateRoutineExerciseSets(ex.id, ex.sets)
        } else {
          await addExerciseToRoutine(props.routine.id, ex.exerciseId, ex.sets)
        }
      }
    } else {
      // 새 루틴 생성
      const routine = await createRoutine(
        user.value.id,
        name.value.trim(),
        description.value.trim() || undefined
      )

      // 운동 추가
      for (const ex of exercises.value) {
        await addExerciseToRoutine(routine.id, ex.exerciseId, ex.sets)
      }
    }

    const toast = await toastController.create({
      message: isEditMode.value ? '루틴이 수정되었습니다' : '루틴이 생성되었습니다',
      duration: 1500,
      color: 'success',
    })
    await toast.present()

    modalController.dismiss(null, 'saved')
  } catch (e: any) {
    const toast = await toastController.create({
      message: e.message || '저장에 실패했습니다',
      duration: 2000,
      color: 'danger',
    })
    await toast.present()
  } finally {
    saving.value = false
  }
}

onMounted(loadRoutineData)
</script>

<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ modalTitle }}</ion-title>
      <ion-buttons slot="end">
        <ion-button strong :disabled="!canSave || saving" @click="save">
          <ion-spinner v-if="saving" name="crescent" />
          <span v-else>저장</span>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <div v-if="loading" class="loading-container">
      <ion-spinner name="crescent" />
    </div>

    <template v-else>
      <div class="form-section">
        <ion-input
          v-model="name"
          label="루틴 이름"
          label-placement="stacked"
          placeholder="예: Push Day, 등 운동"
          fill="outline"
        />

        <ion-textarea
          v-model="description"
          label="설명 (선택)"
          label-placement="stacked"
          placeholder="루틴에 대한 간단한 설명"
          fill="outline"
          :rows="2"
        />
      </div>

      <div class="exercises-section">
        <div class="section-header">
          <h3>운동 목록</h3>
          <ion-button fill="clear" size="small" @click="openExerciseSelector">
            <ion-icon :icon="addOutline" slot="start" />
            운동 추가
          </ion-button>
        </div>

        <div v-if="exercises.length === 0" class="empty-exercises">
          <p>추가된 운동이 없습니다</p>
        </div>

        <ion-card
          v-for="(ex, index) in exercises"
          :key="ex.exerciseId"
          class="exercise-card"
          button
          @click="openSetEditor(ex.exerciseId, ex.exercise, index)"
        >
          <ion-card-header>
            <div class="exercise-header">
              <ion-card-title class="exercise-name">{{ ex.exercise.name }}</ion-card-title>
              <ion-button
                fill="clear"
                size="small"
                color="danger"
                @click.stop="removeExercise(index)"
              >
                <ion-icon :icon="trashOutline" />
              </ion-button>
            </div>
          </ion-card-header>
          <ion-card-content>
            <p class="sets-info">{{ ex.sets.length }}세트: {{ formatSets(ex.sets) }}</p>
          </ion-card-content>
        </ion-card>
      </div>
    </template>
  </ion-content>
</template>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.exercises-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.empty-exercises {
  text-align: center;
  padding: 24px;
  background: var(--ion-color-light);
  border-radius: 8px;
}

.empty-exercises p {
  color: var(--ion-color-medium);
  margin: 0;
}

.exercise-card {
  margin: 0 0 8px;
}

.exercise-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exercise-name {
  font-size: 16px;
}

.sets-info {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 0;
}
</style>
