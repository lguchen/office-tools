<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NIcon, NSwitch, NFormItem, NForm, NRadioGroup, NRadio, NText } from 'naive-ui'
import { SwapHorizontalOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import { invoke } from '@tauri-apps/api/core'
import { notifySuccess, notifyError } from '../../composables/useNotification'

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
      notifySuccess('编码成功', 'Base64编码完成')
    } else {
      if (!inputFile.value) return
      const arrayBuffer = await inputFile.value.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const result = await invoke<string>('base64_encode_file_data', { data: Array.from(bytes) })
      outputText.value = result
      notifySuccess('编码成功', '文件Base64编码完成')
    }
  } catch (e) {
    notifyError('编码失败', (e as Error).message)
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
      notifySuccess('解码成功', 'Base64解码完成')
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
      notifySuccess('解码成功', 'Base64解码完成，文件已下载')
    }
  } catch (e) {
    notifyError('解码失败', (e as Error).message)
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
    notifySuccess('复制成功', '结果已复制到剪贴板')
  } catch (e) {
    notifyError('复制失败', (e as Error).message)
  }
}

const handleClear = () => {
  inputText.value = ''
  outputText.value = ''
  inputFile.value = null
  fileName.value = ''
}

const handleFileUpload = (fileList: { name: string; path: string; size?: number; file?: File }[]) => {
  if (fileList.length === 0 || !fileList[0].file) return
  const file = fileList[0].file
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
          <FileDropZone
            :show-file-list="false"
            accept="*"
            tips="点击或拖拽文件到此处"
            @files-selected="handleFileUpload"
          />
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
