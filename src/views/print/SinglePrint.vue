<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, reactive } from 'vue'
import { useTheme } from '../../composables/useTheme'
import { useSettings } from '../../composables/useSettings'
import {
  NButton, NIcon, NFormItem, NForm, NSelect,
  NInputNumber, NRadioGroup, NRadioButton, NCard, NDivider, NSpin,
  NButtonGroup, NSpace, NCheckbox, NCheckboxGroup, NInput, NTabs, NTabPane, NTag,
  NModal, NList, NListItem, NThing
} from 'naive-ui'
import {
  PrintOutline, ChevronBackOutline, ChevronForwardOutline,
  SettingsOutline, GridOutline, DocumentTextOutline,
  TrashOutline, EyeOutline, AddOutline, CheckmarkOutline,
  RefreshOutline, WarningOutline
} from '@vicons/ionicons5'
import PrintPreview from '../../components/print/PrintPreview.vue'
import { invoke } from '@tauri-apps/api/core'
import { notifySuccess, notifyError, notifyInfo } from '../../composables/useNotification'
import * as XLSX from 'xlsx'

interface PrintFile {
  id: string
  file: File
  name: string
  size: number
  selected: boolean
  status: 'pending' | 'printing' | 'done' | 'error'
}

const files = ref<PrintFile[]>([])
const activeFileId = ref<string>('')
const isPrinting = ref(false)

const activeFile = computed(() => files.value.find(f => f.id === activeFileId.value) || null)
const inputFile = computed(() => activeFile.value?.file || null)
const fileName = computed(() => activeFile.value?.name || '')
const fileSize = computed(() => activeFile.value?.size || 0)

const selectedFiles = computed(() => files.value.filter(f => f.selected))
const selectedCount = computed(() => selectedFiles.value.length)
const pendingCount = computed(() => files.value.filter(f => f.status === 'pending').length)
const doneCount = computed(() => files.value.filter(f => f.status === 'done').length)

const printerName = ref('')
const printers = ref<string[]>([])
const networkPrinters = ref<any[]>([])
const isScanningNetwork = ref(false)
const showPrinterManager = ref(false)
const newPrinterPath = ref('')
const isAddingPrinter = ref(false)
const isDragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const printPreviewRef = ref<InstanceType<typeof PrintPreview> | null>(null)
const currentSelection = ref<any>(null)

const excelSheetNames = ref<string[]>([])
const selectedSheets = ref<string[]>([])
const showSheetSelector = ref(false)
const hasLibreOffice = ref(false)

const { settings, loadSettings, saveSettings } = useSettings()

const copies = ref(settings.copies)
const printOrder = ref<'sequential' | 'collated'>(settings.printOrder)
const paperSize = ref(settings.paperSize)
const orientation = ref<'portrait' | 'landscape'>(settings.orientation)
const printSides = ref(settings.printSides)
const printRange = ref(settings.printRange)
const pageFrom = ref(settings.pageFrom)
const pageTo = ref(settings.pageTo)
const printColor = ref<'color' | 'monochrome'>(settings.printColor)

const pagesPerSheet = ref(settings.pagesPerSheet)
const pagesPerSheetOptions = [
  { label: '1版', value: 1, icon: '1' },
  { label: '2版', value: 2, icon: '2' },
  { label: '4版', value: 4, icon: '4' },
  { label: '6版', value: 6, icon: '6' },
  { label: '更多', value: 0, icon: '...' },
]

const scaling = ref(settings.scaling)
const scalePercent = ref(settings.scalePercent)
const scalingOptions = [
  { label: '无打印缩放', value: 'none' },
  { label: '适应纸张大小', value: 'fit' },
  { label: '适应页宽', value: 'fitwidth' },
  { label: '自定义缩放', value: 'custom' },
]

const marginPreset = ref(settings.marginPreset)
const marginOptions = [
  { label: '常规', value: 'normal' },
  { label: '窄', value: 'narrow' },
  { label: '宽', value: 'wide' },
  { label: '自定义', value: 'custom' },
]
const marginTop = ref(settings.marginTop)
const marginBottom = ref(settings.marginBottom)
const marginLeft = ref(settings.marginLeft)
const marginRight = ref(settings.marginRight)
const showMarginAdjust = ref(false)

const viewMode = ref<'normal' | 'pageBreak'>('normal')
const showGridlines = ref(false)

const shrinkToFit = ref(false)
const autoOptimize = ref(false)

const currentPage = ref(1)
const totalPages = ref(1)

const paperSizeOptions = [
  { label: 'A4 (210×297 mm)', value: 'A4' },
  { label: 'A3 (297×420 mm)', value: 'A3' },
  { label: 'A5 (148×210 mm)', value: 'A5' },
  { label: 'B4 (250×353 mm)', value: 'B4' },
  { label: 'B5 (176×250 mm)', value: 'B5' },
  { label: 'Letter (8.5×11 in)', value: 'Letter' },
  { label: 'Legal (8.5×14 in)', value: 'Legal' },
  { label: 'Executive (7.25×10.5 in)', value: 'Executive' },
  { label: '信封 #10', value: 'Envelope10' },
  { label: '信封 DL', value: 'EnvelopeDL' },
  { label: '自定义', value: 'Custom' },
]

const printRangeOptions = [
  { label: '打印全部内容', value: 'all' },
  { label: '当前页', value: 'current' },
  { label: '页码范围', value: 'range' },
  { label: '选定内容', value: 'selection' },
]

const printSidesOptions = [
  { label: '单面打印', value: 'simplex' },
  { label: '双面打印-长边翻转', value: 'duplex-long' },
  { label: '双面打印-短边翻转', value: 'duplex-short' },
]

const canPrint = computed(() => {
  if (printRange.value === 'selection') {
    return !!currentSelection.value
  }
  return files.value.length > 0
})

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const parseExcelSheetNames = async (file: File): Promise<string[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    return workbook.SheetNames || []
  } catch {
    return []
  }
}

const addFiles = (fileList: FileList | File[]) => {
  const filesArray = Array.from(fileList)
  filesArray.forEach(async (file) => {
    const id = Date.now() + Math.random().toString(36).slice(2)
    const newFile: PrintFile = {
      id,
      file,
      name: file.name,
      size: file.size,
      selected: true,
      status: 'pending'
    }
    files.value.push(newFile)
    if (!activeFileId.value) {
      activeFileId.value = id
      if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        const sheets = await parseExcelSheetNames(file)
        excelSheetNames.value = sheets
        selectedSheets.value = [...sheets]
        showSheetSelector.value = sheets.length > 1
      } else {
        excelSheetNames.value = []
        selectedSheets.value = []
        showSheetSelector.value = false
      }
    }
  })
}

const handleFileInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    addFiles(input.files)
    input.value = ''
  }
}

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  const relatedTarget = e.relatedTarget as Node
  if (!relatedTarget || !(e.currentTarget as HTMLElement).contains(relatedTarget)) {
    isDragOver.value = false
  }
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = false
  
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    addFiles(e.dataTransfer.files)
  }
}

let unlistenDragEnter: (() => void) | null = null
let unlistenDragLeave: (() => void) | null = null
let unlistenDragDrop: (() => void) | null = null
let dragEnterCount = 0

const injectPreviewColors = () => {
  const root = document.documentElement
  root.style.setProperty('--preview-wrapper-bg', '#ffffff')
  root.style.setProperty('--preview-wrapper-shadow', '0 4px 20px rgba(0, 0, 0, 0.15)')
  root.style.setProperty('--preview-wrapper-text', '#1f2328')
}

const setupTauriDragDrop = async () => {
  try {
    const { listen } = await import('@tauri-apps/api/event')

    unlistenDragEnter = await listen('tauri://drag-enter', () => {
      dragEnterCount++
      isDragOver.value = true
    })

    unlistenDragLeave = await listen('tauri://drag-leave', () => {
      dragEnterCount = Math.max(0, dragEnterCount - 1)
      if (dragEnterCount === 0) {
        isDragOver.value = false
      }
    })

    unlistenDragDrop = await listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
      dragEnterCount = 0
      isDragOver.value = false
      const filePaths = event.payload.paths
      if (filePaths && filePaths.length > 0) {
        loadFilesFromPaths(filePaths)
      }
    })
  } catch (e) {
    console.log('Tauri drag drop not available:', e)
  }
}

const loadFilesFromPaths = async (paths: string[]) => {
  try {
    const { readFile } = await import('@tauri-apps/plugin-fs')
    for (const path of paths) {
      try {
        const data = await readFile(path)
        const fileName = path.split(/[\\/]/).pop() || 'unknown'
        const file = new File([data], fileName)
        addFiles([file])
      } catch (e) {
        console.error('Failed to read file:', path, e)
      }
    }
  } catch (e) {
    console.error('Failed to load files from paths:', e)
  }
}

const handleSelectionChange = (data: any) => {
  currentSelection.value = data
}

const selectFile = async (id: string) => {
  activeFileId.value = id
  currentPage.value = 1
  currentSelection.value = null
  
  const file = files.value.find(f => f.id === id)
  if (file) {
    if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      const sheets = await parseExcelSheetNames(file.file)
      excelSheetNames.value = sheets
      selectedSheets.value = [...sheets]
      showSheetSelector.value = sheets.length > 1
    } else {
      excelSheetNames.value = []
      selectedSheets.value = []
      showSheetSelector.value = false
    }
  }
}

const toggleSelectFile = (id: string, e: Event) => {
  e.stopPropagation()
  const file = files.value.find(f => f.id === id)
  if (file) {
    file.selected = !file.selected
  }
}

const selectAll = () => {
  files.value.forEach(f => f.selected = true)
}

const deselectAll = () => {
  files.value.forEach(f => f.selected = false)
}

const removeFile = (id: string, e: Event) => {
  e.stopPropagation()
  const index = files.value.findIndex(f => f.id === id)
  if (index > -1) {
    files.value.splice(index, 1)
    if (activeFileId.value === id) {
      activeFileId.value = files.value[0]?.id || ''
    }
  }
}

const clearAll = () => {
  files.value = []
  activeFileId.value = ''
  currentPage.value = 1
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'default'
    case 'printing': return 'info'
    case 'done': return 'success'
    case 'error': return 'error'
    default: return 'default'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return '等待中'
    case 'printing': return '打印中'
    case 'done': return '已完成'
    case 'error': return '失败'
    default: return status
  }
}

const loadPrinters = async () => {
  try {
    const result = await invoke<string[]>('get_cached_printers')
    printers.value = result
    if (result.length > 0 && !printerName.value) {
      printerName.value = result[0]
    }
  } catch (e) {
    console.warn('Failed to load printers:', e)
  }
}

const refreshPrinters = async () => {
  try {
    const result = await invoke<string[]>('refresh_printers')
    printers.value = result
    if (result.length > 0 && !printerName.value) {
      printerName.value = result[0]
    }
    notifySuccess('刷新成功', `已刷新 ${result.length} 台打印机`)
  } catch (e) {
    notifyError('刷新失败', (e as Error).message)
  }
}

const scanNetworkPrinters = async () => {
  isScanningNetwork.value = true
  try {
    const result = await invoke<any[]>('get_cached_network_printers')
    networkPrinters.value = result
  } catch (e) {
    notifyError('扫描失败', (e as Error).message)
  } finally {
    isScanningNetwork.value = false
  }
}

const addNetworkPrinter = async () => {
  if (!newPrinterPath.value.trim()) {
    notifyInfo('请输入打印机路径', '例如 \\\\server\\printer')
    return
  }
  isAddingPrinter.value = true
  try {
    const result = await invoke<boolean>('add_network_printer', {
      uncPath: newPrinterPath.value.trim()
    })
    if (result) {
      notifySuccess('添加成功', '网络打印机已添加')
      newPrinterPath.value = ''
      await loadPrinters()
      await scanNetworkPrinters()
    }
  } catch (e) {
    notifyError('添加失败', (e as Error).message)
  } finally {
    isAddingPrinter.value = false
  }
}

const testPrinter = async (name: string) => {
  try {
    const online = await invoke<boolean>('test_printer_connection', { printerName: name })
    if (online) {
      notifySuccess('打印机在线', name)
    } else {
      notifyInfo('打印机离线', name)
    }
  } catch (e) {
    notifyError('测试失败', (e as Error).message)
  }
}

const selectPrinter = (name: string) => {
  printerName.value = name
  showPrinterManager.value = false
}

const openPrinterManager = async () => {
  showPrinterManager.value = true
  await scanNetworkPrinters()
}

const printSingleFile = async (fileItem: PrintFile): Promise<boolean> => {
  try {
    const arrayBuffer = await fileItem.file.arrayBuffer()
    const data = Array.from(new Uint8Array(arrayBuffer))

    const isExcel = fileItem.name.toLowerCase().endsWith('.xlsx') || fileItem.name.toLowerCase().endsWith('.xls')
    const sheetNames = isExcel && selectedSheets.value.length > 0 ? selectedSheets.value : undefined

    let printArea = undefined
    if (currentSelection.value && currentSelection.value.type === 'excel') {
      printArea = {
        startRow: currentSelection.value.startRow,
        startCol: currentSelection.value.startCol,
        endRow: currentSelection.value.endRow,
        endCol: currentSelection.value.endCol,
      }
    }

    const result = await invoke<boolean>('print_file', {
      data,
      fileName: fileItem.name,
      printer: printerName.value || null,
      copies: copies.value,
      sheetNames,
      printArea,
    })

    return result
  } catch (e) {
    console.error('Print error:', e)
    return false
  }
}

const handleCancelPrint = async () => {
  try {
    await invoke('cancel_print')
    notifyInfo('取消打印', '已发送取消打印指令')
  } catch (e) {
    console.error('Cancel print error:', e)
  }
}

const handlePrint = async () => {
  if (!canPrint.value) return
  isPrinting.value = true

  await saveSettings()

  if (printRange.value === 'selection' && currentSelection.value) {
    try {
      await printSelection()
      notifySuccess('打印成功', '选定内容已发送到打印机')
    } catch (e) {
      notifyError('打印失败', '选定内容打印失败')
    }
    isPrinting.value = false
    return
  }

  let filesToPrint: PrintFile[] = []
  
  if (printRange.value === 'selection') {
    filesToPrint = selectedFiles.value
  } else {
    filesToPrint = files.value
  }

  if (filesToPrint.length === 0) {
    isPrinting.value = false
    return
  }

  if (filesToPrint.length === 1) {
    const fileItem = filesToPrint[0]
    fileItem.status = 'printing'
    const result = await printSingleFile(fileItem)
    fileItem.status = result ? 'done' : 'error'
    
    if (result) {
      notifySuccess('打印成功', `${fileItem.name} 已发送到打印机`)
    } else {
      notifyError('打印失败', `${fileItem.name} 打印失败`)
    }
  } else {
    let success = 0
    let failed = 0

    for (const fileItem of filesToPrint) {
      if (fileItem.status !== 'pending' && fileItem.status !== 'error') continue
      fileItem.status = 'printing'
      const result = await printSingleFile(fileItem)
      if (result) {
        fileItem.status = 'done'
        success++
      } else {
        fileItem.status = 'error'
        failed++
      }
    }

    notifySuccess('批量打印完成', `成功 ${success} 个，失败 ${failed} 个`)
  }

  isPrinting.value = false
}

const printSelection = async (): Promise<boolean> => {
  if (!currentSelection.value || !currentSelection.value.htmlContent) {
    return false
  }

  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) {
    return false
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>打印选定内容</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #d0d7de;
          padding: 6px 10px;
          text-align: left;
          white-space: nowrap;
        }
        th {
          background-color: #f6f8fa;
          font-weight: 600;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${currentSelection.value.htmlContent}
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()

  return new Promise((resolve) => {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.onafterprint = () => {
          printWindow.close()
          resolve(true)
        }
      }, 500)
    }
  })
}

const applyMarginPreset = () => {
  switch (marginPreset.value) {
    case 'normal':
      marginTop.value = 25.4
      marginBottom.value = 25.4
      marginLeft.value = 31.8
      marginRight.value = 31.8
      break
    case 'narrow':
      marginTop.value = 12.7
      marginBottom.value = 12.7
      marginLeft.value = 12.7
      marginRight.value = 12.7
      break
    case 'wide':
      marginTop.value = 38.1
      marginBottom.value = 38.1
      marginLeft.value = 50.8
      marginRight.value = 50.8
      break
  }
}

watch(marginPreset, applyMarginPreset)



const checkLibreOffice = async () => {
  try {
    const result = await invoke<boolean>('has_libreoffice')
    hasLibreOffice.value = result
  } catch {
    hasLibreOffice.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  copies.value = settings.copies
  printOrder.value = settings.printOrder
  paperSize.value = settings.paperSize
  orientation.value = settings.orientation
  printSides.value = settings.printSides
  printRange.value = settings.printRange
  pageFrom.value = settings.pageFrom
  pageTo.value = settings.pageTo
  printColor.value = settings.printColor
  pagesPerSheet.value = settings.pagesPerSheet
  scaling.value = settings.scaling
  scalePercent.value = settings.scalePercent
  marginPreset.value = settings.marginPreset
  marginTop.value = settings.marginTop
  marginBottom.value = settings.marginBottom
  marginLeft.value = settings.marginLeft
  marginRight.value = settings.marginRight
  
  injectPreviewColors()
  loadPrinters()
  scanNetworkPrinters()
  setupTauriDragDrop()
  checkLibreOffice()
})

onUnmounted(() => {
  if (unlistenDragEnter) unlistenDragEnter()
  if (unlistenDragLeave) unlistenDragLeave()
  if (unlistenDragDrop) unlistenDragDrop()
})
</script>

<template>
  <div class="print-page h-full flex flex-col rounded-lg overflow-hidden border shadow-sm theme-light">
    <!-- 顶部工具栏 -->
    <div class="toolbar flex-shrink-0 border-b px-4 py-2.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NButton text size="small" @click="$router.back()">
          <template #icon>
            <NIcon size="16"><ChevronBackOutline /></NIcon>
          </template>
          退出预览
        </NButton>
        <NDivider vertical />
        <div class="font-medium text-base">
          {{ activeFile ? fileName : '打印中心' }}
        </div>
        <span v-if="fileSize" class="text-xs opacity-60">{{ formatFileSize(fileSize) }}</span>
        <span v-if="files.length > 1" class="text-xs opacity-60 ml-2">
          ({{ files.findIndex(f => f.id === activeFileId) + 1 }}/{{ files.length }})
        </span>
      </div>
      <div class="flex items-center gap-2">
        <NButton size="small" text>
          <template #icon>
            <NIcon size="16"><SettingsOutline /></NIcon>
          </template>
        </NButton>
        <NButton size="small" text>
          <template #icon>
            <NIcon size="16"><GridOutline /></NIcon>
          </template>
        </NButton>
        <NButton 
          type="primary" 
          size="small" 
          :disabled="!canPrint" 
          :loading="isPrinting" 
          @click="handlePrint"
        >
          <template #icon>
            <NIcon size="16"><PrintOutline /></NIcon>
          </template>
          {{ printRange === 'selection' ? '打印选定内容' : (files.length > 1 ? `批量打印 (${files.length})` : '打印') }}
        </NButton>
        <NButton 
          size="small" 
          :loading="isPrinting" 
          :disabled="!isPrinting"
          @click="handleCancelPrint"
        >
          取消打印
        </NButton>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="flex-1 flex min-h-0">
      <!-- 左侧预览区域 -->
      <div class="preview-area flex-1 flex flex-col min-w-0">
        <!-- 文件列表栏 -->
        <div v-if="files.length > 0" class="file-list-bar flex-shrink-0 border-b px-3 py-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <NCheckbox 
              :checked="selectedCount === files.length && files.length > 0" 
              :indeterminate="selectedCount > 0 && selectedCount < files.length"
              @update:checked="(v: boolean) => v ? selectAll() : deselectAll()"
            >
              <span class="text-sm">全选</span>
            </NCheckbox>
            <span class="text-xs opacity-60">已选 {{ selectedCount }}/{{ files.length }}</span>
          </div>
          <div class="flex items-center gap-1">
            <NButton size="tiny" text @click="triggerFileSelect">
              <template #icon>
                <NIcon size="14"><AddOutline /></NIcon>
              </template>
              添加文件
            </NButton>
            <NButton size="tiny" text @click="clearAll">
              <template #icon>
                <NIcon size="14"><TrashOutline /></NIcon>
              </template>
              清空
            </NButton>
          </div>
        </div>

        <!-- 文件缩略图列表 -->
        <div v-if="files.length > 0" class="file-thumb-list flex-shrink-0 border-b px-2 py-2 flex gap-2 overflow-x-auto">
          <div
            v-for="fileItem in files"
            :key="fileItem.id"
            class="file-thumb flex-shrink-0 w-24 h-28 rounded border cursor-pointer flex flex-col items-center p-1.5 transition-all relative"
            :class="{ 
              'active': fileItem.id === activeFileId,
              'selected': fileItem.selected 
            }"
            @click="selectFile(fileItem.id)"
          >
            <div class="thumb-checkbox absolute top-1 left-1 z-10" @click.stop="toggleSelectFile(fileItem.id, $event)">
              <div 
                class="w-4 h-4 rounded border flex items-center justify-center text-xs"
                :class="fileItem.selected ? 'bg-primary border-primary text-white' : 'bg-transparent'"
              >
                <CheckmarkOutline v-if="fileItem.selected" />
              </div>
            </div>
            <div class="thumb-delete absolute top-1 right-1 z-10" @click.stop="removeFile(fileItem.id, $event)">
              <div class="w-4 h-4 rounded flex items-center justify-center text-xs hover:bg-red-100 hover:text-red-500 transition-colors">
                <NIcon size="12"><TrashOutline /></NIcon>
              </div>
            </div>
            <div class="thumb-icon text-2xl mb-1 mt-2">📄</div>
            <div class="thumb-name text-xs text-center truncate w-full" :title="fileItem.name">
              {{ fileItem.name }}
            </div>
            <div class="thumb-status mt-auto">
              <NTag :type="getStatusColor(fileItem.status) as any" size="tiny" round>
                {{ getStatusText(fileItem.status) }}
              </NTag>
            </div>
          </div>
        </div>

        <!-- 预览工具栏 -->
        <div v-if="activeFile" class="flex-shrink-0 px-4 py-2 flex items-center justify-between border-b">
          <div class="flex items-center gap-2">
            <NButton 
              size="small" 
              text 
              :disabled="files.findIndex(f => f.id === activeFileId) <= 0" 
              @click="activeFileId = files[files.findIndex(f => f.id === activeFileId) - 1]?.id || activeFileId"
            >
              <NIcon><ChevronBackOutline /></NIcon>
            </NButton>
            <span class="text-sm">
              第 <NInputNumber
                v-model:value="currentPage"
                size="small"
                :min="1"
                :max="totalPages"
                style="width: 60px; display: inline-block;"
              /> 页，共 {{ totalPages }} 页
            </span>
            <NButton 
              size="small" 
              text 
              :disabled="files.findIndex(f => f.id === activeFileId) >= files.length - 1" 
              @click="activeFileId = files[files.findIndex(f => f.id === activeFileId) + 1]?.id || activeFileId"
            >
              <NIcon><ChevronForwardOutline /></NIcon>
            </NButton>
          </div>
          <div class="flex items-center gap-2">
            <NButton size="small" text @click="viewMode = viewMode === 'normal' ? 'pageBreak' : 'normal'">
              <template #icon>
                <NIcon><GridOutline /></NIcon>
              </template>
              {{ viewMode === 'normal' ? '分页预览' : '普通视图' }}
            </NButton>
          </div>
        </div>

        <!-- 预览内容 -->
        <div class="flex-1 min-h-0 p-6 overflow-auto flex items-start justify-center">
          <div v-if="files.length === 0" class="h-full w-full flex items-center justify-center">
            <input
              ref="fileInputRef"
              type="file"
              multiple
              class="hidden"
              @change="handleFileInputChange"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff"
            />
            <div
              class="w-full max-w-md border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 upload-drop-area"
              :class="{ 'border-primary bg-primary/5': isDragOver }"
              @click="triggerFileSelect"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @drop="handleDrop"
            >
              <div class="py-12 text-center">
                <div class="text-5xl mb-4">🖨️</div>
                <div class="text-xl font-medium mb-2">选择文件开始打印</div>
                <div class="text-sm opacity-60 mb-4">
                  支持 PDF、Word、Excel、图片、文本 等格式<br/>
                  可选择多个文件批量打印<br/>
                  也可直接拖拽文件到此处
                </div>
                <NButton type="primary" @click.stop="triggerFileSelect">
                  <template #icon>
                    <NIcon><DocumentTextOutline /></NIcon>
                  </template>
                  选择文件
                </NButton>
              </div>
            </div>
          </div>
          <div v-else-if="activeFile" class="print-preview-wrapper shadow-xl rounded" :class="{ landscape: orientation === 'landscape' }">
            <PrintPreview ref="printPreviewRef" :file="inputFile" @selection-change="handleSelectionChange" />
          </div>
        </div>
      </div>

      <!-- 右侧设置面板 -->
      <div class="settings-panel w-[380px] flex-shrink-0 flex flex-col min-h-0 border-l">
        <div class="flex-shrink-0 px-4 py-3 border-b settings-header">
          <div class="font-medium text-lg settings-title">打印设置</div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div class="p-4 space-y-5">
            <!-- 打印机 -->
            <div class="setting-section">
              <div class="setting-label flex items-center justify-between">
                <span>打印机</span>
                <NButton text size="tiny" @click="openPrinterManager">
                  <template #icon>
                    <NIcon size="14"><SettingsOutline /></NIcon>
                  </template>
                  网络打印机
                </NButton>
              </div>
              <div class="flex items-center gap-2">
                <NSelect
                  v-model:value="printerName"
                  placeholder="选择打印机"
                  :options="printers.map(p => ({ label: p, value: p }))"
                  style="flex: 1;"
                  size="small"
                />
                <NButton text size="small" @click="loadPrinters">
                  <NIcon><RefreshOutline /></NIcon>
                </NButton>
              </div>
            </div>

            <!-- 份数 -->
            <div class="setting-section">
              <div class="setting-label">份数</div>
              <div class="flex items-center gap-2">
                <NInputNumber v-model:value="copies" :min="1" :max="999" size="small" style="width: 100px;" />
                <NRadioGroup v-model:value="printOrder" size="small">
                  <NRadioButton value="collated">逐页打印</NRadioButton>
                  <NRadioButton value="sequential">顺序</NRadioButton>
                </NRadioGroup>
              </div>
            </div>

            <NDivider class="!my-2" />

            <!-- 纸张信息 -->
            <div class="setting-section">
              <div class="setting-label">纸张信息</div>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <NSelect
                    v-model:value="paperSize"
                    :options="paperSizeOptions"
                    size="small"
                    style="flex: 1;"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <NRadioGroup v-model:value="orientation" size="small">
                    <NRadioButton value="portrait">
                      <span class="flex items-center gap-1">
                        <span>📄</span>纵向
                      </span>
                    </NRadioButton>
                    <NRadioButton value="landscape">
                      <span class="flex items-center gap-1">
                        <span>📄</span>横向
                      </span>
                    </NRadioButton>
                  </NRadioGroup>
                </div>
              </div>
            </div>

            <!-- 打印方式 -->
            <div class="setting-section">
              <div class="setting-label">打印方式</div>
              <NSelect
                v-model:value="printSides"
                :options="printSidesOptions"
                size="small"
                style="width: 100%;"
              />
            </div>

            <!-- 打印范围 -->
            <div class="setting-section">
              <div class="setting-label">打印范围</div>
              <div class="space-y-2">
                <NSelect
                  v-model:value="printRange"
                  :options="printRangeOptions"
                  size="small"
                  style="width: 100%;"
                />
                <div v-if="printRange === 'range'" class="flex items-center gap-2">
                  <NInputNumber v-model:value="pageFrom" :min="1" size="small" placeholder="起始页" style="width: 100px;" />
                  <span class="opacity-60">到</span>
                  <NInputNumber v-model:value="pageTo" :min="1" size="small" placeholder="结束页" style="width: 100px;" />
                </div>
                <div v-if="printRange === 'selection'" :class="['text-xs p-2 rounded', currentSelection ? 'text-green-500 bg-green-50' : 'opacity-70 bg-gray-100']">
                  <span v-if="currentSelection && currentSelection.type === 'excel'">
                    已选 {{ currentSelection.endRow - currentSelection.startRow + 1 }} 行 × {{ currentSelection.endCol - currentSelection.startCol + 1 }} 列
                    <span v-if="currentSelection.sheetName" class="opacity-70">({{ currentSelection.sheetName }})</span>
                  </span>
                  <span v-else-if="currentSelection && currentSelection.type === 'word'">
                    已选中 Word 文档内容
                  </span>
                  <span v-else>
                    请在预览中选择要打印的内容（Excel 拖拽选择单元格 / Word 选中文本）
                  </span>
                  <NButton v-if="currentSelection" size="tiny" text @click="printPreviewRef?.clearSelection()">清除选择</NButton>
                </div>
              </div>
            </div>

            <!-- Excel 工作表选择 -->
            <div v-if="showSheetSelector" class="setting-section">
              <div class="setting-label">选择工作表</div>
              <div class="space-y-2">
                <NCheckboxGroup v-model:value="selectedSheets" class="grid grid-cols-2 gap-2">
                  <NCheckbox
                    v-for="sheet in excelSheetNames"
                    :key="sheet"
                    :value="sheet"
                    :label="sheet"
                  />
                </NCheckboxGroup>
                <div class="flex gap-2">
                  <NButton size="tiny" text @click="selectedSheets = [...excelSheetNames]">全选</NButton>
                  <NButton size="tiny" text @click="selectedSheets = []">清空</NButton>
                </div>
              </div>
            </div>

            <!-- LibreOffice 状态提示 -->
            <div v-if="!hasLibreOffice && (activeFile && (activeFile.name.endsWith('.xlsx') || activeFile.name.endsWith('.xls') || activeFile.name.endsWith('.docx') || activeFile.name.endsWith('.doc')))" class="setting-section">
              <div class="text-xs p-2 rounded bg-yellow-50 text-yellow-700 flex items-center gap-2">
                <NIcon size="14"><WarningOutline /></NIcon>
                <span>未检测到 LibreOffice，将使用系统默认程序打印。建议安装 LibreOffice 以获得更好的打印效果。</span>
              </div>
            </div>

            <!-- 打印颜色 -->
            <div class="setting-section">
              <div class="setting-label">打印颜色</div>
              <NRadioGroup v-model:value="printColor" size="small">
                <NRadioButton value="monochrome">
                  <span class="flex items-center gap-1">
                    <span>⚫</span>黑白
                  </span>
                </NRadioButton>
                <NRadioButton value="color">
                  <span class="flex items-center gap-1">
                    <span>🎨</span>彩色
                  </span>
                </NRadioButton>
              </NRadioGroup>
            </div>

            <NDivider class="!my-2" />

            <!-- 每页版数 -->
            <div class="setting-section">
              <div class="setting-label">每页版数</div>
              <div class="flex flex-wrap gap-2">
                <NButton
                  v-for="opt in pagesPerSheetOptions"
                  :key="opt.value"
                  size="small"
                  :type="pagesPerSheet === opt.value ? 'primary' : 'default'"
                  @click="pagesPerSheet = opt.value"
                >
                  {{ opt.label }}
                </NButton>
              </div>
            </div>

            <!-- 缩放 -->
            <div class="setting-section">
              <div class="setting-label">缩放</div>
              <div class="flex items-center gap-2">
                <NSelect
                  v-model:value="scaling"
                  :options="scalingOptions"
                  size="small"
                  style="flex: 1;"
                />
                <NInputNumber
                  v-if="scaling === 'custom'"
                  v-model:value="scalePercent"
                  :min="10"
                  :max="400"
                  size="small"
                  style="width: 90px;"
                >
                  <template #suffix>%</template>
                </NInputNumber>
              </div>
            </div>

            <NDivider class="!my-2" />

            <!-- 页边距 -->
            <div class="setting-section">
              <div class="setting-label flex items-center justify-between">
                <span>页边距</span>
                <NButton text size="tiny" @click="showMarginAdjust = !showMarginAdjust">
                  调整页边距
                </NButton>
              </div>
              <div class="space-y-2">
                <NSelect
                  v-model:value="marginPreset"
                  :options="marginOptions"
                  size="small"
                  style="width: 100%;"
                />
                <div v-if="showMarginAdjust" class="grid grid-cols-2 gap-2 pt-2">
                  <div class="space-y-1">
                    <div class="text-xs opacity-60">上边距 (mm)</div>
                    <NInputNumber v-model:value="marginTop" :min="0" :max="100" size="small" style="width: 100%;" />
                  </div>
                  <div class="space-y-1">
                    <div class="text-xs opacity-60">下边距 (mm)</div>
                    <NInputNumber v-model:value="marginBottom" :min="0" :max="100" size="small" style="width: 100%;" />
                  </div>
                  <div class="space-y-1">
                    <div class="text-xs opacity-60">左边距 (mm)</div>
                    <NInputNumber v-model:value="marginLeft" :min="0" :max="100" size="small" style="width: 100%;" />
                  </div>
                  <div class="space-y-1">
                    <div class="text-xs opacity-60">右边距 (mm)</div>
                    <NInputNumber v-model:value="marginRight" :min="0" :max="100" size="small" style="width: 100%;" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 视图 -->
            <div class="setting-section">
              <div class="setting-label">视图</div>
              <div class="flex flex-wrap gap-2">
                <NButton
                  size="small"
                  :type="viewMode === 'normal' ? 'primary' : 'default'"
                  @click="viewMode = 'normal'"
                >
                  普通视图
                </NButton>
                <NButton
                  size="small"
                  :type="viewMode === 'pageBreak' ? 'primary' : 'default'"
                  @click="viewMode = 'pageBreak'"
                >
                  分页预览
                </NButton>
                <NButton
                  size="small"
                  :type="showGridlines ? 'primary' : 'default'"
                  @click="showGridlines = !showGridlines"
                >
                  网格线
                </NButton>
              </div>
            </div>

            <NDivider class="!my-2" />

            <!-- 页面 -->
            <div class="setting-section">
              <div class="setting-label">页面</div>
              <div class="flex flex-wrap gap-2">
                <NButton size="small">页面设置</NButton>
                <NButton size="small">页眉页脚</NButton>
              </div>
            </div>

            <!-- 显示 -->
            <div class="setting-section">
              <div class="setting-label">显示</div>
              <NCheckbox v-model:checked="shrinkToFit">
                适当缩小字号防止内容溢出
              </NCheckbox>
            </div>

            <!-- 排版 -->
            <div class="setting-section">
              <div class="setting-label">排版</div>
              <NCheckbox v-model:checked="autoOptimize">
                自动优化打印排版
              </NCheckbox>
            </div>

            <NDivider class="!my-2" />

            <!-- 同步设置 -->
            <div class="setting-section">
              <div class="setting-label">同步设置</div>
              <NButton size="small">应用至其他工作表</NButton>
            </div>
          </div>
        </div>

        <!-- 底部打印按钮 -->
        <div class="flex-shrink-0 p-4 border-t">
          <NButton 
            type="primary" 
            size="large" 
            block 
            :disabled="!canPrint" 
            :loading="isPrinting" 
            @click="handlePrint"
          >
            <template #icon>
              <NIcon><PrintOutline /></NIcon>
            </template>
            {{ printRange === 'selection' ? '打印选定内容' : (files.length > 1 ? `批量打印 ${files.length} 个文件` : '打印 (Enter)') }}
          </NButton>
        </div>
      </div>
    </div>
  </div>

  <!-- 网络打印机管理对话框 -->
  <NModal
    v-model:show="showPrinterManager"
    preset="card"
    title="网络打印机管理"
    :style="{ width: '600px' }"
    :mask-closable="true"
  >
    <div class="printer-manager">
      <!-- 添加打印机 -->
      <div class="mb-4 p-3 rounded-lg bg-gray-50">
        <div class="text-sm font-medium mb-2">添加网络打印机</div>
        <div class="flex items-center gap-2">
          <NInput
            v-model:value="newPrinterPath"
            placeholder="\\server\printer 或 IP 地址"
            size="small"
            style="flex: 1;"
            @keyup.enter="addNetworkPrinter"
          />
          <NButton 
            type="primary" 
            size="small" 
            :loading="isAddingPrinter"
            @click="addNetworkPrinter"
          >
            <template #icon>
              <NIcon><AddOutline /></NIcon>
            </template>
            添加
          </NButton>
        </div>
        <div class="text-xs opacity-60 mt-1.5">
          格式示例：\\计算机名\打印机名 或 \\192.168.1.100\HP_LaserJet
        </div>
      </div>

      <!-- 扫描结果 -->
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-medium">已发现的网络打印机</div>
        <NButton size="tiny" text :loading="isScanningNetwork" @click="scanNetworkPrinters">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          刷新
        </NButton>
      </div>

      <div class="printer-list h-64 overflow-y-auto border rounded border-gray-200">
        <NSpin v-if="isScanningNetwork" :show="true">
          <div class="h-full flex items-center justify-center">
            <span class="opacity-60">正在扫描网络打印机...</span>
          </div>
        </NSpin>
        <div v-else-if="networkPrinters.length === 0" class="h-full flex items-center justify-center opacity-60">
          暂未发现网络打印机
        </div>
        <NList v-else size="small">
          <NListItem v-for="printer in networkPrinters" :key="printer.id" :bordered="false">
            <NThing>
              <template #avatar>
                <div 
                  class="w-10 h-10 rounded-lg flex items-center justify-center"
                  :class="printer.online ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'"
                >
                  <NIcon size="20"><SettingsOutline /></NIcon>
                </div>
              </template>
              <template #header>
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ printer.name }}</span>
                  <NTag v-if="printer.saved" size="tiny" type="success">已保存</NTag>
                  <NTag v-if="printer.online" size="tiny" type="success">在线</NTag>
                  <NTag v-else size="tiny" type="warning">离线</NTag>
                </div>
              </template>
              <template #description>
                <div class="text-xs opacity-70">
                  {{ printer.address }}
                  <span v-if="printer.location" class="ml-2">📍 {{ printer.location }}</span>
                </div>
              </template>
              <template #action>
                <NSpace>
                  <NButton size="tiny" text @click="testPrinter(printer.name)">
                    测试
                  </NButton>
                  <NButton 
                    size="tiny" 
                    type="primary"
                    :disabled="!printer.online"
                    @click="selectPrinter(printer.name)"
                  >
                    选择
                  </NButton>
                </NSpace>
              </template>
            </NThing>
          </NListItem>
        </NList>
      </div>
    </div>
  </NModal>
</template>

<style scoped>
.print-page {
  min-height: 0;
}

/* Light theme */
.theme-light {
  background-color: #ffffff;
  border-color: #e5e7eb;
  color: #1f2937;
}

.theme-light .toolbar {
  background-color: #f9fafb;
  border-bottom-color: #e5e7eb;
}

.theme-light .preview-area {
  background-color: #f3f4f6;
}

.theme-light .settings-panel {
  background-color: #ffffff;
  border-left-color: #e5e7eb;
}

.theme-light .settings-header {
  border-bottom-color: #e5e7eb;
}

.theme-light .settings-title {
  color: #1f2937;
}

.theme-light .setting-label {
  color: #4b5563;
}

.theme-light .file-list-bar {
  background-color: #f9fafb;
  border-bottom-color: #e5e7eb;
}

.theme-light .file-thumb-list {
  background-color: #ffffff;
  border-bottom-color: #e5e7eb;
}

.theme-light .file-thumb {
  background-color: #f9fafb;
  border-color: #e5e7eb;
}

.theme-light .file-thumb:hover {
  border-color: #3b82f6;
}

.theme-light .file-thumb.active {
  background-color: #eff6ff;
  border-color: #3b82f6;
}

.theme-light .file-thumb.selected {
  box-shadow: 0 0 0 2px #3b82f6;
}

.theme-light .thumb-name {
  color: #4b5563;
}

/* Dark theme */
.theme-dark {
  background-color: #1f2937;
  border-color: #374151;
  color: #f3f4f6;
}

.theme-dark .toolbar {
  background-color: #111827;
  border-bottom-color: #374151;
}

.theme-dark .preview-area {
  background-color: #111827;
}

.theme-dark .settings-panel {
  background-color: #1f2937;
  border-left-color: #374151;
}

.theme-dark .settings-header {
  border-bottom-color: #374151;
}

.theme-dark .settings-title {
  color: #f9fafb;
}

.theme-dark .setting-label {
  color: #d1d5db;
}

.theme-dark .file-list-bar {
  background-color: #111827;
  border-bottom-color: #374151;
}

.theme-dark .file-thumb-list {
  background-color: #1f2937;
  border-bottom-color: #374151;
}

.theme-dark .file-thumb {
  background-color: #374151;
  border-color: #4b5563;
}

.theme-dark .file-thumb:hover {
  border-color: #60a5fa;
}

.theme-dark .file-thumb.active {
  background-color: #1e3a5f;
  border-color: #60a5fa;
}

.theme-dark .file-thumb.selected {
  box-shadow: 0 0 0 2px #60a5fa;
}

.theme-dark .thumb-name {
  color: #d1d5db;
}

.setting-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 2px;
}

.print-preview-wrapper {
  width: 210mm;
  max-width: 100%;
  background: var(--preview-wrapper-bg);
  min-height: 297mm;
  transition: all 0.3s ease;
  box-shadow: var(--preview-wrapper-shadow);
  color: var(--preview-wrapper-text);
}

.print-preview-wrapper.landscape {
  width: 297mm;
  min-height: 210mm;
}

.file-thumb-list::-webkit-scrollbar {
  height: 6px;
}

.file-thumb-list::-webkit-scrollbar-track {
  background: transparent;
}

.file-thumb-list::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.file-thumb {
  position: relative;
}

.thumb-checkbox {
  position: absolute;
  top: 4px;
  left: 4px;
}

@media (max-width: 1024px) {
  .print-preview-wrapper {
    width: 100%;
    min-height: auto;
    aspect-ratio: 210 / 297;
  }
  .print-preview-wrapper.landscape {
    aspect-ratio: 297 / 210;
  }
}

:deep(.n-divider) {
  margin: 4px 0 !important;
}
</style>
