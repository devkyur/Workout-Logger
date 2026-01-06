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

// 3개월 데이터 (이전, 현재, 다음)
const prevMonthSummary = ref<DaySummary[]>([])
const currentMonthSummary = ref<DaySummary[]>([])
const nextMonthSummary = ref<DaySummary[]>([])

// 스와이프 관련 상태
const swipeStartX = ref(0)
const swipeStartY = ref(0)
const swipeOffset = ref(0)
const isSwiping = ref(false)
const isAnimating = ref(false)

// 컨테이너 너비 (CSS의 100vw와 일치)
const containerWidth = computed(() => window.innerWidth)

const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth() + 1)
const monthTitle = computed(() =>
  format(currentDate.value, 'yyyy년 M월', { locale: ko })
)

// 이전/다음 월 계산
const prevDate = computed(() => subMonths(currentDate.value, 1))
const nextDate = computed(() => addMonths(currentDate.value, 1))

const prevYear = computed(() => prevDate.value.getFullYear())
const prevMonthNum = computed(() => prevDate.value.getMonth() + 1)
const nextYear = computed(() => nextDate.value.getFullYear())
const nextMonthNum = computed(() => nextDate.value.getMonth() + 1)

// 슬라이더 transform 계산
const sliderTransform = computed(() => {
  const baseOffset = -containerWidth.value // 중앙(현재 월)에서 시작
  const dragOffset = isSwiping.value ? swipeOffset.value : 0
  return `translateX(${baseOffset + dragOffset}px)`
})

const sliderTransition = computed(() => {
  return isSwiping.value ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
})

async function loadAllMonthsData() {
  loading.value = true
  try {
    const [prev, current, next] = await Promise.all([
      fetchMonthSummary(prevYear.value, prevMonthNum.value),
      fetchMonthSummary(currentYear.value, currentMonth.value),
      fetchMonthSummary(nextYear.value, nextMonthNum.value),
    ])
    prevMonthSummary.value = prev
    currentMonthSummary.value = current
    nextMonthSummary.value = next
  } catch (e) {
    console.error('Failed to load month data:', e)
  } finally {
    loading.value = false
  }
}

async function shiftToPrevMonth() {
  // 다음 → 현재, 현재 → 이전으로 데이터 이동
  nextMonthSummary.value = currentMonthSummary.value
  currentMonthSummary.value = prevMonthSummary.value

  // 새로운 이전 월 데이터 fetch (currentDate가 이미 변경된 상태)
  prevMonthSummary.value = await fetchMonthSummary(
    prevYear.value,
    prevMonthNum.value
  )
}

async function shiftToNextMonth() {
  // 이전 → 현재, 현재 → 다음으로 데이터 이동
  prevMonthSummary.value = currentMonthSummary.value
  currentMonthSummary.value = nextMonthSummary.value

  // 새로운 다음 월 데이터 fetch (currentDate가 이미 변경된 상태)
  nextMonthSummary.value = await fetchMonthSummary(
    nextYear.value,
    nextMonthNum.value
  )
}

function prevMonth() {
  if (isAnimating.value) return
  animateToMonth('prev')
}

function nextMonth() {
  if (isAnimating.value) return
  animateToMonth('next')
}

function animateToMonth(direction: 'prev' | 'next') {
  isAnimating.value = true

  // 애니메이션으로 이동
  swipeOffset.value = direction === 'prev' ? containerWidth.value : -containerWidth.value
  isSwiping.value = false // transition 활성화

  setTimeout(async () => {
    if (direction === 'prev') {
      currentDate.value = subMonths(currentDate.value, 1)
      await shiftToPrevMonth()
    } else {
      currentDate.value = addMonths(currentDate.value, 1)
      await shiftToNextMonth()
    }
    swipeOffset.value = 0
    isAnimating.value = false
  }, 300)
}

// 스와이프 핸들러
const VERTICAL_THRESHOLD = 75

function onTouchStart(e: TouchEvent) {
  if (isAnimating.value) return

  const touch = e.touches[0]
  if (!touch) return
  swipeStartX.value = touch.clientX
  swipeStartY.value = touch.clientY
  isSwiping.value = true
}

function onTouchMove(e: TouchEvent) {
  if (!isSwiping.value || isAnimating.value) return

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

  // 저항감 추가 (끝에서 당길 때)
  const resistance = 0.8
  swipeOffset.value = deltaX * resistance
}

function onTouchEnd() {
  if (!isSwiping.value || isAnimating.value) {
    swipeOffset.value = 0
    isSwiping.value = false
    return
  }

  const threshold = containerWidth.value * 0.2 // 20% 이상 스와이프하면 전환

  if (swipeOffset.value > threshold) {
    animateToMonth('prev')
  } else if (swipeOffset.value < -threshold) {
    animateToMonth('next')
  } else {
    // 원래 위치로 돌아가기
    isSwiping.value = false
    swipeOffset.value = 0
  }
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
    await loadAllMonthsData()
  }
}

onMounted(loadAllMonthsData)
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="prevMonth" :disabled="isAnimating">
            <ion-icon :icon="chevronBackOutline" />
          </ion-button>
        </ion-buttons>

        <ion-title>{{ monthTitle }}</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="nextMonth" :disabled="isAnimating">
            <ion-icon :icon="chevronForwardOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="loading && !currentMonthSummary.length" class="loading-container">
        <ion-spinner name="crescent" />
      </div>

      <div
        v-else
        class="swipe-container"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div
          class="months-slider"
          :style="{
            transform: sliderTransform,
            transition: sliderTransition,
          }"
        >
          <!-- 이전 월 -->
          <div class="month-panel">
            <MonthGrid
              :year="prevYear"
              :month="prevMonthNum"
              :summary="prevMonthSummary"
              @select-date="openWorkoutModal"
            />
          </div>

          <!-- 현재 월 -->
          <div class="month-panel">
            <MonthGrid
              :year="currentYear"
              :month="currentMonth"
              :summary="currentMonthSummary"
              @select-date="openWorkoutModal"
            />
          </div>

          <!-- 다음 월 -->
          <div class="month-panel">
            <MonthGrid
              :year="nextYear"
              :month="nextMonthNum"
              :summary="nextMonthSummary"
              @select-date="openWorkoutModal"
            />
          </div>
        </div>
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
  overflow: hidden;
  width: 100%;
  touch-action: pan-y;
}

.months-slider {
  display: flex;
  will-change: transform;
}

.month-panel {
  width: 100vw;
  flex-shrink: 0;
  box-sizing: border-box;
}
</style>
