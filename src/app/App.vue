<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { useTheme } from '@/composables/useTheme'

const { isDarkMode } = useTheme()
</script>

<template>
  <ion-app :class="{ 'ion-palette-dark': isDarkMode }">
    <ion-router-outlet />
  </ion-app>
</template>

<style>
/* Action Sheet Cancel 버튼 숨김 */
.hide-cancel-button .action-sheet-cancel {
  display: none !important;
}
</style>
