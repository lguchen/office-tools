<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount, nextTick } from 'vue'
import { NSpin, NIcon, NEmpty, NTabs, NTabPane, NTag, NButton } from 'naive-ui'
import { DocumentTextOutline, ImageOutline, DocumentOutline, GridOutline, Document, CloseOutline } from '@vicons/ionicons5'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import { useTheme } from '../../composables/useTheme'

interface Props {
  file?: File | null
  printMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  file: null,
  printMode: false
})

const emit = defineEmits<{
  (e: 'selection-change', data: SelectionData | null): void
}>()

const { isDark } = useTheme()

interface SelectionData {
  type: 'excel' | 'word' | 'text' | 'image'
  sheetIndex?: number
  sheetName?: string
  startRow?: number
  endRow?: number
  startCol?: number
  endCol?: number
  htmlContent?: string
  textContent?: string
}

const loading = ref(false)
const previewType = ref<'image' | 'text' | 'pdf' | 'excel' | 'word' | 'unsupported' | 'none'>('none')
const imageUrl = ref('')
const textContent = ref('')
const pdfUrl = ref('')
const excelSheets = ref<{ name: string; html: string; data: any[][] }[]>([])
const wordHtml = ref('')
const errorMsg = ref('')
const activeSheet = ref(0)

const excelSelectStart = ref<{ row: number; col: number } | null>(null)
const excelSelectEnd = ref<{ row: number; col: number } | null>(null)
const isExcelSelecting = ref(false)
const excelContainerRef = ref<HTMLElement | null>(null)

const wordSelectionHtml = ref('')
const hasWordSelection = ref(false)

const hasSelection = computed(() => {
  if (previewType.value === 'excel') {
    return excelSelectStart.value !== null && excelSelectEnd.value !== null
  }
  if (previewType.value === 'word') {
    return hasWordSelection.value
  }
  return false
})

const selectionInfo = computed(() => {
  if (previewType.value === 'excel' && excelSelectStart.value && excelSelectEnd.value) {
    const startRow = Math.min(excelSelectStart.value.row, excelSelectEnd.value.row)
    const endRow = Math.max(excelSelectStart.value.row, excelSelectEnd.value.row)
    const startCol = Math.min(excelSelectStart.value.col, excelSelectEnd.value.col)
    const endCol = Math.max(excelSelectStart.value.col, excelSelectEnd.value.col)
    const colCount = endCol - startCol + 1
    const rowCount = endRow - startRow + 1
    return `${rowCount} 行 × ${colCount} 列`
  }
  if (previewType.value === 'word' && hasWordSelection.value) {
    return '已选内容'
  }
  return ''
})

const getSelectionData = (): SelectionData | null => {
  if (previewType.value === 'excel' && excelSelectStart.value && excelSelectEnd.value) {
    const startRow = Math.min(excelSelectStart.value.row, excelSelectEnd.value.row)
    const endRow = Math.max(excelSelectStart.value.row, excelSelectEnd.value.row)
    const startCol = Math.min(excelSelectStart.value.col, excelSelectEnd.value.col)
    const endCol = Math.max(excelSelectStart.value.col, excelSelectEnd.value.col)
    
    const sheet = excelSheets.value[activeSheet.value]
    if (sheet) {
      const selectedData = sheet.data.slice(startRow - 1, endRow).map(row => row.slice(startCol - 1, endCol))
      const ws = XLSX.utils.aoa_to_sheet(selectedData)
      const html = XLSX.utils.sheet_to_html(ws, {
        id: 'excel-selected',
        header: `<style>${getExcelHeaderStyle()}</style>`
      })
      
      return {
        type: 'excel',
        sheetIndex: activeSheet.value,
        sheetName: sheet.name,
        startRow,
        endRow,
        startCol,
        endCol,
        htmlContent: html
      }
    }
  }
  if (previewType.value === 'word' && hasWordSelection.value && wordSelectionHtml.value) {
    return {
      type: 'word',
      htmlContent: wordSelectionHtml.value
    }
  }
  return null
}

const getExcelHeaderStyle = (): string => {
  const base = 'table{border-collapse:collapse;width:100%;font-size:12px;}th,td{border:1px solid #d0d7de;padding:6px 10px;text-align:left;white-space:nowrap;}'
  if (isDark.value) {
    return base + 'th{background-color:#1f2937;color:#e5e7eb;font-weight:600;}td{color:#d1d5db;}tr:nth-child(even){background-color:#111827;}'
  }
  return base + 'th{background-color:#f6f8fa;font-weight:600;}tr:nth-child(even){background-color:#fafbfc;}'
}

const injectWordColors = () => {
  const root = document.documentElement
  if (isDark.value) {
    root.style.setProperty('--word-text-color', '#e5e7eb')
    root.style.setProperty('--word-border-color', '#4b5563')
    root.style.setProperty('--word-header-bg', '#1f2937')
    root.style.setProperty('--word-row-bg', '#111827')
    root.style.setProperty('--word-muted-text', '#9ca3af')
    root.style.setProperty('--word-code-bg', '#1f2937')
    root.style.setProperty('--word-link-color', '#60a5fa')
  } else {
    root.style.setProperty('--word-text-color', '#1f2328')
    root.style.setProperty('--word-border-color', '#d0d7de')
    root.style.setProperty('--word-header-bg', '#f6f8fa')
    root.style.setProperty('--word-row-bg', '#f6f8fa')
    root.style.setProperty('--word-muted-text', '#57606a')
    root.style.setProperty('--word-code-bg', '#f6f8fa')
    root.style.setProperty('--word-link-color', '#0969da')
  }
}

const injectExcelColors = () => {
  const root = document.documentElement
  if (isDark.value) {
    root.style.setProperty('--excel-highlight-bg', '#1e3a5f')
    root.style.setProperty('--excel-highlight-border', '#60a5fa')
  } else {
    root.style.setProperty('--excel-highlight-bg', '#e6f4ff')
    root.style.setProperty('--excel-highlight-border', '#1677ff')
  }
}

defineExpose({
  hasSelection,
  selectionInfo,
  getSelectionData,
  clearSelection
})

function clearSelection() {
  excelSelectStart.value = null
  excelSelectEnd.value = null
  wordSelectionHtml.value = ''
  hasWordSelection.value = false
  emit('selection-change', null)
  updateExcelCellHighlight()
}

function getCellPosition(cell: HTMLTableCellElement): { row: number; col: number } | null {
  const row = cell.parentElement
  if (!row) return null
  const table = row.parentElement?.parentElement
  if (!table) return null
  const rows = Array.from(table.querySelectorAll('tr'))
  const rowIndex = rows.indexOf(row as HTMLTableRowElement)
  const cells = Array.from(row.querySelectorAll('th, td'))
  const colIndex = cells.indexOf(cell)
  if (rowIndex < 0 || colIndex < 0) return null
  return { row: rowIndex + 1, col: colIndex + 1 }
}

function handleExcelMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement
  const cell = target.closest('th, td') as HTMLTableCellElement | null
  if (!cell) return
  const pos = getCellPosition(cell)
  if (!pos) return
  isExcelSelecting.value = true
  excelSelectStart.value = pos
  excelSelectEnd.value = pos
  updateExcelCellHighlight()
}

function handleExcelMouseMove(e: MouseEvent) {
  if (!isExcelSelecting.value) return
  const target = e.target as HTMLElement
  const cell = target.closest('th, td') as HTMLTableCellElement | null
  if (!cell) return
  const pos = getCellPosition(cell)
  if (!pos) return
  excelSelectEnd.value = pos
  updateExcelCellHighlight()
}

function handleExcelMouseUp() {
  if (!isExcelSelecting.value) return
  isExcelSelecting.value = false
  if (excelSelectStart.value && excelSelectEnd.value) {
    emit('selection-change', getSelectionData())
  }
}

function updateExcelCellHighlight() {
  const container = document.querySelector('.excel-container') as HTMLElement | null
  if (!container) return
  const table = container.querySelector('#excel-table') as HTMLTableElement | null
  if (!table) return
  const cells = table.querySelectorAll('th, td')
  cells.forEach(cell => {
    cell.classList.remove('excel-selected-cell')
  })
  if (!excelSelectStart.value || !excelSelectEnd.value) return
  const startRow = Math.min(excelSelectStart.value.row, excelSelectEnd.value.row)
  const endRow = Math.max(excelSelectStart.value.row, excelSelectEnd.value.row)
  const startCol = Math.min(excelSelectStart.value.col, excelSelectEnd.value.col)
  const endCol = Math.max(excelSelectStart.value.col, excelSelectEnd.value.col)
  const rows = table.querySelectorAll('tr')
  for (let i = startRow - 1; i <= endRow - 1; i++) {
    const row = rows[i]
    if (!row) continue
    const cells = row.querySelectorAll('th, td')
    for (let j = startCol - 1; j <= endCol - 1; j++) {
      const cell = cells[j]
      if (cell) {
        cell.classList.add('excel-selected-cell')
      }
    }
  }
}

function setupExcelSelection() {
  const container = document.querySelector('.excel-container') as HTMLElement | null
  if (!container) return
  container.addEventListener('mousedown', handleExcelMouseDown)
  container.addEventListener('mousemove', handleExcelMouseMove)
  document.addEventListener('mouseup', handleExcelMouseUp)
}

function cleanupExcelSelection() {
  const container = document.querySelector('.excel-container') as HTMLElement | null
  if (container) {
    container.removeEventListener('mousedown', handleExcelMouseDown)
    container.removeEventListener('mousemove', handleExcelMouseMove)
  }
  document.removeEventListener('mouseup', handleExcelMouseUp)
}

function handleWordSelection() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    wordSelectionHtml.value = ''
    hasWordSelection.value = false
    emit('selection-change', null)
    return
  }
  const range = selection.getRangeAt(0)
  const wordContainer = document.querySelector('.word-container') as HTMLElement | null
  if (!wordContainer || !wordContainer.contains(range.commonAncestorContainer)) {
    return
  }
  const selectedHtml = Array.from(range.cloneContents().childNodes)
    .map(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return (node as HTMLElement).outerHTML
      }
      return node.textContent || ''
    })
    .join('')
  if (selectedHtml.trim() === '' && selection.toString().trim() === '') {
    wordSelectionHtml.value = ''
    hasWordSelection.value = false
    emit('selection-change', null)
    return
  }
  wordSelectionHtml.value = selectedHtml || selection.toString()
  hasWordSelection.value = true
  emit('selection-change', getSelectionData())
}

function setupWordSelection() {
  document.addEventListener('selectionchange', handleWordSelection)
}

function cleanupWordSelection() {
  document.removeEventListener('selectionchange', handleWordSelection)
}

const fileName = computed(() => props.file?.name || '')
const fileSize = computed(() => {
  if (!props.file) return ''
  const bytes = props.file.size
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
})

const getFileExt = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return ext
}

const isImage = (ext: string): boolean => {
  return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'].includes(ext)
}

const isText = (ext: string): boolean => {
  return [
    'txt', 'md', 'markdown', 'json', 'csv', 'xml', 'html', 'htm', 'css', 'js', 'ts',
    'py', 'java', 'c', 'cpp', 'h', 'log', 'yml', 'yaml', 'ini', 'conf', 'sh', 'bat',
    'sql', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'dart', 'vue', 'jsx', 'tsx'
  ].includes(ext)
}

const isPdf = (ext: string): boolean => {
  return ext === 'pdf'
}

const isExcel = (ext: string): boolean => {
  return ['xlsx', 'xls', 'csv', 'ods', 'xlsb', 'xlsm', 'xltx', 'xltm', 'xlt'].includes(ext)
}

const isWord = (ext: string): boolean => {
  return ['docx', 'docm', 'dotx', 'dotm'].includes(ext)
}

const loadExcel = async (file: File) => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheets: { name: string; html: string; data: any[][] }[] = []

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const html = XLSX.utils.sheet_to_html(worksheet, {
      id: 'excel-table',
      editable: false,
      header: `<style>${getExcelHeaderStyle()}</style>`
    })
    const data = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' })
    sheets.push({ name: sheetName, html, data })
  }

  return sheets
}

const loadWord = async (file: File) => {
  const buffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
  return result.value
}

const loadPreview = async () => {
  if (!props.file) {
    previewType.value = 'none'
    imageUrl.value = ''
    textContent.value = ''
    pdfUrl.value = ''
    excelSheets.value = []
    wordHtml.value = ''
    errorMsg.value = ''
    return
  }

  loading.value = true
  errorMsg.value = ''
  activeSheet.value = 0
  clearSelection()
  const ext = getFileExt(props.file.name)

  try {
    if (isImage(ext)) {
      previewType.value = 'image'
      imageUrl.value = URL.createObjectURL(props.file)
    } else if (isText(ext)) {
      previewType.value = 'text'
      textContent.value = await props.file.text()
    } else if (isPdf(ext)) {
      previewType.value = 'pdf'
      pdfUrl.value = URL.createObjectURL(props.file)
    } else if (isExcel(ext)) {
      previewType.value = 'excel'
      excelSheets.value = await loadExcel(props.file)
      await nextTick()
      setupExcelSelection()
    } else if (isWord(ext)) {
      previewType.value = 'word'
      wordHtml.value = await loadWord(props.file)
      await nextTick()
      setupWordSelection()
    } else {
      previewType.value = 'unsupported'
      errorMsg.value = '此文件格式暂不支持预览'
    }
  } catch (e) {
    previewType.value = 'unsupported'
    errorMsg.value = '预览加载失败: ' + (e as Error).message
  } finally {
    loading.value = false
  }
}

watch(() => props.file, () => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
  loadPreview()
}, { immediate: true })

watch(activeSheet, async () => {
  if (previewType.value === 'excel') {
    clearSelection()
    await nextTick()
    setupExcelSelection()
  }
})

watch(isDark, () => {
  injectWordColors()
  injectExcelColors()
  if (previewType.value === 'excel') {
    loadExcel(props.file!)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
  cleanupExcelSelection()
  cleanupWordSelection()
})
</script>

<template>
  <div class="print-preview h-full flex flex-col">
    <div v-if="file" class="flex-shrink-0 mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2 min-w-0">
        <NIcon size="18" class="text-blue-400 flex-shrink-0">
          <DocumentTextOutline />
        </NIcon>
        <span class="font-medium truncate">{{ fileName }}</span>
        <span class="opacity-60 text-sm flex-shrink-0">{{ fileSize }}</span>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <NTag v-if="hasSelection" size="small" type="info" class="flex items-center gap-1">
          已选 {{ selectionInfo }}
          <NButton text size="tiny" @click="clearSelection" class="ml-1 h-auto p-0 min-h-0">
            <NIcon size="14">
              <CloseOutline />
            </NIcon>
          </NButton>
        </NTag>
      </div>
    </div>

    <div class="flex-1 min-h-0 border rounded-lg overflow-hidden"
         :class="isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'">
      <NSpin v-if="loading" class="h-full flex items-center justify-center">
        <div class="opacity-60">加载预览中...</div>
      </NSpin>

      <div v-else-if="previewType === 'none'" class="h-full flex items-center justify-center">
        <NEmpty description="选择文件后预览">
          <template #icon>
            <NIcon size="48" class="opacity-30">
              <DocumentOutline />
            </NIcon>
          </template>
        </NEmpty>
      </div>

      <div v-else-if="previewType === 'image'" class="h-full flex items-center justify-center p-4 overflow-auto">
        <img :src="imageUrl" :alt="fileName" class="max-w-full max-h-full object-contain" />
      </div>

      <div v-else-if="previewType === 'text'" class="h-full overflow-auto">
        <pre class="p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed m-0">{{ textContent }}</pre>
      </div>

      <div v-else-if="previewType === 'pdf'" class="h-full">
        <iframe :src="pdfUrl" class="w-full h-full border-0" title="PDF Preview" />
      </div>

      <div v-else-if="previewType === 'excel'" class="h-full flex flex-col">
        <NTabs v-model:value="activeSheet" type="line" size="small" class="flex-shrink-0 px-3 border-b">
          <NTabPane
            v-for="(sheet, index) in excelSheets"
            :key="sheet.name"
            :name="index"
            :tab="sheet.name"
          />
        </NTabs>
        <div class="flex-1 overflow-auto excel-container" v-html="excelSheets[activeSheet]?.html"></div>
      </div>

      <div v-else-if="previewType === 'word'" class="h-full overflow-auto">
        <div class="word-container p-6 max-w-4xl mx-auto"
             :class="isDark ? 'text-gray-200' : 'text-gray-800'"
             v-html="wordHtml"></div>
      </div>

      <div v-else-if="previewType === 'unsupported'" class="h-full flex items-center justify-center">
        <NEmpty :description="errorMsg || '不支持预览'" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-preview {
  min-height: 0;
}

:deep(.word-container) {
  color: var(--word-text-color);
  line-height: 1.6;
  user-select: text;
}

:deep(.word-container h1) {
  font-size: 2em;
  font-weight: 700;
  margin: 0.67em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--word-border-color);
}

:deep(.word-container h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0.83em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--word-border-color);
}

:deep(.word-container h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 1em 0;
}

:deep(.word-container h4) {
  font-size: 1em;
  font-weight: 600;
  margin: 1.33em 0;
}

:deep(.word-container p) {
  margin: 1em 0;
}

:deep(.word-container ul),
:deep(.word-container ol) {
  padding-left: 2em;
  margin: 1em 0;
}

:deep(.word-container li) {
  margin: 0.25em 0;
}

:deep(.word-container table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

:deep(.word-container th),
:deep(.word-container td) {
  border: 1px solid var(--word-border-color);
  padding: 6px 13px;
}

:deep(.word-container th) {
  background-color: var(--word-header-bg);
  font-weight: 600;
}

:deep(.word-container tr:nth-child(2n)) {
  background-color: var(--word-row-bg);
}

:deep(.word-container blockquote) {
  padding: 0 1em;
  color: var(--word-muted-text);
  border-left: 0.25em solid var(--word-border-color);
  margin: 1em 0;
}

:deep(.word-container code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: var(--word-code-bg);
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

:deep(.word-container pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: var(--word-code-bg);
  border-radius: 6px;
  margin: 1em 0;
}

:deep(.word-container pre code) {
  padding: 0;
  background: transparent;
  border-radius: 0;
}

:deep(.word-container img) {
  max-width: 100%;
  height: auto;
}

:deep(.word-container a) {
  color: var(--word-link-color);
  text-decoration: none;
}

:deep(.word-container a:hover) {
  text-decoration: underline;
}

:deep(.word-container hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: var(--word-border-color);
  border: 0;
}

:deep(.excel-container) {
  padding: 0;
  user-select: none;
}

:deep(.excel-container #excel-table) {
  width: 100%;
  margin: 0;
}

:deep(.excel-container #excel-table th),
:deep(.excel-container #excel-table td) {
  cursor: cell;
}

:deep(.excel-container .excel-selected-cell) {
  background-color: var(--excel-highlight-bg) !important;
  outline: 1px solid var(--excel-highlight-border);
  outline-offset: -1px;
}
</style>
