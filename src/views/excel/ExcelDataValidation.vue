<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NIcon, NUpload, NRadioGroup, NRadio, NInput, NInputNumber, NSpace, NTag, NDataTable, NScrollbar, NSelect } from 'naive-ui'
import { CloudUploadOutline, DownloadOutline, CheckmarkCircleOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
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
const workbook = ref<XLSX.WorkBook | null>(null)

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
const handleFileUpload = async (options: any) => {
  const file = options.file.file as File
  if (!file) return

  const validExtensions = ['.xlsx', '.xls']
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

  if (!validExtensions.includes(fileExt)) {
    notification.error({ title: '文件格式错误', content: '请上传 .xlsx 或 .xls 文件' })
    return
  }

  fileName.value = file.name

  try {
    const arrayBuffer = await file.arrayBuffer()
    const wb = XLSX.read(arrayBuffer, { type: 'array' })
    workbook.value = wb

    notification.success({
      title: '导入成功',
      content: `已导入文件，包含 ${wb.SheetNames.length} 个工作表`
    })
  } catch (e) {
    notification.error({ title: '导入失败', content: (e as Error).message })
  }
}

// 导出带数据验证的Excel
const handleExport = async () => {
  if (!workbook.value) {
    notification.warning({ title: '无文件', content: '请先上传Excel文件' })
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

      notification.success({
        title: '导出成功',
        content: `文件已保存至: ${savePath}\n注意：数据验证功能需要xlsx-js-style库支持才能在Excel中生效`
      })
    }
  } catch (e) {
    notification.error({ title: '导出失败', content: (e as Error).message })
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
          <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
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
            <div class="text-sm mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              数值范围
            </div>
            <div class="flex gap-2 items-center">
              <NInputNumber
                v-model:value="minValue"
                placeholder="最小值"
                size="small"
              />
              <span :class="isDark ? 'text-gray-400' : 'text-gray-500'">至</span>
              <NInputNumber
                v-model:value="maxValue"
                placeholder="最大值"
                size="small"
              />
            </div>
          </div>

          <!-- 文本长度限制 -->
          <div v-if="selectedValidation === 'textLength'" class="space-y-2">
            <div class="text-sm mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              文本长度范围
            </div>
            <div class="flex gap-2 items-center">
              <NInputNumber
                v-model:value="minLength"
                placeholder="最小长度"
                size="small"
                :min="0"
              />
              <span :class="isDark ? 'text-gray-400' : 'text-gray-500'">至</span>
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
            <div class="text-sm mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
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
            <div class="text-sm mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
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
            <div class="text-sm mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
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
        <NUpload
          :show-file-list="false"
          :custom-request="handleFileUpload"
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
            <div v-if="fileName" class="text-blue-400">{{ fileName }}</div>
            <div v-else :class="isDark ? 'text-gray-400' : 'text-gray-500'">点击上传Excel文件</div>
            <div class="text-xs mt-1" :class="isDark ? 'text-gray-500' : 'text-gray-400'">支持 .xlsx / .xls</div>
          </div>
        </NUpload>

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
      <div class="h-full flex flex-col">
        <!-- 验证配置预览 -->
        <div v-if="selectedValidation" class="flex-1">
          <div class="text-sm font-medium mb-3" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            当前配置预览
          </div>

          <!-- 配置卡片 -->
          <div
            class="p-4 rounded-lg space-y-3"
            :class="isDark ? 'bg-gray-700' : 'bg-gray-50'"
          >
            <!-- 验证类型 -->
            <div class="flex items-center gap-2">
              <NIcon :class="isDark ? 'text-blue-400' : 'text-blue-500'">
                <CheckmarkCircleOutline />
              </NIcon>
              <span class="font-medium" :class="isDark ? 'text-gray-200' : 'text-gray-700'">
                {{ validationOptions.find(o => o.value === selectedValidation)?.label }}
              </span>
            </div>

            <!-- 验证说明 -->
            <div
              class="text-sm"
              :class="isDark ? 'text-gray-400' : 'text-gray-600'"
            >
              {{ validationDescription }}
            </div>

            <!-- 目标范围 -->
            <div class="flex items-center gap-2">
              <NTag size="small" type="info">目标范围</NTag>
              <span :class="isDark ? 'text-gray-300' : 'text-gray-600'">{{ targetRange }}</span>
            </div>

            <!-- 错误提示 -->
            <div class="mt-2 p-2 rounded" :class="isDark ? 'bg-red-900/30' : 'bg-red-50'">
              <div class="text-xs font-medium text-red-400">{{ errorTitle }}</div>
              <div class="text-xs text-red-300">{{ errorMessage }}</div>
            </div>
          </div>

          <!-- 使用说明 -->
          <div class="mt-4">
            <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
              使用说明
            </div>
            <div class="space-y-2 text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              <p>1. 选择要应用的数据验证类型</p>
              <p>2. 设置验证规则的参数（范围值或下拉选项）</p>
              <p>3. 配置输入无效数据时的错误提示消息</p>
              <p>4. 指定要应用验证的单元格范围</p>
              <p>5. 上传Excel文件并导出</p>
            </div>
          </div>

          <!-- 注意事项 -->
          <div class="mt-4 p-3 rounded-lg" :class="isDark ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-50 text-yellow-600'">
            <div class="text-xs font-medium mb-1">注意事项</div>
            <div class="text-xs">
              数据验证功能导出需要xlsx-js-style库或ExcelJS库支持。
              当前使用标准xlsx库，验证规则可能无法在Excel中直接生效。
              建议安装xlsx-js-style库以获得完整的样式和数据验证支持。
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="flex-1 flex items-center justify-center" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
          <div class="text-center">
            <NIcon :size="48" class="mb-2 opacity-50">
              <CheckmarkCircleOutline />
            </NIcon>
            <div>选择数据验证类型后查看配置详情</div>
          </div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>