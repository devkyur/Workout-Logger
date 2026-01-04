import { ref, computed, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme-mode'

const themeMode = ref<ThemeMode>('system')
const systemPrefersDark = ref(false)

// 시스템 다크모드 감지
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemPrefersDark.value = mediaQuery.matches

  mediaQuery.addEventListener('change', (e) => {
    systemPrefersDark.value = e.matches
  })
}

// localStorage에서 테마 복구
function loadTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved
  }
  return 'system'
}

// 초기화
themeMode.value = loadTheme()

export function useTheme() {
  const isDarkMode = computed(() => {
    if (themeMode.value === 'system') {
      return systemPrefersDark.value
    }
    return themeMode.value === 'dark'
  })

  function setTheme(mode: ThemeMode) {
    themeMode.value = mode
    localStorage.setItem(STORAGE_KEY, mode)
  }

  // 테마 변경 시 저장
  watch(themeMode, (newMode) => {
    localStorage.setItem(STORAGE_KEY, newMode)
  })

  return {
    themeMode,
    isDarkMode,
    setTheme,
  }
}
