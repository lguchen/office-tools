import { reactive, watch, onMounted } from 'vue'
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

interface PrintSettings {
  printerName: string
  copies: number
  printOrder: 'sequential' | 'collated'
  paperSize: string
  orientation: 'portrait' | 'landscape'
  printSides: string
  printRange: string
  pageFrom: number
  pageTo: number
  printColor: 'color' | 'monochrome'
  pagesPerSheet: number
  scaling: string
  scalePercent: number
  marginPreset: string
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
}

const defaultSettings: PrintSettings = {
  printerName: '',
  copies: 1,
  printOrder: 'collated',
  paperSize: 'A4',
  orientation: 'portrait',
  printSides: 'simplex',
  printRange: 'current',
  pageFrom: 1,
  pageTo: 1,
  printColor: 'monochrome',
  pagesPerSheet: 1,
  scaling: 'none',
  scalePercent: 100,
  marginPreset: 'normal',
  marginTop: 25.4,
  marginBottom: 25.4,
  marginLeft: 31.8,
  marginRight: 31.8,
}

const settings = reactive<PrintSettings>({ ...defaultSettings })

const SETTINGS_PATH = 'config/print_settings.json'

export function useSettings() {
  const loadSettings = async () => {
    try {
      const fileExists = await exists(SETTINGS_PATH)
      if (fileExists) {
        const content = await readTextFile(SETTINGS_PATH)
        const saved = JSON.parse(content)
        Object.assign(settings, saved)
      }
    } catch (e) {
      console.warn('Failed to load settings:', e)
    }
  }

  const saveSettings = async () => {
    try {
      await writeTextFile(SETTINGS_PATH, JSON.stringify(settings, null, 2))
    } catch (e) {
      console.warn('Failed to save settings:', e)
    }
  }

  const resetSettings = () => {
    Object.assign(settings, defaultSettings)
    saveSettings()
  }

  const updateSetting = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    settings[key] = value
    saveSettings()
  }

  const syncSettings = (newSettings: Partial<PrintSettings>) => {
    Object.assign(settings, newSettings)
    saveSettings()
  }

  onMounted(() => {
    loadSettings()
  })

  watch(settings, saveSettings, { deep: true })

  return {
    settings,
    loadSettings,
    saveSettings,
    resetSettings,
    updateSetting,
    syncSettings,
  }
}

export type { PrintSettings }