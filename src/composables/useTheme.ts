import { computed } from 'vue'
import { useSettingsStore } from '../stores/settings'

export function useTheme() {
  const settingsStore = useSettingsStore()
  const isDark = computed(() => settingsStore.theme === 'dark')

  const themeColors = computed(() => {
    if (isDark.value) {
      return {
        bg: 'bg-gray-900',
        bgSecondary: 'bg-gray-800',
        bgTertiary: 'bg-gray-700',
        border: 'border-gray-700',
        text: 'text-gray-200',
        textMuted: 'text-gray-400',
        primary: 'text-blue-400',
        primaryBg: 'bg-blue-600'
      }
    }
    return {
      bg: 'bg-gray-50',
      bgSecondary: 'bg-white',
      bgTertiary: 'bg-gray-100',
      border: 'border-gray-200',
      text: 'text-gray-800',
      textMuted: 'text-gray-500',
      primary: 'text-blue-600',
      primaryBg: 'bg-blue-500'
    }
  })

  const injectThemeColors = () => {
    const root = document.documentElement
    if (isDark.value) {
      root.style.setProperty('--preview-wrapper-bg', '#1f2937')
      root.style.setProperty('--preview-wrapper-shadow', '0 4px 20px rgba(0, 0, 0, 0.5)')
      root.style.setProperty('--preview-wrapper-text', '#e5e7eb')
      root.style.setProperty('--word-text-color', '#e5e7eb')
      root.style.setProperty('--word-border-color', '#4b5563')
      root.style.setProperty('--word-header-bg', '#1f2937')
      root.style.setProperty('--word-row-bg', '#111827')
      root.style.setProperty('--word-muted-text', '#9ca3af')
      root.style.setProperty('--word-code-bg', '#1f2937')
      root.style.setProperty('--word-link-color', '#60a5fa')
      root.style.setProperty('--excel-highlight-bg', '#1e3a5f')
      root.style.setProperty('--excel-highlight-border', '#60a5fa')
    } else {
      root.style.setProperty('--preview-wrapper-bg', '#ffffff')
      root.style.setProperty('--preview-wrapper-shadow', '0 4px 20px rgba(0, 0, 0, 0.15)')
      root.style.setProperty('--preview-wrapper-text', '#1f2328')
      root.style.setProperty('--word-text-color', '#1f2328')
      root.style.setProperty('--word-border-color', '#d0d7de')
      root.style.setProperty('--word-header-bg', '#f6f8fa')
      root.style.setProperty('--word-row-bg', '#f6f8fa')
      root.style.setProperty('--word-muted-text', '#57606a')
      root.style.setProperty('--word-code-bg', '#f6f8fa')
      root.style.setProperty('--word-link-color', '#0969da')
      root.style.setProperty('--excel-highlight-bg', '#e6f4ff')
      root.style.setProperty('--excel-highlight-border', '#1677ff')
    }
  }

  return {
    isDark,
    themeColors,
    injectThemeColors
  }
}
