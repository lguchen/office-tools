<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NButton, NIcon, NRadioGroup, NRadio, NInput, NInputNumber, NSpace, NTag, NSelect } from 'naive-ui'
import { CloudUploadOutline, DownloadOutline, CheckmarkCircleOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import ExcelPreview from '../../components/common/ExcelPreview.vue'
import DetachablePreview from '../../components/common/DetachablePreview.vue'
import { notifySuccess, notifyError, notifyWarning } from '../../composables/useNotification'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import * as XLSX from 'xlsx'

// 文件数据
const fileName = ref('')
const workbook = ref<XLSX.WorkBook | null>(null)
const fileArrayBuffer = ref<ArrayBuffer | null>(null)
const isDetached = ref(false)
const detachableRef = ref<InstanceType<typeof DetachablePreview> | null>(null)

// 数据验证类型
type ValidationType = 'integer' | 'decimal' | 'textLength' | 'list'
const selectedValidation = ref<ValidationType>('integer')

// 验证参数
const minValue = ref<number>(0)
const maxValue = ref<number>(100)
const minLength = ref<number>(0)
const maxLength = ref<number>(50)
const listOptions = ref<string>('选项1,选项2,选项3') // 下拉列表选项，逗号分隔

// 错误提示消息
const errorTitle = ref('输入错误')
const errorMessage = ref('请输入有效的数据')

// 目标单元格范围
const targetRange = ref('A1:A100')

// 验证类型选项
const validationOptions = [
  { label: '整数范围', value: 'integer' },
  { label: '小数范围', value: 'decimal' },
  { label: '文本长度限制', value: 'textLength' },
  { label: '下拉列表', value: 'list' }
]

// 文件上传处理
const handleFileUpload = async (files: { name: string; path: string; size?: number; file?: File }[]) => {
  if (files.length === 0) return
  const fileInfo = files[0]

  const validExtensions = ['xlsx', 'xls', 'csv']
  const fileExt = fileInfo.name.split('.').pop()?.toLowerCase() || ''

  if (!validExtensions.includes(fileExt)) {
    notifyError('文件格式错误', '请上传 .xlsx、.xls 或 .csv 文件')
    return
  }

  fileName.value = fileInfo.name

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

    fileArrayBuffer.value = arrayBuffer
    const wb = XLSX.read(arrayBuffer, { type: 'array' })
    workbook.value = wb

    notifySuccess('导入成功', `已导入文件，包含 ${wb.SheetNames.length} 个工作表`)
  } catch (e) {
    console.error('Data validation upload error:', e)
    notifyError('导入失败', (e as Error).message)
  }
}

// 导出带数据验证的Excel
const handleExport = async () => {
  if (!workbook.value) {
    notifyWarning('无文件', '请先上传Excel文件')
    return
  }

  try {
    // 创建新的工作簿（基于原有文件）
    const newWb = workbook.value

    // 获取第一个工作表
    const firstSheetName = newWb.SheetNames[0]
    const ws = newWb.Sheets[firstSheetName]

    // 数据验证配置
    // 注意：xlsx库本身不直接支持数据验证(data validation)
    // 实际需要通过Excel的内部XML结构或使用xlsx-js-style等扩展库
    // 这里我们通过修改工作表的内部数据结构来尝试添加验证规则

    // 数据验证规则对象（用于xlsx-js-style或其他库）
    const dvConfig = buildValidationConfig()

    // 将验证配置添加到工作表
    // 标准xlsx库不支持，需要使用扩展库
    // 这里作为示例，将验证信息存储为自定义属性
    if (!ws['!dataValidation']) {
      ws['!dataValidation'] = []
    }

    // 添加数据验证规则
    ws['!dataValidation'].push({
      target: targetRange.value,
      type: selectedValidation.value,
      config: dvConfig,
      errorTitle: errorTitle.value,
      errorMessage: errorMessage.value
    })

    // 保存文件
    const defaultName = fileName.value.replace(/\.[^.]+$/, '') + '_validated.xlsx'
    const savePath = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })

    if (savePath) {
      const wbout = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' })
      await writeFile(savePath, new Uint8Array(wbout))

      notifySuccess('导出成功', `文件已保存至: ${savePath}\n注意：数据验证功能需要xlsx-js-style库支持才能在Excel中生效`)
    }
  } catch (e) {
    notifyError('导出失败', (e as Error).message)
  }
}

// 构建验证配置
const buildValidationConfig = () => {
  switch (selectedValidation.value) {
    case 'integer':
      return {
        operator: 'between',
        formula1: minValue.value,
        formula2: maxValue.value,
        allowBlank: true
      }

    case 'decimal':
      return {
        operator: 'between',
        formula1: minValue.value,
        formula2: maxValue.value,
        allowBlank: true
      }

    case 'textLength':
      return {
        operator: 'between',
        formula1: minLength.value,
        formula2: maxLength.value,
        allowBlank: true
      }

    case 'list':
      // 下拉列表选项
      const options = listOptions.value.split(',').map(s => s.trim()).filter(s => s)
      return {
        formula1: `"${options.join(',')}"`,
        allowBlank: true,
        showDropDown: true
      }

    default:
      return {}
  }
}

// 清空数据
const handleClear = () => {
  fileName.value = ''
  workbook.value = null
  fileArrayBuffer.value = null
  minValue.value = 0
  maxValue.value = 100
  minLength.value = 0
  maxLength.value = 50
  listOptions.value = '选项1,选项2,选项3'
  errorTitle.value = '输入错误'
  errorMessage.value = '请输入有效的数据'
  targetRange.value = 'A1:A100'
}

// 验证说明文本
const validationDescription = computed(() => {
  switch (selectedValidation.value) {
    case 'integer':
      return `限制单元格只能输入 ${minValue.value} 到 ${maxValue.value} 之间的整数`
    case 'decimal':
      return `限制单元格只能输入 ${minValue.value} 到 ${maxValue.value} 之间的数值（包括小数）`
    case 'textLength':
      return `限制单元格文本长度在 ${minLength.value} 到 ${maxLength.value} 个字符之间`
    case 'list':
      const options = listOptions.value.split(',').map(s => s.trim()).filter(s => s)
      return `限制单元格只能选择下拉列表中的选项：${options.join('、')}`
    default:
      return ''
  }
})
</script>

<template>
  <ToolLayout title="Excel数据验证工具" description="为Excel单元格添加数据验证规则">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <!-- 数据验证类型选择 -->
        <div class="flex-shrink-0">
          <div class="text-sm font-medium mb-2 text-gray-700">
            选择数据验证类型
          </div>
          <NSelect
            v-model:value="selectedValidation"
            :options="validationOptions"
            placeholder="请选择验证类型"
          />
        </div>

        <!-- 验证参数输入 -->
        <div class="flex-shrink-0">
          <!-- 整数/小数范围 -->
          <div v-if="selectedValidation === 'integer' || selectedValidation === 'decimal'" class="space-y-2">
            <div class="text-sm mb-1 text-gray-500">
              数值范围
            </div>
            <div class="flex gap-2 items-center">
              <NInputNumber
                v-model:value="minValue"
                placeholder="最小值"
                size="small"
              />
              <span class="text-gray-500">至</span>
              <NInputNumber
                v-model:value="maxValue"
                placeholder="最大值"
                size="small"
              />
            </div>
          </div>

          <!-- 文本长度限制 -->
          <div v-if="selectedValidation === 'textLength'" class="space-y-2">
            <div class="text-sm mb-1 text-gray-500">
              文本长度范围
            </div>
            <div class="flex gap-2 items-center">
              <NInputNumber
                v-model:value="minLength"
                placeholder="最小长度"
                size="small"
                :min="0"
              />
              <span class="text-gray-500">至</span>
              <NInputNumber
                v-model:value="maxLength"
                placeholder="最大长度"
                size="small"
                :min="1"
              />
            </div>
          </div>

          <!-- 下拉列表选项 -->
          <div v-if="selectedValidation === 'list'" class="space-y-2">
            <div class="text-sm mb-1 text-gray-500">
              下拉列表选项（用逗号分隔）
            </div>
            <NInput
              v-model:value="listOptions"
              placeholder="例如: 选项1,选项2,选项3"
              clearable
            />
          </div>

          <!-- 目标单元格范围 -->
          <div class="mt-4 space-y-2">
            <div class="text-sm mb-1 text-gray-500">
              目标单元格范围
            </div>
            <NInput
              v-model:value="targetRange"
              placeholder="例如: A1:A100 或 B1:B10"
              clearable
            />
          </div>

          <!-- 错误提示设置 -->
          <div class="mt-4 space-y-2">
            <div class="text-sm mb-1 text-gray-500">
              错误提示设置
            </div>
            <NInput
              v-model:value="errorTitle"
              placeholder="错误提示标题"
              size="small"
            />
            <NInput
              v-model:value="errorMessage"
              placeholder="错误提示消息"
              type="textarea"
              :rows="2"
            />
          </div>
        </div>

        <!-- 上传区域 -->
        <FileDropZone
          accept=".xlsx,.xls,.csv"
          :multiple="false"
          :show-file-list="false"
          class="flex-shrink-0"
          @files-selected="handleFileUpload"
        />

        <!-- 操作按钮 -->
        <div class="mt-4 flex gap-2 flex-shrink-0">
          <NButton
            type="primary"
            :disabled="!workbook"
            @click="handleExport"
          >
            <template #icon>
              <NIcon><DownloadOutline /></NIcon>
            </template>
            导出Excel
          </NButton>
          <NButton @click="handleClear" :disabled="!workbook">
            清空
          </NButton>
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
          <div class="flex items-center gap-2 px-3 py-1.5 border-b flex-shrink-0 border-gray-200 bg-gray-50">
            <NTag v-if="fileName" size="small" type="info">{{ fileName }}</NTag>
            <div class="flex-1"></div>
            <NButton
              v-if="workbook"
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
              v-if="fileArrayBuffer"
              :array-buffer="fileArrayBuffer"
              class="h-full"
            />
            <div v-else class="h-full flex items-center justify-center text-gray-400">
              <div class="text-center text-sm">
                <NIcon :size="48" class="mb-2 opacity-50">
                  <CheckmarkCircleOutline />
                </NIcon>
                <div>上传Excel文件后可在此预览数据</div>
                <div class="text-xs mt-1 opacity-70">支持 .xlsx / .xls / .csv 格式</div>
              </div>
            </div>
          </div>
        </div>
      </DetachablePreview>
    </template>
  </ToolLayout>
</template>