<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
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
import { chevronBackOutline, chevronForwardOutline, arrowBackOutline } from 'ionicons/icons'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useWorkout } from '@/composables/useWorkout'
import type { DaySummary, WorkoutSessionWithExercises } from '@/entities/workout/types'
import MonthGrid from '../components/MonthGrid.vue'
import DaySummaryPanel from '../components/DaySummaryPanel.vue'
import WorkoutModal from '@/features/workout-log/components/WorkoutModal.vue'

const { fetchMonthSummary, fetchDaySession } = useWorkout()

const currentDate = ref(new Date())
const loading = ref(false)

// 3개월 데이터 (이전, 현재, 다음)
const prevMonthSummary = ref<DaySummary[]>([])
const currentMonthSummary = ref<DaySummary[]>([])
const nextMonthSummary = ref<DaySummary[]>([])

// 선택된 날짜 및 세션
const selectedDate = ref<string | null>(format(new Date(), 'yyyy-MM-dd'))
const selectedSession = ref<WorkoutSessionWithExercises | null>(null)
const sessionLoading = ref(false)

// 패널 모드
const panelMode = ref<'normal' | 'expanded'>('normal')

// 통합 스와이프 상태
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchDeltaX = ref(0)
const touchDeltaY = ref(0)
const swipeDirection = ref<'none' | 'horizontal' | 'vertical'>('none')
const isTouching = ref(false)
const isAnimating = ref(false)

// 캘린더 높이 (동적 계산)
const calendarRef = ref<HTMLElement | null>(null)
const calendarHeight = ref(0)

// 패널 위치 (0 = 기본 위치, calendarHeight = 완전 확장)
const panelOffsetY = ref(0)

// 컨테이너 너비
const containerWidth = computed(() => window.innerWidth)

const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth() + 1)
const monthTitle = computed(() =>
  format(currentDate.value, 'yyyy년 M월', { locale: ko })
)

const selectedDateTitle = computed(() => {
  if (!selectedDate.value) return ''
  return format(parseISO(selectedDate.value), 'M. d. EEEE', { locale: ko })
})

// 이전/다음 월 계산
const prevDate = computed(() => subMonths(currentDate.value, 1))
const nextDate = computed(() => addMonths(currentDate.value, 1))

const prevYear = computed(() => prevDate.value.getFullYear())
const prevMonthNum = computed(() => prevDate.value.getMonth() + 1)
const nextYear = computed(() => nextDate.value.getFullYear())
const nextMonthNum = computed(() => nextDate.value.getMonth() + 1)

// 월 슬라이더 transform
const monthSliderTransform = computed(() => {
  const baseOffset = -containerWidth.value
  if (swipeDirection.value === 'horizontal' && isTouching.value) {
    return `translateX(${baseOffset + touchDeltaX.value}px)`
  }
  return `translateX(${baseOffset}px)`
})

const monthSliderTransition = computed(() => {
  if (isTouching.value && swipeDirection.value === 'horizontal') return 'none'
  return 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
})

// 패널 transform (캘린더를 덮는 효과)
const panelTransform = computed(() => {
  if (panelMode.value === 'expanded') {
    return `translateY(-${calendarHeight.value}px)`
  }
  if (swipeDirection.value === 'vertical' && isTouching.value) {
    // 위로 드래그: 음수 delta → 패널이 위로 올라감
    const clampedY = Math.max(-calendarHeight.value, panelOffsetY.value + touchDeltaY.value)
    return `translateY(${Math.min(0, clampedY)}px)`
  }
  return 'translateY(0)'
})

const panelTransition = computed(() => {
  if (isTouching.value) return 'none'
  return 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
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

async function loadSelectedDateSession() {
  if (!selectedDate.value) {
    selectedSession.value = null
    return
  }

  sessionLoading.value = true
  try {
    selectedSession.value = await fetchDaySession(selectedDate.value)
  } catch (e) {
    console.error('Failed to load session:', e)
    selectedSession.value = null
  } finally {
    sessionLoading.value = false
  }
}

async function shiftToPrevMonth() {
  nextMonthSummary.value = currentMonthSummary.value
  currentMonthSummary.value = prevMonthSummary.value
  prevMonthSummary.value = await fetchMonthSummary(
    prevYear.value,
    prevMonthNum.value
  )
}

async function shiftToNextMonth() {
  prevMonthSummary.value = currentMonthSummary.value
  currentMonthSummary.value = nextMonthSummary.value
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
  touchDeltaX.value = direction === 'prev' ? containerWidth.value : -containerWidth.value
  swipeDirection.value = 'horizontal'
  isTouching.value = false

  setTimeout(async () => {
    if (direction === 'prev') {
      currentDate.value = subMonths(currentDate.value, 1)
      await shiftToPrevMonth()
    } else {
      currentDate.value = addMonths(currentDate.value, 1)
      await shiftToNextMonth()
    }
    touchDeltaX.value = 0
    swipeDirection.value = 'none'
    isAnimating.value = false
  }, 300)
}

// 통합 터치 핸들러
const DIRECTION_THRESHOLD = 10

function onTouchStart(e: TouchEvent) {
  if (isAnimating.value) return
  if (panelMode.value === 'expanded') return // 확장 모드에서는 스와이프 비활성화

  const touch = e.touches[0]
  if (!touch) return

  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
  touchDeltaX.value = 0
  touchDeltaY.value = 0
  swipeDirection.value = 'none'
  isTouching.value = true
}

function onTouchMove(e: TouchEvent) {
  if (!isTouching.value || isAnimating.value) return

  const touch = e.touches[0]
  if (!touch) return

  const deltaX = touch.clientX - touchStartX.value
  const deltaY = touch.clientY - touchStartY.value

  // 방향이 아직 결정되지 않았으면 결정
  if (swipeDirection.value === 'none') {
    if (Math.abs(deltaX) > DIRECTION_THRESHOLD || Math.abs(deltaY) > DIRECTION_THRESHOLD) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        swipeDirection.value = 'horizontal'
      } else {
        swipeDirection.value = 'vertical'
      }
    }
  }

  if (swipeDirection.value === 'horizontal') {
    touchDeltaX.value = deltaX * 0.8
  } else if (swipeDirection.value === 'vertical') {
    touchDeltaY.value = deltaY
  }
}

function onTouchEnd() {
  if (!isTouching.value || isAnimating.value) {
    resetTouch()
    return
  }

  const SWIPE_THRESHOLD = containerWidth.value * 0.2
  const VERTICAL_THRESHOLD = 80

  if (swipeDirection.value === 'horizontal') {
    // 월 변경
    if (touchDeltaX.value > SWIPE_THRESHOLD) {
      animateToMonth('prev')
    } else if (touchDeltaX.value < -SWIPE_THRESHOLD) {
      animateToMonth('next')
    } else {
      resetTouch()
    }
  } else if (swipeDirection.value === 'vertical') {
    // 패널 확장/축소
    if (touchDeltaY.value < -VERTICAL_THRESHOLD && panelMode.value === 'normal') {
      // 위로 스와이프 → 확장
      panelMode.value = 'expanded'
    }
    resetTouch()
  } else {
    resetTouch()
  }
}

function resetTouch() {
  isTouching.value = false
  touchDeltaX.value = 0
  touchDeltaY.value = 0
  swipeDirection.value = 'none'
}

// 패널 영역에서 위로 스와이프 (확장)
function onPanelTouchStart(e: TouchEvent) {
  if (isAnimating.value) return

  const touch = e.touches[0]
  if (!touch) return

  touchStartY.value = touch.clientY
  touchDeltaY.value = 0
  panelOffsetY.value = 0
  swipeDirection.value = 'vertical'
  isTouching.value = true
}

function onPanelTouchMove(e: TouchEvent) {
  if (!isTouching.value) return

  const touch = e.touches[0]
  if (!touch) return

  const deltaY = touch.clientY - touchStartY.value
  // 위로만 이동 가능 (음수 delta)
  touchDeltaY.value = Math.min(0, deltaY)
}

function onPanelTouchEnd() {
  if (!isTouching.value) return

  const VERTICAL_THRESHOLD = 80

  if (touchDeltaY.value < -VERTICAL_THRESHOLD) {
    // 위로 스와이프 → 확장
    panelMode.value = 'expanded'
  }
  panelOffsetY.value = 0
  resetTouch()
}

// 확장 모드에서 아래로 스와이프 (까꿍 효과)
function onExpandedTouchStart(e: TouchEvent) {
  if (isAnimating.value) return

  const touch = e.touches[0]
  if (!touch) return

  touchStartY.value = touch.clientY
  touchDeltaY.value = 0
  panelOffsetY.value = -calendarHeight.value // 현재 확장된 위치
  swipeDirection.value = 'vertical'
  isTouching.value = true
}

function onExpandedTouchMove(e: TouchEvent) {
  if (!isTouching.value) return

  const touch = e.touches[0]
  if (!touch) return

  const deltaY = touch.clientY - touchStartY.value
  // 아래로만 이동 가능 (양수 delta)
  touchDeltaY.value = Math.max(0, deltaY)
}

function onExpandedTouchEnd() {
  if (!isTouching.value) return

  const VERTICAL_THRESHOLD = 80

  if (touchDeltaY.value > VERTICAL_THRESHOLD) {
    // 아래로 스와이프 → 축소 (캘린더 보이기)
    panelMode.value = 'normal'
  }
  panelOffsetY.value = 0
  resetTouch()
}

function collapsePanel() {
  panelMode.value = 'normal'
}

function handleDateSelect(date: string) {
  selectedDate.value = date
}

async function openWorkoutModal() {
  if (!selectedDate.value) return

  const modal = await modalController.create({
    component: WorkoutModal,
    componentProps: { date: selectedDate.value },
    breakpoints: [0, 0.5, 0.9],
    initialBreakpoint: 0.9,
  })

  await modal.present()

  const { role } = await modal.onWillDismiss()
  if (role === 'saved') {
    await loadAllMonthsData()
    await loadSelectedDateSession()
  }
}

function updateCalendarHeight() {
  if (calendarRef.value) {
    calendarHeight.value = calendarRef.value.offsetHeight
  }
}

watch(selectedDate, loadSelectedDateSession)

onMounted(async () => {
  await loadAllMonthsData()
  await loadSelectedDateSession()

  // 캘린더 높이 측정
  setTimeout(updateCalendarHeight, 100)
  window.addEventListener('resize', updateCalendarHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCalendarHeight)
})
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <!-- 기본 모드: 월 네비게이션 -->
        <template v-if="panelMode === 'normal'">
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
        </template>

        <!-- 확장 모드 -->
        <template v-else>
          <ion-buttons slot="start">
            <ion-button @click="collapsePanel">
              <ion-icon :icon="arrowBackOutline" />
            </ion-button>
          </ion-buttons>

          <ion-title>{{ selectedDateTitle }}</ion-title>
        </template>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="false">
      <div v-if="loading && !currentMonthSummary.length" class="loading-container">
        <ion-spinner name="crescent" />
      </div>

      <template v-else>
        <!-- 캘린더 영역 (항상 고정) -->
        <div
          ref="calendarRef"
          class="calendar-section"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <div
            class="months-slider"
            :style="{
              transform: monthSliderTransform,
              transition: monthSliderTransition,
            }"
          >
            <div class="month-panel">
              <MonthGrid
                :year="prevYear"
                :month="prevMonthNum"
                :summary="prevMonthSummary"
                :selected-date="selectedDate"
                @select-date="handleDateSelect"
              />
            </div>

            <div class="month-panel">
              <MonthGrid
                :year="currentYear"
                :month="currentMonth"
                :summary="currentMonthSummary"
                :selected-date="selectedDate"
                @select-date="handleDateSelect"
              />
            </div>

            <div class="month-panel">
              <MonthGrid
                :year="nextYear"
                :month="nextMonthNum"
                :summary="nextMonthSummary"
                :selected-date="selectedDate"
                @select-date="handleDateSelect"
              />
            </div>
          </div>
        </div>

        <!-- 하단 패널 컨테이너 (캘린더를 덮음) -->
        <div
          class="panel-container"
          :style="{
            transform: panelTransform,
            transition: panelTransition,
          }"
        >
          <!-- 드래그 핸들 -->
          <div
            class="drag-handle"
            @touchstart="panelMode === 'normal' ? onTouchStart($event) : onExpandedTouchStart($event)"
            @touchmove="panelMode === 'normal' ? onTouchMove($event) : onExpandedTouchMove($event)"
            @touchend="panelMode === 'normal' ? onTouchEnd() : onExpandedTouchEnd()"
          >
            <div class="handle-bar"></div>
          </div>

          <!-- 하단 패널 -->
          <div
            class="panel-section"
            :class="{ expanded: panelMode === 'expanded' }"
            @touchstart="panelMode === 'normal' ? onPanelTouchStart($event) : onExpandedTouchStart($event)"
            @touchmove="panelMode === 'normal' ? onPanelTouchMove($event) : onExpandedTouchMove($event)"
            @touchend="panelMode === 'normal' ? onPanelTouchEnd() : onExpandedTouchEnd()"
          >
            <DaySummaryPanel
              :selected-date="selectedDate"
              :session="selectedSession"
              :loading="sessionLoading"
              :expanded="panelMode === 'expanded'"
              @open-modal="openWorkoutModal"
              @add-workout="openWorkoutModal"
            />
          </div>
        </div>
      </template>
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

.calendar-section {
  overflow: hidden;
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

/* 패널 컨테이너 - 캘린더 위에 덮이는 영역 */
.panel-container {
  background: var(--ion-background-color);
  will-change: transform;
  min-height: calc(100vh - 56px); /* 헤더 높이 제외 */
  display: flex;
  flex-direction: column;
}

.drag-handle {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 0 8px;
  touch-action: none;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.handle-bar {
  width: 40px;
  height: 4px;
  background: var(--ion-color-medium);
  border-radius: 2px;
  opacity: 0.5;
}

.panel-section {
  flex: 1;
  overflow: hidden;
}

.panel-section.expanded {
  overflow-y: auto;
}
</style>
