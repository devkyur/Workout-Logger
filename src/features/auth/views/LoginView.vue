<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  toastController,
} from '@ionic/vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { signIn } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!email.value || !password.value) {
    const toast = await toastController.create({
      message: '이메일과 비밀번호를 입력해주세요',
      duration: 2000,
      color: 'warning',
    })
    await toast.present()
    return
  }

  loading.value = true
  try {
    await signIn(email.value, password.value)
    router.replace('/calendar')
  } catch (error: any) {
    const toast = await toastController.create({
      message: error.message || '로그인에 실패했습니다',
      duration: 2000,
      color: 'danger',
    })
    await toast.present()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding" :fullscreen="true">
      <div class="login-container">
        <div class="login-header">
          <h1>🏋️ Workout Logger</h1>
          <p>운동 기록을 시작하세요</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <IonInput
            v-model="email"
            type="email"
            label="이메일"
            label-placement="floating"
            fill="outline"
            placeholder="email@example.com"
          />

          <IonInput
            v-model="password"
            type="password"
            label="비밀번호"
            label-placement="floating"
            fill="outline"
            placeholder="••••••••"
          />

          <IonButton
            expand="block"
            type="submit"
            :disabled="loading"
            class="login-button"
          >
            <IonSpinner v-if="loading" name="crescent" />
            <span v-else>로그인</span>
          </IonButton>
        </form>

        <div class="login-footer">
          <IonText color="medium">
            계정이 없으신가요?
          </IonText>
          <IonButton
            fill="clear"
            size="small"
            router-link="/register"
          >
            회원가입
          </IonButton>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.login-header p {
  color: var(--ion-color-medium);
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-button {
  margin-top: 8px;
}

.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
  gap: 4px;
}
</style>
