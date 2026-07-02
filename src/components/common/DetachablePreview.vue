<script setup lang="ts">
import { ref, watch, onUnmounted, computed, onBeforeUnmount } from 'vue'
import { NButton, NIcon } from 'naive-ui'
import { ExpandOutline, ContractOutline } from '@vicons/ionicons5'
import { useTheme } from '../../composables/useTheme'

interface Props {
  title?: string
  detached?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '预览',
  detached: false
})

const emit = defineEmits<{
  (e: 'update:detached', v: boolean): void
}>()

const { isDark } = useTheme()

const isDetached = ref(props.detached)
let popupWindow: Window | null = null
let syncTimer: number | null = null
const contentSlotRef = ref<HTMLDivElement | null>(null)
const STORAGE_KEY = 'preview_window_pos'

watch(isDetached, (v) => {
  emit('update:detached', v)
  if (v) {
    openDetachedWindow()
  } else {
    closeDetachedWindow()
  }
})

const saveWindowPos = () => {
  if (!popupWindow) return
  try {
    const pos = {
      x: popupWindow.screenX,
      y: popupWindow.screenY,
      w: popupWindow.innerWidth,
      h: popupWindow.innerHeight
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
  } catch (e) {}
}

const loadWindowPos = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return { x: 100, y: 100, w: 900, h: 700 }
}

const openDetachedWindow = () => {
  const pos = loadWindowPos()
  const features = `width=${pos.w},height=${pos.h},left=${pos.x},top=${pos.y},resizable=yes,scrollbars=yes,status=no,menubar=no,toolbar=no`

  popupWindow = window.open('', '_blank', features)

  if (!popupWindow) {
    console.warn('Failed to open popup window')
    isDetached.value = false
    return
  }

  const themeClass = isDark.value ? 'dark-theme' : 'light-theme'
  const bgColor = isDark.value ? '#111827' : '#f3f4f6'
  const textColor = isDark.value ? '#e5e7eb' : '#1f2937'

  popupWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${props.title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
          background: ${bgColor};
          color: ${textColor};
          overflow: hidden;
        }
        #preview-container {
          width: 100vw;
          height: 100vh;
          overflow: auto;
        }
        #preview-title {
          padding: 8px 12px;
          font-size: 13px;
          border-bottom: 1px solid ${isDark.value ? '#374151' : '#e5e7eb'};
          background: ${isDark.value ? '#1f2937' : '#ffffff'};
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        #preview-content {
          padding: 0;
          width: 100%;
          height: calc(100vh - 36px);
          overflow: auto;
        }
        .close-hint {
          font-size: 11px;
          opacity: 0.6;
        }
      </style>
    </head>
    <body class="${themeClass}">
      <div id="preview-container">
        <div id="preview-title">
          <span>${props.title}</span>
          <span class="close-hint">关闭此窗口可返回内嵌预览</span>
        </div>
        <div id="preview-content"></div>
      </div>
    </body>
    </html>
  `)
  popupWindow.document.close()

  const checkClose = setInterval(() => {
    if (!popupWindow || popupWindow.closed) {
      clearInterval(checkClose)
      isDetached.value = false
      popupWindow = null
    }
  }, 500)

  popupWindow.addEventListener('beforeunload', () => {
    saveWindowPos()
  })

  popupWindow.addEventListener('resize', () => {
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = window.setTimeout(() => saveWindowPos(), 300)
  })

  setTimeout(() => syncContent(), 100)
}

const closeDetachedWindow = () => {
  if (popupWindow && !popupWindow.closed) {
    saveWindowPos()
    popupWindow.close()
  }
  popupWindow = null
}

const syncContent = () => {
  if (!popupWindow || popupWindow.closed || !contentSlotRef.value) return

  const targetEl = popupWindow.document.getElementById('preview-content')
  if (targetEl) {
    targetEl.innerHTML = contentSlotRef.value.innerHTML
  }
}

const syncContentDebounced = () => {
  if (!isDetached.value) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = window.setTimeout(() => {
    syncContent()
  }, 150)
}

watch(() => props.title, (t) => {
  if (popupWindow && !popupWindow.closed) {
    popupWindow.document.title = t
    const titleEl = popupWindow.document.querySelector('#preview-title span:first-child')
    if (titleEl) titleEl.textContent = t
  }
})

const toggleDetach = () => {
  isDetached.value = !isDetached.value
}

onBeforeUnmount(() => {
  closeDetachedWindow()
  if (syncTimer) clearTimeout(syncTimer)
})

defineExpose({
  syncContent: syncContentDebounced,
  syncContentImmediate: syncContent
})
</script>

<template>
  <div class="detachable-preview h-full flex flex-col">
    <div class="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0"
         :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'">
      <span class="text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
        {{ title }}
      </span>
      <NButton size="small" text @click="toggleDetach">
        <template #icon>
          <NIcon>
            <component :is="isDetached ? ContractOutline : ExpandOutline" />
          </NIcon>
        </template>
        {{ isDetached ? '合并窗口' : '分离窗口' }}
      </NButton>
    </div>

    <div class="flex-1 min-h-0 overflow-hidden">
      <div v-show="!isDetached" ref="contentSlotRef" class="h-full">
        <slot></slot>
      </div>
      <div v-show="isDetached" class="h-full flex items-center justify-center text-sm"
           :class="isDark ? 'text-gray-500' : 'text-gray-400'">
        <div class="text-center">
          <NIcon size="32" class="mb-2 opacity-50"><ExpandOutline /></NIcon>
          <div>预览已在独立窗口中显示</div>
          <div class="text-xs mt-1 opacity-70">关闭独立窗口可返回内嵌预览</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detachable-preview {
  min-height: 0;
}
</style>
