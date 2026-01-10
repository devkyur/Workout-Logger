<script setup lang="ts">
import { computed } from 'vue'
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import type { BalanceData } from '@/composables/useStats'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  data: BalanceData[]
  loading?: boolean
}>()

const chartColors = [
  'rgba(76, 175, 80, 0.8)',   // 초록
  'rgba(33, 150, 243, 0.8)',  // 파랑
  'rgba(255, 193, 7, 0.8)',   // 노랑
  'rgba(156, 39, 176, 0.8)',  // 보라
  'rgba(255, 87, 34, 0.8)',   // 주황
  'rgba(0, 188, 212, 0.8)',   // 청록
  'rgba(233, 30, 99, 0.8)',   // 핑크
  'rgba(121, 85, 72, 0.8)',   // 갈색
]

const chartData = computed(() => ({
  labels: props.data.map(d => d.categoryName),
  datasets: [
    {
      data: props.data.map(d => d.setCount),
      backgroundColor: chartColors.slice(0, props.data.length),
      borderWidth: 0,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const label = context.label || ''
          const value = context.raw || 0
          const percentage = props.data[context.dataIndex]?.percentage || 0
          return `${label}: ${value}세트 (${percentage}%)`
        },
      },
    },
  },
}

const topCategory = computed(() => {
  if (props.data.length === 0) return null
  return props.data[0]
})
</script>

<template>
  <ion-card class="balance-card">
    <ion-card-header>
      <ion-card-title class="card-title">
        <span class="title-icon">💪</span>
        부위별 비율
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <template v-if="loading">
        <div class="chart-skeleton">
          <div class="skeleton-circle"></div>
        </div>
        <div class="legend-skeleton">
          <div v-for="i in 4" :key="i" class="skeleton-item">
            <div class="skeleton-box"></div>
            <div class="skeleton-text"></div>
          </div>
        </div>
      </template>

      <template v-else-if="data.length > 0">
        <div class="chart-container">
          <Doughnut :data="chartData" :options="chartOptions" />
          <div v-if="topCategory" class="chart-center">
            <span class="top-category-name">{{ topCategory.categoryName }}</span>
            <span class="top-category-percent">{{ topCategory.percentage }}%</span>
          </div>
        </div>

        <div class="legend-list">
          <div
            v-for="(item, index) in data"
            :key="item.categoryId"
            class="legend-item"
          >
            <div
              class="legend-color"
              :style="{ backgroundColor: chartColors[index] }"
            ></div>
            <span class="legend-name">{{ item.categoryName }}</span>
            <span class="legend-percent">{{ item.percentage }}%</span>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="empty-state">
          <p>부위별 데이터가 없습니다.</p>
        </div>
      </template>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.balance-card {
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

.chart-container {
  position: relative;
  height: 180px;
  margin-bottom: 16px;
}

.chart-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.top-category-name {
  font-size: 0.75rem;
  color: var(--ion-color-medium);
}

.top-category-percent {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ion-text-color);
}

.legend-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-name {
  color: var(--ion-text-color);
}

.legend-percent {
  color: var(--ion-color-medium);
}

.empty-state {
  text-align: center;
  color: var(--ion-color-medium);
  padding: 32px 0;
}

.chart-skeleton {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.skeleton-circle {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: linear-gradient(90deg, var(--ion-color-medium-shade) 25%, var(--ion-color-medium) 50%, var(--ion-color-medium-shade) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.legend-skeleton {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: center;
}

.skeleton-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.skeleton-box {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: var(--ion-color-medium-shade);
}

.skeleton-text {
  width: 60px;
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--ion-color-medium-shade) 25%, var(--ion-color-medium) 50%, var(--ion-color-medium-shade) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
