import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface PrintSettings {
  printer: string
  paperSize: string
  orientation: 'portrait' | 'landscape'
  copies: number
  duplex: 'none' | 'long-edge' | 'short-edge'
  colorMode: 'color' | 'grayscale'
}

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<'light' | 'dark'>('dark')
  const defaultPrinter = ref<string>('')
  const printSettings = ref<PrintSettings>({
    printer: '',
    paperSize: 'A4',
    orientation: 'portrait',
    copies: 1,
    duplex: 'none',
    colorMode: 'color'
  })

  const setTheme = (newTheme: 'light' | 'dark') => {
    theme.value = newTheme
  }

  const setDefaultPrinter = (printer: string) => {
    defaultPrinter.value = printer
    printSettings.value.printer = printer
  }

  const updatePrintSettings = (settings: Partial<PrintSettings>) => {
    printSettings.value = { ...printSettings.value, ...settings }
  }

  return {
    theme,
    defaultPrinter,
    printSettings,
    setTheme,
    setDefaultPrinter,
    updatePrintSettings
  }
})
