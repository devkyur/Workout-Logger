<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonRange,
  alertController,
} from '@ionic/vue'
import { createOutline } from 'ionicons/icons'
import type { WeeklyGoal } from '@/composables/useStats'

const props = defineProps<{
  goal: WeeklyGoal | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'save', targetValue: number): void
}>()

const isEditing = ref(false)
const editValue = ref(5)

const progressWidth = computed(() => {
  if (!props.goal) return '0%'
  return `${props.goal.percentage}%`
})

const progressColor = computed(() => {
  if (!props.goal) return 'var(--ion-color-medium)'
  if (props.goal.percentage >= 100) return 'var(--ion-color-success)'
  if (props.goal.percentage >= 60) return 'var(--ion-color-primary)'
  return 'var(--ion-color-warning)'
})

function startEdit() {
  if (props.goal) {
    editValue.value = props.goal.targetValue
  }
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
}

function saveEdit() {
  emit('save', editValue.value)
  isEditing.value = false
}

async function showEditAlert() {
  const alert = await alertController.create({
    header: '주간 목표 설정',
    message: '이번 주 운동 목표 횟수를 설정하세요.',
    inputs: [
      {
        name: 'target',
        type: 'number',
        placeholder: '목표 횟수',
        value: props.goal?.targetValue ?? 5,
        min: 1,
        max: 7,
      },
    ],
    buttons: [
      {
        text: '취소',
        role: 'cancel',
      },
      {
        text: '저장',
        handler: (data) => {
          const value = parseInt(data.target, 10)
          if (value >= 1 && value <= 7) {
            emit('save', value)
          }
        },
      },
    ],
  })

  await alert.present()
}
</script>

<template>
  <ion-card class="goal-card">
    <ion-card-header>
      <ion-card-title class="card-title">
        <span class="title-icon">🎯</span>
        이번 주 목표
        <ion-button
          fill="clear"
          size="small"
          class="edit-button"
          @click="showEditAlert"
        >
          <ion-icon :icon="createOutline" slot="icon-only" />
        </ion-button>
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <template v-if="loading">
        <div class="skeleton-text" style="width: 60%; height: 20px;"></div>
        <div class="skeleton-bar"></div>
      </template>

      <template v-else-if="goal">
        <!-- 진행 상태 텍스트 -->
        <div class="goal-status">
          <span class="status-text">
            운동 횟수:
            <span class="current-value">{{ goal.currentValue }}회</span>
            /
            <span class="target-value">{{ goal.targetValue }}회</span>
          </span>
        </div>

        <!-- 프로그레스 바 -->
        <div class="progress-container">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: progressWidth, backgroundColor: progressColor }"
            ></div>
          </div>
          <span class="progress-percent">{{ goal.percentage }}%</span>
        </div>

        <!-- 완료 메시지 -->
        <div v-if="goal.percentage >= 100" class="complete-message">
          🎉 이번 주 목표를 달성했습니다!
        </div>
      </template>

      <template v-else>
        <div class="empty-state">
          <p>목표를 설정해주세요.</p>
          <ion-button size="small" @click="showEditAlert">
            목표 설정
          </ion-button>
        </div>
      </template>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.goal-card {
  margin: 0;
  --background: var(--ion-card-background, #1c1c1e);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
}

.title-icon {
  font-size: 1.25rem;
}

.edit-button {
  margin-left: auto;
  --color: var(--ion-color-medium);
}

.goal-status {
  margin-bottom: 12px;
}

.status-text {
  font-size: 0.9375rem;
  color: var(--ion-text-color);
}

.current-value {
  font-weight: 700;
  color: var(--ion-color-primary);
}

.target-value {
  color: var(--ion-color-medium);
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 12px;
  background: var(--ion-color-step-100, rgba(255, 255, 255, 0.1));
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.progress-percent {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ion-text-color);
  min-width: 40px;
  text-align: right;
}

.complete-message {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(76, 175, 80, 0.1);
  border-radius: 8px;
  color: var(--ion-color-success);
  font-size: 0.875rem;
  text-align: center;
}

.empty-state {
  text-align: center;
  color: var(--ion-color-medium);
  padding: 16px 0;
}

.skeleton-text {
  background: linear-gradient(90deg, var(--ion-color-medium-shade) 25%, var(--ion-color-medium) 50%, var(--ion-color-medium-shade) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 12px;
}

.skeleton-bar {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--ion-color-medium-shade) 25%, var(--ion-color-medium) 50%, var(--ion-color-medium-shade) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
