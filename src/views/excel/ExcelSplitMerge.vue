<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NIcon, NUpload, NRadioGroup, NRadio, NInputNumber, NSpace, NTag, NDataTable, NScrollbar, NProgress } from 'naive-ui'
import { CutOutline, GitMergeOutline, CloudUploadOutline, DownloadOutline, TrashOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile, mkdir } from '@tauri-apps/plugin-fs'
import * as XLSX from 'xlsx'
import { useSettingsStore } from '../../stores/settings'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

// 模式切换
const mode = ref<'split' | 'merge'>('split')

// 拆分模式相关
const splitFileName = ref('')
const splitWorkbook = ref<XLSX.WorkBook | null>(null)
const splitSheets = ref<string[]>([])
const splitMethod = ref<'sheets' | 'rows'>('sheets')
const splitRowCount = ref<number>(100)

// 合并模式相关
const mergeFiles = ref<{ name: string; workbook: XLSX.WorkBook }[]>([])
const mergeMethod = ref<'rows' | 'sheets'>('rows')

// 处理状态
const isProcessing = ref(false)
const progress = ref(0)
const progressText = ref('')

// 输出结果
const outputFiles = ref<{ name: string; sheets: string[]; rowCount: number }[]>([])

// 表格列定义（用于显示输出结果）
const outputColumns = [
  { title: '文件名', key: 'name', ellipsis: { tooltip: true } },
  { title: '工作表', key: 'sheets', render: (row: any) => row.sheets?.join(', ') || '-' },
  { title: '行数', key: 'rowCount' }
]

// 上传Excel文件（拆分模式）
const handleSplitUpload = async (options: any) => {
  const file = options.file.file as File
  if (!file) return

  const validExtensions = ['.xlsx', '.xls']
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

  if (!validExtensions.includes(fileExt)) {
    notification.error({ title: '文件格式错误', content: '请上传 .xlsx 或 .xls 文件' })
    return
  }

  splitFileName.value = file.name

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    splitWorkbook.value = workbook
    splitSheets.value = workbook.SheetNames

    notification.success({
      title: '导入成功',
      content: `已导入文件，包含 ${splitSheets.value.length} 个工作表`
    })
  } catch (e) {
    notification.error({ title: '导入失败', content: (e as Error).message })
  }
}

// 上传Excel文件（合并模式）
const handleMergeUpload = async (options: any) => {
  const file = options.file.file as File
  if (!file) return

  const validExtensions = ['.xlsx', '.xls']
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

  if (!validExtensions.includes(fileExt)) {
    notification.error({ title: '文件格式错误', content: '请上传 .xlsx 或 .xls 文件' })
    return
  }

  // 检查是否已存在同名文件
  if (mergeFiles.value.some(f => f.name === file.name)) {
    notification.warning({ title: '文件已存在', content: '该文件已添加' })
    return
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    mergeFiles.value.push({
      name: file.name,
      workbook
    })

    notification.success({
      title: '添加成功',
      content: `已添加 ${file.name}`
    })
  } catch (e) {
    notification.error({ title: '导入失败', content: (e as Error).message })
  }
}

// 执行拆分
const handleSplit = async () => {
  if (!splitWorkbook.value) {
    notification.warning({ title: '无文件', content: '请先上传Excel文件' })
    return
  }

  isProcessing.value = true
  progress.value = 0
  outputFiles.value = []

  try {
    const wb = splitWorkbook.value
    const baseName = splitFileName.value.replace(/\.[^.]+$/, '')

    if (splitMethod.value === 'sheets') {
      // 按工作表拆分
      const totalSheets = wb.SheetNames.length
      progressText.value = '正在按工作表拆分...'

      for (let i = 0; i < totalSheets; i++) {
        const sheetName = wb.SheetNames[i]
        const sheet = wb.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

        // 创建新的工作簿
        const newWb = XLSX.utils.book_new()
        const newWs = XLSX.utils.aoa_to_sheet(data)
        XLSX.utils.book_append_sheet(newWb, newWs, sheetName)

        // 生成文件名
        const newFileName = `${baseName}_${sheetName}.xlsx`

        // 保存文件
        const savePath = await save({
          defaultPath: newFileName,
          filters: [{ name: 'Excel', extensions: ['xlsx'] }]
        })

        if (savePath) {
          const wbout = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' })
          await writeFile(savePath, new Uint8Array(wbout))

          outputFiles.value.push({
            name: newFileName,
            sheets: [sheetName],
            rowCount: data.length
          })
        }

        progress.value = Math.round(((i + 1) / totalSheets) * 100)
      }

      notification.success({
        title: '拆分完成',
        content: `已拆分为 ${outputFiles.value.length} 个文件`
      })
    } else {
      // 按行数拆分
      const firstSheetName = wb.SheetNames[0]
      const sheet = wb.Sheets[firstSheetName]
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      const totalRows = data.length
      const rowsPerFile = splitRowCount.value

      if (rowsPerFile <= 0 || rowsPerFile >= totalRows) {
        notification.warning({ title: '行数无效', content: '请输入有效的拆分行数' })
        return
      }

      progressText.value = '正在按行数拆分...'

      // 计算需要拆分的文件数
      const headerRow = data[0] // 保留表头
      const dataRows = data.slice(1)
      const fileCount = Math.ceil(dataRows.length / rowsPerFile)

      for (let i = 0; i < fileCount; i++) {
        const startIdx = i * rowsPerFile
        const endIdx = Math.min(startIdx + rowsPerFile, dataRows.length)
        const chunkData = [headerRow, ...dataRows.slice(startIdx, endIdx)]

        // 创建新的工作簿
        const newWb = XLSX.utils.book_new()
        const newWs = XLSX.utils.aoa_to_sheet(chunkData)
        XLSX.utils.book_append_sheet(newWb, newWs, 'Sheet1')

        // 生成文件名
        const newFileName = `${baseName}_part${i + 1}.xlsx`

        // 保存文件
        const savePath = await save({
          defaultPath: newFileName,
          filters: [{ name: 'Excel', extensions: ['xlsx'] }]
        })

        if (savePath) {
          const wbout = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' })
          await writeFile(savePath, new Uint8Array(wbout))

          outputFiles.value.push({
            name: newFileName,
            sheets: ['Sheet1'],
            rowCount: chunkData.length
          })
        }

        progress.value = Math.round(((i + 1) / fileCount) * 100)
      }

      notification.success({
        title: '拆分完成',
        content: `已将 ${totalRows - 1} 行数据拆分为 ${outputFiles.value.length} 个文件`
      })
    }
  } catch (e) {
    notification.error({ title: '拆分失败', content: (e as Error).message })
  } finally {
    isProcessing.value = false
    progress.value = 100
    progressText.value = ''
  }
}

// 执行合并
const handleMerge = async () => {
  if (mergeFiles.value.length < 2) {
    notification.warning({ title: '文件不足', content: '请至少上传2个Excel文件' })
    return
  }

  isProcessing.value = true
  progress.value = 0
  progressText.value = '正在合并文件...'

  try {
    const mergedWb = XLSX.utils.book_new()

    if (mergeMethod.value === 'rows') {
      // 追加行合并
      let allData: any[][] = []
      let headerRow: any[] = []

      for (let i = 0; i < mergeFiles.value.length; i++) {
        const { workbook, name } = mergeFiles.value[i]
        const firstSheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[firstSheetName]
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

        if (i === 0) {
          // 第一个文件，保留表头
          headerRow = data[0]
          allData = [...data]
        } else {
          // 后续文件，只追加数据行（跳过表头）
          allData.push(...data.slice(1))
        }

        progress.value = Math.round(((i + 1) / mergeFiles.value.length) * 50)
      }

      // 创建合并后的工作表
      const mergedWs = XLSX.utils.aoa_to_sheet(allData)
      XLSX.utils.book_append_sheet(mergedWb, mergedWs, '合并数据')

      // 保存文件
      const savePath = await save({
        defaultPath: 'merged_rows.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      })

      if (savePath) {
        const wbout = XLSX.write(mergedWb, { bookType: 'xlsx', type: 'array' })
        await writeFile(savePath, new Uint8Array(wbout))

        outputFiles.value = [{
          name: 'merged_rows.xlsx',
          sheets: ['合并数据'],
          rowCount: allData.length
        }]

        notification.success({
          title: '合并完成',
          content: `已合并 ${mergeFiles.value.length} 个文件，共 ${allData.length - 1} 行数据`
        })
      }
    } else {
      // 合并到不同Sheet
      for (let i = 0; i < mergeFiles.value.length; i++) {
        const { workbook, name } = mergeFiles.value[i]
        const baseName = name.replace(/\.[^.]+$/, '')
        const sheetName = baseName.length > 31 ? baseName.substring(0, 31) : baseName

        // 复制第一个工作表
        const firstSheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[firstSheetName]
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

        const newWs = XLSX.utils.aoa_to_sheet(data)
        XLSX.utils.book_append_sheet(mergedWb, newWs, sheetName)

        progress.value = Math.round(((i + 1) / mergeFiles.value.length) * 50)
      }

      // 保存文件
      const savePath = await save({
        defaultPath: 'merged_sheets.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      })

      if (savePath) {
        const wbout = XLSX.write(mergedWb, { bookType: 'xlsx', type: 'array' })
        await writeFile(savePath, new Uint8Array(wbout))

        outputFiles.value = [{
          name: 'merged_sheets.xlsx',
          sheets: mergedWb.SheetNames,
          rowCount: mergedWb.SheetNames.length
        }]

        notification.success({
          title: '合并完成',
          content: `已合并 ${mergeFiles.value.length} 个文件到 ${mergedWb.SheetNames.length} 个工作表`
        })
      }
    }

    progress.value = 100
  } catch (e) {
    notification.error({ title: '合并失败', content: (e as Error).message })
  } finally {
    isProcessing.value = false
    progressText.value = ''
  }
}

// 清空数据
const handleClear = () => {
  if (mode.value === 'split') {
    splitFileName.value = ''
    splitWorkbook.value = null
    splitSheets.value = []
  } else {
    mergeFiles.value = []
  }
  outputFiles.value = []
}
</script>

<template>
  <ToolLayout title="Excel拆分合并" description="将Excel文件拆分或合并多个文件">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <!-- 模式切换 -->
        <div class="flex-shrink-0">
          <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            选择模式
          </div>
          <NRadioGroup v-model:value="mode">
            <NSpace>
              <NRadio value="split">
                <div class="flex items-center gap-1">
                  <NIcon><CutOutline /></NIcon>
                  拆分
                </div>
              </NRadio>
              <NRadio value="merge">
                <div class="flex items-center gap-1">
                  <NIcon><GitMergeOutline /></NIcon>
                  合并
                </div>
              </NRadio>
            </NSpace>
          </NRadioGroup>
        </div>

        <!-- 拆分模式 -->
        <div v-if="mode === 'split'" class="flex-1 flex flex-col">
          <!-- 拆分方式选择 -->
          <div class="mb-4">
            <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
              拆分方式
            </div>
            <NRadioGroup v-model:value="splitMethod">
              <NSpace>
                <NRadio value="sheets">按工作表拆分</NRadio>
                <NRadio value="rows">按行数拆分</NRadio>
              </NSpace>
            </NRadioGroup>
          </div>

          <!-- 按行数拆分的参数 -->
          <div v-if="splitMethod === 'rows'" class="mb-4">
            <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
              每个文件行数
            </div>
            <NInputNumber
              v-model:value="splitRowCount"
              :min="1"
              :max="10000"
              placeholder="输入每个文件的行数"
            />
          </div>

          <!-- 上传区域 -->
          <NUpload
            :show-file-list="false"
            :custom-request="handleSplitUpload"
            accept=".xlsx,.xls"
            class="flex-shrink-0"
          >
            <div
              class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
              :class="isDark ? 'border-gray-600 hover:border-blue-500 bg-gray-700' : 'border-gray-300 hover:border-blue-500 bg-gray-50'"
            >
              <NIcon :size="32" class="mb-2" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                <CloudUploadOutline />
              </NIcon>
              <div v-if="splitFileName" class="text-blue-400">{{ splitFileName }}</div>
              <div v-else :class="isDark ? 'text-gray-400' : 'text-gray-500'">点击上传Excel文件</div>
              <div class="text-xs mt-1" :class="isDark ? 'text-gray-500' : 'text-gray-400'">支持 .xlsx / .xls</div>
            </div>
          </NUpload>

          <!-- 文件信息 -->
          <div v-if="splitSheets.length > 0" class="mt-4 flex gap-2">
            <NTag type="info">{{ splitSheets.length }} 个工作表</NTag>
          </div>

          <!-- 操作按钮 -->
          <div class="mt-4 flex gap-2">
            <NButton
              type="primary"
              :disabled="!splitWorkbook"
              :loading="isProcessing"
              @click="handleSplit"
            >
              <template #icon>
                <NIcon><CutOutline /></NIcon>
              </template>
              执行拆分
            </NButton>
            <NButton @click="handleClear" :disabled="!splitWorkbook">
              清空
            </NButton>
          </div>
        </div>

        <!-- 合并模式 -->
        <div v-else class="flex-1 flex flex-col">
          <!-- 合并方式选择 -->
          <div class="mb-4">
            <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
              合并方式
            </div>
            <NRadioGroup v-model:value="mergeMethod">
              <NSpace>
                <NRadio value="rows">追加行（合并到同一Sheet）</NRadio>
                <NRadio value="sheets">合并到不同Sheet</NRadio>
              </NSpace>
            </NRadioGroup>
          </div>

          <!-- 上传区域 -->
          <NUpload
            :show-file-list="false"
            :custom-request="handleMergeUpload"
            accept=".xlsx,.xls"
            :multiple="true"
            class="flex-shrink-0"
          >
            <div
              class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
              :class="isDark ? 'border-gray-600 hover:border-blue-500 bg-gray-700' : 'border-gray-300 hover:border-blue-500 bg-gray-50'"
            >
              <NIcon :size="32" class="mb-2" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                <CloudUploadOutline />
              </NIcon>
              <div :class="isDark ? 'text-gray-400' : 'text-gray-500'">点击上传多个Excel文件</div>
              <div class="text-xs mt-1" :class="isDark ? 'text-gray-500' : 'text-gray-400'">支持 .xlsx / .xls，可多次上传</div>
            </div>
          </NUpload>

          <!-- 已上传文件列表 -->
          <div v-if="mergeFiles.length > 0" class="mt-4 flex gap-2 flex-wrap">
            <NTag v-for="file in mergeFiles" :key="file.name" type="info" closable @close="mergeFiles = mergeFiles.filter(f => f.name !== file.name)">
              {{ file.name }}
            </NTag>
          </div>

          <!-- 操作按钮 -->
          <div class="mt-4 flex gap-2">
            <NButton
              type="primary"
              :disabled="mergeFiles.length < 2"
              :loading="isProcessing"
              @click="handleMerge"
            >
              <template #icon>
                <NIcon><GitMergeOutline /></NIcon>
              </template>
              执行合并
            </NButton>
            <NButton @click="handleClear" :disabled="mergeFiles.length === 0">
              清空
            </NButton>
          </div>
        </div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <!-- 进度条 -->
        <div v-if="isProcessing" class="mb-4">
          <NProgress
            type="line"
            :percentage="progress"
            :height="24"
            :border-radius="4"
            :fill-border-radius="4"
            status="default"
          >
            {{ progressText || `处理中 ${progress}%` }}
          </NProgress>
        </div>

        <!-- 输出结果 -->
        <div v-if="outputFiles.length > 0" class="flex-1 min-h-0 flex flex-col">
          <div class="text-sm text-gray-400 mb-2 flex justify-between items-center">
            <span>输出文件</span>
            <NTag size="small" type="success">{{ outputFiles.length }} 个文件</NTag>
          </div>
          <div class="flex-1 border rounded-lg overflow-hidden" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
            <NScrollbar class="h-full">
              <NDataTable
                :columns="outputColumns"
                :data="outputFiles"
                :bordered="false"
                size="small"
                :max-height="300"
              />
            </NScrollbar>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="flex-1 flex items-center justify-center" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
          <div class="text-center">
            <NIcon :size="48" class="mb-2 opacity-50">
              <DownloadOutline />
            </NIcon>
            <div>处理后的文件将显示在这里</div>
          </div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>