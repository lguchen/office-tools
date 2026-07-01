<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NInput, NButton, NIcon, NCard, NTag } from 'naive-ui'
import { CreateOutline, TrashOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useNotification } from 'naive-ui'

const notification = useNotification()

const inputText = ref('')

interface ValidationResult {
  valid: boolean
  message: string
  line?: number
  column?: number
  type?: string
}

const result = ref<ValidationResult | null>(null)

const validateJson = () => {
  if (!inputText.value.trim()) {
    result.value = null
    return
  }

  try {
    const obj = JSON.parse(inputText.value)
    const type = Array.isArray(obj) ? 'array' : typeof obj
    result.value = {
      valid: true,
      message: 'JSON格式正确',
      type
    }
  } catch (e) {
    const err = e as Error
    const match = err.message.match(/position (\d+)/)
    let line = 0
    let column = 0
    if (match) {
      const pos = parseInt(match[1])
      const lines = inputText.value.substring(0, pos).split('\n')
      line = lines.length
      column = lines[lines.length - 1].length + 1
    }
    result.value = {
      valid: false,
      message: err.message,
      line,
      column
    }
  }
}

const handleCopyError = async () => {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value.message)
    notification.success({ title: '复制成功', content: '错误信息已复制' })
  } catch (e) {
    notification.error({ title: '复制失败', content: (e as Error).message })
  }
}

const handleClear = () => {
  inputText.value = ''
  result.value = null
}

const typeLabel = computed(() => {
  if (!result.value?.type) return ''
  const typeMap: Record<string, string> = {
    object: '对象 (Object)',
    array: '数组 (Array)',
    string: '字符串 (String)',
    number: '数字 (Number)',
    boolean: '布尔值 (Boolean)',
    null: '空值 (Null)'
  }
  return typeMap[result.value.type] || result.value.type
})
</script>

<template>
  <ToolLayout title="JSON校验" description="实时校验JSON格式是否正确" :showOutput="false">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <div class="flex justify-between items-center">
          <div class="text-sm text-gray-400">输入JSON</div>
          <NButton size="small" @click="handleClear">清空</NButton>
        </div>
        <NInput
          v-model:value="inputText"
          type="textarea"
          placeholder="在此输入或粘贴JSON数据进行校验..."
          class="flex-1 font-mono text-sm"
          style="min-height: 200px;"
          @input="validateJson"
        />
      </div>
    </template>

    <template #output>
      <div class="space-y-4">
        <div class="text-lg font-semibold text-blue-400">校验结果</div>

        <div v-if="result === null" class="text-center py-12 text-gray-500">
          输入JSON后将自动校验
        </div>

        <div v-else-if="result.valid" class="space-y-4">
          <NCard class="border-green-600 bg-green-900/20">
            <div class="flex items-center gap-3">
              <NIcon size="32" class="text-green-400">
                <CheckmarkCircleOutline />
              </NIcon>
              <div>
                <div class="text-lg font-semibold text-green-400">JSON格式正确</div>
                <div v-if="typeLabel" class="text-sm text-gray-400 mt-1">
                  数据类型: <NTag size="small" type="success">{{ typeLabel }}</NTag>
                </div>
              </div>
            </div>
          </NCard>
        </div>

        <div v-else class="space-y-4">
          <NCard class="border-red-600 bg-red-900/20">
            <div class="flex items-center gap-3">
              <NIcon size="32" class="text-red-400">
                <CloseCircleOutline />
              </NIcon>
              <div>
                <div class="text-lg font-semibold text-red-400">JSON格式错误</div>
              </div>
            </div>
          </NCard>

          <NCard size="small">
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-400">错误信息</span>
                <NButton size="tiny" text @click="handleCopyError">复制</NButton>
              </div>
              <div class="text-red-400 font-mono text-xs break-all p-2 bg-gray-800 rounded">
                {{ result.message }}
              </div>
              <div v-if="result.line" class="flex gap-4 pt-2">
                <span class="text-gray-400">行号: <span class="text-white">{{ result.line }}</span></span>
                <span class="text-gray-400">列号: <span class="text-white">{{ result.column }}</span></span>
              </div>
            </div>
          </NCard>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
