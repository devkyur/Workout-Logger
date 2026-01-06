<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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
  modalController,
} from '@ionic/vue'
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons'
import { format, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useWorkout } from '@/composables/useWorkout'
import type { DaySummary } from '@/entities/workout/types'
import MonthGrid from '../components/MonthGrid.vue'
import WorkoutModal from '@/features/workout-log/components/WorkoutModal.vue'

const { fetchMonthSummary } = useWorkout()

const currentDate = ref(new Date())
const loading = ref(false)
const monthlySummary = ref<DaySummary[]>([])

// 스와이프 관련 상태
const swipeStartX = ref(0)
const swipeStartY = ref(0)
const swipeOffset = ref(0)
const isSwiping = ref(false)

const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth() + 1)
const monthTitle = computed(() =>
  format(currentDate.value, 'yyyy년 M월', { locale: ko })
)

async function loadMonthData() {
  loading.value = true
  try {
    monthlySummary.value = await fetchMonthSummary(currentYear.value, currentMonth.value)
  } catch (e) {
    console.error('Failed to load month data:', e)
  } finally {
    loading.value = false
  }
}

function prevMonth() {
  currentDate.value = subMonths(currentDate.value, 1)
}

function nextMonth() {
  currentDate.value = addMonths(currentDate.value, 1)
}

// 스와이프 핸들러
const SWIPE_THRESHOLD = 50
const VERTICAL_THRESHOLD = 75

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  swipeStartX.value = touch.clientX
  swipeStartY.value = touch.clientY
  isSwiping.value = true
}

function onTouchMove(e: TouchEvent) {
  if (!isSwiping.value) return

  const touch = e.touches[0]
  if (!touch) return
  const deltaX = touch.clientX - swipeStartX.value
  const deltaY = Math.abs(touch.clientY - swipeStartY.value)

  // 수직 스크롤이 더 크면 스와이프 취소
  if (deltaY > VERTICAL_THRESHOLD) {
    isSwiping.value = false
    swipeOffset.value = 0
    return
  }

  swipeOffset.value = deltaX
}

function onTouchEnd() {
  if (!isSwiping.value) {
    swipeOffset.value = 0
    return
  }

  if (swipeOffset.value > SWIPE_THRESHOLD) {
    prevMonth()
  } else if (swipeOffset.value < -SWIPE_THRESHOLD) {
    nextMonth()
  }

  swipeOffset.value = 0
  isSwiping.value = false
}

async function openWorkoutModal(date: string) {
  const modal = await modalController.create({
    component: WorkoutModal,
    componentProps: { date },
    breakpoints: [0, 0.5, 0.9],
    initialBreakpoint: 0.9,
  })

  await modal.present()

  const { role } = await modal.onWillDismiss()
  if (role === 'saved') {
    await loadMonthData()
  }
}

watch([currentYear, currentMonth], loadMonthData)
onMounted(loadMonthData)
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="prevMonth">
            <ion-icon :icon="chevronBackOutline" />
          </ion-button>
        </ion-buttons>

        <ion-title>{{ monthTitle }}</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="nextMonth">
            <ion-icon :icon="chevronForwardOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" />
      </div>

      <div
        v-else
        class="swipe-container"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        :style="{ transform: `translateX(${swipeOffset * 0.3}px)` }"
      >
        <MonthGrid
          :year="currentYear"
          :month="currentMonth"
          :summary="monthlySummary"
          @select-date="openWorkoutModal"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.swipe-container {
  transition: transform 0.1s ease-out;
  will-change: transform;
}
</style>
