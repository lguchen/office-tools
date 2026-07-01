<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NIcon, NTag } from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import { useNotification } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'

const notification = useNotification()

const inputFile = ref<File | null>(null)
const fileName = ref('')
const imageUrl = ref('')
const resultText = ref('')
const isProcessing = ref(false)

const canScan = computed(() => inputFile.value !== null)

const handleFileUpload = (fileList: { name: string; path: string; size?: number; file?: File }[]) => {
  if (fileList.length === 0 || !fileList[0].file) return
  const file = fileList[0].file
  inputFile.value = file
  fileName.value = file.name
  resultText.value = ''

  const reader = new FileReader()
  reader.onload = (e) => {
    imageUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const handleScan = async () => {
  if (!canScan.value || !inputFile.value) return
  isProcessing.value = true
  try {
    const arrayBuffer = await inputFile.value.arrayBuffer()
    const data = Array.from(new Uint8Array(arrayBuffer))
    const result = await invoke<string>('scan_qrcode', { data })
    resultText.value = result
    notification.success({ title: '扫描成功', content: '二维码已识别' })
  } catch (e) {
    notification.error({ title: '扫描失败', content: (e as Error).message })
  } finally {
    isProcessing.value = false
  }
}

const handleCopy = async () => {
  if (!resultText.value) return
  try {
    await navigator.clipboard.writeText(resultText.value)
    notification.success({ title: '复制成功', content: '内容已复制到剪贴板' })
  } catch (e) {
    notification.error({ title: '复制失败', content: (e as Error).message })
  }
}

const handleClear = () => {
  inputFile.value = null
  fileName.value = ''
  imageUrl.value = ''
  resultText.value = ''
}

const isUrl = (text: string): boolean => {
  try {
    new URL(text)
    return true
  } catch {
    return false
  }
}
</script>

<template>
  <ToolLayout title="二维码扫描" description="上传图片识别二维码内容">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canScan" :loading="isProcessing" @click="handleScan">
            <template #icon>
              <NIcon><ScanOutline /></NIcon>
            </template>
            开始扫描
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>

        <FileDropZone
          :show-file-list="false"
          accept=".png,.jpg,.jpeg,.gif,.bmp"
          tips="点击或拖拽二维码图片到此处"
          @files-selected="handleFileUpload"
        />

        <div v-if="imageUrl" class="flex-1 min-h-0 overflow-auto bg-gray-800 rounded-lg p-4 flex items-center justify-center">
          <img :src="imageUrl" class="max-w-full max-h-64 object-contain" />
        </div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <ActionBar
          :showCopy="true"
          :showDownload="false"
          :showClear="true"
          :copyDisabled="!resultText"
          @copy="handleCopy"
          @clear="resultText = ''"
        />
        <div v-if="resultText" class="mt-4 flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2 flex items-center gap-2">
            识别结果
            <NTag v-if="isUrl(resultText)" size="small" type="success">URL</NTag>
          </div>
          <div class="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-4 overflow-auto">
            <p class="text-sm whitespace-pre-wrap break-all">{{ resultText }}</p>
            <a
              v-if="isUrl(resultText)"
              :href="resultText"
              target="_blank"
              class="mt-3 inline-block text-blue-400 hover:text-blue-300 text-sm"
            >
              在浏览器中打开 →
            </a>
          </div>
        </div>
        <div v-else class="mt-4 flex-1 flex items-center justify-center text-gray-500">
          扫描结果将显示在这里
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
