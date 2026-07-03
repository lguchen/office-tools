<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NButton, NIcon, NRadioGroup, NRadio, NInputNumber, NSpace, NTag, NDataTable, NScrollbar, NProgress, NSelect } from 'naive-ui'
import { CutOutline, GitMergeOutline, CloudUploadOutline, DownloadOutline, TrashOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import ExcelPreview from '../../components/common/ExcelPreview.vue'
import DetachablePreview from '../../components/common/DetachablePreview.vue'
import { notifySuccess, notifyError, notifyWarning } from '../../composables/useNotification'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile, mkdir } from '@tauri-apps/plugin-fs'
import * as XLSX from 'xlsx'

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
const previewWorkbooks = ref<{ name: string; workbook: XLSX.WorkBook }[]>([])
const currentPreviewIndex = ref(0)
const isDetached = ref(false)
const detachableRef = ref<InstanceType<typeof DetachablePreview> | null>(null)

const currentPreviewWorkbook = computed(() => {
  if (previewWorkbooks.value.length === 0) return null
  return previewWorkbooks.value[currentPreviewIndex.value]?.workbook || null
})

// 改为 ref，避免 computed 中频繁序列化
const currentPreviewArrayBuffer = ref<ArrayBuffer | null>(null)

// 显式更新预览 buffer
const updatePreviewBuffer = () => {
  if (!currentPreviewWorkbook.value) {
    currentPreviewArrayBuffer.value = null
    return
  }
  const wbout = XLSX.write(currentPreviewWorkbook.value, { bookType: 'xlsx', type: 'array' })
  currentPreviewArrayBuffer.value = wbout as ArrayBuffer
  if (isDetached.value && detachableRef.value) {
    detachableRef.value.syncContent()
  }
}

// 监听预览索引变化时更新 buffer
watch(currentPreviewWorkbook, () => {
  updatePreviewBuffer()
})

// 表格列定义（用于显示输出结果）
const outputColumns = [
  { title: '文件名', key: 'name', ellipsis: { tooltip: true } },
  { title: '工作表', key: 'sheets', render: (row: any) => row.sheets?.join(', ') || '-' },
  { title: '行数', key: 'rowCount' }
]

// 上传Excel文件（拆分模式）
const handleSplitUpload = async (files: { name: string; path: string; size?: number; file?: File }[]) => {
  if (files.length === 0) return
  const fileInfo = files[0]

  const validExtensions = ['xlsx', 'xls', 'csv']
  const fileExt = fileInfo.name.split('.').pop()?.toLowerCase() || ''

  if (!validExtensions.includes(fileExt)) {
    notifyError('文件格式错误', '请上传 .xlsx、.xls 或 .csv 文件')
    return
  }

  splitFileName.value = fileInfo.name

  try {
    let arrayBuffer: ArrayBuffer
    if (fileInfo.file) {
      arrayBuffer = await fileInfo.file.arrayBuffer()
    } else if (fileInfo.path) {
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const data = await readFile(fileInfo.path)
      arrayBuffer = data.buffer
    } else {
      notifyError('导入失败', '无法读取文件内容')
      return
    }

    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    splitWorkbook.value = workbook
    splitSheets.value = workbook.SheetNames

    notifySuccess('导入成功', `已导入文件，包含 ${splitSheets.value.length} 个工作表`)
  } catch (e) {
    console.error('Split upload error:', e)
    notifyError('导入失败', (e as Error).message)
  }
}

// 上传Excel文件（合并模式）
const handleMergeUpload = async (files: { name: string; path: string; size?: number; file?: File }[]) => {
  const validExtensions = ['xlsx', 'xls', 'csv']

  for (const fileInfo of files) {
    const fileExt = fileInfo.name.split('.').pop()?.toLowerCase() || ''

    if (!validExtensions.includes(fileExt)) {
      notifyError('文件格式错误', '请上传 .xlsx、.xls 或 .csv 文件')
      continue
    }

    if (mergeFiles.value.some(f => f.name === fileInfo.name)) {
      notifyWarning('文件已存在', `${fileInfo.name} 已添加`)
      continue
    }

    try {
      let arrayBuffer: ArrayBuffer
      if (fileInfo.file) {
        arrayBuffer = await fileInfo.file.arrayBuffer()
      } else if (fileInfo.path) {
        const { readFile } = await import('@tauri-apps/plugin-fs')
        const data = await readFile(fileInfo.path)
        arrayBuffer = data.buffer
      } else {
        continue
      }

      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      mergeFiles.value.push({
        name: fileInfo.name,
        workbook
      })

      notifySuccess('添加成功', `已添加 ${fileInfo.name}`)
    } catch (e) {
      console.error('Merge upload error:', e)
      notifyError('导入失败', (e as Error).message)
    }
  }
}

// 执行拆分
const handleSplit = async () => {
  if (!splitWorkbook.value) {
    notifyWarning('无文件', '请先上传Excel文件')
    return
  }

  isProcessing.value = true
  progress.value = 0
  outputFiles.value = []
  previewWorkbooks.value = []
  currentPreviewIndex.value = 0

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
          previewWorkbooks.value.push({
            name: newFileName,
            workbook: newWb
          })
        }

        progress.value = Math.round(((i + 1) / totalSheets) * 100)
      }

      notifySuccess('拆分完成', `已拆分为 ${outputFiles.value.length} 个文件`)
    } else {
      // 按行数拆分
      const firstSheetName = wb.SheetNames[0]
      const sheet = wb.Sheets[firstSheetName]
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      const totalRows = data.length
      const rowsPerFile = splitRowCount.value

      if (rowsPerFile <= 0 || rowsPerFile >= totalRows) {
        notifyWarning('行数无效', '请输入有效的拆分行数')
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
          previewWorkbooks.value.push({
            name: newFileName,
            workbook: newWb
          })
        }

        progress.value = Math.round(((i + 1) / fileCount) * 100)
      }

      notifySuccess('拆分完成', `已将 ${totalRows - 1} 行数据拆分为 ${outputFiles.value.length} 个文件`)
    }
  } catch (e) {
    notifyError('拆分失败', (e as Error).message)
  } finally {
    isProcessing.value = false
    progress.value = 100
    progressText.value = ''
  }
}

// 执行合并
const handleMerge = async () => {
  if (mergeFiles.value.length < 2) {
    notifyWarning('文件不足', '请至少上传2个Excel文件')
    return
  }

  isProcessing.value = true
  progress.value = 0
  progressText.value = '正在合并文件...'
  outputFiles.value = []
  previewWorkbooks.value = []
  currentPreviewIndex.value = 0

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
        previewWorkbooks.value = [{
          name: 'merged_rows.xlsx',
          workbook: mergedWb
        }]

        notifySuccess('合并完成', `已合并 ${mergeFiles.value.length} 个文件，共 ${allData.length - 1} 行数据`)
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
        previewWorkbooks.value = [{
          name: 'merged_sheets.xlsx',
          workbook: mergedWb
        }]

        notifySuccess('合并完成', `已合并 ${mergeFiles.value.length} 个文件到 ${mergedWb.SheetNames.length} 个工作表`)
      }
    }

    progress.value = 100
  } catch (e) {
    notifyError('合并失败', (e as Error).message)
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
  previewWorkbooks.value = []
  currentPreviewIndex.value = 0
}
</script>

<template>
  <ToolLayout title="Excel拆分合并" description="将Excel文件拆分或合并多个文件">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <!-- 模式切换 -->
        <div class="flex-shrink-0">
          <div class="text-sm font-medium mb-2 text-gray-700">
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
            <div class="text-sm font-medium mb-2 text-gray-700">
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
            <div class="text-sm font-medium mb-2 text-gray-700">
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
          <FileDropZone
            accept=".xlsx,.xls,.csv"
            :multiple="false"
            :show-file-list="false"
            class="flex-shrink-0"
            @files-selected="handleSplitUpload"
          />

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
            <div class="text-sm font-medium mb-2 text-gray-700">
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
          <FileDropZone
            accept=".xlsx,.xls,.csv"
            :multiple="true"
            :show-file-list="false"
            class="flex-shrink-0"
            @files-selected="handleMergeUpload"
          />

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
      <DetachablePreview
        ref="detachableRef"
        v-model:detached="isDetached"
        title="Excel预览"
        class="h-full"
      >
        <div class="h-full flex flex-col">
          <div v-if="isProcessing" class="px-3 py-2 border-b flex-shrink-0 border-gray-200 bg-gray-50">
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

          <div v-if="previewWorkbooks.length > 0" class="flex-1 min-h-0 flex flex-col">
            <div v-if="previewWorkbooks.length > 1" class="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0 border-gray-200 bg-gray-50">
              <span class="text-sm text-gray-700">文件：</span>
              <NSelect
                :value="currentPreviewIndex"
                :options="previewWorkbooks.map((wb, idx) => ({ label: wb.name, value: idx }))"
                size="small"
                class="flex-1 max-w-xs"
                @update:value="currentPreviewIndex = $event"
              />
              <NTag size="small" type="success">{{ previewWorkbooks.length }} 个文件</NTag>
            </div>

            <div class="flex-1 min-h-0">
              <ExcelPreview
                v-if="currentPreviewArrayBuffer"
                :array-buffer="currentPreviewArrayBuffer"
                class="h-full"
              />
            </div>
          </div>

          <div v-else class="flex-1 flex items-center justify-center text-gray-400">
            <div class="text-center text-sm">
              <NIcon :size="48" class="mb-2 opacity-50">
                <DownloadOutline />
              </NIcon>
              <div>处理后的文件将显示在这里</div>
            </div>
          </div>
        </div>
      </DetachablePreview>
    </template>
  </ToolLayout>
</template>