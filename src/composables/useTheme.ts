import { computed, ref } from 'vue'

export function useTheme() {
  const isDark = ref(false)

  const themeColors = computed(() => ({
    bg: 'bg-gray-50',
    bgSecondary: 'bg-white',
    bgTertiary: 'bg-gray-100',
    border: 'border-gray-200',
    text: 'text-gray-800',
    textMuted: 'text-gray-500',
    primary: 'text-blue-600',
    primaryBg: 'bg-blue-500'
  }))

  const injectThemeColors = () => {
    const root = document.documentElement
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

  return {
    isDark,
    themeColors,
    injectThemeColors
  }
}
