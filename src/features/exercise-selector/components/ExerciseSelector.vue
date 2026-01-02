<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  IonSearchbar,
  IonChip,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonIcon,
  IonBadge,
} from '@ionic/vue'
import { checkmarkOutline } from 'ionicons/icons'
import { useWorkout } from '@/composables/useWorkout'
import type { Category, Exercise } from '@/entities/workout/types'

interface Props {
  existingExerciseIds?: Set<string>
}

const props = withDefaults(defineProps<Props>(), {
  existingExerciseIds: () => new Set(),
})

const emit = defineEmits<{
  select: [exerciseId: string]
  close: []
}>()

const { fetchCategories, fetchExercises } = useWorkout()

const loading = ref(true)
const categories = ref<Category[]>([])
const exercises = ref<Exercise[]>([])
const selectedCategoryIds = ref<Set<string>>(new Set())
const searchQuery = ref('')

const filteredExercises = computed(() => {
  let result = exercises.value

  // 카테고리 필터
  if (selectedCategoryIds.value.size > 0) {
    result = result.filter((e) => selectedCategoryIds.value.has(e.category_id))
  }

  // 검색 필터
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((e) => e.name.toLowerCase().includes(query))
  }

  return result
})

function toggleCategory(categoryId: string) {
  if (selectedCategoryIds.value.has(categoryId)) {
    selectedCategoryIds.value.delete(categoryId)
  } else {
    selectedCategoryIds.value.add(categoryId)
  }
  // 반응성 트리거
  selectedCategoryIds.value = new Set(selectedCategoryIds.value)
}

function isCategorySelected(categoryId: string) {
  return selectedCategoryIds.value.has(categoryId)
}

function getCategoryName(categoryId: string) {
  return categories.value.find((c) => c.id === categoryId)?.name ?? ''
}

function selectExercise(exerciseId: string) {
  emit('select', exerciseId)
}

async function loadData() {
  loading.value = true
  try {
    const [cats, exs] = await Promise.all([fetchCategories(), fetchExercises()])
    categories.value = cats
    exercises.value = exs
  } catch (e) {
    console.error('Failed to load exercise data:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="exercise-selector">
    <!-- 검색 -->
    <ion-searchbar
      v-model="searchQuery"
      placeholder="운동 검색"
      :debounce="200"
      class="search-bar"
    />

    <!-- 카테고리 필터 -->
    <div class="category-filter">
      <ion-chip
        v-for="category in categories"
        :key="category.id"
        :color="isCategorySelected(category.id) ? 'primary' : 'medium'"
        :outline="!isCategorySelected(category.id)"
        @click="toggleCategory(category.id)"
      >
        <ion-icon v-if="isCategorySelected(category.id)" :icon="checkmarkOutline" />
        {{ category.name }}
      </ion-chip>
    </div>

    <!-- 운동 목록 -->
    <div v-if="loading" class="loading-container">
      <ion-spinner name="crescent" />
    </div>

    <ion-list v-else class="exercise-list">
      <ion-item
        v-for="exercise in filteredExercises"
        :key="exercise.id"
        button
        @click="selectExercise(exercise.id)"
        :class="{ 'already-added': existingExerciseIds.has(exercise.id) }"
      >
        <ion-label>
          <h3>
            {{ exercise.name }}
            <ion-badge v-if="existingExerciseIds.has(exercise.id)" color="primary" class="added-badge">
              추가됨
            </ion-badge>
          </h3>
          <p>{{ getCategoryName(exercise.category_id) }}</p>
        </ion-label>
      </ion-item>

      <div v-if="filteredExercises.length === 0" class="empty-state">
        검색 결과가 없습니다
      </div>
    </ion-list>
  </div>
</template>

<style scoped>
.exercise-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--ion-background-color);
  border-radius: 16px 16px 0 0;
  padding-top: 8px;
}

.search-bar {
  padding: 0 8px;
}

.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--ion-color-light);
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.exercise-list {
  flex: 1;
  overflow-y: auto;
}

.exercise-list ion-item h3 {
  font-size: 15px;
  margin-bottom: 2px;
}

.exercise-list ion-item p {
  font-size: 12px;
  color: var(--ion-color-medium);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--ion-color-medium);
}

.already-added {
  --background: var(--ion-color-light);
}

.added-badge {
  font-size: 10px;
  margin-left: 6px;
  vertical-align: middle;
}
</style>
