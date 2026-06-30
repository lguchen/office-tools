import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// 主题模式类型
export type ThemeMode = 'light' | 'dark' | 'auto'

// 语言类型
export type Language = 'zh-CN' | 'en-US'

// 快捷键配置类型
export interface ShortcutConfig {
  showMainWindow: string
  quickCapture: string
  screenshot: string
}

// 文件关联配置类型
export interface FileAssociationConfig {
  pdf: boolean
  docx: boolean
  xlsx: boolean
  txt: boolean
  png: boolean
  jpg: boolean
}

// 完整设置配置类型
export interface AppSettings {
  theme: ThemeMode
  language: Language
  outputDir: string
  autoStart: boolean
  minimizeToTray: boolean
  trayNotification: boolean
  primaryColor: string
  windowOpacity: number
  acrylicEffect: boolean
  previewPanelVisible: boolean
  previewWidth: number
  fileAssociation: FileAssociationConfig
  shortcuts: ShortcutConfig
}

// 默认配置
const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'zh-CN',
  outputDir: '',
  autoStart: false,
  minimizeToTray: true,
  trayNotification: true,
  primaryColor: '#1677ff',
  windowOpacity: 1,
  acrylicEffect: false,
  previewPanelVisible: true,
  previewWidth: 320,
  fileAssociation: {
    pdf: false,
    docx: false,
    xlsx: false,
    txt: false,
    png: false,
    jpg: false
  },
  shortcuts: {
    showMainWindow: 'Alt+Space',
    quickCapture: 'Ctrl+Shift+A',
    screenshot: 'PrintScreen'
  }
}

const STORAGE_KEY = 'office_settings'

export const useSettingStore = defineStore('setting', () => {
  // 基础设置
  const theme = ref<ThemeMode>(defaultSettings.theme)
  const language = ref<Language>(defaultSettings.language)
  const outputDir = ref<string>(defaultSettings.outputDir)
  const autoStart = ref<boolean>(defaultSettings.autoStart)
  const minimizeToTray = ref<boolean>(defaultSettings.minimizeToTray)
  const trayNotification = ref<boolean>(defaultSettings.trayNotification)

  // 外观设置
  const primaryColor = ref<string>(defaultSettings.primaryColor)
  const windowOpacity = ref<number>(defaultSettings.windowOpacity)
  const acrylicEffect = ref<boolean>(defaultSettings.acrylicEffect)

  // 预览面板设置
  const previewPanelVisible = ref<boolean>(defaultSettings.previewPanelVisible)
  const previewWidth = ref<number>(defaultSettings.previewWidth)
  const MIN_PREVIEW_WIDTH = 240
  const MAX_PREVIEW_WIDTH = 600

  // 侧边栏设置
  const sidebarCollapsed = ref<boolean>(false)

  // 文件关联设置
  const fileAssociation = ref<FileAssociationConfig>({ ...defaultSettings.fileAssociation })

  // 快捷键设置
  const shortcuts = ref<ShortcutConfig>({ ...defaultSettings.shortcuts })

  // 应用主题到 DOM
  const applyTheme = () => {
    let isDark = false
    if (theme.value === 'auto') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      isDark = theme.value === 'dark'
    }
    document.documentElement.classList.toggle('dark', isDark)
  }

  // 应用主色调到 CSS 变量
  const applyPrimaryColor = () => {
    document.documentElement.style.setProperty('--primary-color', primaryColor.value)
    // 计算 hover 和 active 颜色（简单处理）
    const hex = primaryColor.value.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    // hover: 变亮
    const hoverR = Math.min(255, Math.round(r + (255 - r) * 0.15))
    const hoverG = Math.min(255, Math.round(g + (255 - g) * 0.15))
    const hoverB = Math.min(255, Math.round(b + (255 - b) * 0.15))
    document.documentElement.style.setProperty(
      '--primary-hover',
      `rgb(${hoverR}, ${hoverG}, ${hoverB})`
    )
    // active: 变暗
    const activeR = Math.max(0, Math.round(r * 0.8))
    const activeG = Math.max(0, Math.round(g * 0.8))
    const activeB = Math.max(0, Math.round(b * 0.8))
    document.documentElement.style.setProperty(
      '--primary-active',
      `rgb(${activeR}, ${activeG}, ${activeB})`
    )
  }

  // 应用窗口透明度
  const applyWindowOpacity = async () => {
    try {
      if (window.__TAURI_INTERNALS__) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrentWindow()
        await currentWindow.setOpacity(windowOpacity.value)
      }
    } catch (e) {
      console.warn('设置窗口透明度失败:', e)
    }
  }

  // 应用预览面板宽度
  const applyPreviewWidth = () => {
    document.documentElement.style.setProperty('--preview-width', previewWidth.value + 'px')
  }

  // 从本地存储加载设置
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        // 基础设置
        theme.value = data.theme || defaultSettings.theme
        language.value = data.language || defaultSettings.language
        outputDir.value = data.outputDir || defaultSettings.outputDir
        autoStart.value = data.autoStart ?? defaultSettings.autoStart
        minimizeToTray.value = data.minimizeToTray ?? defaultSettings.minimizeToTray
        trayNotification.value = data.trayNotification ?? defaultSettings.trayNotification

        // 外观设置
        primaryColor.value = data.primaryColor || defaultSettings.primaryColor
        windowOpacity.value = data.windowOpacity ?? defaultSettings.windowOpacity
        acrylicEffect.value = data.acrylicEffect ?? defaultSettings.acrylicEffect

        // 预览面板设置
        previewPanelVisible.value = data.previewPanelVisible ?? defaultSettings.previewPanelVisible
        previewWidth.value = data.previewWidth || defaultSettings.previewWidth

        // 侧边栏设置
        sidebarCollapsed.value = data.sidebarCollapsed ?? false

        // 文件关联设置
        if (data.fileAssociation) {
          fileAssociation.value = { ...defaultSettings.fileAssociation, ...data.fileAssociation }
        }

        // 快捷键设置
        if (data.shortcuts) {
          shortcuts.value = { ...defaultSettings.shortcuts, ...data.shortcuts }
        }
      }
    } catch (e) {
      console.error('加载设置失败', e)
    }

    // 应用设置
    applyTheme()
    applyPrimaryColor()
    applyPreviewWidth()
    applyWindowOpacity()
    document.documentElement.style.setProperty(
      '--sidebar-width',
      sidebarCollapsed.value ? '64px' : '220px'
    )
  }

  // 保存设置到本地存储
  const saveSettings = () => {
    const settings: AppSettings = {
      theme: theme.value,
      language: language.value,
      outputDir: outputDir.value,
      autoStart: autoStart.value,
      minimizeToTray: minimizeToTray.value,
      trayNotification: trayNotification.value,
      primaryColor: primaryColor.value,
      windowOpacity: windowOpacity.value,
      acrylicEffect: acrylicEffect.value,
      previewPanelVisible: previewPanelVisible.value,
      previewWidth: previewWidth.value,
      sidebarCollapsed: sidebarCollapsed.value,
      fileAssociation: { ...fileAssociation.value },
      shortcuts: { ...shortcuts.value }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }

  // 切换主题
  const toggleTheme = (mode: ThemeMode) => {
    theme.value = mode
    applyTheme()
    saveSettings()
  }

  // 设置主色调
  const setPrimaryColor = (color: string) => {
    primaryColor.value = color
    applyPrimaryColor()
    saveSettings()
  }

  // 设置窗口透明度
  const setWindowOpacity = (opacity: number) => {
    windowOpacity.value = opacity
    applyWindowOpacity()
    saveSettings()
  }

  // 切换预览面板
  const togglePreviewPanel = () => {
    previewPanelVisible.value = !previewPanelVisible.value
    saveSettings()
  }

  // 设置预览面板宽度（带边界限制）
  const setPreviewWidth = (width: number) => {
    const w = Math.max(MIN_PREVIEW_WIDTH, Math.min(MAX_PREVIEW_WIDTH, width))
    previewWidth.value = w
    applyPreviewWidth()
    saveSettings()
  }

  // 切换侧边栏折叠
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
    document.documentElement.style.setProperty(
      '--sidebar-width',
      sidebarCollapsed.value ? '64px' : '220px'
    )
  }

  // 更新文件关联
  const updateFileAssociation = (key: keyof FileAssociationConfig, value: boolean) => {
    fileAssociation.value[key] = value
    saveSettings()
  }

  // 更新快捷键
  const updateShortcut = (key: keyof ShortcutConfig, value: string) => {
    shortcuts.value[key] = value
    saveSettings()
  }

  // 从 Rust 后端加载设置
  const loadSettingsFromRust = async () => {
    try {
      if (window.__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core')
        const rustSettings = await invoke('get_settings')
        if (rustSettings && typeof rustSettings === 'object') {
          // 将 Rust 返回的设置合并到当前设置中
          Object.assign(theme.value, (rustSettings as any).theme || theme.value)
          saveSettings()
          applyTheme()
          applyPrimaryColor()
          applyPreviewWidth()
          applyWindowOpacity()
        }
      }
    } catch (e) {
      console.warn('从 Rust 加载设置失败，使用本地存储:', e)
    }
  }

  // 保存设置到 Rust 后端
  const saveSettingsToRust = async () => {
    try {
      if (window.__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core')
        const settings: AppSettings = {
          theme: theme.value,
          language: language.value,
          outputDir: outputDir.value,
          autoStart: autoStart.value,
          minimizeToTray: minimizeToTray.value,
          trayNotification: trayNotification.value,
          primaryColor: primaryColor.value,
          windowOpacity: windowOpacity.value,
          acrylicEffect: acrylicEffect.value,
          previewPanelVisible: previewPanelVisible.value,
          previewWidth: previewWidth.value,
          sidebarCollapsed: sidebarCollapsed.value,
          fileAssociation: { ...fileAssociation.value },
          shortcuts: { ...shortcuts.value }
        }
        await invoke('save_settings', { settings })
      }
    } catch (e) {
      console.warn('保存设置到 Rust 失败:', e)
    }
  }

  // 监听所有设置变化并保存
  watch(
    [
      theme,
      language,
      outputDir,
      autoStart,
      minimizeToTray,
      trayNotification,
      primaryColor,
      windowOpacity,
      acrylicEffect,
      previewPanelVisible,
      previewWidth,
      sidebarCollapsed,
      fileAssociation,
      shortcuts
    ],
    () => {
      saveSettings()
      saveSettingsToRust()
    },
    { deep: true }
  )

  return {
    // 状态
    theme,
    language,
    outputDir,
    autoStart,
    minimizeToTray,
    trayNotification,
    primaryColor,
    windowOpacity,
    acrylicEffect,
    previewPanelVisible,
    previewWidth,
    MIN_PREVIEW_WIDTH,
    MAX_PREVIEW_WIDTH,
    sidebarCollapsed,
    fileAssociation,
    shortcuts,
    // 方法
    loadSettings,
    saveSettings,
    toggleTheme,
    setPrimaryColor,
    setWindowOpacity,
    togglePreviewPanel,
    setPreviewWidth,
    toggleSidebar,
    updateFileAssociation,
    updateShortcut,
    loadSettingsFromRust,
    saveSettingsToRust
  }
})
