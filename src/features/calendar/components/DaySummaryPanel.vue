<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import {
  IonIcon,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  modalController,
  toastController,
  alertController,
} from '@ionic/vue'
import { chevronForwardOutline, reorderTwoOutline, trashOutline } from 'ionicons/icons'
import Sortable from 'sortablejs'
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
  dragging: [isDragging: boolean]
  reorder: [exerciseIds: number[]]
}>()

const { user } = useAuth()
const {
  getOrCreateSession,
  addExerciseToSession,
  deleteSessionExercise,
  deleteEmptySession,
  updateExerciseSets,
  copySessionToDate,
  reorderSessionExercises,
} = useWorkout()

// Sortable 관련
const exerciseListRef = ref<HTMLElement | null>(null)
let sortableInstance: Sortable | null = null

// Sortable 초기화
function initSortable() {
  if (!exerciseListRef.value) return

  // 기존 인스턴스 정리
  if (sortableInstance) {
    sortableInstance.destroy()
  }

  sortableInstance = new Sortable(exerciseListRef.value, {
    animation: 200,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onStart: () => emit('dragging', true),
    onEnd: () => {
      emit('dragging', false)
      handleSortEnd()
    },
  })
}

// 드래그 종료 시 순서 저장
async function handleSortEnd() {
  if (!props.session || !exerciseListRef.value) return

  // DOM에서 현재 순서 읽기
  const wrappers = exerciseListRef.value.querySelectorAll('.exercise-card-wrapper')
  const exerciseIds: number[] = []
  wrappers.forEach((el) => {
    const id = el.getAttribute('data-id')
    if (id) exerciseIds.push(parseInt(id, 10))
  })

  // 부모에게 순서 변경 알림 (optimistic update)
  emit('reorder', exerciseIds)

  // API로 순서 저장 (백그라운드)
  try {
    await reorderSessionExercises(exerciseIds)
  } catch (e) {
    console.error('Failed to reorder exercises:', e)
    const toast = await toastController.create({
      message: '순서 변경에 실패했습니다',
      duration: 2000,
      color: 'danger',
    })
    await toast.present()
    emit('refresh') // 실패 시에만 원래 순서로 복구
  }
}

// expanded 모드 또는 session 변경 시 Sortable 재초기화
watch(
  [() => props.expanded, () => props.session],
  async ([expanded, session]) => {
    if (expanded && session?.exercises.length) {
      await nextTick()
      initSortable()
    } else if (sortableInstance) {
      sortableInstance.destroy()
      sortableInstance = null
    }
  },
  { deep: true }
)
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
    breakpoints: [0, 0.8],
    initialBreakpoint: 0.8,
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
    breakpoints: [0, 0.8],
    initialBreakpoint: 0.8,
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
          <div ref="exerciseListRef" class="exercise-list">
            <div
              v-for="exercise in session!.exercises"
              :key="exercise.id"
              class="exercise-card-wrapper"
              :data-id="exercise.id"
            >
              <ion-item-sliding class="exercise-sliding-item">
                <ion-item class="exercise-item" lines="none">
                  <ion-card
                    class="workout-card"
                    button
                    @click="handleEditExercise(exercise, $event)"
                  >
                    <ion-card-header>
                      <div class="card-header-content">
                        <ion-card-title class="exercise-name">
                          {{ exercise.exercise?.name ?? '알 수 없음' }}
                        </ion-card-title>
                        <div class="drag-handle" @click.stop @touchstart.stop @touchmove.stop @touchend.stop>
                          <ion-icon :icon="reorderTwoOutline" />
                        </div>
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
                </ion-item>

                <ion-item-options side="end">
                  <ion-item-option color="danger" @click="handleDeleteExercise(exercise.id, $event)">
                    <ion-icon slot="icon-only" :icon="trashOutline" />
                  </ion-item-option>
                </ion-item-options>
              </ion-item-sliding>
            </div>
          </div>

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
  border-radius: 16px;
  margin: 0 12px 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 120px;
  transition: all 0.3s ease;
}

.day-summary-panel.expanded {
  margin: 0;
  border-radius: 0;
  min-height: 100%;
  flex: 1;
  box-shadow: none;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
  position: relative;
  background: var(--ion-background-color);
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
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
  padding-bottom: 100px;
}

.total-volume-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-primary);
  margin-bottom: 16px;
  padding: 14px 16px;
  background: var(--ion-card-background, #1c1c1e);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.total-volume-header::before {
  content: '';
  width: 4px;
  height: 20px;
  background: var(--ion-color-primary);
  border-radius: 2px;
}

.workout-card {
  margin: 0 0 12px;
  border-radius: 12px;
  --background: var(--ion-card-background, #1c1c1e);
}

.card-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exercise-name {
  font-size: 15px;
  font-weight: 600;
}

.sets-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.set-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--ion-color-light, #f4f5f8);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.set-number {
  color: var(--ion-color-medium);
  font-size: 11px;
  font-weight: 500;
}

.set-value {
  color: var(--ion-text-color);
}

.exercise-volume {
  font-size: 12px;
  color: var(--ion-color-primary);
  font-weight: 500;
  margin-bottom: 8px;
}

.memo {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 0;
  padding: 10px 12px;
  background: var(--ion-color-light, #f4f5f8);
  border-radius: 8px;
  line-height: 1.4;
}

/* 운동 목록 스타일 */
.exercise-list {
  background: transparent;
  padding: 0;
}

.exercise-sliding-item {
  --background: transparent;
  margin-bottom: 12px;
}

.exercise-item {
  --background: transparent;
  --padding-start: 0;
  --padding-end: 0;
  --inner-padding-end: 0;
}

.exercise-item .workout-card {
  width: 100%;
  margin: 0;
}

/* 드래그 핸들 */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  color: var(--ion-color-medium);
  cursor: grab;
  touch-action: none;
}

.drag-handle:active {
  cursor: grabbing;
  color: var(--ion-color-primary);
}

.drag-handle ion-icon {
  font-size: 20px;
}

/* Sortable 드래그 스타일 */
.sortable-ghost {
  opacity: 0.4;
}

.sortable-chosen {
  opacity: 0.8;
}

.sortable-drag {
  opacity: 1;
  background: var(--ion-card-background);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
</style>
