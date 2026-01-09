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
  modalController,
} from '@ionic/vue'
import { closeOutline, addOutline, removeOutline, barbellOutline } from 'ionicons/icons'
import { useWorkout } from '@/composables/useWorkout'
import { useRoutine } from '@/composables/useRoutine'
import type { Exercise, ExerciseSet, PreviousExerciseRecord, RoutineWithExercises } from '@/entities/workout/types'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Props {
  exerciseId: number
  existingSets?: ExerciseSet[]
  existingMemo?: string | null
  isAddingToExisting?: boolean
  isEditMode?: boolean
  currentDate?: string
}

interface SetInput {
  weight: number | null
  reps: number | null
  duration_seconds: number | null
}

const props = withDefaults(defineProps<Props>(), {
  existingSets: () => [],
  existingMemo: null,
  isAddingToExisting: false,
  isEditMode: false,
  currentDate: undefined,
})

const { fetchExercises, fetchPreviousExerciseRecord } = useWorkout()
const { getRoutinesByExercise } = useRoutine()

const exercise = ref<Exercise | null>(null)
const loading = ref(true)
const memo = ref('')
const sets = ref<SetInput[]>([
  { weight: null, reps: null, duration_seconds: null },
])
const previousRecord = ref<PreviousExerciseRecord | null>(null)
const routinesWithExercise = ref<RoutineWithExercises[]>([])
const showRoutineList = ref(false)

const isCardio = computed(() => {
  const cardioExercises = ['러닝', '사이클', '로잉머신', '스텝밀', '점프로프']
  return cardioExercises.some((name) => exercise.value?.name.includes(name))
})

const modalTitle = computed(() => {
  if (props.isEditMode) {
    return `${exercise.value?.name ?? ''} - 수정`
  }
  if (props.isAddingToExisting) {
    return `${exercise.value?.name ?? ''} - 세트 추가`
  }
  return exercise.value?.name ?? '세트 입력'
})

async function loadExercise() {
  loading.value = true
  try {
    const exercises = await fetchExercises()
    exercise.value = exercises.find((e) => e.id === props.exerciseId) ?? null

    // 이전 기록 및 루틴 로드 (수정 모드가 아닐 때만)
    if (!props.isEditMode) {
      try {
        const [prevRecord, routines] = await Promise.all([
          fetchPreviousExerciseRecord(props.exerciseId, props.currentDate),
          getRoutinesByExercise(props.exerciseId),
        ])
        previousRecord.value = prevRecord
        routinesWithExercise.value = routines
      } catch (e) {
        console.error('Failed to load previous record or routines:', e)
      }
    }

    // 수정 모드: 기존 세트를 편집 가능하게 로드
    if (props.isEditMode && props.existingSets.length > 0) {
      sets.value = props.existingSets.map((set) => ({
        weight: set.weight,
        reps: set.reps,
        duration_seconds: set.duration_seconds,
      }))
      memo.value = props.existingMemo ?? ''
    }
    // 추가 모드: 마지막 세트 값을 기본값으로
    else if (props.isAddingToExisting && props.existingSets.length > 0) {
      const lastSet = props.existingSets[props.existingSets.length - 1]
      if (lastSet) {
        sets.value = [
          {
            weight: lastSet.weight,
            reps: lastSet.reps,
            duration_seconds: lastSet.duration_seconds,
          },
        ]
      }
    }
  } catch (e) {
    console.error('Failed to load exercise:', e)
  } finally {
    loading.value = false
  }
}

function addSet() {
  const lastSet = sets.value[sets.value.length - 1]
  sets.value.push({
    weight: lastSet?.weight ?? null,
    reps: lastSet?.reps ?? null,
    duration_seconds: lastSet?.duration_seconds ?? null,
  })
}

function removeSet(index: number) {
  if (sets.value.length > 1) {
    sets.value.splice(index, 1)
  }
}

function closeModal() {
  modalController.dismiss(null, 'cancel')
}

function formatPreviousDate(dateStr: string): string {
  return format(parseISO(dateStr), 'M월 d일', { locale: ko })
}

function copyFromPrevious() {
  if (!previousRecord.value) return

  sets.value = previousRecord.value.sets.map((set) => ({
    weight: set.weight,
    reps: set.reps,
    duration_seconds: set.duration_seconds,
  }))
}

function toggleRoutineList() {
  showRoutineList.value = !showRoutineList.value
}

function copyFromRoutine(routine: RoutineWithExercises) {
  const routineExercise = routine.exercises.find(
    (re) => re.exercise_id === props.exerciseId
  )
  if (!routineExercise) return

  sets.value = routineExercise.sets.map((set) => ({
    weight: set.weight,
    reps: set.reps,
    duration_seconds: set.duration_seconds,
  }))

  showRoutineList.value = false
}

function save() {
  const validSets = sets.value
    .map((set, index) => ({
      set_number: index + 1,
      weight: set.weight,
      reps: set.reps,
      duration_seconds: set.duration_seconds,
    }))
    .filter((set) => set.weight || set.reps || set.duration_seconds)

  modalController.dismiss({ sets: validSets, memo: memo.value }, 'save')
}

onMounted(loadExercise)
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
        <ion-button strong @click="save">저장</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <div v-if="loading" class="loading-container">
      <ion-spinner name="crescent" />
    </div>

    <template v-else>
      <!-- 이전 기록 및 루틴 가져오기 (수정 모드가 아닐 때) -->
      <div v-if="!isEditMode && (previousRecord || routinesWithExercise.length > 0)" class="reference-section">
        <!-- 이전 기록 -->
        <div v-if="previousRecord" class="previous-record">
          <div class="previous-record-header">
            <span class="previous-record-title">이전 기록</span>
            <span class="previous-record-date">{{ formatPreviousDate(previousRecord.date) }}</span>
          </div>
          <div class="previous-record-sets">
            <div v-for="(set, index) in previousRecord.sets" :key="set.id" class="previous-set-item">
              <span class="set-number">{{ index + 1 }}</span>
              <span v-if="set.duration_seconds">
                {{ Math.floor(set.duration_seconds / 60) }}:{{
                  (set.duration_seconds % 60).toString().padStart(2, '0')
                }}
              </span>
              <span v-else>{{ set.weight ?? '-' }}kg × {{ set.reps ?? '-' }}회</span>
            </div>
          </div>
          <ion-button fill="clear" size="small" class="copy-button" @click="copyFromPrevious">
            이전 기록 복사
          </ion-button>
        </div>

        <!-- 루틴에서 가져오기 -->
        <div v-if="routinesWithExercise.length > 0" class="routine-reference">
          <ion-button
            fill="outline"
            size="small"
            class="routine-toggle-button"
            @click="toggleRoutineList"
          >
            <ion-icon slot="start" :icon="barbellOutline" />
            루틴에서 가져오기 ({{ routinesWithExercise.length }})
          </ion-button>

          <div v-if="showRoutineList" class="routine-list">
            <div
              v-for="routine in routinesWithExercise"
              :key="routine.id"
              class="routine-item"
              @click="copyFromRoutine(routine)"
            >
              <span class="routine-name">{{ routine.name }}</span>
              <span class="routine-sets">
                {{
                  routine.exercises
                    .find((re) => re.exercise_id === exerciseId)
                    ?.sets.length ?? 0
                }}세트
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 기존 세트 표시 (추가 모드일 때만, 수정 모드는 직접 편집) -->
      <div v-if="isAddingToExisting && !isEditMode && existingSets.length > 0" class="existing-sets">
        <h3>기존 세트</h3>
        <div class="existing-sets-list">
          <div v-for="(set, index) in existingSets" :key="set.id" class="existing-set-item">
            <span class="set-number">{{ index + 1 }}</span>
            <span v-if="set.duration_seconds">
              {{ Math.floor(set.duration_seconds / 60) }}:{{
                (set.duration_seconds % 60).toString().padStart(2, '0')
              }}
            </span>
            <span v-else> {{ set.weight ?? '-' }}kg × {{ set.reps ?? '-' }}회 </span>
          </div>
        </div>
      </div>

      <!-- 세트 입력/수정 -->
      <div class="sets-section">
        <div class="section-header">
          <h3>{{ isAddingToExisting && !isEditMode ? '추가할 세트' : '세트' }}</h3>
          <ion-button fill="clear" size="small" @click="addSet">
            <ion-icon :icon="addOutline" slot="start" />
            세트 추가
          </ion-button>
        </div>

        <div v-for="(set, index) in sets" :key="index" class="set-row">
          <span class="set-number">
            {{ isAddingToExisting && !isEditMode ? existingSets.length + index + 1 : index + 1 }}
          </span>

          <template v-if="isCardio">
            <ion-input
              v-model.number="set.duration_seconds"
              type="number"
              placeholder="시간(초)"
              fill="outline"
              class="set-input"
            />
          </template>

          <template v-else>
            <ion-input
              v-model.number="set.weight"
              type="number"
              placeholder="무게"
              fill="outline"
              class="set-input"
            >
              <span slot="end" class="input-suffix">kg</span>
            </ion-input>

            <ion-input
              v-model.number="set.reps"
              type="number"
              placeholder="횟수"
              fill="outline"
              class="set-input"
            >
              <span slot="end" class="input-suffix">회</span>
            </ion-input>
          </template>

          <ion-button
            v-if="sets.length > 1"
            fill="clear"
            color="danger"
            size="small"
            @click="removeSet(index)"
          >
            <ion-icon :icon="removeOutline" />
          </ion-button>
        </div>
      </div>

      <!-- 메모 -->
      <div class="memo-section">
        <h3>메모 (선택)</h3>
        <ion-textarea
          v-model="memo"
          placeholder="오늘의 컨디션, 느낌 등을 기록하세요"
          fill="outline"
          :rows="3"
        />
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

.previous-record {
  margin-bottom: 24px;
  padding: 12px;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border-radius: 8px;
  border-left: 3px solid var(--ion-color-primary);
}

.previous-record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.previous-record-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-primary);
}

.previous-record-date {
  font-size: 12px;
  color: var(--ion-color-medium);
}

.previous-record-sets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.previous-set-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--ion-background-color);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
}

.copy-button {
  --padding-start: 0;
  --padding-end: 0;
  font-size: 13px;
}

.reference-section {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.routine-reference {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.routine-toggle-button {
  --padding-start: 12px;
  --padding-end: 12px;
}

.routine-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: var(--ion-color-light);
  border-radius: 8px;
}

.routine-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--ion-background-color);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.routine-item:active {
  background: var(--ion-color-light-shade);
}

.routine-name {
  font-size: 14px;
  font-weight: 500;
}

.routine-sets {
  font-size: 13px;
  color: var(--ion-color-primary);
}

.existing-sets {
  margin-bottom: 24px;
  padding: 12px;
  background: var(--ion-color-light);
  border-radius: 8px;
}

.existing-sets h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--ion-color-medium);
}

.existing-sets-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.existing-set-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--ion-background-color);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
}

.sets-section,
.memo-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3,
.memo-section h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.set-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.set-number {
  width: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--ion-color-medium);
}

.set-input {
  flex: 1;
}

.input-suffix {
  color: var(--ion-color-medium);
  font-size: 14px;
  padding-right: 8px;
}
</style>
