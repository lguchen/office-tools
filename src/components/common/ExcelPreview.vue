<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { NIcon, NButton, NSpin, NSelect } from 'naive-ui'
import { AddOutline, RemoveOutline, GridOutline } from '@vicons/ionicons5'
import { useTheme } from '../../composables/useTheme'
import * as XLSX from 'xlsx'

interface Props {
  file?: File | null
  arrayBuffer?: ArrayBuffer | null
  data?: any[][] | null
  zoom?: number
}

const props = withDefaults(defineProps<Props>(), {
  file: null,
  arrayBuffer: null,
  data: null,
  zoom: 1
})

const emit = defineEmits<{
  (e: 'update:zoom', v: number): void
  (e: 'loaded', data: { sheetNames: string[]; sheetCount: number }): void
  (e: 'error', err: Error): void
}>()

const { isDark } = useTheme()

const containerRef = ref<HTMLDivElement | null>(null)
const isLoading = ref(false)
const localZoom = ref(props.zoom)
const sheetNames = ref<string[]>([])
const currentSheet = ref('')
let spreadsheetInstance: any = null

watch(() => props.zoom, (v) => {
  localZoom.value = v
  applyZoom()
})

watch(localZoom, (v) => {
  emit('update:zoom', v)
  applyZoom()
})

const applyZoom = () => {
  if (!containerRef.value) return
  const canvasContainer = containerRef.value.querySelector('.x-spreadsheet')
  if (canvasContainer) {
    ;(canvasContainer as HTMLElement).style.transform = `scale(${localZoom.value})`
    ;(canvasContainer as HTMLElement).style.transformOrigin = 'top left'
  }
}

const loadSpreadsheet = async () => {
  let workbook: XLSX.WorkBook | null = null

  if (props.data) {
    const ws = XLSX.utils.aoa_to_sheet(props.data)
    workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, ws, 'Sheet1')
  } else if (props.arrayBuffer) {
    workbook = XLSX.read(props.arrayBuffer, { type: 'array' })
  } else if (props.file) {
    const buffer = await props.file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array' })
  }

  if (!workbook) return

  isLoading.value = true

  try {
    sheetNames.value = workbook.SheetNames
    currentSheet.value = sheetNames.value[0] || ''

    emit('loaded', { sheetNames: sheetNames.value, sheetCount: sheetNames.value.length })

    await nextTick()
    renderSheet(workbook, currentSheet.value)
  } catch (e) {
    console.error('Failed to load Excel:', e)
    emit('error', e as Error)
  } finally {
    isLoading.value = false
  }
}

const renderSheet = async (workbook: XLSX.WorkBook, sheetName: string) => {
  if (!containerRef.value) return

  // 设置 5 秒超时，超时后降级为 HTML 表格
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Spreadsheet load timeout')), 5000)
  })

  try {
    const Spreadsheet = (await Promise.race([
      import('x-data-spreadsheet'),
      timeoutPromise
    ])).default
    await import('x-data-spreadsheet/dist/locale/zh-cn')

    if (spreadsheetInstance) {
      spreadsheetInstance = null
    }

    containerRef.value.innerHTML = '<div id="xs-container" style="width:100%;height:100%;"></div>'
    const el = containerRef.value.querySelector('#xs-container') as HTMLElement

    const ws = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]

    const maxRows = Math.max(data.length, 20)
    const maxCols = Math.max(...data.map(r => r.length), 10)

    const rows: any = {}
    for (let i = 0; i < maxRows; i++) {
      rows[i] = {
        cells: {} as any
      }
      for (let j = 0; j < maxCols; j++) {
        const val = data[i]?.[j]
        if (val !== undefined && val !== '') {
          rows[i].cells[j] = { text: String(val) }
        }
      }
    }

    spreadsheetInstance = new Spreadsheet(el, {
      view: {
        height: () => el.clientHeight,
        width: () => el.clientWidth
      },
      row: {
        len: maxRows,
        height: 25
      },
      col: {
        len: maxCols,
        width: 100
      },
      data: [{
        name: sheetName,
        rows
      }],
      bottom: false,
      showToolbar: false,
      showGrid: true,
      showContextmenu: false,
      mode: 'read'
    })

    applyZoom()
  } catch (e) {
    console.error('Failed to render spreadsheet, using fallback:', e)
    if (containerRef.value) {
      containerRef.value.innerHTML = renderTableFallback(workbook, sheetName)
    }
  }
}

const renderTableFallback = (workbook: XLSX.WorkBook, sheetName: string) => {
  const ws = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]

  const borderColor = isDark.value ? '#374151' : '#e5e7eb'
  const headerBg = isDark.value ? '#1f2937' : '#f3f4f6'
  const textColor = isDark.value ? '#d1d5db' : '#374151'
  const rowBg = isDark.value ? '#111827' : '#ffffff'
  const maxRows = Math.min(data.length, 200)
  const maxCols = Math.min(Math.max(...data.map(r => r.length), 0), 50)

  let html = `<div style="overflow:auto;max-height:100%;width:100%;">`
  html += `<table style="border-collapse:collapse;width:100%;font-size:12px;">`

  // 表头
  if (maxRows > 0) {
    html += `<thead style="position:sticky;top:0;z-index:1;">`
    html += `<tr style="background:${headerBg};">`
    for (let j = 0; j < maxCols; j++) {
      html += `<th style="border:1px solid ${borderColor};padding:6px 10px;text-align:left;color:${textColor};white-space:nowrap;font-weight:600;">${data[0]?.[j] ?? ''}</th>`
    }
    html += '</tr></thead>'
  }

  // 数据行
  html += `<tbody>`
  for (let i = 1; i < maxRows; i++) {
    html += `<tr style="background:${rowBg};">`
    for (let j = 0; j < maxCols; j++) {
      html += `<td style="border:1px solid ${borderColor};padding:4px 10px;color:${textColor};white-space:nowrap;">${data[i]?.[j] ?? ''}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table>'

  if (data.length > 200) {
    html += `<div style="padding:8px;color:${isDark.value ? '#9ca3af' : '#6b7280'};font-size:12px;">仅显示前200行，共${data.length}行</div>`
  }
  html += '</div>'
  return html
}

watch(currentSheet, async (sheetName) => {
  if (!sheetName) return

  let workbook: XLSX.WorkBook | null = null
  if (props.file) {
    const buffer = await props.file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array' })
  } else if (props.arrayBuffer) {
    workbook = XLSX.read(props.arrayBuffer, { type: 'array' })
  } else if (props.data) {
    const ws = XLSX.utils.aoa_to_sheet(props.data)
    workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, ws, 'Sheet1')
  }

  if (workbook) {
    renderSheet(workbook, sheetName)
  }
})

watch([() => props.file, () => props.arrayBuffer, () => props.data], () => {
  loadSpreadsheet()
}, { immediate: false })

onMounted(() => {
  if (props.file || props.arrayBuffer || props.data) {
    loadSpreadsheet()
  }
})

onUnmounted(() => {
  if (spreadsheetInstance) {
    spreadsheetInstance = null
  }
})

const zoomIn = () => {
  localZoom.value = Math.min(localZoom.value + 0.1, 2)
}

const zoomOut = () => {
  localZoom.value = Math.max(localZoom.value - 0.1, 0.5)
}

defineExpose({
  reload: loadSpreadsheet,
  getElement: () => containerRef.value
})
</script>

<template>
  <div class="excel-preview h-full flex flex-col" :class="isDark ? 'bg-gray-900' : 'bg-gray-100'">
    <div class="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
         :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'">
      <div class="flex items-center gap-2">
        <NIcon size="16" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
          <GridOutline />
        </NIcon>
        <span class="text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
          {{ currentSheet || '未加载' }}
        </span>
        <div v-if="sheetNames.length > 1" class="w-28 ml-2">
          <NSelect v-model:value="currentSheet" :options="sheetNames.map(n => ({ label: n, value: n }))" size="small" />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <NButton size="small" text @click="zoomOut" :disabled="localZoom <= 0.5">
          <template #icon><NIcon><RemoveOutline /></NIcon></template>
        </NButton>
        <span class="text-xs w-12 text-center" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
          {{ Math.round(localZoom * 100) }}%
        </span>
        <NButton size="small" text @click="zoomIn" :disabled="localZoom >= 2">
          <template #icon><NIcon><AddOutline /></NIcon></template>
        </NButton>
      </div>
    </div>

    <div class="flex-1 min-h-0 overflow-auto relative">
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center z-10"
           :class="isDark ? 'bg-gray-900/80' : 'bg-white/80'">
        <NSpin size="large" />
      </div>
      <div ref="containerRef" class="excel-container w-full h-full overflow-auto">
        <div v-if="!file && !arrayBuffer && !data" class="h-full flex items-center justify-center"
             :class="isDark ? 'text-gray-500' : 'text-gray-400'">
          <div class="text-center text-sm">暂无数据，请上传Excel文件</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.excel-preview {
  min-height: 0;
}
.excel-container :deep(.x-spreadsheet) {
  transition: transform 0.2s ease;
}
</style>
