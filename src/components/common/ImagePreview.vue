<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NIcon, NButton, NSlider } from 'naive-ui'
import { AddOutline, RemoveOutline, ExpandOutline, ContractOutline, RefreshOutline } from '@vicons/ionicons5'
import { useTheme } from '../../composables/useTheme'

interface Props {
  src?: string
  path?: string
  alt?: string
  minWidth?: number
  minHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  path: '',
  alt: 'Preview',
  minWidth: 200,
  minHeight: 200
})

const { isDark } = useTheme()

// 缩放和位置状态
const scale = ref(1)
const minScale = 0.1
const maxScale = 10
const translateX = ref(0)
const translateY = ref(0)

// 容器尺寸（可调整）
const containerWidth = ref(300)
const containerHeight = ref(300)
const isResizing = ref(false)

// 拖拽状态
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartTranslateX = ref(0)
const dragStartTranslateY = ref(0)

// 图片加载状态
const isLoading = ref(true)
const hasError = ref(false)
const imageWidth = ref(0)
const imageHeight = ref(0)

// 实际显示的图片源
const imageSrc = ref(props.src)

// 监听路径变化，通过 Tauri 读取图片
watch(() => props.path, async (newPath) => {
  if (newPath && !props.src) {
    try {
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const data = await readFile(newPath)
      const blob = new Blob([data])
      imageSrc.value = URL.createObjectURL(blob)
    } catch (e) {
      hasError.value = true
      console.error('Failed to load image:', e)
    }
  }
}, { immediate: true })

watch(() => props.src, (newSrc) => {
  if (newSrc) {
    imageSrc.value = newSrc
  }
}, { immediate: true })

// 图片加载完成
const handleImageLoad = (e: Event) => {
  isLoading.value = false
  hasError.value = false
  const img = e.target as HTMLImageElement
  imageWidth.value = img.naturalWidth
  imageHeight.value = img.naturalHeight
  
  // 自动调整缩放以适应容器
  const fitScale = Math.min(
    containerWidth.value / imageWidth.value,
    containerHeight.value / imageHeight.value
  )
  scale.value = Math.min(fitScale, 1)
}

const handleImageError = () => {
  isLoading.value = false
  hasError.value = true
}

// 缩放操作
const zoomIn = () => {
  scale.value = Math.min(scale.value * 1.2, maxScale)
}

const zoomOut = () => {
  scale.value = Math.max(scale.value / 1.2, minScale)
}

const resetZoom = () => {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

const fitToContainer = () => {
  if (imageWidth.value && imageHeight.value) {
    const fitScale = Math.min(
      containerWidth.value / imageWidth.value,
      containerHeight.value / imageHeight.value
    )
    scale.value = fitScale
    translateX.value = 0
    translateY.value = 0
  }
}

// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  scale.value = Math.max(minScale, Math.min(scale.value * delta, maxScale))
}

// 拖拽移动
const handleMouseDown = (e: MouseEvent) => {
  if (e.button === 0) {
    isDragging.value = true
    dragStartX.value = e.clientX
    dragStartY.value = e.clientY
    dragStartTranslateX.value = translateX.value
    dragStartTranslateY.value = translateY.value
    e.preventDefault()
  }
}

const handleMouseMove = (e: MouseEvent) => {
  if (isDragging.value) {
    translateX.value = dragStartTranslateX.value + (e.clientX - dragStartX.value)
    translateY.value = dragStartTranslateY.value + (e.clientY - dragStartY.value)
  }
}

const handleMouseUp = () => {
  isDragging.value = false
}

// 双击还原
const handleDoubleClick = () => {
  resetZoom()
}

// 调整容器大小
const resizeDirections = ['se', 'sw', 'ne', 'nw', 'e', 'w', 's', 'n'] as const
type ResizeDirection = typeof resizeDirections[number]

const startResize = (direction: ResizeDirection, e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isResizing.value = true
  
  const startX = e.clientX
  const startY = e.clientY
  const startWidth = containerWidth.value
  const startHeight = containerHeight.value
  
  const onMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY
    
    if (direction.includes('e')) {
      containerWidth.value = Math.max(props.minWidth, startWidth + deltaX)
    }
    if (direction.includes('w')) {
      containerWidth.value = Math.max(props.minWidth, startWidth - deltaX)
    }
    if (direction.includes('s')) {
      containerHeight.value = Math.max(props.minHeight, startHeight + deltaY)
    }
    if (direction.includes('n')) {
      containerHeight.value = Math.max(props.minHeight, startHeight - deltaY)
    }
    
    // 重新适应容器
    fitToContainer()
  }
  
  const onMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div
    class="image-preview-container relative overflow-hidden rounded-lg border select-none"
    :class="isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'"
    :style="{ width: `${containerWidth}px`, height: `${containerHeight}px` }"
    @wheel="handleWheel"
  >
    <!-- 工具栏 -->
    <div
      class="absolute top-2 left-2 right-2 z-10 flex items-center justify-between px-2 py-1 rounded-lg backdrop-blur-sm"
      :class="isDark ? 'bg-gray-800/80' : 'bg-white/80'"
    >
      <div class="flex items-center gap-2">
        <NButton quaternary size="small" @click="zoomOut">
          <template #icon><NIcon><RemoveOutline /></NIcon></template>
        </NButton>
        <span class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">{{ Math.round(scale * 100) }}%</span>
        <NButton quaternary size="small" @click="zoomIn">
          <template #icon><NIcon><AddOutline /></NIcon></template>
        </NButton>
      </div>
      <div class="flex items-center gap-1">
        <NButton quaternary size="small" @click="fitToContainer" title="适应窗口">
          <template #icon><NIcon><ExpandOutline /></NIcon></template>
        </NButton>
        <NButton quaternary size="small" @click="resetZoom" title="还原">
          <template #icon><NIcon><RefreshOutline /></NIcon></template>
        </NButton>
      </div>
    </div>

    <!-- 图片容器 -->
    <div
      class="image-wrapper absolute inset-0 flex items-center justify-center cursor-move"
      @mousedown="handleMouseDown"
      @dblclick="handleDoubleClick"
    >
      <!-- 加载状态 -->
      <div v-if="isLoading" class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="hasError" class="flex flex-col items-center justify-center" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
        <NIcon size="48"><ContractOutline /></NIcon>
        <span class="mt-2">图片加载失败</span>
      </div>

      <!-- 图片 -->
      <img
        v-else-if="imageSrc"
        :src="imageSrc"
        :alt="alt"
        class="max-w-none transition-transform duration-100"
        :style="{
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: 'center center'
        }"
        @load="handleImageLoad"
        @error="handleImageError"
        draggable="false"
      />
    </div>

    <!-- 拖拽调整大小的边框和角落 -->
    <!-- 东边 -->
    <div
      class="absolute top-0 right-0 bottom-0 w-2 cursor-e-resize hover:bg-blue-500/20 transition-colors"
      @mousedown="startResize('e', $event)"
    />
    <!-- 西边 -->
    <div
      class="absolute top-0 left-0 bottom-0 w-2 cursor-w-resize hover:bg-blue-500/20 transition-colors"
      @mousedown="startResize('w', $event)"
    />
    <!-- 南边 -->
    <div
      class="absolute left-0 right-0 bottom-0 h-2 cursor-s-resize hover:bg-blue-500/20 transition-colors"
      @mousedown="startResize('s', $event)"
    />
    <!-- 北边 -->
    <div
      class="absolute left-0 right-0 top-0 h-2 cursor-n-resize hover:bg-blue-500/20 transition-colors"
      @mousedown="startResize('n', $event)"
    />
    <!-- 东南角 -->
    <div
      class="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/30 rounded-bl transition-colors"
      @mousedown="startResize('se', $event)"
    />
    <!-- 西南角 -->
    <div
      class="absolute left-0 bottom-0 w-4 h-4 cursor-sw-resize hover:bg-blue-500/30 rounded-br transition-colors"
      @mousedown="startResize('sw', $event)"
    />
    <!-- 东北角 -->
    <div
      class="absolute right-0 top-0 w-4 h-4 cursor-ne-resize hover:bg-blue-500/30 rounded-bl transition-colors"
      @mousedown="startResize('ne', $event)"
    />
    <!-- 西北角 -->
    <div
      class="absolute left-0 top-0 w-4 h-4 cursor-nw-resize hover:bg-blue-500/30 rounded-br transition-colors"
      @mousedown="startResize('nw', $event)"
    />

    <!-- 图片信息 -->
    <div
      v-if="!isLoading && !hasError && imageWidth"
      class="absolute bottom-2 left-2 px-2 py-1 rounded text-xs backdrop-blur-sm"
      :class="isDark ? 'bg-gray-800/80 text-gray-400' : 'bg-white/80 text-gray-500'"
    >
      {{ imageWidth }} × {{ imageHeight }} px
    </div>
  </div>
</template>

<style scoped>
.image-preview-container {
  user-select: none;
}
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>