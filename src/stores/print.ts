import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// === 新增：打印功能 Store ===
// 管理打印机列表、打印参数、打印任务队列

export interface PrinterInfo {
  name: string
  status: string
  is_default: boolean
  is_offline: boolean
  port: string
  driver: string
}

export interface PrintParams {
  printer_name: string
  copies: number
  page_range: string
  paper_size: string
  orientation: 'portrait' | 'landscape'
  color_mode: 'color' | 'grayscale'
  duplex: boolean
  scale: number
  fit_to_page: boolean
  watermark_text: string
  pages_per_sheet: number
  margin_top: number
  margin_bottom: number
  margin_left: number
  margin_right: number
  print_header_footer: boolean
}

export interface PrintTask {
  id: string
  file: string
  filePath: string
  status: 'pending' | 'printing' | 'completed' | 'failed'
  progress: number
  error?: string
}

const defaultParams: PrintParams = {
  printer_name: '',
  copies: 1,
  page_range: 'all',
  paper_size: 'A4',
  orientation: 'portrait',
  color_mode: 'color',
  duplex: false,
  scale: 100,
  fit_to_page: true,
  watermark_text: '',
  pages_per_sheet: 1,
  margin_top: 20,
  margin_bottom: 20,
  margin_left: 20,
  margin_right: 20,
  print_header_footer: false
}

export const usePrintStore = defineStore('print', () => {
  const printers = ref<PrinterInfo[]>([])
  const selectedPrinter = ref('')
  const params = ref<PrintParams>({ ...defaultParams })
  const isPanelVisible = ref(false)
  const panelWidth = ref(360)
  const isLoading = ref(false)
  const isPrinting = ref(false)

  // 预览相关
  const previewZoom = ref(100)
  const previewPage = ref(1)
  const totalPages = ref(1)
  const previewContent = ref<string>('') // HTML 内容 / 图片URL
  const previewType = ref<'html' | 'image' | 'pdf'>('html')

  // 批量打印队列
  const printTasks = ref<PrintTask[]>([])
  const batchMode = ref(false)
  const filePaths = ref<string[]>([]) // ponytail: 直接存待打印文件路径
  let printProgressListener: (() => void) | null = null

  const defaultPrinter = computed(() => {
    return printers.value.find(p => p.is_default) || printers.value[0] || null
  })

  const hasPrinters = computed(() => printers.value.length > 0)

  // === 加载打印机列表 ===
  const loadPrinters = async () => {
    isLoading.value = true
    try {
      if (window.__TAURI_INTERNALS__) {
        const result = await invokeTauri('get_printers') as PrinterInfo[]
        printers.value = result || []
        if (printers.value.length > 0 && !selectedPrinter.value) {
          const def = printers.value.find(p => p.is_default) || printers.value[0]
          selectedPrinter.value = def.name
          params.value.printer_name = def.name
        }
      }
    } catch (e) {
      console.error('加载打印机列表失败', e)
    } finally {
      isLoading.value = false
    }
  }

  // === 刷新打印机列表 ===
  const refreshPrinters = async () => {
    isLoading.value = true
    try {
      if (window.__TAURI_INTERNALS__) {
        const result = await invokeTauri('refresh_printers') as PrinterInfo[]
        printers.value = result || []
      }
    } catch (e) {
      console.error('刷新打印机列表失败', e)
    } finally {
      isLoading.value = false
    }
  }

  // === 选择打印机 ===
  const selectPrinter = (name: string) => {
    selectedPrinter.value = name
    params.value.printer_name = name
  }

  // === 显示/隐藏打印面板 ===
  const showPanel = () => {
    isPanelVisible.value = true
    if (printers.value.length === 0) {
      loadPrinters()
    }
  }

  const hidePanel = () => {
    isPanelVisible.value = false
  }

  const togglePanel = () => {
    isPanelVisible.value = !isPanelVisible.value
    if (isPanelVisible.value && printers.value.length === 0) {
      loadPrinters()
    }
  }

  // === 设置面板宽度 ===
  const setPanelWidth = (width: number) => {
    const min = 280
    const max = 600
    panelWidth.value = Math.max(min, Math.min(max, width))
  }

  // === 设置预览内容 ===
  const setPreview = (content: string, type: 'html' | 'image' | 'pdf' = 'html', pages = 1) => {
    previewContent.value = content
    previewType.value = type
    totalPages.value = pages
    previewPage.value = 1
  }

  // === 预览缩放 ===
  const zoomIn = () => {
    previewZoom.value = Math.min(200, previewZoom.value + 10)
  }

  const zoomOut = () => {
    previewZoom.value = Math.max(25, previewZoom.value - 10)
  }

  const zoomFit = () => {
    previewZoom.value = 100
  }

  // === 重置参数 ===
  const resetParams = () => {
    const savedPrinter = params.value.printer_name
    params.value = { ...defaultParams, printer_name: savedPrinter }
  }

  // === 打印单个文件 ===
  const printFile = async (filePath: string): Promise<boolean> => {
    if (!params.value.printer_name) {
      throw new Error('请先选择打印机')
    }
    isPrinting.value = true
    try {
      if (window.__TAURI_INTERNALS__) {
        const result = await invokeTauri('print_file', {
          filePath,
          printerName: params.value.printer_name
        })
        return result as boolean
      }
      return false
    } finally {
      isPrinting.value = false
    }
  }

  // === 批量打印 ===
  const startBatchPrint = async (files: { path: string; name: string }[]) => {
    if (!params.value.printer_name) {
      throw new Error('请先选择打印机')
    }

    batchMode.value = true
    printTasks.value = files.map(f => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      file: f.name,
      filePath: f.path,
      status: 'pending',
      progress: 0
    }))

    if (window.__TAURI_INTERNALS__) {
      invokeTauri('batch_print_files', {
        files: files.map(f => f.path),
        printerName: params.value.printer_name,
        params: params.value
      }).catch(e => {
        console.error('批量打印启动失败', e)
      })
    }
  }

  // === 设置进度监听 ===
  const setupProgressListener = async () => {
    if (!window.__TAURI_INTERNALS__) return
    if (printProgressListener) return

    const { listen } = await import('@tauri-apps/api/event')

    const unlisten = await listen('print-progress', (event: any) => {
      const data = event.payload as { file: string; status: string; error?: string }
      const task = printTasks.value.find(t => t.file === data.file)
      if (task) {
        task.status = data.status as any
        if (data.status === 'completed') {
          task.progress = 100
        } else if (data.status === 'failed') {
          task.error = data.error
          task.progress = 0
        } else if (data.status === 'printing') {
          task.progress = 50
        }
      }
    })

    printProgressListener = unlisten as any
  }

  const cleanup = () => {
    if (printProgressListener) {
      printProgressListener()
      printProgressListener = null
    }
  }

  // === 执行打印（ponytail: 有文件路径调系统打印，否则浏览器打印预览）
  const doPrint = async (): Promise<boolean> => {
    if (!params.value.printer_name && filePaths.value.length > 0) {
      throw new Error('请先选择打印机')
    }
    isPrinting.value = true
    try {
      // 有真实文件路径 → 调用系统打印
      if (filePaths.value.length > 0 && (window as any).__TAURI_INTERNALS__) {
        if (filePaths.value.length === 1) {
          const result = await invokeTauri('print_file', {
            filePath: filePaths.value[0],
            printerName: params.value.printer_name
          })
          return result as boolean
        } else {
          await invokeTauri('batch_print_files', {
            files: filePaths.value,
            printerName: params.value.printer_name,
            params: params.value
          })
          return true
        }
      }
      // 没有文件路径 → 浏览器打印预览内容（ponytail: 简单直接）
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('无法打开打印窗口')
      }
      printWindow.document.write(`
        <html><head><title>打印</title>
        <style>
          body { margin: 0; padding: 20px; font-family: "Microsoft YaHei", sans-serif; }
          img { max-width: 100%; height: auto; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          td, th { border: 1px solid #ccc; padding: 4px 6px; }
          th { background: #f5f5f5; }
          @media print { body { padding: 0; } }
        </style></head><body>
      `)
      if (previewType.value === 'image') {
        printWindow.document.write(`<img src="${previewContent.value}" />`)
      } else {
        printWindow.document.write(previewContent.value)
      }
      printWindow.document.write('</body></html>')
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      return true
    } finally {
      isPrinting.value = false
    }
  }

  const clearTasks = () => {
    printTasks.value = []
    batchMode.value = false
  }

  // === 工具函数：调用 Tauri 命令 ===
  const invokeTauri = async (cmd: string, args: Record<string, any> = {}): Promise<any> => {
    if (!window.__TAURI_INTERNALS__) {
      console.warn(`Tauri 不可用，模拟调用 ${cmd}`)
      return null
    }
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke(cmd, args)
  }

  return {
    // 状态
    printers,
    selectedPrinter,
    params,
    isPanelVisible,
    panelWidth,
    isLoading,
    isPrinting,
    previewZoom,
    previewPage,
    totalPages,
    previewContent,
    previewType,
    printTasks,
    batchMode,
    filePaths,
    // 计算属性
    defaultPrinter,
    hasPrinters,
    // 方法
    loadPrinters,
    refreshPrinters,
    selectPrinter,
    showPanel,
    hidePanel,
    togglePanel,
    setPanelWidth,
    setPreview,
    zoomIn,
    zoomOut,
    zoomFit,
    resetParams,
    printFile,
    startBatchPrint,
    setupProgressListener,
    cleanup,
    clearTasks,
    doPrint
  }
})
