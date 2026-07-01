<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NIcon, NUpload, NUploadDragger, NFormItem, NForm, NTag } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'

const notification = useNotification()

const inputFile = ref<File | null>(null)
const fileName = ref('')
const inputImageUrl = ref('')
const outputFormat = ref('png')
const isProcessing = ref(false)
const outputBlobUrl = ref('')
const outputSize = ref(0)

const formats = ['png', 'jpg', 'webp', 'gif', 'bmp', 'tiff']

const canConvert = computed(() => inputFile.value !== null)

const handleFileUpload = (options: any) => {
  const file = options.file.file as File
  inputFile.value = file
  fileName.value = file.name
  outputBlobUrl.value = ''
  outputSize.value = 0

  const reader = new FileReader()
  reader.onload = (e) => {
    inputImageUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const handleConvert = async () => {
  if (!canConvert.value || !inputFile.value) return
  isProcessing.value = true
  try {
    const arrayBuffer = await inputFile.value.arrayBuffer()
    const data = Array.from(new Uint8Array(arrayBuffer))

    const result = await invoke<number[]>('convert_image_format_data', {
      data,
      format: outputFormat.value
    })

    const bytes = new Uint8Array(result)
    outputSize.value = bytes.length
    const blob = new Blob([bytes], { type: `image/${outputFormat.value}` })
    outputBlobUrl.value = URL.createObjectURL(blob)
    notification.success({ title: '转换成功', content: `已转换为 ${outputFormat.value.toUpperCase()} 格式` })
  } catch (e) {
    notification.error({ title: '转换失败', content: (e as Error).message })
  } finally {
    isProcessing.value = false
  }
}

const handleDownload = async () => {
  if (!outputBlobUrl.value) return
  try {
    const ext = outputFormat.value
    const defaultName = fileName.value.replace(/\.[^.]+$/, '') + '.' + ext
    const savePath = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Image', extensions: [ext] }]
    })
    if (savePath) {
      const response = await fetch(outputBlobUrl.value)
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
  outputBlobUrl.value = ''
  outputSize.value = 0
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <ToolLayout title="格式转换" description="图片格式互转，支持PNG/JPG/WebP/GIF/BMP/TIFF">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="目标格式">
            <div class="flex gap-2 flex-wrap">
              <NButton
                v-for="fmt in formats"
                :key="fmt"
                :type="outputFormat === fmt ? 'primary' : 'default'"
                size="small"
                @click="outputFormat = fmt"
              >
                {{ fmt.toUpperCase() }}
              </NButton>
            </div>
          </NFormItem>
        </NForm>

        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canConvert" :loading="isProcessing" @click="handleConvert">
            <template #icon>
              <NIcon><RepeatOutline /></NIcon>
            </template>
            开始转换
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
              <div class="text-sm text-gray-500 mt-2">支持 JPG / PNG / WebP / GIF / BMP / TIFF</div>
            </div>
          </NUploadDragger>
        </NUpload>

        <div v-if="inputImageUrl" class="flex-1 min-h-0 flex flex-col">
          <div class="text-sm text-gray-400 mb-2">原图预览</div>
          <div class="flex-1 overflow-auto bg-gray-800 rounded-lg p-2 flex items-center justify-center">
            <img :src="inputImageUrl" class="max-w-full max-h-full object-contain" />
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
          :downloadDisabled="!outputBlobUrl"
          @download="handleDownload"
          @clear="outputBlobUrl = ''"
        />
        <div v-if="outputBlobUrl" class="mt-4 flex-1 min-h-0 flex flex-col">
          <div class="text-sm text-gray-400 mb-2 flex justify-between">
            <span>转换结果</span>
            <NTag size="small" type="success">{{ formatFileSize(outputSize) }}</NTag>
          </div>
          <div class="flex-1 overflow-auto bg-gray-800 rounded-lg p-2 flex items-center justify-center">
            <img :src="outputBlobUrl" class="max-w-full max-h-full object-contain" />
          </div>
        </div>
        <div v-else class="mt-4 flex-1 flex items-center justify-center text-gray-500">
          转换结果将显示在这里
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
