<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useTheme } from '../../composables/useTheme'
import { NButton, NIcon, NCheckbox, NCheckboxGroup, NTag } from 'naive-ui'
import { TrashOutline, DownloadOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import ExcelPreview from '../../components/common/ExcelPreview.vue'
import DetachablePreview from '../../components/common/DetachablePreview.vue'
import { useNotification } from 'naive-ui'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import * as XLSX from 'xlsx'

const notification = useNotification()
const { isDark } = useTheme()

const fileName = ref('')
const fileData = ref<any[][]>([])
const headers = ref<string[]>([])
const processedData = ref<any[][]>([])
const isProcessing = ref(false)
const realtimePreview = ref(true)
const isDetached = ref(false)
const previewMode = ref<'original' | 'processed'>('processed')
const detachableRef = ref<InstanceType<typeof DetachablePreview> | null>(null)

const processOptions = ref<string[]>([])
const availableOptions = [
  { label: '删除重复行', value: 'removeDuplicates' },
  { label: '删除空行', value: 'removeEmptyRows' },
  { label: '删除空列', value: 'removeEmptyCols' },
  { label: '去除首尾空格', value: 'trimSpaces' },
  { label: '转大写', value: 'toUpperCase' },
  { label: '转小写', value: 'toLowerCase' },
  { label: '按第一列升序排序', value: 'sortAsc' },
  { label: '按第一列降序排序', value: 'sortDesc' }
]

let debounceTimer: number | null = null

const debounceProcess = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    if (realtimePreview.value && fileData.value.length > 0 && processOptions.value.length > 0) {
      doProcess(false)
    }
  }, 300)
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

watch([processOptions, fileData], () => {
  if (realtimePreview.value) {
    debounceProcess()
  }
}, { deep: true })

const handleFilesSelected = async (files: { name: string; path: string; size?: number; file?: File }[]) => {
  if (files.length === 0 || !files[0].file) return

  const file = files[0].file
  const validExtensions = ['.xlsx', '.xls', '.csv']
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

  if (!validExtensions.includes(fileExt)) {
    notification.error({ title: '文件格式错误', content: '请上传 .xlsx, .xls 或 .csv 文件' })
    return
  }

  fileName.value = file.name

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length === 0) {
      notification.error({ title: '文件为空', content: '文件中没有数据' })
      return
    }

    headers.value = (jsonData[0] as string[]).map((h, idx) => h?.toString() || `列${idx + 1}`)
    fileData.value = jsonData.slice(1)
    processedData.value = [...fileData.value.map(row => [...row])]

    notification.success({ title: '导入成功', content: `已导入 ${fileData.value.length} 行数据` })
  } catch (e) {
    notification.error({ title: '导入失败', content: (e as Error).message })
  }
}

const doProcess = (showNotification: boolean) => {
  if (fileData.value.length === 0) {
    if (showNotification) notification.warning({ title: '无数据', content: '请先导入Excel文件' })
    return
  }

  if (processOptions.value.length === 0) {
    if (showNotification) notification.warning({ title: '未选择处理项', content: '请至少选择一项处理选项' })
    return
  }

  isProcessing.value = true

  try {
    let data = [...fileData.value.map(row => [...row])]
    let dataHeaders = [...headers.value]

    if (processOptions.value.includes('removeDuplicates')) {
      const seen = new Set<string>()
      data = data.filter(row => {
        const key = JSON.stringify(row)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    if (processOptions.value.includes('removeEmptyRows')) {
      data = data.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
    }

    if (processOptions.value.includes('removeEmptyCols')) {
      const colCount = data[0]?.length || 0
      const emptyCols: number[] = []
      for (let col = 0; col < colCount; col++) {
        const isEmpty = data.every(row => row[col] === null || row[col] === undefined || row[col] === '')
        if (isEmpty) emptyCols.push(col)
      }
      for (let i = emptyCols.length - 1; i >= 0; i--) {
        const colIndex = emptyCols[i]
        dataHeaders.splice(colIndex, 1)
        data = data.map(row => {
          row.splice(colIndex, 1)
          return row
        })
      }
    }

    if (processOptions.value.includes('trimSpaces')) {
      data = data.map(row =>
        row.map(cell => typeof cell === 'string' ? cell.trim() : cell)
      )
    }

    if (processOptions.value.includes('toUpperCase')) {
      data = data.map(row =>
        row.map(cell => typeof cell === 'string' ? cell.toUpperCase() : cell)
      )
    }

    if (processOptions.value.includes('toLowerCase')) {
      data = data.map(row =>
        row.map(cell => typeof cell === 'string' ? cell.toLowerCase() : cell)
      )
    }

    if (processOptions.value.includes('sortAsc')) {
      data.sort((a, b) => {
        const aVal = a[0] ?? ''
        const bVal = b[0] ?? ''
        return String(aVal).localeCompare(String(bVal), 'zh-CN')
      })
    } else if (processOptions.value.includes('sortDesc')) {
      data.sort((a, b) => {
        const aVal = a[0] ?? ''
        const bVal = b[0] ?? ''
        return String(bVal).localeCompare(String(aVal), 'zh-CN')
      })
    }

    processedData.value = data

    if (showNotification) {
      const stats = []
      if (processOptions.value.includes('removeDuplicates')) {
        const removed = fileData.value.length - data.length
        if (removed > 0) stats.push(`删除 ${removed} 行重复数据`)
      }
      if (processOptions.value.includes('removeEmptyRows')) {
        stats.push('已删除空行')
      }
      notification.success({
        title: '处理完成',
        content: stats.length > 0 ? stats.join('，') : `处理完成，共 ${data.length} 行数据`
      })
    }
  } catch (e) {
    if (showNotification) {
      notification.error({ title: '处理失败', content: (e as Error).message })
    }
  } finally {
    isProcessing.value = false
  }
}

const handleProcess = () => {
  doProcess(true)
}

const handleDownload = async () => {
  if (previewMode.value === 'processed' ? processedData.value.length === 0 : fileData.value.length === 0) {
    notification.warning({ title: '无数据', content: '没有可导出的数据' })
    return
  }

  const data = previewMode.value === 'processed' ? processedData.value : fileData.value

  try {
    const defaultName = fileName.value.replace(/\.[^.]+$/, '') + '_processed.xlsx'
    const savePath = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })

    if (savePath) {
      const wb = XLSX.utils.book_new()
      const wsData = [headers.value, ...data]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      await writeFile(savePath, new Uint8Array(wbout))

      notification.success({ title: '导出成功', content: `文件已保存至: ${savePath}` })
    }
  } catch (e) {
    notification.error({ title: '导出失败', content: (e as Error).message })
  }
}

const handleClear = () => {
  fileName.value = ''
  fileData.value = []
  headers.value = []
  processedData.value = []
  processOptions.value = []
}

const previewData = computed(() => {
  const data = previewMode.value === 'processed' && processedData.value.length > 0
    ? processedData.value
    : fileData.value
  if (data.length === 0) return null
  return [headers.value, ...data]
})
</script>

<template>
  <ToolLayout title="Excel批量数据处理" description="导入Excel文件，批量处理数据并导出">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <div class="flex-shrink-0">
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            上传Excel文件
          </div>
          <FileDropZone
            accept=".xlsx,.xls,.csv"
            :multiple="false"
            tips="选择文件或拖拽上传"
            @files-selected="handleFilesSelected"
          />
        </div>

        <div class="flex-shrink-0">
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">处理选项</div>
            <div class="flex items-center gap-2">
              <span class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">实时预览</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="realtimePreview" class="sr-only peer" />
                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </div>
          <NCheckboxGroup v-model:value="processOptions" class="grid grid-cols-2 gap-2">
            <NCheckbox
              v-for="opt in availableOptions"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </NCheckboxGroup>
        </div>

        <div class="flex gap-2 flex-shrink-0">
          <NButton
            type="primary"
            :disabled="fileData.length === 0 || processOptions.length === 0"
            :loading="isProcessing"
            @click="handleProcess"
          >
            <template #icon>
              <NIcon><TrashOutline /></NIcon>
            </template>
            执行处理
          </NButton>
          <NButton @click="handleClear" :disabled="fileData.length === 0">
            清空
          </NButton>
        </div>

        <div v-if="fileName" class="flex items-center gap-2 flex-shrink-0">
          <NTag size="small" type="info">{{ fileName }}</NTag>
          <span class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">共 {{ fileData.length }} 行</span>
        </div>
      </div>
    </template>

    <template #output>
      <DetachablePreview
        ref="detachableRef"
        v-model:detached="isDetached"
        title="Excel数据预览"
        class="h-full"
      >
        <div class="h-full flex flex-col">
          <div class="flex items-center gap-2 px-3 py-1.5 border-b flex-shrink-0"
               :class="isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'">
            <NButton
              size="small"
              :type="previewMode === 'original' ? 'primary' : 'default'"
              @click="previewMode = 'original'"
            >
              原始数据
            </NButton>
            <NButton
              size="small"
              :type="previewMode === 'processed' ? 'primary' : 'default'"
              @click="previewMode = 'processed'"
              :disabled="processedData.length === 0"
            >
              处理结果
            </NButton>
            <div class="flex-1"></div>
            <NTag v-if="fileData.length > 0" size="small" type="info">
              {{ (previewMode === 'processed' ? processedData.length : fileData.length) || 0 }} 行
            </NTag>
            <NButton
              v-if="fileData.length > 0"
              size="small"
              @click="handleDownload"
            >
              <template #icon>
                <NIcon><DownloadOutline /></NIcon>
              </template>
              导出
            </NButton>
          </div>

          <div class="flex-1 min-h-0">
            <ExcelPreview
              v-if="previewData"
              :data="previewData"
              class="h-full"
            />
            <div v-else class="h-full flex items-center justify-center"
                 :class="isDark ? 'text-gray-500' : 'text-gray-400'">
              <div class="text-center text-sm">上传Excel文件后可在此预览</div>
            </div>
          </div>
        </div>
      </DetachablePreview>
    </template>
  </ToolLayout>
</template>

<style scoped>
</style>
