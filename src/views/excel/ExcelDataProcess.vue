<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NIcon, NUpload, NCheckbox, NCheckboxGroup, NTag, NDataTable, NScrollbar } from 'naive-ui'
import { TrashOutline, DownloadOutline, CloudUploadOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import * as XLSX from 'xlsx'
import { useSettingsStore } from '../../stores/settings'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

// 文件数据
const fileName = ref('')
const fileData = ref<any[][]>([])
const headers = ref<string[]>([])
const processedData = ref<any[][]>([])
const isProcessing = ref(false)

// 处理选项
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

// 表格列定义
const tableColumns = computed(() => {
  if (headers.value.length === 0) return []
  return headers.value.map((header, idx) => ({
    title: header || `列${idx + 1}`,
    key: `col_${idx}`,
    render: (row: any) => row[`col_${idx}`] ?? ''
  }))
})

// 表格数据
const tableData = computed(() => {
  return processedData.value.map((row, rowIdx) => {
    const rowData: Record<string, any> = { __key: rowIdx }
    row.forEach((cell, colIdx) => {
      rowData[`col_${colIdx}`] = cell
    })
    return rowData
  })
})

// 原始表格数据
const originalTableData = computed(() => {
  return fileData.value.map((row, rowIdx) => {
    const rowData: Record<string, any> = { __key: rowIdx }
    row.forEach((cell, colIdx) => {
      rowData[`col_${colIdx}`] = cell
    })
    return rowData
  })
})

// 原始表格列
const originalTableColumns = computed(() => {
  const colCount = fileData.value[0]?.length || 0
  return Array.from({ length: colCount }, (_, idx) => ({
    title: headers.value[idx] || `列${idx + 1}`,
    key: `col_${idx}`,
    width: 120,
    ellipsis: { tooltip: true }
  }))
})

// 处理后的表格列
const processedTableColumns = computed(() => {
  const colCount = processedData.value[0]?.length || 0
  return Array.from({ length: colCount }, (_, idx) => ({
    title: headers.value[idx] || `列${idx + 1}`,
    key: `col_${idx}`,
    width: 120,
    ellipsis: { tooltip: true }
  }))
})

// 文件上传处理
const handleFileUpload = async (options: any) => {
  const file = options.file.file as File
  if (!file) return

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

    // 转换为二维数组
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length === 0) {
      notification.error({ title: '文件为空', content: '文件中没有数据' })
      return
    }

    // 第一行作为表头
    headers.value = (jsonData[0] as string[]).map((h, idx) => h?.toString() || `列${idx + 1}`)
    fileData.value = jsonData.slice(1) // 去掉表头行
    processedData.value = [...fileData.value.map(row => [...row])]

    notification.success({ title: '导入成功', content: `已导入 ${fileData.value.length} 行数据` })
  } catch (e) {
    notification.error({ title: '导入失败', content: (e as Error).message })
  }
}

// 执行数据处理
const handleProcess = () => {
  if (fileData.value.length === 0) {
    notification.warning({ title: '无数据', content: '请先导入Excel文件' })
    return
  }

  if (processOptions.value.length === 0) {
    notification.warning({ title: '未选择处理项', content: '请至少选择一项处理选项' })
    return
  }

  isProcessing.value = true

  try {
    let data = [...fileData.value.map(row => [...row])]

    // 删除重复行
    if (processOptions.value.includes('removeDuplicates')) {
      const seen = new Set<string>()
      data = data.filter(row => {
        const key = JSON.stringify(row)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    // 删除空行
    if (processOptions.value.includes('removeEmptyRows')) {
      data = data.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
    }

    // 删除空列
    if (processOptions.value.includes('removeEmptyCols')) {
      const colCount = data[0]?.length || 0
      const emptyCols: number[] = []

      for (let col = 0; col < colCount; col++) {
        const isEmpty = data.every(row => row[col] === null || row[col] === undefined || row[col] === '')
        if (isEmpty) emptyCols.push(col)
      }

      // 从后往前删除空列
      for (let i = emptyCols.length - 1; i >= 0; i--) {
        const colIndex = emptyCols[i]
        headers.value.splice(colIndex, 1)
        data = data.map(row => {
          row.splice(colIndex, 1)
          return row
        })
      }
    }

    // 去除首尾空格
    if (processOptions.value.includes('trimSpaces')) {
      data = data.map(row =>
        row.map(cell => typeof cell === 'string' ? cell.trim() : cell)
      )
    }

    // 转大写
    if (processOptions.value.includes('toUpperCase')) {
      data = data.map(row =>
        row.map(cell => typeof cell === 'string' ? cell.toUpperCase() : cell)
      )
    }

    // 转小写
    if (processOptions.value.includes('toLowerCase')) {
      data = data.map(row =>
        row.map(cell => typeof cell === 'string' ? cell.toLowerCase() : cell)
      )
    }

    // 排序
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
  } catch (e) {
    notification.error({ title: '处理失败', content: (e as Error).message })
  } finally {
    isProcessing.value = false
  }
}

// 导出Excel
const handleDownload = async () => {
  if (processedData.value.length === 0) {
    notification.warning({ title: '无数据', content: '没有可导出的数据' })
    return
  }

  try {
    const defaultName = fileName.value.replace(/\.[^.]+$/, '') + '_processed.xlsx'
    const savePath = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })

    if (savePath) {
      // 创建工作簿
      const wb = XLSX.utils.book_new()
      // 将表头和数据合并
      const wsData = [headers.value, ...processedData.value]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

      // 生成文件
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      await writeFile(savePath, new Uint8Array(wbout))

      notification.success({ title: '导出成功', content: `文件已保存至: ${savePath}` })
    }
  } catch (e) {
    notification.error({ title: '导出失败', content: (e as Error).message })
  }
}

// 清空数据
const handleClear = () => {
  fileName.value = ''
  fileData.value = []
  headers.value = []
  processedData.value = []
  processOptions.value = []
}
</script>

<template>
  <ToolLayout title="Excel批量数据处理" description="导入Excel文件，批量处理数据并导出">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <!-- 处理选项 -->
        <div class="flex-shrink-0">
          <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">处理选项</div>
          <NCheckboxGroup v-model:value="processOptions" class="grid grid-cols-2 gap-2">
            <NCheckbox
              v-for="opt in availableOptions"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </NCheckboxGroup>
        </div>

        <!-- 操作按钮 -->
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

        <!-- 上传区域 -->
        <NUpload
          :show-file-list="false"
          :custom-request="handleFileUpload"
          accept=".xlsx,.xls,.csv"
          class="flex-shrink-0"
        >
          <div
            class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
            :class="isDark ? 'border-gray-600 hover:border-blue-500 bg-gray-700' : 'border-gray-300 hover:border-blue-500 bg-gray-50'"
          >
            <NIcon :size="32" class="mb-2" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              <CloudUploadOutline />
            </NIcon>
            <div v-if="fileName" class="text-blue-400">{{ fileName }}</div>
            <div v-else :class="isDark ? 'text-gray-400' : 'text-gray-500'">点击或拖拽Excel文件到此处</div>
            <div class="text-xs mt-1" :class="isDark ? 'text-gray-500' : 'text-gray-400'">支持 .xlsx / .xls / .csv</div>
          </div>
        </NUpload>

        <!-- 原始数据预览 -->
        <div v-if="fileData.length > 0" class="flex-1 min-h-0 flex flex-col">
          <div class="text-sm text-gray-400 mb-2 flex justify-between items-center">
            <span>原始数据预览</span>
            <NTag size="small" type="info">{{ fileData.length }} 行</NTag>
          </div>
          <div class="flex-1 border rounded-lg overflow-hidden" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
            <NScrollbar class="h-full">
              <NDataTable
                :columns="originalTableColumns"
                :data="originalTableData.slice(0, 100)"
                :bordered="false"
                size="small"
                :max-height="300"
                virtual-scroll
              />
            </NScrollbar>
          </div>
        </div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <ActionBar
          :showCopy="false"
          :showDownload="true"
          :showClear="true"
          :downloadDisabled="processedData.length === 0 || processedData.length === fileData.length && processOptions.length === 0"
          @download="handleDownload"
          @clear="processedData = []"
        />

        <div v-if="processedData.length > 0" class="mt-4 flex-1 min-h-0 flex flex-col">
          <div class="text-sm text-gray-400 mb-2 flex justify-between items-center">
            <span>处理结果预览</span>
            <div class="flex gap-2">
              <NTag size="small" type="success">{{ processedData.length }} 行</NTag>
            </div>
          </div>
          <div class="flex-1 border rounded-lg overflow-hidden" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
            <NScrollbar class="h-full">
              <NDataTable
                :columns="processedTableColumns"
                :data="tableData.slice(0, 500)"
                :bordered="false"
                size="small"
                :max-height="400"
                virtual-scroll
              />
            </NScrollbar>
          </div>
        </div>
        <div v-else class="mt-4 flex-1 flex items-center justify-center" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
          <div class="text-center">
            <NIcon :size="48" class="mb-2 opacity-50">
              <DownloadOutline />
            </NIcon>
            <div>处理后的数据将显示在这里</div>
          </div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>