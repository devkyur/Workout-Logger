<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/vue'
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>통계</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="empty-state">
        <p>운동 통계 기능이 곧 추가됩니다.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ion-color-medium);
}
</style>
