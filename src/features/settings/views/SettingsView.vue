<script setup lang="ts">
import { computed } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonIcon,
} from '@ionic/vue'
import { logOutOutline, chevronBackOutline, barbellOutline, chevronForwardOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import { useTheme, type ThemeMode } from '@/composables/useTheme'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { themeMode, setTheme } = useTheme()
const { signOut } = useAuth()

const selectedTheme = computed({
  get: () => themeMode.value,
  set: (value: ThemeMode) => setTheme(value),
})

function goBack() {
  router.back()
}

async function handleLogout() {
  await signOut()
  router.replace('/login')
}

function goToRoutines() {
  router.push('/tabs/routines')
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <ion-icon :icon="chevronBackOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
        <ion-title>설정</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item button @click="goToRoutines">
          <ion-icon :icon="barbellOutline" slot="start" />
          <ion-label>
            <h2>나의 루틴</h2>
            <p>자주 하는 운동 조합을 저장하세요</p>
          </ion-label>
          <ion-icon :icon="chevronForwardOutline" slot="end" />
        </ion-item>

        <ion-item>
          <ion-label>
            <h2>테마</h2>
            <p>앱의 색상 모드를 선택하세요</p>
          </ion-label>
        </ion-item>

        <ion-item>
          <ion-segment v-model="selectedTheme">
            <ion-segment-button value="light">
              <ion-label>라이트</ion-label>
            </ion-segment-button>
            <ion-segment-button value="dark">
              <ion-label>다크</ion-label>
            </ion-segment-button>
            <ion-segment-button value="system">
              <ion-label>시스템</ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-item>
      </ion-list>

      <div class="logout-section">
        <ion-button expand="block" color="danger" @click="handleLogout">
          <ion-icon :icon="logOutOutline" slot="start" />
          로그아웃
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.logout-section {
  padding: 24px 16px;
  margin-top: 32px;
}
</style>
