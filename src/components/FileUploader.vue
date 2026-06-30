<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { isTauri, openFileDialog, type FileInfo } from '@/utils/tauriUtils'

interface Props {
  accept?: string[]
  multiple?: boolean
  directory?: boolean
  maxFiles?: number
  hintText?: string
  icon?: string
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: () => [],
  multiple: true,
  directory: false,
  maxFiles: 0,
  hintText: '拖拽文件到此处，或点击选择',
  icon: '📁',
  compact: false
})

const emit = defineEmits<{
  (e: 'files-selected', files: File[]): void
}>()

const isDragOver = ref(false)
const dropZoneRef = ref<HTMLElement | null>(null)
let dragCounter = 0

const acceptStr = computed(() => {
  if (props.accept.length === 0) return ''
  return props.accept.map((a) => (a.startsWith('.') ? a : `.${a}`)).join(',')
})

function filterFiles(files: File[]): File[] {
  if (props.accept.length === 0) return files
  return files.filter((f) => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    return props.accept.some((a) => {
      const pattern = a.toLowerCase().replace(/^\./, '.')
      return ext === pattern || f.name.toLowerCase().endsWith(pattern)
    })
  })
}

async function handleClick() {
  if (isTauri()) {
    const filters = props.accept.length > 0
      ? [{
          name: '支持的文件',
          extensions: props.accept.map((a) => a.replace(/^\./, '').toLowerCase())
        }]
      : undefined

    const fileInfos = await openFileDialog({
      multiple: props.multiple,
      directory: props.directory,
      filters
    })

    if (fileInfos.length > 0) {
      const files = filterFiles(fileInfos.filter((fi) => fi.file).map((fi) => fi.file!))
      emitFiles(files)
    }
  } else {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = props.multiple
    input.accept = acceptStr.value
    input.webkitdirectory = props.directory
    input.onchange = () => {
      if (input.files) {
        const files = filterFiles(Array.from(input.files))
        emitFiles(files)
      }
    }
    input.click()
  }
}

function emitFiles(files: File[]) {
  let result = files
  if (props.maxFiles > 0 && result.length > props.maxFiles) {
    result = result.slice(0, props.maxFiles)
  }
  if (result.length > 0) {
    emit('files-selected', result)
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
    e.dataTransfer.effectAllowed = 'copy'
  }
}

function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter++
  const hasFiles = e.dataTransfer?.types?.includes('Files')
  if (hasFiles) {
    isDragOver.value = true
  }
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter--
  if (dragCounter <= 0) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      isDragOver.value = false
      dragCounter = 0
    }
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = false
  dragCounter = 0

  const files: File[] = []
  const dt = e.dataTransfer

  if (dt) {
    if (dt.files && dt.files.length > 0) {
      for (let i = 0; i < dt.files.length; i++) {
        files.push(dt.files[i])
      }
    }
    if (files.length === 0 && dt.items && dt.items.length > 0) {
      for (let i = 0; i < dt.items.length; i++) {
        const item = dt.items[i]
        if (item.kind === 'file') {
          const f = item.getAsFile()
          if (f) files.push(f)
        }
      }
    }
  }

  const filtered = filterFiles(files)
  if (filtered.length > 0) {
    emitFiles(filtered)
  }
}

let unlistenFileDrop: (() => void) | null = null

onMounted(async () => {
  if (isTauri()) {
    try {
      const { listen } = await import('@tauri-apps/api/event')
      unlistenFileDrop = await listen('tauri://file-drop', (event: any) => {
        const paths: string[] = event.payload
        if (!Array.isArray(paths) || paths.length === 0) return
        handleDroppedFromTauri(paths)
      })
    } catch (e) {
      console.warn('file-drop 事件监听失败', e)
    }
  }
})

async function handleDroppedFromTauri(paths: string[]) {
  try {
    const { readBinaryFile, metadata } = await import('@tauri-apps/plugin-fs')
    const files: File[] = []

    for (const p of paths) {
      try {
        const meta = await metadata(p)
        if ('isDirectory' in meta && meta.isDirectory) continue

        const data = await readBinaryFile(p)
        const name = p.split(/[\\/]/).pop() || p
        const blob = new Blob([data])
        const file = new File([blob], name, { type: getMimeType(name) })
        ;(file as any).path = p
        files.push(file)
      } catch {
        continue
      }
    }

    const filtered = filterFiles(files)
    if (filtered.length > 0) {
      emitFiles(filtered)
    }
  } catch (e) {
    console.error('处理拖拽文件失败', e)
  }
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    webp: 'image/webp',
    txt: 'text/plain'
  }
  return map[ext] || 'application/octet-stream'
}

onUnmounted(() => {
  if (unlistenFileDrop) {
    unlistenFileDrop()
    unlistenFileDrop = null
  }
})
</script>

<template>
  <div
    ref="dropZoneRef"
    class="drop-zone"
    :class="{ 'drag-over': isDragOver, compact: compact }"
    @click="handleClick"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="drop-icon">{{ icon }}</div>
    <div class="drop-text">{{ hintText }}</div>
    <div v-if="accept.length > 0 && !compact" class="drop-hint">
      支持格式：{{ accept.join(', ') }}
    </div>
  </div>
</template>

<style scoped>
.drop-zone {
  border: 2px dashed var(--border-color, #d9d9d9);
  border-radius: 8px;
  padding: 32px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-tertiary, #fafafa);
  user-select: none;
}

.drop-zone.compact {
  padding: 16px 12px;
}

.drop-zone:hover {
  border-color: var(--primary-color, #1677ff);
  background: rgba(22, 119, 255, 0.03);
}

.drop-zone.drag-over {
  border-color: var(--primary-color, #1677ff);
  background: rgba(22, 119, 255, 0.06);
  transform: scale(1.01);
}

.drop-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.compact .drop-icon {
  font-size: 24px;
  margin-bottom: 6px;
}

.drop-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #262626);
  margin-bottom: 4px;
}

.compact .drop-text {
  font-size: 12px;
}

.drop-hint {
  font-size: 12px;
  color: var(--text-tertiary, #8c8c8c);
}
</style>
