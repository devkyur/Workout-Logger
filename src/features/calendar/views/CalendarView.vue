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
import { chevronBackOutline, chevronForwardOutline, logOutOutline } from 'ionicons/icons'
import { format, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAuth } from '@/composables/useAuth'
import { useWorkout } from '@/composables/useWorkout'
import type { DaySummary } from '@/entities/workout/types'
import MonthGrid from '../components/MonthGrid.vue'
import WorkoutModal from '@/features/workout-log/components/WorkoutModal.vue'

const { signOut } = useAuth()
const { fetchMonthSummary } = useWorkout()

const currentDate = ref(new Date())
const loading = ref(false)
const monthlySummary = ref<DaySummary[]>([])

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

async function handleLogout() {
  await signOut()
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
          <ion-button @click="handleLogout">
            <ion-icon :icon="logOutOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" />
      </div>

      <MonthGrid
        v-else
        :year="currentYear"
        :month="currentMonth"
        :summary="monthlySummary"
        @select-date="openWorkoutModal"
      />
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
</style>
