<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonInput,
  modalController,
} from '@ionic/vue'
import { closeOutline, addOutline, removeOutline } from 'ionicons/icons'
import type { Exercise, RoutineSetInput } from '@/entities/workout/types'

interface Props {
  exercise: Exercise
  existingSets?: RoutineSetInput[]
}

interface SetInput {
  weight: number | null
  reps: number | null
  duration_seconds: number | null
}

const props = withDefaults(defineProps<Props>(), {
  existingSets: () => [],
})

const sets = ref<SetInput[]>([{ weight: null, reps: null, duration_seconds: null }])

const isCardio = computed(() => {
  const cardioExercises = ['러닝', '사이클', '로잉머신', '스텝밀', '점프로프']
  return cardioExercises.some((name) => props.exercise.name.includes(name))
})

function loadExistingSets() {
  if (props.existingSets.length > 0) {
    sets.value = props.existingSets.map((s) => ({
      weight: s.weight,
      reps: s.reps,
      duration_seconds: s.duration_seconds,
    }))
  }
}

function addSet() {
  const lastSet = sets.value[sets.value.length - 1]
  sets.value.push({
    weight: lastSet?.weight ?? null,
    reps: lastSet?.reps ?? null,
    duration_seconds: lastSet?.duration_seconds ?? null,
  })
}

function removeSet(index: number) {
  if (sets.value.length > 1) {
    sets.value.splice(index, 1)
  }
}

function closeModal() {
  modalController.dismiss(null, 'cancel')
}

function save() {
  const validSets: RoutineSetInput[] = sets.value
    .map((set, index) => ({
      set_number: index + 1,
      weight: set.weight,
      reps: set.reps,
      duration_seconds: set.duration_seconds,
    }))
    .filter((set) => set.weight || set.reps || set.duration_seconds)

  modalController.dismiss({ sets: validSets }, 'save')
}

onMounted(loadExistingSets)
</script>

<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ exercise.name }} 세트</ion-title>
      <ion-buttons slot="end">
        <ion-button strong @click="save">완료</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <div class="section-header">
      <h3>세트 설정</h3>
      <ion-button fill="clear" size="small" @click="addSet">
        <ion-icon :icon="addOutline" slot="start" />
        세트 추가
      </ion-button>
    </div>

    <div v-for="(set, index) in sets" :key="index" class="set-row">
      <span class="set-number">{{ index + 1 }}</span>

      <template v-if="isCardio">
        <ion-input
          v-model.number="set.duration_seconds"
          type="number"
          placeholder="시간(초)"
          fill="outline"
          class="set-input"
        />
      </template>

      <template v-else>
        <ion-input
          v-model.number="set.weight"
          type="number"
          placeholder="무게"
          fill="outline"
          class="set-input"
        >
          <span slot="end" class="input-suffix">kg</span>
        </ion-input>

        <ion-input
          v-model.number="set.reps"
          type="number"
          placeholder="횟수"
          fill="outline"
          class="set-input"
        >
          <span slot="end" class="input-suffix">회</span>
        </ion-input>
      </template>

      <ion-button
        v-if="sets.length > 1"
        fill="clear"
        color="danger"
        size="small"
        @click="removeSet(index)"
      >
        <ion-icon :icon="removeOutline" />
      </ion-button>
    </div>

    <p class="hint">세트를 비워두면 운동 기록 시 직접 입력합니다</p>
  </ion-content>
</template>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.set-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.set-number {
  width: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--ion-color-medium);
}

.set-input {
  flex: 1;
}

.input-suffix {
  color: var(--ion-color-medium);
  font-size: 14px;
  padding-right: 8px;
}

.hint {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin-top: 16px;
  text-align: center;
}
</style>
