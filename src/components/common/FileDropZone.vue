<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NIcon, NText } from 'naive-ui'
import { CloudUploadOutline, DocumentOutline, ImageOutline, FileTrayOutline } from '@vicons/ionicons5'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useSettingsStore } from '../../stores/settings'

interface Props {
  accept?: string
  multiple?: boolean
  tips?: string
}

const props = withDefaults(defineProps<Props>(), {
  accept: '*',
  multiple: false,
  tips: '点击或拖拽文件到此处上传'
})

const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

const emit = defineEmits<{
  (e: 'update:files', files: { name: string; path: string; size?: number }[]): void
}>()

const files = ref<{ name: string; path: string; size?: number }[]>([])
const isDragging = ref(false)
const unlistenDrag = ref<UnlistenFn | null>(null)
const unlistenDrop = ref<UnlistenFn | null>(null)

// 监听 Tauri 拖拽事件
onMounted(async () => {
  try {
    // 监听拖拽进入
    unlistenDrag.value = await listen('tauri://drag-enter', () => {
      isDragging.value = true
    })

    // 监听拖拽离开
    const unlistenDragLeave = await listen('tauri://drag-leave', () => {
      isDragging.value = false
    })

    // 监听拖拽释放
    unlistenDrop.value = await listen<{ paths: string[] }>('tauri://drop', (event) => {
      isDragging.value = false
      const paths = event.payload.paths

      if (!props.multiple && paths.length > 1) {
        // 单文件模式只取第一个
        handleFiles([paths[0]])
      } else {
        handleFiles(paths)
      }
    })

    // 合并清理函数
    unlistenDrag.value = () => {
      unlistenDrag.value?.()
      unlistenDragLeave()
    }
  } catch (e) {
    // 非 Tauri 环境（浏览器开发），使用 HTML5 拖拽
    console.log('Not in Tauri environment, using HTML5 drag events')
  }
})

onUnmounted(() => {
  unlistenDrag.value?.()
  unlistenDrop.value?.()
})

const handleFiles = (paths: string[]) => {
  const newFiles = paths.map(path => {
    const name = path.split(/[\\/]/).pop() || path
    return { name, path }
  })

  if (props.multiple) {
    files.value = [...files.value, ...newFiles]
  } else {
    files.value = newFiles.slice(0, 1)
  }

  emit('update:files', files.value)
}

// HTML5 拖拽事件（浏览器模式备用）
const handleHtmlDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleHtmlDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
}

const handleHtmlDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false

  const items = e.dataTransfer?.items || e.dataTransfer?.files
  if (!items) return

  const paths: string[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as any
    if (item.kind === 'file' || item instanceof File) {
      const file = item.getAsFile?.() || item
      if (file) {
        // 浏览器环境下只能获取 File 对象，无法获取路径
        paths.push(file.name)
        files.value.push({ name: file.name, path: file.name, size: file.size })
      }
    }
  }

  if (paths.length > 0) {
    if (!props.multiple) {
      files.value = files.value.slice(0, 1)
    }
    emit('update:files', files.value)
  }
}

// 点击选择文件（通过 Tauri dialog）
const handleClick = async () => {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      multiple: props.multiple,
      filters: props.accept !== '*' ? [{
        name: 'Files',
        extensions: props.accept.split(',').map(s => s.replace('.', '').trim())
      }] : undefined
    })

    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected]
      handleFiles(paths)
    }
  } catch (e) {
    // 浏览器环境，使用原生 input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = props.accept
    input.multiple = props.multiple
    input.onchange = (e: any) => {
      const fileList = e.target?.files
      if (fileList) {
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i]
          files.value.push({ name: file.name, path: file.name, size: file.size })
        }
        if (!props.multiple) {
          files.value = files.value.slice(0, 1)
        }
        emit('update:files', files.value)
      }
    }
    input.click()
  }
}

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext || '')) return ImageOutline
  if (['pdf'].includes(ext || '')) return DocumentOutline
  return FileTrayOutline
}

const formatSize = (size?: number) => {
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}
</script>

<template>
  <div class="file-drop-zone">
    <div
      class="drop-area p-8 rounded-lg border-2 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center"
      :class="[
        isDragging
          ? (isDark ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50')
          : (isDark ? 'border-gray-600 bg-gray-800/50 hover:border-gray-500' : 'border-gray-300 bg-gray-50 hover:border-gray-400'),
        isDragging && 'scale-[1.02]'
      ]"
      @click="handleClick"
      @dragover="handleHtmlDragOver"
      @dragleave="handleHtmlDragLeave"
      @drop="handleHtmlDrop"
    >
      <NIcon size="48" :class="isDragging ? 'text-blue-400' : (isDark ? 'text-gray-400' : 'text-gray-500')">
        <CloudUploadOutline />
      </NIcon>
      <NText :class="isDark ? 'text-gray-300' : 'text-gray-600'" class="mt-4">
        {{ isDragging ? '松开鼠标上传文件' : tips }}
      </NText>
      <NText depth="3" class="text-sm mt-2" v-if="accept !== '*'">
        支持格式: {{ accept }}
      </NText>
    </div>

    <!-- 文件列表 -->
    <div v-if="files.length > 0" class="mt-4 space-y-2">
      <div
        v-for="(file, index) in files"
        :key="index"
        class="flex items-center gap-3 p-3 rounded-lg border transition-colors"
        :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'"
      >
        <div class="w-8 h-8 rounded flex items-center justify-center" :class="isDark ? 'bg-gray-700' : 'bg-gray-100'">
          <NIcon :size="16" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
            <component :is="getFileIcon(file.name)" />
          </NIcon>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate" :class="isDark ? 'text-gray-200' : 'text-gray-700'">{{ file.name }}</div>
          <div class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            {{ formatSize(file.size) || '等待读取' }}
          </div>
        </div>
        <button
          class="text-sm px-2 py-1 rounded transition-colors"
          :class="isDark ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'"
          @click="files.splice(index, 1); emit('update:files', files)"
        >
          移除
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-drop-zone {
  width: 100%;
}
.drop-area {
  min-height: 120px;
}
</style>