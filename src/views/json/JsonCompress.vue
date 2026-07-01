<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NIcon, NFormItem, NForm, NSwitch } from 'naive-ui'
import { RemoveOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'

const notification = useNotification()

const inputText = ref('')
const outputText = ref('')
const removeComments = ref(false)
const escapeUnicode = ref(false)

const canCompress = computed(() => inputText.value.trim().length > 0)

const stripJsonComments = (str: string): string => {
  let result = ''
  let inString = false
  let inSingleComment = false
  let inMultiComment = false
  let i = 0

  while (i < str.length) {
    const char = str[i]
    const nextChar = str[i + 1]

    if (inSingleComment) {
      if (char === '\n') {
        inSingleComment = false
        result += char
      }
      i++
      continue
    }

    if (inMultiComment) {
      if (char === '*' && nextChar === '/') {
        inMultiComment = false
        i += 2
      } else {
        i++
      }
      continue
    }

    if (inString) {
      result += char
      if (char === '\\' && nextChar) {
        result += nextChar
        i += 2
        continue
      }
      if (char === '"') {
        inString = false
      }
      i++
      continue
    }

    if (char === '"') {
      inString = true
      result += char
      i++
      continue
    }

    if (char === '/' && nextChar === '/') {
      inSingleComment = true
      i += 2
      continue
    }

    if (char === '/' && nextChar === '*') {
      inMultiComment = true
      i += 2
      continue
    }

    result += char
    i++
  }

  return result
}

const handleCompress = () => {
  if (!canCompress.value) return
  try {
    let jsonStr = inputText.value

    if (removeComments.value) {
      jsonStr = stripJsonComments(jsonStr)
    }

    const obj = JSON.parse(jsonStr)

    if (escapeUnicode.value) {
      outputText.value = JSON.stringify(obj).replace(/[\u007f-\uffff]/g, c => {
        return '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')
      })
    } else {
      outputText.value = JSON.stringify(obj)
    }

    const originalSize = new Blob([inputText.value]).size
    const compressedSize = new Blob([outputText.value]).size
    const saved = originalSize - compressedSize
    const percent = originalSize > 0 ? ((saved / originalSize) * 100).toFixed(1) : '0'

    notification.success({
      title: '压缩成功',
      content: `压缩率: ${percent}% (节省 ${saved} 字节)`
    })
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
}

const handleDownload = async () => {
  if (!outputText.value) return
  try {
    const blob = new Blob([outputText.value], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compressed.json'
    a.click()
    URL.revokeObjectURL(url)
    notification.success({ title: '下载成功', content: '文件已保存' })
  } catch (e) {
    notification.error({ title: '下载失败', content: (e as Error).message })
  }
}
</script>

<template>
  <ToolLayout title="JSON压缩" description="去除空白字符，最小化JSON体积">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="去除注释">
            <div class="flex items-center gap-2">
              <NSwitch v-model:value="removeComments" />
              <span class="text-sm">支持 // 和 /* */ 注释</span>
            </div>
          </NFormItem>
          <NFormItem label="转义Unicode">
            <div class="flex items-center gap-2">
              <NSwitch v-model:value="escapeUnicode" />
              <span class="text-sm">中文等转义为\uXXXX</span>
            </div>
          </NFormItem>
        </NForm>
        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canCompress" @click="handleCompress">
            <template #icon>
              <NIcon><RemoveOutline /></NIcon>
            </template>
            压缩
          </NButton>
          <NButton @click="handleClear">清空</NButton>
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
          <div class="text-sm text-gray-400 mb-2">压缩结果</div>
          <NInput
            :value="outputText"
            type="textarea"
            placeholder="压缩结果将显示在这里..."
            readonly
            class="flex-1 font-mono text-xs"
            style="min-height: 200px;"
          />
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
