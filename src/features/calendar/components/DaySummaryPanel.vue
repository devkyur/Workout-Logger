<script setup lang="ts">
import { computed } from 'vue'
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  modalController,
  toastController,
  alertController,
} from '@ionic/vue'
import { chevronForwardOutline, trashOutline } from 'ionicons/icons'
import { format, parseISO, isToday as isTodayFn } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useWorkout } from '@/composables/useWorkout'
import { useRoutine } from '@/composables/useRoutine'
import { useAuth } from '@/composables/useAuth'
import { supabase } from '@/shared/lib/supabase'
import type { WorkoutSessionWithExercises, SessionExerciseWithSets, RoutineWithExercises } from '@/entities/workout/types'
import ExerciseSelector from '@/features/exercise-selector/components/ExerciseSelector.vue'
import SetInputModal from '@/features/workout-log/components/SetInputModal.vue'
import RoutineSelector from '@/features/routines/components/RoutineSelector.vue'

interface Props {
  selectedDate: string | null
  session: WorkoutSessionWithExercises | null
  loading: boolean
  expanded?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  expand: []
  refresh: []
  copyToToday: []
}>()

const { user } = useAuth()
const {
  getOrCreateSession,
  addExerciseToSession,
  deleteSessionExercise,
  deleteEmptySession,
  updateExerciseSets,
  copySessionToDate,
} = useWorkout()
const { applyRoutineToSession } = useRoutine()

const formattedDate = computed(() => {
  if (!props.selectedDate) return ''
  const date = parseISO(props.selectedDate)
  const dateStr = format(date, 'M월 d일 (EEEE)', { locale: ko })
  return isTodayFn(date) ? `${dateStr} · 오늘` : dateStr
})

// 선택된 날짜가 오늘인지 확인
const isToday = computed(() => {
  if (!props.selectedDate) return false
  return isTodayFn(parseISO(props.selectedDate))
})

const hasWorkout = computed(() =>
  props.session && props.session.exercises.length > 0
)

// 운동 요약 텍스트
const exerciseSummary = computed(() => {
  if (!props.session) return ''
  return props.session.exercises
    .map(ex => `${ex.exercise?.name ?? '알 수 없음'} ${ex.sets.length}세트`)
    .join(' · ')
})

// 총 볼륨 계산
const totalVolume = computed(() => {
  if (!props.session) return 0
  return props.session.exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((acc, set) => {
      if (set.weight && set.reps) {
        return acc + set.weight * set.reps
      }
      return acc
    }, 0)
  }, 0)
})

// 해당 날짜에 이미 기록된 운동 ID 목록
const existingExerciseIds = computed(
  () => new Set(props.session?.exercises.map((e) => e.exercise_id) ?? [])
)

// 세트 표시 포맷
function formatSet(set: { weight?: number | null; reps?: number | null; duration_seconds?: number | null }) {
  if (set.duration_seconds) {
    const mins = Math.floor(set.duration_seconds / 60)
    const secs = set.duration_seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return `${set.weight ?? '-'}kg × ${set.reps ?? '-'}회`
}

// 운동별 볼륨 계산
function getExerciseVolume(exercise: SessionExerciseWithSets): number {
  return exercise.sets.reduce((acc, set) => {
    if (set.weight && set.reps) {
      return acc + set.weight * set.reps
    }
    return acc
  }, 0)
}

// 운동 선택 모달 열기
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
    await handleExerciseSelected(data.id)
  }
}

// 운동 선택 후 세트 입력
async function handleExerciseSelected(exerciseId: number) {
  if (!props.selectedDate) return

  const existingExercise = props.session?.exercises.find(
    (e) => e.exercise_id === exerciseId
  )

  const modal = await modalController.create({
    component: SetInputModal,
    componentProps: {
      exerciseId,
      existingSets: existingExercise?.sets ?? [],
      isAddingToExisting: !!existingExercise,
      currentDate: props.selectedDate,
    },
    breakpoints: [0, 0.75],
    initialBreakpoint: 0.75,
  })

  await modal.present()

  const { data, role } = await modal.onWillDismiss()

  if (role === 'save' && data) {
    try {
      let currentSession = props.session
      if (!currentSession) {
        const newSession = await getOrCreateSession(user.value!.id, props.selectedDate)
        currentSession = { ...newSession, exercises: [] }
      }

      await addExerciseToSession(
        currentSession.id,
        exerciseId,
        data.sets,
        data.memo || null
      )

      const toast = await toastController.create({
        message: existingExercise ? '세트가 추가되었습니다' : '운동이 기록되었습니다',
        duration: 1500,
        color: 'success',
      })
      await toast.present()

      emit('refresh')
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

// 운동 수정
async function handleEditExercise(sessionExercise: SessionExerciseWithSets, event: Event) {
  event.stopPropagation()
  if (!props.selectedDate) return

  const modal = await modalController.create({
    component: SetInputModal,
    componentProps: {
      exerciseId: sessionExercise.exercise_id,
      existingSets: sessionExercise.sets,
      existingMemo: sessionExercise.memo,
      isEditMode: true,
      currentDate: props.selectedDate,
    },
    breakpoints: [0, 0.75],
    initialBreakpoint: 0.75,
  })

  await modal.present()

  const { data, role } = await modal.onWillDismiss()

  if (role === 'save' && data) {
    try {
      await updateExerciseSets(sessionExercise.id, data.sets)

      if (data.memo !== sessionExercise.memo) {
        const { error } = await supabase
          .from('session_exercises')
          .update({ memo: data.memo || null })
          .eq('id', sessionExercise.id)
        if (error) throw error
      }

      const toast = await toastController.create({
        message: '수정되었습니다',
        duration: 1500,
        color: 'success',
      })
      await toast.present()

      emit('refresh')
    } catch (e: any) {
      const toast = await toastController.create({
        message: e.message || '수정에 실패했습니다',
        duration: 2000,
        color: 'danger',
      })
      await toast.present()
    }
  }
}

// 오늘 운동으로 복사
async function handleCopyToToday() {
  if (!props.session || !user.value) return

  const today = format(new Date(), 'yyyy-MM-dd')

  try {
    await copySessionToDate(user.value.id, props.session, today)

    const toast = await toastController.create({
      message: '오늘 운동으로 복사되었습니다',
      duration: 1500,
      color: 'success',
    })
    await toast.present()

    emit('copyToToday')
  } catch (e: any) {
    const toast = await toastController.create({
      message: e.message || '복사에 실패했습니다',
      duration: 2000,
      color: 'danger',
    })
    await toast.present()
  }
}

// 루틴 적용 모달 열기
async function openRoutineSelector() {
  const modal = await modalController.create({
    component: RoutineSelector,
  })

  await modal.present()

  const { data, role } = await modal.onWillDismiss()

  if (role === 'select' && data) {
    await handleApplyRoutine(data as RoutineWithExercises)
  }
}

// 루틴 적용
async function handleApplyRoutine(routine: RoutineWithExercises) {
  if (!props.selectedDate || !user.value) return

  try {
    // 세션 가져오거나 생성
    const session = await getOrCreateSession(user.value.id, props.selectedDate)

    // 루틴 적용
    const { skipped } = await applyRoutineToSession(
      routine,
      session.id,
      existingExerciseIds.value
    )

    let message = `${routine.name} 루틴이 적용되었습니다`
    if (skipped > 0) {
      message += ` (${skipped}개 운동 건너뜀)`
    }

    const toast = await toastController.create({
      message,
      duration: 2000,
      color: 'success',
    })
    await toast.present()

    emit('refresh')
  } catch (e: any) {
    const toast = await toastController.create({
      message: e.message || '루틴 적용에 실패했습니다',
      duration: 2000,
      color: 'danger',
    })
    await toast.present()
  }
}

// 운동 삭제
async function handleDeleteExercise(sessionExerciseId: number, event: Event) {
  event.stopPropagation()

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

            if (props.session) {
              await deleteEmptySession(props.session.id)
            }

            const toast = await toastController.create({
              message: '삭제되었습니다',
              duration: 1500,
            })
            await toast.present()

            emit('refresh')
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

// CalendarView에서 호출할 수 있도록 메서드 노출
defineExpose({
  openExerciseSelector,
  openRoutineSelector,
  handleCopyToToday,
  isToday,
  hasWorkout,
})
</script>

<template>
  <div class="day-summary-panel" :class="{ expanded }">
    <!-- 날짜 미선택 상태 -->
    <div v-if="!selectedDate" class="empty-state">
      <p class="hint">날짜를 선택하면 운동 기록을 볼 수 있어요</p>
    </div>

    <!-- 로딩 중 -->
    <div v-else-if="loading" class="loading-state">
      <ion-spinner name="crescent" />
    </div>

    <!-- 운동 기록 있음 -->
    <template v-else-if="hasWorkout">
      <!-- 기본 모드 -->
      <template v-if="!expanded">
        <div class="panel-header">
          <span class="date">{{ formattedDate }}</span>
        </div>

        <div class="workout-summary" @click="emit('expand')">
          <p class="exercises">{{ exerciseSummary }}</p>

          <div class="stats">
            <span v-if="totalVolume > 0" class="volume">
              총 볼륨: {{ totalVolume.toLocaleString() }}kg
            </span>
          </div>

          <div class="action-hint">
            <span>상세 보기</span>
            <ion-icon :icon="chevronForwardOutline" />
          </div>
        </div>
      </template>

      <!-- 확장 모드 - 상세 뷰 (CRUD 기능 포함) -->
      <template v-else>
        <div class="expanded-content">
          <!-- 총 볼륨 표시 -->
          <div v-if="totalVolume > 0" class="total-volume-header">
            총 볼륨: {{ totalVolume.toLocaleString() }}kg
          </div>

          <!-- 운동 카드 목록 -->
          <ion-card
            v-for="exercise in session!.exercises"
            :key="exercise.id"
            class="workout-card"
            button
            @click="handleEditExercise(exercise, $event)"
          >
            <ion-card-header>
              <div class="card-header-content">
                <ion-card-title class="exercise-name">
                  {{ exercise.exercise?.name ?? '알 수 없음' }}
                </ion-card-title>
                <ion-button fill="clear" color="danger" size="small" @click="handleDeleteExercise(exercise.id, $event)">
                  <ion-icon :icon="trashOutline" />
                </ion-button>
              </div>
            </ion-card-header>

            <ion-card-content>
              <div class="sets-container">
                <div
                  v-for="(set, index) in exercise.sets"
                  :key="set.id"
                  class="set-item"
                >
                  <span class="set-number">{{ index + 1 }}</span>
                  <span class="set-value">{{ formatSet(set) }}</span>
                </div>
              </div>

              <div v-if="getExerciseVolume(exercise) > 0" class="exercise-volume">
                볼륨: {{ getExerciseVolume(exercise).toLocaleString() }}kg
              </div>

              <p v-if="exercise.memo" class="memo">{{ exercise.memo }}</p>
            </ion-card-content>
          </ion-card>

        </div>
      </template>
    </template>

    <!-- 운동 기록 없음 -->
    <template v-else>
      <template v-if="!expanded">
        <div class="panel-header">
          <span class="date">{{ formattedDate }}</span>
        </div>
        <div class="no-workout">
          <p>기록된 운동이 없어요</p>
        </div>
      </template>

      <template v-else>
        <div class="no-workout-expanded">
          <p>기록된 운동이 없어요</p>
          <p class="hint">우측 하단 + 버튼으로 운동을 추가하세요</p>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.day-summary-panel {
  background: var(--ion-card-background, var(--ion-background-color));
  border-radius: 16px 16px 0 0;
  margin: 0 12px;
  padding: 16px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  min-height: 100px;
  transition: all 0.3s ease;
}

.day-summary-panel.expanded {
  margin: 0;
  border-radius: 0;
  min-height: auto;
  flex: 1;
  box-shadow: none;
  overflow-y: auto;
  max-height: calc(100vh - 120px); /* 헤더 + 드래그핸들 높이 제외 */
  position: relative;
}

.empty-state,
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
}

.empty-state .hint {
  color: var(--ion-color-medium);
  font-size: 14px;
  margin: 0;
}

.panel-header {
  margin-bottom: 12px;
}

.date {
  font-size: 15px;
  font-weight: 600;
  color: var(--ion-text-color);
}

.workout-summary {
  cursor: pointer;
  padding: 12px;
  margin: -12px;
  margin-top: 0;
  border-radius: 12px;
  transition: background-color 0.15s;
}

.workout-summary:active {
  background: var(--ion-color-light);
}

.exercises {
  font-size: 14px;
  color: var(--ion-color-medium-shade);
  margin: 0 0 8px;
  line-height: 1.4;
}

.stats {
  margin-bottom: 8px;
}

.volume {
  font-size: 13px;
  color: var(--ion-color-primary);
  font-weight: 500;
}

.action-hint {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: 13px;
  color: var(--ion-color-medium);
}

.no-workout {
  text-align: center;
  padding: 16px 0;
}

.no-workout p {
  color: var(--ion-color-medium);
  margin: 0;
  font-size: 14px;
}

.no-workout-expanded {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.no-workout-expanded p {
  color: var(--ion-color-medium);
  margin: 0;
  font-size: 15px;
}

.no-workout-expanded .hint {
  margin-top: 8px;
  font-size: 13px;
  opacity: 0.7;
}

/* 확장 모드 스타일 */
.expanded-content {
  padding-bottom: 80px;
}

.total-volume-header {
  font-size: 15px;
  font-weight: 600;
  color: var(--ion-color-primary-contrast);
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--ion-color-primary);
  border-radius: 8px;
}

.workout-card {
  margin: 0 0 12px;
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

.exercise-volume {
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
