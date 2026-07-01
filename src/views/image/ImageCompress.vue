<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NIcon, NUpload, NUploadDragger, NSlider, NFormItem, NForm, NTag } from 'naive-ui'
import { FileTrayFullOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import ImagePreview from '../../components/common/ImagePreview.vue'
import { useNotification } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile } from '@tauri-apps/plugin-fs'

const notification = useNotification()

const inputFile = ref<File | null>(null)
const fileName = ref('')
const inputImageUrl = ref('')
const outputImageUrl = ref('')
const outputSize = ref(0)
const quality = ref(75)
const format = ref('jpg')
const isProcessing = ref(false)
const originalSize = ref(0)

const canCompress = computed(() => inputFile.value !== null)

const handleFileUpload = async (options: any) => {
  const file = options.file.file as File
  inputFile.value = file
  fileName.value = file.name
  originalSize.value = file.size
  outputImageUrl.value = ''
  outputSize.value = 0

  const reader = new FileReader()
  reader.onload = (e) => {
    inputImageUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const handleCompress = async () => {
  if (!canCompress.value || !inputFile.value) return
  isProcessing.value = true
  try {
    const arrayBuffer = await inputFile.value.arrayBuffer()
    const data = Array.from(new Uint8Array(arrayBuffer))

    const result = await invoke<{ data: number[]; size: number }>('compress_image_data', {
      data,
      quality: quality.value,
      format: format.value
    })

    const bytes = new Uint8Array(result.data)
    outputSize.value = result.size || bytes.length
    const blob = new Blob([bytes], { type: `image/${format.value}` })
    outputImageUrl.value = URL.createObjectURL(blob)
    const savedPercent = originalSize.value > 0
      ? (((originalSize.value - outputSize.value) / originalSize.value) * 100).toFixed(1)
      : '0'
    notification.success({
      title: '压缩成功',
      content: `压缩率: ${savedPercent}% (${formatFileSize(originalSize.value)} → ${formatFileSize(outputSize.value)})`
    })
  } catch (e) {
    notification.error({ title: '压缩失败', content: (e as Error).message })
  } finally {
    isProcessing.value = false
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const handleDownload = async () => {
  if (!outputImageUrl.value) return
  try {
    const ext = format.value
    const defaultName = fileName.value.replace(/\.[^.]+$/, '') + `_compressed.${ext}`
    const savePath = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Image', extensions: [ext] }]
    })
    if (savePath) {
      const response = await fetch(outputImageUrl.value)
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      await writeFile(savePath, new Uint8Array(arrayBuffer))
      notification.success({ title: '保存成功', content: '图片已保存' })
    }
  } catch (e) {
    notification.error({ title: '保存失败', content: (e as Error).message })
  }
}

const handleClear = () => {
  inputFile.value = null
  fileName.value = ''
  inputImageUrl.value = ''
  outputImageUrl.value = ''
  outputSize.value = 0
  originalSize.value = 0
}

const compressionRatio = computed(() => {
  if (originalSize.value === 0 || outputSize.value === 0) return 0
  return (1 - outputSize.value / originalSize.value) * 100
})
</script>

<template>
  <ToolLayout title="图片压缩" description="压缩图片体积，支持JPG/PNG/WebP格式">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="输出格式">
            <div class="flex gap-2">
              <NButton
                v-for="fmt in ['jpg', 'png', 'webp']"
                :key="fmt"
                :type="format === fmt ? 'primary' : 'default'"
                size="small"
                @click="format = fmt as 'jpg' | 'png' | 'webp'"
              >
                {{ fmt.toUpperCase() }}
              </NButton>
            </div>
          </NFormItem>
          <NFormItem label="压缩质量">
            <div class="w-48">
              <NSlider v-model:value="quality" :min="1" :max="100" :tooltip="true" />
            </div>
          </NFormItem>
        </NForm>

        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canCompress" :loading="isProcessing" @click="handleCompress">
            <template #icon>
              <NIcon><FileTrayFullOutline /></NIcon>
            </template>
            压缩图片
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>

        <NUpload
          :show-file-list="false"
          :custom-request="handleFileUpload"
          accept="image/*"
        >
          <NUploadDragger>
            <div class="py-6">
              <div class="text-3xl mb-2">🖼️</div>
              <div v-if="fileName" class="text-blue-400">{{ fileName }}</div>
              <div v-else class="text-gray-400">点击或拖拽图片到此处</div>
              <div class="text-sm text-gray-500 mt-2">支持 JPG / PNG / WebP / GIF / BMP</div>
            </div>
          </NUploadDragger>
        </NUpload>

        <div v-if="inputImageUrl" class="flex-1 min-h-0 flex flex-col">
          <div class="text-sm text-gray-400 mb-2 flex justify-between">
            <span>原图预览</span>
            <NTag size="small" type="info">{{ formatFileSize(originalSize) }}</NTag>
          </div>
          <div class="flex-1 flex items-center justify-center">
            <ImagePreview :src="inputImageUrl" />
          </div>
        </div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <ActionBar
          :showCopy="false"
          :showDownload="true"
          :showClear="true"
          :downloadDisabled="!outputImageUrl"
          @download="handleDownload"
          @clear="outputImageUrl = ''"
        />
        <div v-if="outputImageUrl" class="mt-4 flex-1 min-h-0 flex flex-col">
          <div class="text-sm text-gray-400 mb-2 flex justify-between">
            <span>压缩结果</span>
            <div class="flex gap-2">
              <NTag size="small" type="success">{{ formatFileSize(outputSize) }}</NTag>
              <NTag v-if="compressionRatio > 0" size="small" type="success">节省 {{ compressionRatio.toFixed(1) }}%</NTag>
            </div>
          </div>
          <div class="flex-1 flex items-center justify-center">
            <ImagePreview :src="outputImageUrl" />
          </div>
        </div>
        <div v-else class="mt-4 flex-1 flex items-center justify-center text-gray-500">
          压缩结果将显示在这里
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
