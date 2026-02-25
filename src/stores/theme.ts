import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'zhongwen-theme'

export type Theme = 'light' | 'dark'

function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return 'dark'
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(getStoredTheme())

  function setTheme(value: Theme) {
    theme.value = value
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* ignore */
    }
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  watch(
    theme,
    (v) => {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', v)
      }
    },
    { immediate: true },
  )

  return { theme, setTheme, toggleTheme }
})
