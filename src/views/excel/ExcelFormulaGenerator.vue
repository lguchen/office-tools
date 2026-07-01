<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NSelect, NRadioGroup, NRadio, NInput, NButton, NIcon, NCard, NSpace, NInputGroup, NInputGroupLabel } from 'naive-ui'
import { CopyOutline, RefreshOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useNotification } from 'naive-ui'
import { useSettingsStore } from '../../stores/settings'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

// 公式类型定义
interface FormulaType {
  label: string
  value: string
  params: string[]
  description: string
  example: string
}

// 可用的公式类型
const formulaTypes: FormulaType[] = [
  {
    label: 'SUM - 求和',
    value: 'SUM',
    params: ['range'],
    description: '计算一组数值的总和',
    example: 'SUM(A1:A10)'
  },
  {
    label: 'AVERAGE - 平均值',
    value: 'AVERAGE',
    params: ['range'],
    description: '计算一组数值的算术平均值',
    example: 'AVERAGE(A1:A10)'
  },
  {
    label: 'COUNT - 计数',
    value: 'COUNT',
    params: ['range'],
    description: '计算包含数字的单元格个数',
    example: 'COUNT(A1:A10)'
  },
  {
    label: 'COUNTA - 非空计数',
    value: 'COUNTA',
    params: ['range'],
    description: '计算非空单元格的个数',
    example: 'COUNTA(A1:A10)'
  },
  {
    label: 'SUMIF - 条件求和',
    value: 'SUMIF',
    params: ['range', 'criteria', 'sumRange'],
    description: '对满足条件的单元格求和',
    example: 'SUMIF(A1:A10, ">100") 或 SUMIF(A1:A10, "苹果", B1:B10)'
  },
  {
    label: 'COUNTIF - 条件计数',
    value: 'COUNTIF',
    params: ['range', 'criteria'],
    description: '计算满足条件的单元格个数',
    example: 'COUNTIF(A1:A10, ">100")'
  },
  {
    label: 'IF - 条件判断',
    value: 'IF',
    params: ['condition', 'trueValue', 'falseValue'],
    description: '根据条件返回不同的值',
    example: 'IF(A1>100, "高", "低")'
  },
  {
    label: 'VLOOKUP - 垂直查找',
    value: 'VLOOKUP',
    params: ['lookupValue', 'tableArray', 'colIndex', 'rangeLookup'],
    description: '在表格首列查找指定值，返回同行指定列的值',
    example: 'VLOOKUP(A1, B1:D10, 2, FALSE)'
  },
  {
    label: 'CONCATENATE - 文本连接',
    value: 'CONCATENATE',
    params: ['text1', 'text2', 'text3'],
    description: '将多个文本字符串合并为一个',
    example: 'CONCATENATE(A1, " ", B1)'
  },
  {
    label: 'MAX - 最大值',
    value: 'MAX',
    params: ['range'],
    description: '返回一组数值中的最大值',
    example: 'MAX(A1:A10)'
  },
  {
    label: 'MIN - 最小值',
    value: 'MIN',
    params: ['range'],
    description: '返回一组数值中的最小值',
    example: 'MIN(A1:A10)'
  }
]

// 当前选中的公式类型
const selectedFormula = ref<string>('SUM')

// 参数输入
const params = ref<Record<string, string>>({
  range: '',
  criteria: '',
  sumRange: '',
  condition: '',
  trueValue: '',
  falseValue: '',
  lookupValue: '',
  tableArray: '',
  colIndex: '',
  rangeLookup: 'FALSE',
  text1: '',
  text2: '',
  text3: ''
})

// 参数标签映射
const paramLabels: Record<string, string> = {
  range: '数据范围',
  criteria: '条件',
  sumRange: '求和范围',
  condition: '条件表达式',
  trueValue: '条件为真时的值',
  falseValue: '条件为假时的值',
  lookupValue: '查找值',
  tableArray: '表格范围',
  colIndex: '列索引',
  rangeLookup: '匹配类型',
  text1: '文本1',
  text2: '文本2',
  text3: '文本3'
}

// 参数占位符映射
const paramPlaceholders: Record<string, string> = {
  range: '例如: A1:A10',
  criteria: '例如: >100 或 "苹果"',
  sumRange: '例如: B1:B10',
  condition: '例如: A1>100',
  trueValue: '例如: 高',
  falseValue: '例如: 低',
  lookupValue: '例如: A1 或 "苹果"',
  tableArray: '例如: B1:D10',
  colIndex: '例如: 2',
  rangeLookup: 'FALSE(精确匹配) 或 TRUE(近似匹配)',
  text1: '例如: A1 或 "你好"',
  text2: '例如: B1 或 "世界"',
  text3: '例如: C1 或 "!"'
}

// 获取当前公式信息
const currentFormulaInfo = computed(() => {
  return formulaTypes.find(f => f.value === selectedFormula.value)
})

// 生成公式
const generatedFormula = computed(() => {
  const formula = currentFormulaInfo.value
  if (!formula) return ''

  const { value, params: paramNames } = formula

  switch (value) {
    case 'SUM':
    case 'AVERAGE':
    case 'COUNT':
    case 'COUNTA':
    case 'MAX':
    case 'MIN':
      return params.value.range ? `${value}(${params.value.range})` : ''

    case 'COUNTIF':
      if (params.value.range && params.value.criteria) {
        return `COUNTIF(${params.value.range}, ${formatCriteria(params.value.criteria)})`
      }
      return ''

    case 'SUMIF':
      if (params.value.range && params.value.criteria) {
        const sumRange = params.value.sumRange ? `, ${params.value.sumRange}` : ''
        return `SUMIF(${params.value.range}, ${formatCriteria(params.value.criteria)}${sumRange})`
      }
      return ''

    case 'IF':
      if (params.value.condition) {
        const trueVal = formatValue(params.value.trueValue)
        const falseVal = formatValue(params.value.falseValue)
        return `IF(${params.value.condition}, ${trueVal}, ${falseVal})`
      }
      return ''

    case 'VLOOKUP':
      if (params.value.lookupValue && params.value.tableArray && params.value.colIndex) {
        const lookupVal = formatValue(params.value.lookupValue)
        const rangeLookup = params.value.rangeLookup || 'FALSE'
        return `VLOOKUP(${lookupVal}, ${params.value.tableArray}, ${params.value.colIndex}, ${rangeLookup})`
      }
      return ''

    case 'CONCATENATE':
      const texts = [params.value.text1, params.value.text2, params.value.text3]
        .filter(t => t)
        .map(t => formatValue(t))
      if (texts.length >= 2) {
        return `CONCATENATE(${texts.join(', ')})`
      }
      return ''

    default:
      return ''
  }
})

// 格式化条件值
const formatCriteria = (value: string): string => {
  // 如果是数字或比较表达式，直接返回
  if (/^[\d.]+$/.test(value) || /^[<>!=]/.test(value)) {
    return value
  }
  // 否则添加引号
  return `"${value}"`
}

// 格式化值（添加引号如果不是单元格引用或数字）
const formatValue = (value: string): string => {
  if (!value) return '""'
  // 单元格引用
  if (/^[A-Za-z]+\d+$/.test(value)) return value
  // 数字
  if (/^-?[\d.]+$/.test(value)) return value
  // 已有引号
  if (value.startsWith('"') && value.endsWith('"')) return value
  return `"${value}"`
}

// 公式解释
const formulaExplanation = computed(() => {
  const formula = currentFormulaInfo.value
  if (!formula) return ''

  let explanation = `**${formula.value}** 函数: ${formula.description}\n\n`

  switch (formula.value) {
    case 'SUM':
      explanation += `- **数据范围**: 需要求和的单元格范围\n- **示例**: ${formula.example} 计算 A1 到 A10 所有数值的总和`
      break
    case 'AVERAGE':
      explanation += `- **数据范围**: 需要计算平均值的单元格范围\n- **示例**: ${formula.example} 计算 A1 到 A10 所有数值的平均值`
      break
    case 'COUNT':
      explanation += `- **数据范围**: 需要计数的单元格范围\n- **示例**: ${formula.example} 统计 A1 到 A10 中包含数字的单元格个数`
      break
    case 'COUNTA':
      explanation += `- **数据范围**: 需要计数的单元格范围\n- **示例**: ${formula.example} 统计 A1 到 A10 中非空单元格的个数`
      break
    case 'COUNTIF':
      explanation += `- **数据范围**: 需要计数的单元格范围\n- **条件**: 计数条件，支持比较运算符(>, <, =等)\n- **示例**: ${formula.example} 统计 A1 到 A10 中大于 100 的单元格个数`
      break
    case 'SUMIF':
      explanation += `- **数据范围**: 用于条件判断的单元格范围\n- **条件**: 求和条件\n- **求和范围** (可选): 实际求和的单元格范围\n- **示例**: ${formula.example}`
      break
    case 'IF':
      explanation += `- **条件表达式**: 判断条件\n- **条件为真时的值**: 条件成立时返回的值\n- **条件为假时的值**: 条件不成立时返回的值\n- **示例**: ${formula.example}`
      break
    case 'VLOOKUP':
      explanation += `- **查找值**: 要查找的值\n- **表格范围**: 包含数据的表格范围\n- **列索引**: 要返回的列号(从1开始)\n- **匹配类型**: FALSE=精确匹配, TRUE=近似匹配\n- **示例**: ${formula.example}`
      break
    case 'CONCATENATE':
      explanation += `- **文本1/2/3**: 要连接的文本或单元格引用\n- **示例**: ${formula.example} 将 A1 和 B1 的内容连接，中间加空格`
      break
    case 'MAX':
      explanation += `- **数据范围**: 需要查找最大值的单元格范围\n- **示例**: ${formula.example} 返回 A1 到 A10 中的最大值`
      break
    case 'MIN':
      explanation += `- **数据范围**: 需要查找最小值的单元格范围\n- **示例**: ${formula.example} 返回 A1 到 A10 中的最小值`
      break
  }

  return explanation
})

// 监听公式类型变化，重置参数
watch(selectedFormula, () => {
  // 保留一些通用参数
  const range = params.value.range
  params.value = {
    range: range,
    criteria: '',
    sumRange: '',
    condition: '',
    trueValue: '',
    falseValue: '',
    lookupValue: '',
    tableArray: '',
    colIndex: '',
    rangeLookup: 'FALSE',
    text1: '',
    text2: '',
    text3: ''
  }
})

// 复制公式到剪贴板
const handleCopy = async () => {
  if (!generatedFormula.value) {
    notification.warning({ title: '无法复制', content: '请先完整填写参数' })
    return
  }

  try {
    await navigator.clipboard.writeText(generatedFormula.value)
    notification.success({ title: '复制成功', content: '公式已复制到剪贴板' })
  } catch (e) {
    notification.error({ title: '复制失败', content: '请手动复制公式' })
  }
}

// 重置所有参数
const handleReset = () => {
  params.value = {
    range: '',
    criteria: '',
    sumRange: '',
    condition: '',
    trueValue: '',
    falseValue: '',
    lookupValue: '',
    tableArray: '',
    colIndex: '',
    rangeLookup: 'FALSE',
    text1: '',
    text2: '',
    text3: ''
  }
}
</script>

<template>
  <ToolLayout title="Excel公式生成器" description="快速生成常用的Excel公式">
    <template #input>
      <div class="space-y-4">
        <!-- 公式类型选择 -->
        <div>
          <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            选择公式类型
          </div>
          <NSelect
            v-model:value="selectedFormula"
            :options="formulaTypes.map(f => ({ label: f.label, value: f.value }))"
            placeholder="请选择公式类型"
          />
        </div>

        <!-- 参数输入区 -->
        <div v-if="currentFormulaInfo">
          <div class="text-sm font-medium mb-3" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            参数设置
          </div>
          <div class="space-y-3">
            <!-- 基础范围参数 -->
            <div v-if="currentFormulaInfo.params.includes('range')">
              <NInputGroup>
                <NInputGroupLabel :style="{ width: '100px' }">{{ paramLabels.range }}</NInputGroupLabel>
                <NInput
                  v-model:value="params.range"
                  :placeholder="paramPlaceholders.range"
                  clearable
                />
              </NInputGroup>
            </div>

            <!-- 条件参数 -->
            <div v-if="currentFormulaInfo.params.includes('criteria')">
              <NInputGroup>
                <NInputGroupLabel :style="{ width: '100px' }">{{ paramLabels.criteria }}</NInputGroupLabel>
                <NInput
                  v-model:value="params.criteria"
                  :placeholder="paramPlaceholders.criteria"
                  clearable
                />
              </NInputGroup>
            </div>

            <!-- 求和范围 -->
            <div v-if="currentFormulaInfo.params.includes('sumRange')">
              <NInputGroup>
                <NInputGroupLabel :style="{ width: '100px' }">{{ paramLabels.sumRange }}</NInputGroupLabel>
                <NInput
                  v-model:value="params.sumRange"
                  :placeholder="paramPlaceholders.sumRange"
                  clearable
                />
              </NInputGroup>
            </div>

            <!-- IF条件 -->
            <div v-if="currentFormulaInfo.params.includes('condition')">
              <NInputGroup>
                <NInputGroupLabel :style="{ width: '100px' }">{{ paramLabels.condition }}</NInputGroupLabel>
                <NInput
                  v-model:value="params.condition"
                  :placeholder="paramPlaceholders.condition"
                  clearable
                />
              </NInputGroup>
            </div>

            <div v-if="currentFormulaInfo.params.includes('trueValue')">
              <NInputGroup>
                <NInputGroupLabel :style="{ width: '100px' }">{{ paramLabels.trueValue }}</NInputGroupLabel>
                <NInput
                  v-model:value="params.trueValue"
                  :placeholder="paramPlaceholders.trueValue"
                  clearable
                />
              </NInputGroup>
            </div>

            <div v-if="currentFormulaInfo.params.includes('falseValue')">
              <NInputGroup>
                <NInputGroupLabel :style="{ width: '100px' }">{{ paramLabels.falseValue }}</NInputGroupLabel>
                <NInput
                  v-model:value="params.falseValue"
                  :placeholder="paramPlaceholders.falseValue"
                  clearable
                />
              </NInputGroup>
            </div>

            <!-- VLOOKUP参数 -->
            <div v-if="currentFormulaInfo.params.includes('lookupValue')">
              <NInputGroup>
                <NInputGroupLabel :style="{ width: '100px' }">{{ paramLabels.lookupValue }}</NInputGroupLabel>
                <NInput
                  v-model:value="params.lookupValue"
                  :placeholder="paramPlaceholders.lookupValue"
                  clearable
                />
              </NInputGroup>
            </div>

            <div v-if="currentFormulaInfo.params.includes('tableArray')">
              <NInputGroup>
                <NInputGroupLabel :style="{ width: '100px' }">{{ paramLabels.tableArray }}</NInputGroupLabel>
                <NInput
                  v-model:value="params.tableArray"
                  :placeholder="paramPlaceholders.tableArray"
                  clearable
                />
              </NInputGroup>
            </div>

            <div v-if="currentFormulaInfo.params.includes('colIndex')">
              <NInputGroup>
                <NInputGroupLabel :style="{ width: '100px' }">{{ paramLabels.colIndex }}</NInputGroupLabel>
                <NInput
                  v-model:value="params.colIndex"
                  :placeholder="paramPlaceholders.colIndex"
                  clearable
                />
              </NInputGroup>
            </div>

            <div v-if="currentFormulaInfo.params.includes('rangeLookup')">
              <div class="text-sm mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                {{ paramLabels.rangeLookup }}
              </div>
              <NRadioGroup v-model:value="params.rangeLookup">
                <NSpace>
                  <NRadio value="FALSE">精确匹配</NRadio>
                  <NRadio value="TRUE">近似匹配</NRadio>
                </NSpace>
              </NRadioGroup>
            </div>

            <!-- CONCATENATE参数 -->
            <div v-if="currentFormulaInfo.params.includes('text1')">
              <NInputGroup>
                <NInputGroupLabel :style="{ width: '100px' }">{{ paramLabels.text1 }}</NInputGroupLabel>
                <NInput
                  v-model:value="params.text1"
                  :placeholder="paramPlaceholders.text1"
                  clearable
                />
              </NInputGroup>
            </div>

            <div v-if="currentFormulaInfo.params.includes('text2')">
              <NInputGroup>
                <NInputGroupLabel :style="{ width: '100px' }">{{ paramLabels.text2 }}</NInputGroupLabel>
                <NInput
                  v-model:value="params.text2"
                  :placeholder="paramPlaceholders.text2"
                  clearable
                />
              </NInputGroup>
            </div>

            <div v-if="currentFormulaInfo.params.includes('text3')">
              <NInputGroup>
                <NInputGroupLabel :style="{ width: '100px' }">{{ paramLabels.text3 }}</NInputGroupLabel>
                <NInput
                  v-model:value="params.text3"
                  :placeholder="paramPlaceholders.text3"
                  clearable
                />
              </NInputGroup>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex gap-2">
          <NButton type="primary" :disabled="!generatedFormula" @click="handleCopy">
            <template #icon>
              <NIcon><CopyOutline /></NIcon>
            </template>
            复制公式
          </NButton>
          <NButton @click="handleReset">
            <template #icon>
              <NIcon><RefreshOutline /></NIcon>
            </template>
            重置
          </NButton>
        </div>
      </div>
    </template>

    <template #output>
      <div class="space-y-4 h-full flex flex-col">
        <!-- 生成的公式 -->
        <div>
          <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            生成的公式
          </div>
          <NInput
            :value="generatedFormula || '请填写完整参数...'"
            readonly
            size="large"
            :style="{
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: '16px',
              backgroundColor: isDark ? '#1f2937' : '#f9fafb'
            }"
            :class="{ 'text-blue-500': generatedFormula }"
          />
        </div>

        <!-- 公式解释 -->
        <div class="flex-1">
          <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            公式说明
          </div>
          <div
            class="p-4 rounded-lg text-sm leading-relaxed"
            :class="isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'"
            v-html="formulaExplanation.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')"
          />
        </div>

        <!-- 快捷参考 -->
        <div>
          <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            快捷参考
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div
              class="p-2 rounded"
              :class="isDark ? 'bg-gray-700' : 'bg-gray-50'"
            >
              <span class="font-medium">单元格引用:</span> A1, B2:C10
            </div>
            <div
              class="p-2 rounded"
              :class="isDark ? 'bg-gray-700' : 'bg-gray-50'"
            >
              <span class="font-medium">比较运算:</span> >, <, >=, <=, =, <>
            </div>
            <div
              class="p-2 rounded"
              :class="isDark ? 'bg-gray-700' : 'bg-gray-50'"
            >
              <span class="font-medium">文本:</span> 用双引号包裹
            </div>
            <div
              class="p-2 rounded"
              :class="isDark ? 'bg-gray-700' : 'bg-gray-50'"
            >
              <span class="font-medium">绝对引用:</span> $A$1, $B$1:$B$10
            </div>
          </div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>