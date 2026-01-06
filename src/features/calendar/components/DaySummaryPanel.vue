<script setup lang="ts">
import { computed } from 'vue'
import { IonButton, IonIcon, IonSpinner } from '@ionic/vue'
import { addOutline, chevronForwardOutline } from 'ionicons/icons'
import { format, parseISO, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { WorkoutSessionWithExercises } from '@/entities/workout/types'

interface Props {
  selectedDate: string | null
  session: WorkoutSessionWithExercises | null
  loading: boolean
  expanded?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  openModal: []
  addWorkout: []
}>()

const formattedDate = computed(() => {
  if (!props.selectedDate) return ''
  const date = parseISO(props.selectedDate)
  const dateStr = format(date, 'M월 d일 (EEEE)', { locale: ko })
  return isToday(date) ? `${dateStr} · 오늘` : dateStr
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

// 세트 표시 포맷
function formatSet(set: { weight?: number | null; reps?: number | null; duration_seconds?: number | null }) {
  if (set.duration_seconds) {
    const mins = Math.floor(set.duration_seconds / 60)
    const secs = set.duration_seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return `${set.weight ?? '-'}kg × ${set.reps ?? '-'}회`
}
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

        <div class="workout-summary" @click="emit('openModal')">
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

      <!-- 확장 모드 - 상세 뷰 -->
      <template v-else>
        <div class="expanded-content">
          <div
            v-for="exercise in session!.exercises"
            :key="exercise.id"
            class="exercise-card"
            @click="emit('openModal')"
          >
            <div class="exercise-header">
              <h3 class="exercise-name">{{ exercise.exercise?.name ?? '알 수 없음' }}</h3>
            </div>

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

            <p v-if="exercise.memo" class="memo">{{ exercise.memo }}</p>
          </div>

          <!-- 운동 추가 버튼 -->
          <ion-button
            expand="block"
            fill="outline"
            class="add-button"
            @click="emit('addWorkout')"
          >
            <ion-icon slot="start" :icon="addOutline" />
            운동 추가
          </ion-button>
        </div>
      </template>
    </template>

    <!-- 운동 기록 없음 -->
    <template v-else>
      <template v-if="!expanded">
        <div class="panel-header">
          <span class="date">{{ formattedDate }}</span>
        </div>
      </template>

      <div class="no-workout">
        <p>기록된 운동이 없어요</p>
        <ion-button fill="outline" size="default" @click="emit('addWorkout')">
          <ion-icon slot="start" :icon="addOutline" />
          운동 기록하기
        </ion-button>
      </div>
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
  margin: 0 0 16px;
  font-size: 14px;
}

/* 확장 모드 스타일 */
.expanded-content {
  padding-bottom: 20px;
}

.exercise-card {
  background: var(--ion-color-light);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.exercise-card:active {
  background: var(--ion-color-light-shade);
}

.exercise-header {
  margin-bottom: 12px;
}

.exercise-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--ion-text-color);
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
  background: var(--ion-background-color);
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

.memo {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px solid var(--ion-color-medium-tint);
}

.add-button {
  margin-top: 8px;
}
</style>
