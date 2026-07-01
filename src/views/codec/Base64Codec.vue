<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NIcon, NSwitch, NFormItem, NForm, NRadioGroup, NRadio, NUpload, NUploadDragger, NText } from 'naive-ui'
import { SwapHorizontalOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'

const notification = useNotification()

const mode = ref<'text' | 'file'>('text')
const inputText = ref('')
const outputText = ref('')
const isProcessing = ref(false)
const inputFile = ref<File | null>(null)
const fileName = ref('')

const canEncode = computed(() => {
  if (mode.value === 'text') return inputText.value.length > 0
  return inputFile.value !== null
})

const canDecode = computed(() => {
  if (mode.value === 'text') return inputText.value.length > 0
  return inputFile.value !== null
})

const handleEncode = async () => {
  if (!canEncode.value) return
  isProcessing.value = true
  try {
    if (mode.value === 'text') {
      const encoder = new TextEncoder()
      const bytes = encoder.encode(inputText.value)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      outputText.value = btoa(binary)
      notification.success({ title: '编码成功', content: 'Base64编码完成' })
    } else {
      if (!inputFile.value) return
      const arrayBuffer = await inputFile.value.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const result = await invoke<string>('base64_encode_file_data', { data: Array.from(bytes) })
      outputText.value = result
      notification.success({ title: '编码成功', content: '文件Base64编码完成' })
    }
  } catch (e) {
    notification.error({ title: '编码失败', content: (e as Error).message })
  } finally {
    isProcessing.value = false
  }
}

const handleDecode = async () => {
  if (!canDecode.value) return
  isProcessing.value = true
  try {
    if (mode.value === 'text') {
      const binary = atob(inputText.value.trim())
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const decoder = new TextDecoder('utf-8')
      outputText.value = decoder.decode(bytes)
      notification.success({ title: '解码成功', content: 'Base64解码完成' })
    } else {
      if (!inputFile.value) return
      const text = await inputFile.value.text()
      const result = await invoke<number[]>('base64_decode_to_bytes', { data: text.trim() })
      const bytes = new Uint8Array(result)
      const blob = new Blob([bytes])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'decoded.bin'
      a.click()
      URL.revokeObjectURL(url)
      outputText.value = `解码成功，文件大小: ${bytes.length} 字节`
      notification.success({ title: '解码成功', content: 'Base64解码完成，文件已下载' })
    }
  } catch (e) {
    notification.error({ title: '解码失败', content: (e as Error).message })
  } finally {
    isProcessing.value = false
  }
}

const handleSwap = () => {
  if (mode.value === 'text') {
    const temp = inputText.value
    inputText.value = outputText.value
    outputText.value = temp
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
  inputFile.value = null
  fileName.value = ''
}

const handleFileUpload = (options: any) => {
  const file = options.file.file as File
  inputFile.value = file
  fileName.value = file.name
}
</script>

<template>
  <ToolLayout title="Base64编解码" description="支持文本和文件的Base64编码与解码">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NRadioGroup v-model:value="mode" @update:value="handleClear">
          <NRadio value="text">文本模式</NRadio>
          <NRadio value="file">文件模式</NRadio>
        </NRadioGroup>

        <div v-if="mode === 'text'" class="flex gap-2">
          <NButton type="primary" :disabled="!canEncode" :loading="isProcessing" @click="handleEncode">
            编码
          </NButton>
          <NButton type="success" :disabled="!canDecode" :loading="isProcessing" @click="handleDecode">
            解码
          </NButton>
          <NButton quaternary @click="handleSwap">
            <NIcon><SwapHorizontalOutline /></NIcon>
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>

        <div v-else class="flex gap-2">
          <NButton type="primary" :disabled="!canEncode" :loading="isProcessing" @click="handleEncode">
            编码为Base64
          </NButton>
          <NButton type="success" :disabled="!canDecode" :loading="isProcessing" @click="handleDecode">
            从Base64解码
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>

        <div v-if="mode === 'text'" class="flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">输入文本</div>
          <NInput
            v-model:value="inputText"
            type="textarea"
            placeholder="在此输入文本进行Base64编解码..."
            class="flex-1"
            style="min-height: 200px;"
          />
        </div>

        <div v-else class="flex-1 flex flex-col">
          <NUpload
            :show-file-list="false"
            :custom-request="handleFileUpload"
            accept="*"
          >
            <NUploadDragger>
              <div class="py-8">
                <div class="text-2xl mb-2">📁</div>
                <div v-if="fileName" class="text-blue-400">{{ fileName }}</div>
                <div v-else class="text-gray-400">点击或拖拽文件到此处</div>
                <div class="text-sm text-gray-500 mt-2">支持任意文件</div>
              </div>
            </NUploadDragger>
          </NUpload>
        </div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <ActionBar
          :showCopy="true"
          :showDownload="false"
          :showClear="true"
          :copyDisabled="!outputText"
          @copy="handleCopy"
          @clear="outputText = ''"
        />
        <div class="mt-4 flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">输出结果</div>
          <NInput
            :value="outputText"
            type="textarea"
            placeholder="结果将显示在这里..."
            readonly
            class="flex-1"
            style="min-height: 200px;"
          />
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
