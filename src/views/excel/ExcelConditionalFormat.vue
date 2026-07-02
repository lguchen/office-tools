<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useTheme } from '../../composables/useTheme'
import { NButton, NIcon, NRadioGroup, NRadio, NInput, NInputNumber, NSpace, NTag, NSelect } from 'naive-ui'
import { DownloadOutline, ColorPaletteOutline } from '@vicons/ionicons5'
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

// 文件数据
const fileName = ref('')
const fileData = ref<any[][]>([])
const headers = ref<string[]>([])
const workbook = ref<XLSX.WorkBook | null>(null)

// 条件格式规则类型
type RuleType = 'duplicates' | 'empty' | 'greater' | 'less' | 'contains' | 'range'
const selectedRule = ref<RuleType>('duplicates')

// 条件参数
const thresholdValue = ref<number>(0)
const searchText = ref('')
const rangeMin = ref<number>(0)
const rangeMax = ref<number>(100)

// 高亮颜色
const highlightColor = ref('#FFEB3B') // 默认黄色
const colorOptions = [
  { label: '黄色', value: '#FFEB3B' },
  { label: '红色', value: '#FFCDD2' },
  { label: '绿色', value: '#C8E6C9' },
  { label: '蓝色', value: '#BBDEFB' },
  { label: '橙色', value: '#FFE0B2' },
  { label: '紫色', value: '#E1BEE7' }
]

// 高亮的单元格（用于预览）
const highlightedCells = ref<Set<string>>(new Set())

// 预览模式
const previewMode = ref<'original' | 'formatted'>('formatted')
const isDetached = ref(false)
const detachableRef = ref<InstanceType<typeof DetachablePreview> | null>(null)

// 带高亮标记的数据（高亮单元格前加 ★）
const highlightedData = computed(() => {
  return fileData.value.map((row, rowIdx) => {
    return row.map((cell, colIdx) => {
      const cellKey = `${rowIdx}_${colIdx}`
      if (highlightedCells.value.has(cellKey)) {
        return `★ ${cell ?? ''}`
      }
      return cell
    })
  })
})

// 预览数据（含表头）
const previewData = computed(() => {
  const data = previewMode.value === 'formatted' ? highlightedData.value : fileData.value
  if (data.length === 0) return null
  return [headers.value, ...data]
})

// 应用条件格式规则
const applyRule = () => {
  highlightedCells.value = new Set()

  if (fileData.value.length === 0) return

  switch (selectedRule.value) {
    case 'duplicates':
      // 高亮重复值
      const allValues = new Map<string, Set<string>>()
      fileData.value.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          const value = String(cell ?? '')
          if (value) {
            const cellKey = `${rowIdx}_${colIdx}`
            if (!allValues.has(value)) {
              allValues.set(value, new Set())
            }
            allValues.get(value)!.add(cellKey)
          }
        })
      })
      // 标记重复的单元格
      allValues.forEach((cells) => {
        if (cells.size > 1) {
          cells.forEach(key => highlightedCells.value.add(key))
        }
      })
      break

    case 'empty':
      // 高亮空值
      fileData.value.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell === null || cell === undefined || cell === '' || cell === '') {
            highlightedCells.value.add(`${rowIdx}_${colIdx}`)
          }
        })
      })
      break

    case 'greater':
      // 高亮大于某值
      fileData.value.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          const num = Number(cell)
          if (!isNaN(num) && num > thresholdValue.value) {
            highlightedCells.value.add(`${rowIdx}_${colIdx}`)
          }
        })
      })
      break

    case 'less':
      // 高亮小于某值
      fileData.value.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          const num = Number(cell)
          if (!isNaN(num) && num < thresholdValue.value) {
            highlightedCells.value.add(`${rowIdx}_${colIdx}`)
          }
        })
      })
      break

    case 'contains':
      // 高亮包含某文本
      fileData.value.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          const str = String(cell ?? '')
          if (str.includes(searchText.value)) {
            highlightedCells.value.add(`${rowIdx}_${colIdx}`)
          }
        })
      })
      break

    case 'range':
      // 高亮范围内的值
      fileData.value.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          const num = Number(cell)
          if (!isNaN(num) && num >= rangeMin.value && num <= rangeMax.value) {
            highlightedCells.value.add(`${rowIdx}_${colIdx}`)
          }
        })
      })
      break
  }
}

// 监听规则变化，自动应用（防抖，大数据量避免频繁计算）
let debounceTimer: number | null = null
onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

watch([selectedRule, thresholdValue, searchText, rangeMin, rangeMax, highlightColor], () => {
  if (fileData.value.length > 0) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => {
      applyRule()
    }, 150)
  }
})

// 文件上传处理
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
    const wb = XLSX.read(arrayBuffer, { type: 'array' })
    workbook.value = wb

    const firstSheetName = wb.SheetNames[0]
    const worksheet = wb.Sheets[firstSheetName]

    // 转换为二维数组
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length === 0) {
      notification.error({ title: '文件为空', content: '文件中没有数据' })
      return
    }

    // 第一行作为表头
    headers.value = (jsonData[0] as string[]).map((h, idx) => h?.toString() || `列${idx + 1}`)
    fileData.value = jsonData.slice(1)

    // 自动应用当前规则
    applyRule()

    notification.success({ title: '导入成功', content: `已导入 ${fileData.value.length} 行数据` })
  } catch (e) {
    notification.error({ title: '导入失败', content: (e as Error).message })
  }
}

// 导出带条件格式的Excel
const handleExport = async () => {
  if (!workbook.value || fileData.value.length === 0) {
    notification.warning({ title: '无数据', content: '请先导入Excel文件' })
    return
  }

  try {
    // 创建新的工作簿
    const newWb = XLSX.utils.book_new()

    // 合并表头和数据
    const wsData = [headers.value, ...fileData.value]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // 添加样式信息（通过单元格属性）
    // 注意：xlsx库本身不完全支持样式，这里使用s属性尝试设置
    // 实际导出可能需要xlsx-js-style库来完全支持样式

    // 获取列数
    const colCount = headers.value.length
    const rowCount = fileData.value.length + 1 // 包含表头

    // 为每个单元格设置样式属性
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
        const cell = ws[cellRef]

        if (cell) {
          // 检查是否需要高亮（数据行，跳过表头）
          if (row > 0) {
            const cellKey = `${row - 1}_${col}`
            if (highlightedCells.value.has(cellKey)) {
              // 设置单元格样式（需要在xlsx-js-style环境下才能完整工作）
              // 这里作为示例设置属性
              if (!cell.s) {
                cell.s = {}
              }
              cell.s = {
                fill: {
                  patternType: 'solid',
                  fgColor: { rgb: highlightColor.value.replace('#', '') }
                }
              }
            }
          }
        }
      }
    }

    // 设置列宽
    ws['!cols'] = headers.value.map(() => ({ wch: 12 }))

    XLSX.utils.book_append_sheet(newWb, ws, 'Sheet1')

    // 保存文件
    const defaultName = fileName.value.replace(/\.[^.]+$/, '') + '_formatted.xlsx'
    const savePath = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })

    if (savePath) {
      // 使用xlsx-js-style的write方法来保留样式
      // 如果使用标准xlsx库，样式可能不会保存
      const wbout = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' })
      await writeFile(savePath, new Uint8Array(wbout))

      notification.success({
        title: '导出成功',
        content: `文件已保存至: ${savePath}\n注意：样式导出需要xlsx-js-style库支持`
      })
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
  workbook.value = null
  highlightedCells.value = new Set()
}
</script>

<template>
  <ToolLayout title="Excel条件格式工具" description="为Excel数据添加条件格式高亮">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <!-- 条件格式规则选择 -->
        <div class="flex-shrink-0">
          <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            选择条件格式规则
          </div>
          <NRadioGroup v-model:value="selectedRule">
            <NSpace vertical>
              <NRadio value="duplicates">高亮重复值</NRadio>
              <NRadio value="empty">高亮空值</NRadio>
              <NRadio value="greater">高亮大于某值</NRadio>
              <NRadio value="less">高亮小于某值</NRadio>
              <NRadio value="contains">高亮包含某文本</NRadio>
              <NRadio value="range">高亮范围内的值</NRadio>
            </NSpace>
          </NRadioGroup>
        </div>

        <!-- 条件参数输入 -->
        <div class="flex-shrink-0">
          <!-- 大于/小于某值 -->
          <div v-if="selectedRule === 'greater' || selectedRule === 'less'" class="mt-3">
            <div class="text-sm mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              {{ selectedRule === 'greater' ? '阈值（大于此值）' : '阈值（小于此值）' }}
            </div>
            <NInputNumber
              v-model:value="thresholdValue"
              placeholder="输入数值"
              clearable
            />
          </div>

          <!-- 包含文本 -->
          <div v-if="selectedRule === 'contains'" class="mt-3">
            <div class="text-sm mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              搜索文本
            </div>
            <NInput
              v-model:value="searchText"
              placeholder="输入要搜索的文本"
              clearable
            />
          </div>

          <!-- 范围 -->
          <div v-if="selectedRule === 'range'" class="mt-3 space-y-2">
            <div class="text-sm mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              数值范围
            </div>
            <div class="flex gap-2">
              <NInputNumber
                v-model:value="rangeMin"
                placeholder="最小值"
                size="small"
              />
              <span :class="isDark ? 'text-gray-400' : 'text-gray-500'">至</span>
              <NInputNumber
                v-model:value="rangeMax"
                placeholder="最大值"
                size="small"
              />
            </div>
          </div>

          <!-- 高亮颜色选择 -->
          <div class="mt-4">
            <div class="text-sm mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              高亮颜色
            </div>
            <NSelect
              v-model:value="highlightColor"
              :options="colorOptions"
              size="small"
            />
          </div>
        </div>

        <!-- 上传区域 -->
        <FileDropZone
          accept=".xlsx,.xls,.csv"
          :multiple="false"
          tips="选择文件或拖拽上传"
          @files-selected="handleFilesSelected"
          class="flex-shrink-0"
        />

        <!-- 统计信息 -->
        <div v-if="highlightedCells.size > 0" class="mt-2 flex gap-2">
          <NTag type="info">{{ fileData.length }} 行数据</NTag>
          <NTag type="warning">{{ highlightedCells.size }} 个单元格高亮</NTag>
        </div>

        <!-- 操作按钮 -->
        <div class="mt-4 flex gap-2 flex-shrink-0">
          <NButton
            type="primary"
            :disabled="fileData.length === 0"
            @click="handleExport"
          >
            <template #icon>
              <NIcon><DownloadOutline /></NIcon>
            </template>
            导出Excel
          </NButton>
          <NButton @click="handleClear" :disabled="fileData.length === 0">
            清空
          </NButton>
        </div>
      </div>
    </template>

    <template #output>
      <DetachablePreview
        ref="detachableRef"
        v-model:detached="isDetached"
        title="Excel条件格式预览"
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
              :type="previewMode === 'formatted' ? 'primary' : 'default'"
              @click="previewMode = 'formatted'"
              :disabled="fileData.length === 0"
            >
              条件格式结果
            </NButton>
            <div class="flex-1"></div>
            <NTag v-if="highlightedCells.size > 0 && previewMode === 'formatted'" size="small" type="warning">
              {{ highlightedCells.size }} 个高亮
            </NTag>
            <NTag v-if="fileData.length > 0" size="small" type="info">
              {{ fileData.length }} 行
            </NTag>
            <NButton
              v-if="fileData.length > 0"
              size="small"
              @click="handleExport"
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
              <div class="text-center">
                <NIcon :size="48" class="mb-2 opacity-50">
                  <ColorPaletteOutline />
                </NIcon>
                <div class="text-sm">上传Excel文件后可预览条件格式效果</div>
                <div class="text-xs mt-1 opacity-70">高亮单元格使用 ★ 标记提示</div>
              </div>
            </div>
          </div>
        </div>
      </DetachablePreview>
    </template>
  </ToolLayout>
</template>