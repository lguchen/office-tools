<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NInput, NButton, NIcon, NSelect, NFormItem, NForm, NSwitch } from 'naive-ui'
import { CreateOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'

const notification = useNotification()

const inputText = ref('')
const outputText = ref('')
const indentSize = ref<2 | 4>(2)
const sortKeys = ref(false)

const canFormat = computed(() => inputText.value.trim().length > 0)

const errorInfo = ref<{ line: number; column: number; message: string } | null>(null)

const handleFormat = () => {
  if (!canFormat.value) return
  try {
    const obj = JSON.parse(inputText.value)
    if (sortKeys.value) {
      const sorted = sortObjectKeys(obj)
      outputText.value = JSON.stringify(sorted, null, indentSize.value)
    } else {
      outputText.value = JSON.stringify(obj, null, indentSize.value)
    }
    errorInfo.value = null
    notification.success({ title: '格式化成功', content: 'JSON已格式化' })
  } catch (e) {
    const err = e as Error
    const match = err.message.match(/position (\d+)/)
    if (match) {
      const pos = parseInt(match[1])
      const lines = inputText.value.substring(0, pos).split('\n')
      errorInfo.value = {
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
        message: err.message
      }
    } else {
      errorInfo.value = { line: 0, column: 0, message: err.message }
    }
    notification.error({ title: '格式化失败', content: err.message })
  }
}

const sortObjectKeys = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  } else if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, any> = {}
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = sortObjectKeys(obj[key])
    })
    return sorted
  }
  return obj
}

const handleCompress = () => {
  if (!canFormat.value) return
  try {
    const obj = JSON.parse(inputText.value)
    outputText.value = JSON.stringify(obj)
    errorInfo.value = null
    notification.success({ title: '压缩成功', content: 'JSON已压缩' })
  } catch (e) {
    notification.error({ title: '压缩失败', content: (e as Error).message })
  }
}

const handleCopy = async () => {
  if (!outputText.value) return
  try {
    await navigator.clipboard.writeText(outputText.value)
    notification.success({ title: '复制成功', content: '结果已复制到剪贴板' })
  } catch (e) {
    notification.error({ title: '复制失败', content: (e as Error).message })
  }
}

const handleClear = () => {
  inputText.value = ''
  outputText.value = ''
  errorInfo.value = null
}

const handleDownload = async () => {
  if (!outputText.value) return
  try {
    const blob = new Blob([outputText.value], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'formatted.json'
    a.click()
    URL.revokeObjectURL(url)
    notification.success({ title: '下载成功', content: '文件已保存' })
  } catch (e) {
    notification.error({ title: '下载失败', content: (e as Error).message })
  }
}
</script>

<template>
  <ToolLayout title="JSON格式化" description="美化或压缩JSON数据，支持自定义缩进">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px" inline>
          <NFormItem label="缩进大小">
            <NSelect
              v-model:value="indentSize"
              :options="[
                { label: '2 空格', value: 2 },
                { label: '4 空格', value: 4 }
              ]"
              style="width: 120px;"
            />
          </NFormItem>
          <NFormItem label="按键排序">
            <NSwitch v-model:value="sortKeys" />
          </NFormItem>
        </NForm>
        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canFormat" @click="handleFormat">
            <template #icon>
              <NIcon><ColorFilterOutline /></NIcon>
            </template>
            格式化
          </NButton>
          <NButton :disabled="!canFormat" @click="handleCompress">
            压缩
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>
        <div v-if="errorInfo" class="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          <div class="font-semibold">JSON解析错误</div>
          <div>第 {{ errorInfo.line }} 行, 第 {{ errorInfo.column }} 列</div>
          <div class="text-xs mt-1">{{ errorInfo.message }}</div>
        </div>
        <div class="flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">输入JSON</div>
          <NInput
            v-model:value="inputText"
            type="textarea"
            placeholder="在此输入或粘贴JSON数据..."
            class="flex-1 font-mono text-sm"
            style="min-height: 200px;"
          />
        </div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <ActionBar
          :showCopy="true"
          :showDownload="true"
          :showClear="true"
          :copyDisabled="!outputText"
          :downloadDisabled="!outputText"
          @copy="handleCopy"
          @download="handleDownload"
          @clear="outputText = ''"
        />
        <div class="mt-4 flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">输出结果</div>
          <NInput
            :value="outputText"
            type="textarea"
            placeholder="格式化结果将显示在这里..."
            readonly
            class="flex-1 font-mono text-sm"
            style="min-height: 200px;"
          />
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
