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
  const defaultPrinter = ref<string>('')
  const printSettings = ref<PrintSettings>({
    printer: '',
    paperSize: 'A4',
    orientation: 'portrait',
    copies: 1,
    duplex: 'none',
    colorMode: 'color'
  })

  const setDefaultPrinter = (printer: string) => {
    defaultPrinter.value = printer
    printSettings.value.printer = printer
  }

  const updatePrintSettings = (settings: Partial<PrintSettings>) => {
    printSettings.value = { ...printSettings.value, ...settings }
  }

  return {
    defaultPrinter,
    printSettings,
    setDefaultPrinter,
    updatePrintSettings
  }
})
