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
const { signUp } = useAuth()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

async function handleRegister() {
  if (!email.value || !password.value || !confirmPassword.value) {
    const toast = await toastController.create({
      message: '모든 필드를 입력해주세요',
      duration: 2000,
      color: 'warning',
    })
    await toast.present()
    return
  }

  if (password.value !== confirmPassword.value) {
    const toast = await toastController.create({
      message: '비밀번호가 일치하지 않습니다',
      duration: 2000,
      color: 'warning',
    })
    await toast.present()
    return
  }

  if (password.value.length < 6) {
    const toast = await toastController.create({
      message: '비밀번호는 6자 이상이어야 합니다',
      duration: 2000,
      color: 'warning',
    })
    await toast.present()
    return
  }

  loading.value = true
  try {
    await signUp(email.value, password.value)
    const toast = await toastController.create({
      message: '회원가입 완료! 이메일을 확인해주세요.',
      duration: 3000,
      color: 'success',
    })
    await toast.present()
    router.replace('/login')
  } catch (error: any) {
    const toast = await toastController.create({
      message: error.message || '회원가입에 실패했습니다',
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
      <div class="register-container">
        <div class="register-header">
          <h1>🏋️ 회원가입</h1>
          <p>새 계정을 만들어보세요</p>
        </div>

        <form @submit.prevent="handleRegister" class="register-form">
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
            placeholder="6자 이상"
          />

          <IonInput
            v-model="confirmPassword"
            type="password"
            label="비밀번호 확인"
            label-placement="floating"
            fill="outline"
            placeholder="비밀번호 재입력"
          />

          <IonButton
            expand="block"
            type="submit"
            :disabled="loading"
            class="register-button"
          >
            <IonSpinner v-if="loading" name="crescent" />
            <span v-else>회원가입</span>
          </IonButton>
        </form>

        <div class="register-footer">
          <IonText color="medium">
            이미 계정이 있으신가요?
          </IonText>
          <IonButton
            fill="clear"
            size="small"
            router-link="/login"
          >
            로그인
          </IonButton>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.register-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.register-header {
  text-align: center;
  margin-bottom: 40px;
}

.register-header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.register-header p {
  color: var(--ion-color-medium);
  margin: 0;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.register-button {
  margin-top: 8px;
}

.register-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
  gap: 4px;
}
</style>
