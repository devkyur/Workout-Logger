<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
} from '@ionic/vue'
import {
  settingsOutline,
  personOutline,
  informationCircleOutline,
} from 'ionicons/icons'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user } = useAuth()

// 메뉴 항목 - 확장 시 여기에 추가
const menuItems = [
  {
    label: '설정',
    icon: settingsOutline,
    action: () => router.push('/tabs/settings'),
  },
  {
    label: '앱 정보',
    icon: informationCircleOutline,
    action: () => {}, // 추후 구현
    disabled: true,
  },
]
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>메뉴</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="profile-section">
        <div class="profile-icon">
          <ion-icon :icon="personOutline" />
        </div>
        <p class="profile-email">{{ user?.email }}</p>
      </div>

      <ion-list>
        <ion-item
          v-for="item in menuItems"
          :key="item.label"
          button
          :disabled="item.disabled"
          @click="item.action"
        >
          <ion-icon :icon="item.icon" slot="start" />
          <ion-label>{{ item.label }}</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.profile-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.profile-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--ion-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.profile-icon ion-icon {
  font-size: 36px;
  color: var(--ion-color-medium);
}

.profile-email {
  font-size: 14px;
  color: var(--ion-color-medium);
  margin: 0;
}
</style>
