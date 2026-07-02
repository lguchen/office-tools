<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NIcon, NText } from 'naive-ui'
import { CloudUploadOutline, DocumentOutline, ImageOutline, FileTrayOutline } from '@vicons/ionicons5'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useTheme } from '../../composables/useTheme'

interface Props {
  accept?: string
  multiple?: boolean
  tips?: string
  showFileList?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: '*',
  multiple: false,
  tips: '点击或拖拽文件到此处上传',
  showFileList: true
})

const emit = defineEmits<{
  (e: 'update:files', files: { name: string; path: string; size?: number; file?: File }[]): void
  (e: 'files-selected', files: { name: string; path: string; size?: number; file?: File }[]): void
}>()

const { isDark } = useTheme()

const files = ref<{ name: string; path: string; size?: number; file?: File }[]>([])
const isDragging = ref(false)
const isHovering = ref(false)
const dropZoneRef = ref<HTMLDivElement | null>(null)
const unlistenDragEnter = ref<UnlistenFn | null>(null)
const unlistenDragLeave = ref<UnlistenFn | null>(null)
const unlistenDrop = ref<UnlistenFn | null>(null)
const unlistenDragOver = ref<UnlistenFn | null>(null)
let globalDragCount = 0

const acceptExtensions = computed(() => {
  if (props.accept === '*') return []
  return props.accept.split(',').map(s => s.replace('.', '').trim().toLowerCase())
})

const filterByAccept = (paths: string[]) => {
  if (acceptExtensions.value.length === 0) return paths
  return paths.filter(p => {
    const ext = p.split('.').pop()?.toLowerCase() || ''
    return acceptExtensions.value.includes(ext)
  })
}

const readFileFromPath = async (path: string): Promise<{ name: string; path: string; size?: number; file?: File }> => {
  const name = path.split(/[\\/]/).pop() || path
  let file: File | undefined
  let size: number | undefined

  try {
    const { readFile } = await import('@tauri-apps/plugin-fs')
    const data = await readFile(path)
    size = data.byteLength
    const ext = name.split('.').pop()?.toLowerCase() || ''
    const mimeMap: Record<string, string> = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      csv: 'text/csv',
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      tiff: 'image/tiff',
      txt: 'text/plain',
      json: 'application/json'
    }
    file = new File([data], name, { type: mimeMap[ext] || 'application/octet-stream' })
  } catch (e) {
    console.warn('Failed to read file via Tauri:', e)
  }

  return { name, path, size, file }
}

const handleFilesDrop = async (paths: string[]) => {
  const filteredPaths = filterByAccept(paths)
  if (filteredPaths.length === 0) return

  const newFiles = await Promise.all(filteredPaths.map(p => readFileFromPath(p)))

  if (props.multiple) {
    files.value = [...files.value, ...newFiles]
  } else {
    files.value = newFiles.slice(0, 1)
  }

  emit('update:files', files.value)
  emit('files-selected', files.value)
}

onMounted(async () => {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const appWindow = getCurrentWindow()

    unlistenDragEnter.value = await listen('tauri://drag-enter', () => {
      globalDragCount++
      isDragging.value = true
    })

    unlistenDragOver.value = await listen('tauri://drag-over', (event: any) => {
      if (dropZoneRef.value) {
        const rect = dropZoneRef.value.getBoundingClientRect()
        const x = event.payload?.position?.x ?? 0
        const y = event.payload?.position?.y ?? 0
        isHovering.value = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      }
    })

    unlistenDragLeave.value = await listen('tauri://drag-leave', () => {
      globalDragCount = Math.max(0, globalDragCount - 1)
      if (globalDragCount === 0) {
        isDragging.value = false
        isHovering.value = false
      }
    })

    unlistenDrop.value = await listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
      globalDragCount = 0
      isDragging.value = false
      isHovering.value = false
      await handleFilesDrop(event.payload.paths)
    })

    console.log('Tauri drag-drop listeners registered successfully')
  } catch (e) {
    console.log('Not in Tauri environment, using HTML5 drag events only:', e)
  }
})

onUnmounted(() => {
  unlistenDragEnter.value?.()
  unlistenDragLeave.value?.()
  unlistenDrop.value?.()
  unlistenDragOver.value?.()
  globalDragCount = 0
})

const handleFiles = async (fileList: FileList | null) => {
  if (!fileList || fileList.length === 0) return

  const newFiles: { name: string; path: string; size?: number; file?: File }[] = []
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i]
    const ext = f.name.split('.').pop()?.toLowerCase() || ''
    if (acceptExtensions.value.length > 0 && !acceptExtensions.value.includes(ext)) continue

    newFiles.push({
      name: f.name,
      path: f.name,
      size: f.size,
      file: f
    })
  }

  if (newFiles.length === 0) return

  if (props.multiple) {
    files.value = [...files.value, ...newFiles]
  } else {
    files.value = newFiles.slice(0, 1)
  }

  emit('update:files', files.value)
  emit('files-selected', files.value)
}

const handleClick = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = props.accept
  input.multiple = props.multiple
  input.style.display = 'none'
  input.onchange = (e: any) => {
    handleFiles(e.target?.files)
    document.body.removeChild(input)
  }
  document.body.appendChild(input)
  input.click()
}

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
  handleFiles(e.dataTransfer?.files || null)
}

const removeFile = (index: number) => {
  files.value.splice(index, 1)
  emit('update:files', files.value)
}

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext || '')) return ImageOutline
  if (['pdf', 'docx', 'doc'].includes(ext || '')) return DocumentOutline
  return FileTrayOutline
}

const formatSize = (size?: number) => {
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

defineExpose({
  clearFiles: () => { files.value = [] }
})
</script>

<template>
  <div class="file-drop-zone">
    <div
      ref="dropZoneRef"
      class="drop-area p-6 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center"
      :class="[
        (isDragging && isHovering)
          ? (isDark ? 'border-blue-500 bg-blue-500/20' : 'border-blue-500 bg-blue-50')
          : isDragging
          ? (isDark ? 'border-blue-400/50 bg-blue-500/5' : 'border-blue-400/50 bg-blue-50/50')
          : (isDark ? 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'),
        (isDragging && isHovering) && 'scale-[1.02]'
      ]"
      @click="handleClick"
      @dragover="handleHtmlDragOver"
      @dragleave="handleHtmlDragLeave"
      @drop="handleHtmlDrop"
    >
      <NIcon size="40" :class="(isDragging && isHovering) ? 'text-blue-400' : isDragging ? 'text-blue-400/60' : (isDark ? 'text-gray-400' : 'text-gray-500')">
        <CloudUploadOutline />
      </NIcon>
      <NText :class="(isDragging && isHovering) ? 'text-blue-400' : isDark ? 'text-gray-300' : 'text-gray-600'" class="mt-3 text-sm font-medium">
        {{ (isDragging && isHovering) ? '松开鼠标上传文件' : isDragging ? '拖拽文件到此处' : tips }}
      </NText>
      <NText depth="3" class="text-xs mt-1" v-if="accept !== '*'">
        支持格式: {{ accept }}
      </NText>
    </div>

    <div v-if="showFileList && files.length > 0" class="mt-3 space-y-2">
      <div
        v-for="(file, index) in files"
        :key="index"
        class="flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
        :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'"
      >
        <div class="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" :class="isDark ? 'bg-gray-700' : 'bg-gray-100'">
          <NIcon :size="16" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
            <component :is="getFileIcon(file.name)" />
          </NIcon>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate" :class="isDark ? 'text-gray-200' : 'text-gray-700'">{{ file.name }}</div>
          <div class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            {{ formatSize(file.size) || '等待读取' }}
          </div>
        </div>
        <button
          class="text-xs px-2 py-1 rounded transition-colors flex-shrink-0"
          :class="isDark ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'"
          @click.stop="removeFile(index)"
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
  min-height: 100px;
}
</style>
