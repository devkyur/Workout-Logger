<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
} from '@ionic/vue'
import {
  calendarOutline,
  calendar,
  statsChartOutline,
  statsChart,
  menuOutline,
  menu,
} from 'ionicons/icons'

// 탭 설정 - 새 탭 추가 시 여기에만 추가하면 됨
const tabs = [
  {
    name: 'home',
    path: '/tabs/home',
    label: '홈',
    icon: calendarOutline,
    iconActive: calendar,
  },
  {
    name: 'stats',
    path: '/tabs/stats',
    label: '통계',
    icon: statsChartOutline,
    iconActive: statsChart,
  },
  {
    name: 'menu',
    path: '/tabs/menu',
    label: '메뉴',
    icon: menuOutline,
    iconActive: menu,
  },
]

const route = useRoute()

const currentTab = computed(() => {
  const path = route.path
  return tabs.find(tab => path.startsWith(tab.path))?.name || 'home'
})

function getIcon(tab: typeof tabs[0]) {
  return currentTab.value === tab.name ? tab.iconActive : tab.icon
}
</script>

<template>
  <ion-tabs>
    <ion-router-outlet />

    <ion-tab-bar slot="bottom">
      <ion-tab-button
        v-for="tab in tabs"
        :key="tab.name"
        :tab="tab.name"
        :href="tab.path"
      >
        <ion-icon :icon="getIcon(tab)" />
        <ion-label>{{ tab.label }}</ion-label>
      </ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>
</template>

<style scoped>
ion-tab-bar {
  --background: var(--ion-card-background, var(--ion-background-color));
  --border: none;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  padding-bottom: env(safe-area-inset-bottom);
}

ion-tab-button {
  --color: var(--ion-color-medium);
  --color-selected: var(--ion-color-primary);
}
</style>
