<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NInputNumber, NButton, NIcon, NFormItem, NForm, NSwitch, NTag } from 'naive-ui'
import { CropOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import ImagePreview from '../../components/common/ImagePreview.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import { notifySuccess, notifyError } from '../../composables/useNotification'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'

const inputFile = ref<File | null>(null)
const fileName = ref('')
const inputImageUrl = ref('')
const outputBlobUrl = ref('')
const outputSize = ref(0)
const originalWidth = ref(0)
const originalHeight = ref(0)
const width = ref(0)
const height = ref(0)
const keepAspect = ref(true)
const isProcessing = ref(false)
const mode = ref<'pixels' | 'percent'>('pixels')
const percent = ref(100)

const canResize = computed(() => inputFile.value !== null && width.value > 0 && height.value > 0)

const handleFileUpload = (files: { name: string; path: string; size?: number; file?: File }[]) => {
  const file = files[0]?.file
  if (!file) return
  inputFile.value = file
  fileName.value = file.name
  outputBlobUrl.value = ''
  outputSize.value = 0

  const reader = new FileReader()
  reader.onload = (e) => {
    inputImageUrl.value = e.target?.result as string
    const img = new Image()
    img.onload = () => {
      originalWidth.value = img.width
      originalHeight.value = img.height
      width.value = img.width
      height.value = img.height
    }
    img.src = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const onWidthChange = () => {
  if (keepAspect.value && originalWidth.value > 0) {
    const ratio = originalHeight.value / originalWidth.value
    height.value = Math.round(width.value * ratio)
  }
}

const onHeightChange = () => {
  if (keepAspect.value && originalHeight.value > 0) {
    const ratio = originalWidth.value / originalHeight.value
    width.value = Math.round(height.value * ratio)
  }
}

watch(percent, () => {
  if (mode.value === 'percent') {
    width.value = Math.round(originalWidth.value * percent.value / 100)
    height.value = Math.round(originalHeight.value * percent.value / 100)
  }
})

const handleResize = async () => {
  if (!canResize.value || !inputFile.value) return
  isProcessing.value = true
  try {
    const arrayBuffer = await inputFile.value.arrayBuffer()
    const data = Array.from(new Uint8Array(arrayBuffer))

    const result = await invoke<number[]>('resize_image_data', {
      data,
      width: width.value,
      height: height.value,
      maintainAspect: keepAspect.value
    })

    const bytes = new Uint8Array(result)
    outputSize.value = bytes.length
    const blob = new Blob([bytes], { type: 'image/png' })
    outputBlobUrl.value = URL.createObjectURL(blob)
    notifySuccess('调整成功', `尺寸已调整为 ${width.value} × ${height.value}`)
  } catch (e) {
    notifyError('调整失败', (e as Error).message)
  } finally {
    isProcessing.value = false
  }
}

const handleDownload = async () => {
  if (!outputBlobUrl.value) return
  try {
    const defaultName = fileName.value.replace(/\.[^.]+$/, '') + `_${width.value}x${height.value}.png`
    const savePath = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Image', extensions: ['png'] }]
    })
    if (savePath) {
      const response = await fetch(outputBlobUrl.value)
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      await writeFile(savePath, new Uint8Array(arrayBuffer))
      notifySuccess('保存成功', '图片已保存')
    }
  } catch (e) {
    notifyError('保存失败', (e as Error).message)
  }
}

const handleClear = () => {
  inputFile.value = null
  fileName.value = ''
  inputImageUrl.value = ''
  outputBlobUrl.value = ''
  outputSize.value = 0
  originalWidth.value = 0
  originalHeight.value = 0
  width.value = 0
  height.value = 0
  percent.value = 100
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const presetSizes = [
  { label: '50%', p: 50 },
  { label: '25%', p: 25 },
  { label: '200%', p: 200 },
  { label: '1080p', w: 1920, h: 1080 },
  { label: '720p', w: 1280, h: 720 },
]

const applyPreset = (preset: any) => {
  if (preset.p) {
    percent.value = preset.p
    mode.value = 'percent'
    width.value = Math.round(originalWidth.value * preset.p / 100)
    height.value = Math.round(originalHeight.value * preset.p / 100)
  } else {
    mode.value = 'pixels'
    width.value = preset.w
    height.value = preset.h
  }
}
</script>

<template>
  <ToolLayout title="尺寸调整" description="调整图片尺寸，支持等比例缩放">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="调整方式">
            <div class="flex gap-2">
              <NButton
                :type="mode === 'pixels' ? 'primary' : 'default'"
                size="small"
                @click="mode = 'pixels'"
              >
                像素
              </NButton>
              <NButton
                :type="mode === 'percent' ? 'primary' : 'default'"
                size="small"
                @click="mode = 'percent'"
              >
                百分比
              </NButton>
            </div>
          </NFormItem>

          <NFormItem v-if="mode === 'pixels'" label="尺寸">
            <div class="flex items-center gap-2">
              <NInputNumber
                v-model:value="width"
                placeholder="宽度"
                style="width: 100px;"
                @update:value="onWidthChange"
              />
              <span class="text-gray-500">×</span>
              <NInputNumber
                v-model:value="height"
                placeholder="高度"
                style="width: 100px;"
                @update:value="onHeightChange"
              />
              <span class="text-sm text-gray-500">px</span>
            </div>
          </NFormItem>

          <NFormItem v-else label="缩放比例">
            <div class="flex items-center gap-2">
              <NInputNumber
                v-model:value="percent"
                :min="1"
                :max="500"
                style="width: 100px;"
              />
              <span class="text-gray-500">%</span>
            </div>
          </NFormItem>

          <NFormItem label="保持比例">
            <NSwitch v-model:value="keepAspect" />
          </NFormItem>

          <NFormItem label="预设">
            <div class="flex gap-2 flex-wrap">
              <NButton
                v-for="preset in presetSizes"
                :key="preset.label"
                size="tiny"
                @click="applyPreset(preset)"
              >
                {{ preset.label }}
              </NButton>
            </div>
          </NFormItem>
        </NForm>

        <div v-if="originalWidth > 0" class="text-xs text-gray-500">
          原始尺寸: {{ originalWidth }} × {{ originalHeight }} px
        </div>

        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canResize" :loading="isProcessing" @click="handleResize">
            <template #icon>
              <NIcon><CropOutline /></NIcon>
            </template>
            调整尺寸
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>

        <FileDropZone
          accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff"
          :multiple="false"
          @files-selected="handleFileUpload"
        />

        <div v-if="inputImageUrl" class="flex-1 min-h-0 flex flex-col">
          <div class="text-sm mb-2 text-gray-500">原图预览</div>
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
          :downloadDisabled="!outputBlobUrl"
          @download="handleDownload"
          @clear="outputBlobUrl = ''"
        />
        <div v-if="outputBlobUrl" class="mt-4 flex-1 min-h-0 flex flex-col">
          <div class="text-sm mb-2 flex justify-between text-gray-500">
            <span>输出结果</span>
            <NTag size="small" type="success">{{ formatFileSize(outputSize) }}</NTag>
          </div>
          <div class="flex-1 flex items-center justify-center">
            <ImagePreview :src="outputBlobUrl" />
          </div>
        </div>
        <div v-else class="mt-4 flex-1 flex items-center justify-center text-gray-500">
          调整结果将显示在这里
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
