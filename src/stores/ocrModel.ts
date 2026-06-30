import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { isTauri } from '@/utils/tauriUtils'

// OCR离线模型下载管理Store

export interface ModelInfo {
  name: string
  lang: string
  size: number
  url: string
  md5: string
}

export interface ModelStatus {
  lang: string
  exists: boolean
  size: number
  verified: boolean
  status: string // not_downloaded / downloading / ready / corrupted
}

export interface DownloadProgress {
  model: string
  downloaded: number
  total: number
  percent: number
  status: string // downloading / paused / completed / failed / cancelled / verifying
  speed: string
}

export const useOcrModelStore = defineStore('ocrModel', () => {
  const models = ref<ModelInfo[]>([])
  const modelStatuses = ref<ModelStatus[]>([])
  const currentDownload = ref<DownloadProgress | null>(null)
  const downloadError = ref<string>('')
  const customUrls = ref<Record<string, string>>({})
  const modelsDir = ref<string>('')
  const hasChecked = ref(false)
  const downloadStatus = ref<string>('idle') // idle / checking / downloading / error
  let unlistenFn: (() => void) | null = null

  const readyLangs = computed(() => {
    return modelStatuses.value.filter((s) => s.status === 'ready').map((s) => s.lang)
  })

  const hasChinese = computed(() => readyLangs.value.includes('chi_sim'))
  const hasEnglish = computed(() => readyLangs.value.includes('eng'))

  // 可识别：至少有一个语言包就绪即可
  const canRecognize = computed(() => readyLangs.value.length > 0)

  // === 修复：兼容OCR页面使用的属性 ===
  const allModelsReady = computed(() => readyLangs.value.length > 0)
  const readyCount = computed(() => readyLangs.value.length)
  const totalCount = computed(() => models.value.length)

  const initModels = async () => {
    if (!isTauri()) {
      models.value = [
        { name: '中文简体', lang: 'chi_sim', size: 19000000, url: '', md5: '' },
        { name: '英文', lang: 'eng', size: 4000000, url: '', md5: '' }
      ]
      modelStatuses.value = models.value.map((m) => ({
        lang: m.lang,
        exists: false,
        size: 0,
        verified: false,
        status: 'not_downloaded'
      }))
      hasChecked.value = true
      return
    }
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      models.value = await invoke('get_default_models')
      modelsDir.value = await invoke('get_ocr_models_dir')
    } catch (e: any) {
      console.error('获取模型列表失败', e)
    }
  }

  const checkAllModels = async (): Promise<boolean> => {
    if (!isTauri()) {
      return canRecognize.value
    }
    try {
      downloadStatus.value = 'checking'
      const { invoke } = await import('@tauri-apps/api/core')
      modelStatuses.value = await invoke('check_all_models')
      hasChecked.value = true
      downloadStatus.value = 'idle'
      return canRecognize.value
    } catch (e: any) {
      console.error('检测模型状态失败', e)
      downloadStatus.value = 'error'
      return false
    }
  }

  const setupProgressListener = async () => {
    if (!isTauri() || unlistenFn) return
    try {
      const { listen } = await import('@tauri-apps/api/event')
      unlistenFn = await listen('ocr-download-progress', (event: any) => {
        const payload = event.payload as DownloadProgress
        currentDownload.value = payload
        if (payload.status === 'completed' || payload.status === 'failed' || payload.status === 'cancelled') {
          checkAllModels()
        }
      })
    } catch (e: any) {
      console.error('监听下载进度失败', e)
    }
  }

  const downloadModel = async (lang: string, customUrl?: string): Promise<boolean> => {
    if (!isTauri()) {
      downloadError.value = '浏览器环境下无法下载模型'
      return false
    }
    const model = models.value.find((m) => m.lang === lang)
    if (!model) {
      downloadError.value = '未找到模型'
      return false
    }

    downloadError.value = ''
    currentDownload.value = {
      model: lang,
      downloaded: 0,
      total: model.size,
      percent: 0,
      status: 'downloading',
      speed: '0 KB/s'
    }
    downloadStatus.value = 'downloading'

    // 更新状态为下载中
    const idx = modelStatuses.value.findIndex((s) => s.lang === lang)
    if (idx >= 0) {
      modelStatuses.value[idx].status = 'downloading'
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const url = customUrl || customUrls.value[lang]
      const result = await invoke('download_model', {
        model,
        customUrl: url || null
      })
      downloadStatus.value = 'idle'
      return result as boolean
    } catch (e: any) {
      downloadError.value = e.message || '下载失败'
      currentDownload.value = null
      downloadStatus.value = 'error'
      await checkAllModels()
      return false
    }
  }

  const cancelDownload = async (lang: string): Promise<boolean> => {
    if (!isTauri()) return false
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const result = await invoke('cancel_download', { lang })
      if (result) {
        currentDownload.value = null
        await checkAllModels()
      }
      return result as boolean
    } catch (e: any) {
      console.error('取消下载失败', e)
      return false
    }
  }

  const deleteModel = async (lang: string): Promise<boolean> => {
    if (!isTauri()) return false
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const result = await invoke('delete_model', { lang })
      if (result) {
        await checkAllModels()
      }
      return result as boolean
    } catch (e: any) {
      console.error('删除模型失败', e)
      return false
    }
  }

  const setCustomUrl = (lang: string, url: string) => {
    customUrls.value[lang] = url
  }

  const cleanup = () => {
    if (unlistenFn) {
      unlistenFn()
      unlistenFn = null
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const getStatusText = (status: string): string => {
    const map: Record<string, string> = {
      not_downloaded: '未下载',
      downloading: '下载中',
      ready: '已就绪',
      corrupted: '文件损坏'
    }
    return map[status] || status
  }

  const getStatusColor = (status: string): string => {
    const map: Record<string, string> = {
      not_downloaded: '#8c8c8c',
      downloading: '#1677ff',
      ready: '#52c41a',
      corrupted: '#ff4d4f'
    }
    return map[status] || '#8c8c8c'
  }

  return {
    models,
    modelStatuses,
    currentDownload,
    downloadError,
    customUrls,
    modelsDir,
    hasChecked,
    downloadStatus,
    readyLangs,
    hasChinese,
    hasEnglish,
    canRecognize,
    allModelsReady,
    readyCount,
    totalCount,
    initModels,
    checkAllModels,
    setupProgressListener,
    downloadModel,
    cancelDownload,
    deleteModel,
    setCustomUrl,
    cleanup,
    formatSize,
    getStatusText,
    getStatusColor
  }
})
