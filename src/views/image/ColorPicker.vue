<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NIcon, NTag, NCard, NSpace } from 'naive-ui'
import { CreateOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import { useNotification } from 'naive-ui'
import { useSettingsStore } from '../../stores/settings'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

const inputFile = ref<File | null>(null)
const fileName = ref('')
const imageUrl = ref('')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)

const pickedColor = ref('#000000')
const rgbColor = ref('rgb(0, 0, 0)')
const hslColor = ref('hsl(0, 0%, 0%)')
const colorHistory = ref<string[]>([])
const isPicking = ref(false)

const handleFileUpload = (files: { name: string; path: string; size?: number; file?: File }[]) => {
  const file = files[0]?.file
  if (!file) return
  inputFile.value = file
  fileName.value = file.name

  const reader = new FileReader()
  reader.onload = (e) => {
    imageUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const onImageLoad = () => {
  const canvas = document.createElement('canvas')
  const img = imageRef.value
  if (!img) return
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(img, 0, 0)
    canvasRef.value = canvas
  }
}

const startPick = () => {
  if (!canvasRef.value) return
  isPicking.value = true
}

const handleImageClick = (e: MouseEvent) => {
  if (!canvasRef.value || !isPicking.value) return
  const canvas = canvasRef.value
  const img = e.target as HTMLImageElement
  const rect = img.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = Math.floor((e.clientX - rect.left) * scaleX)
  const y = Math.floor((e.clientY - rect.top) * scaleY)

  const ctx = canvas.getContext('2d')
  if (ctx) {
    const pixel = ctx.getImageData(x, y, 1, 1).data
    const r = pixel[0]
    const g = pixel[1]
    const b = pixel[2]
    pickedColor.value = rgbToHex(r, g, b)
    rgbColor.value = `rgb(${r}, ${g}, ${b})`
    hslColor.value = rgbToHsl(r, g, b)

    if (!colorHistory.value.includes(pickedColor.value)) {
      colorHistory.value.unshift(pickedColor.value)
      if (colorHistory.value.length > 12) {
        colorHistory.value.pop()
      }
    }
  }
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

const rgbToHsl = (r: number, g: number, b: number): string => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

const copyColor = async (color: string) => {
  try {
    await navigator.clipboard.writeText(color)
    notification.success({ title: '复制成功', content: '颜色值已复制' })
  } catch (e) {
    notification.error({ title: '复制失败', content: (e as Error).message })
  }
}

const handleClear = () => {
  inputFile.value = null
  fileName.value = ''
  imageUrl.value = ''
  pickedColor.value = '#000000'
  rgbColor.value = 'rgb(0, 0, 0)'
  hslColor.value = 'hsl(0, 0%, 0%)'
  colorHistory.value = []
  isPicking.value = false
}

const pickFromHistory = (color: string) => {
  pickedColor.value = color
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  rgbColor.value = `rgb(${r}, ${g}, ${b})`
  hslColor.value = rgbToHsl(r, g, b)
}
</script>

<template>
  <ToolLayout title="取色器" description="从图片中拾取颜色，获取HEX/RGB/HSL值">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <div class="flex gap-2">
          <NButton type="primary" :disabled="!imageUrl" @click="startPick">
            <template #icon>
              <NIcon><ColorFillOutline /></NIcon>
            </template>
            {{ isPicking ? '点击图片取色' : '开始取色' }}
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>

        <FileDropZone
          accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff,.svg,.ico"
          :multiple="false"
          @files-selected="handleFileUpload"
        />

        <div
          v-if="imageUrl"
          class="flex-1 min-h-0 overflow-auto bg-gray-800 rounded-lg p-2 flex items-center justify-center"
        >
          <img
            ref="imageRef"
            :src="imageUrl"
            class="max-w-full max-h-full object-contain"
            :class="{ 'cursor-crosshair': isPicking }"
            @load="onImageLoad"
            @click="handleImageClick"
          />
        </div>
      </div>
    </template>

    <template #output>
      <div class="space-y-4">
        <div class="text-lg font-semibold text-blue-400">当前颜色</div>

        <NCard class="p-0 overflow-hidden">
          <div
            class="h-24 w-full"
            :style="{ backgroundColor: pickedColor }"
          />
          <div class="p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">HEX</span>
              <div class="flex items-center gap-2">
                <span class="font-mono">{{ pickedColor }}</span>
                <NButton size="tiny" text @click="copyColor(pickedColor)">复制</NButton>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">RGB</span>
              <div class="flex items-center gap-2">
                <span class="font-mono text-sm">{{ rgbColor }}</span>
                <NButton size="tiny" text @click="copyColor(rgbColor)">复制</NButton>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">HSL</span>
              <div class="flex items-center gap-2">
                <span class="font-mono text-sm">{{ hslColor }}</span>
                <NButton size="tiny" text @click="copyColor(hslColor)">复制</NButton>
              </div>
            </div>
          </div>
        </NCard>

        <div v-if="colorHistory.length > 0">
          <div class="text-sm mb-2" :class="isDark ? 'text-gray-400' : 'text-gray-500'">历史颜色</div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="color in colorHistory"
              :key="color"
              class="w-8 h-8 rounded cursor-pointer border-2 border-gray-600 hover:border-white transition-colors"
              :style="{ backgroundColor: color }"
              :title="color"
              @click="pickFromHistory(color)"
            />
          </div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
