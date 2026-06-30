<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'

// ==================== 类型定义 ====================
interface FileItem {
  name: string
  path?: string
  type: string
  size: number
  file?: File
}

interface Props {
  files: FileItem[]
  currentIndex?: number
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currentIndex: 0,
  visible: true
})

const emit = defineEmits<{
  'update:currentIndex': [index: number]
  'update:visible': [visible: boolean]
}>()

// ==================== 布局相关状态 ====================
// 左侧文件列表宽度
const sidebarWidth = ref(240)
// 拖拽状态
const isDragging = ref(false)
// 拖拽起始位置
let dragStartX = 0
let dragStartWidth = 0

// ==================== 预览相关状态 ====================
// 缩放比例
const scale = ref(100)
// 旋转角度
const rotation = ref(0)
// 当前页码（用于多页文档）
const currentPage = ref(1)
// 总页数
const totalPages = ref(1)
// 加载状态
const loading = ref(false)
// 错误信息
const errorMsg = ref('')
// 预览内容（文本/表格数据）
const previewContent = ref<any>(null)
// 图片预览URL
const imageUrl = ref('')
// 预览类型
const previewType = ref<'empty' | 'loading' | 'error' | 'image' | 'text' | 'table' | 'unsupported'>('empty')
// 显示的最大行数（性能优化）
const MAX_DISPLAY_LINES = 1000

// ==================== 文件类型判断 ====================
const getFileExt = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return ext
}

const isImage = (name: string): boolean => {
  const ext = getFileExt(name)
  return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)
}

const isExcel = (name: string): boolean => {
  const ext = getFileExt(name)
  return ['xlsx', 'xls', 'csv'].includes(ext)
}

const isWord = (name: string): boolean => {
  const ext = getFileExt(name)
  return ['docx', 'doc'].includes(ext)
}

const isPdf = (name: string): boolean => {
  const ext = getFileExt(name)
  return ext === 'pdf'
}

const isText = (name: string): boolean => {
  const ext = getFileExt(name)
  return ['txt', 'json', 'js', 'ts', 'vue', 'css', 'html', 'xml', 'md', 'py', 'java', 'c', 'cpp', 'h'].includes(ext)
}

// ==================== 当前文件计算属性 ====================
const currentFile = computed<FileItem | null>(() => {
  if (props.files.length === 0 || props.currentIndex < 0 || props.currentIndex >= props.files.length) {
    return null
  }
  return props.files[props.currentIndex]
})

const formattedFileSize = computed(() => {
  if (!currentFile.value) return ''
  const size = currentFile.value.size
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
})

const isTruncated = computed(() => {
  if (previewType.value === 'text' && previewContent.value) {
    const lines = previewContent.value.split('\n')
    return lines.length > MAX_DISPLAY_LINES
  }
  if (previewType.value === 'table' && previewContent.value) {
    return previewContent.value.length > MAX_DISPLAY_LINES
  }
  return false
})

const displayContent = computed(() => {
  if (previewType.value === 'text' && previewContent.value) {
    const lines = previewContent.value.split('\n')
    if (lines.length > MAX_DISPLAY_LINES) {
      return lines.slice(0, MAX_DISPLAY_LINES).join('\n')
    }
    return previewContent.value
  }
  if (previewType.value === 'table' && previewContent.value) {
    if (previewContent.value.length > MAX_DISPLAY_LINES) {
      return previewContent.value.slice(0, MAX_DISPLAY_LINES)
    }
    return previewContent.value
  }
  return null
})

// ==================== 加载文件预览 ====================
const loadFilePreview = async () => {
  if (!currentFile.value) {
    previewType.value = 'empty'
    previewContent.value = null
    imageUrl.value = ''
    return
  }

  loading.value = true
  errorMsg.value = ''
  previewContent.value = null
  imageUrl.value = ''
  currentPage.value = 1
  totalPages.value = 1
  scale.value = 100
  rotation.value = 0

  const file = currentFile.value

  try {
    // 图片文件
    if (isImage(file.name)) {
      await loadImagePreview(file)
    }
    // Excel文件
    else if (isExcel(file.name)) {
      await loadExcelPreview(file)
    }
    // Word文件
    else if (isWord(file.name)) {
      await loadWordPreview(file)
    }
    // PDF文件
    else if (isPdf(file.name)) {
      previewType.value = 'unsupported'
      errorMsg.value = 'PDF 预览需要安装 PDF 阅读器插件，当前仅支持文本预览。'
    }
    // 文本文件
    else if (isText(file.name)) {
      await loadTextPreview(file)
    }
    // 不支持的格式
    else {
      previewType.value = 'unsupported'
      errorMsg.value = `不支持的文件格式：${getFileExt(file.name) || '未知'}`
    }
  } catch (err: any) {
    previewType.value = 'error'
    errorMsg.value = err.message || '文件加载失败，文件可能已损坏'
  } finally {
    loading.value = false
  }
}

// 加载图片预览
const loadImagePreview = async (file: FileItem) => {
  if (file.file) {
    imageUrl.value = URL.createObjectURL(file.file)
  } else if (file.path) {
    // Tauri环境下从文件路径读取
    try {
      const { readBinaryFile } = await import('@tauri-apps/plugin-fs')
      const data = await readBinaryFile(file.path)
      const blob = new Blob([data as any], { type: getImageMimeType(file.name) })
      imageUrl.value = URL.createObjectURL(blob)
    } catch {
      throw new Error('无法读取图片文件')
    }
  } else {
    throw new Error('没有可用的图片数据源')
  }
  previewType.value = 'image'
  totalPages.value = 1
}

const getImageMimeType = (name: string): string => {
  const ext = getFileExt(name)
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp'
  }
  return mimeTypes[ext] || 'image/png'
}

// 加载Excel预览
const loadExcelPreview = async (file: FileItem) => {
  let data: ArrayBuffer | string

  if (file.file) {
    data = await file.file.arrayBuffer()
  } else if (file.path) {
    const { readBinaryFile } = await import('@tauri-apps/plugin-fs')
    const uint8 = await readBinaryFile(file.path)
    data = uint8.buffer as ArrayBuffer
  } else {
    throw new Error('没有可用的文件数据源')
  }

  const workbook = XLSX.read(data, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

  previewContent.value = jsonData
  previewType.value = 'table'
  totalPages.value = 1
}

// 加载Word预览
const loadWordPreview = async (file: FileItem) => {
  let arrayBuffer: ArrayBuffer

  if (file.file) {
    arrayBuffer = await file.file.arrayBuffer()
  } else if (file.path) {
    const { readBinaryFile } = await import('@tauri-apps/plugin-fs')
    const uint8 = await readBinaryFile(file.path)
    arrayBuffer = uint8.buffer as ArrayBuffer
  } else {
    throw new Error('没有可用的文件数据源')
  }

  try {
    const result = await mammoth.extractRawText({ arrayBuffer })
    previewContent.value = result.value || '（文档内容为空）'
    previewType.value = 'text'
    totalPages.value = 1
  } catch {
    previewType.value = 'unsupported'
    errorMsg.value = 'Word 文档解析失败，文档可能已损坏或格式不支持。'
  }
}

// 加载文本预览
const loadTextPreview = async (file: FileItem) => {
  let text: string

  if (file.file) {
    text = await file.file.text()
  } else if (file.path) {
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    text = await readTextFile(file.path)
  } else {
    throw new Error('没有可用的文件数据源')
  }

  previewContent.value = text
  previewType.value = 'text'
  totalPages.value = 1
}

// ==================== 工具栏操作 ====================
// 缩放
const zoomIn = () => {
  scale.value = Math.min(scale.value + 10, 500)
}

const zoomOut = () => {
  scale.value = Math.max(scale.value - 10, 10)
}

const resetZoom = () => {
  scale.value = 100
}

const fitWidth = () => {
  // 模拟适配宽度
  scale.value = 80
}

const fitPage = () => {
  // 模拟适配页面
  scale.value = 60
}

// 翻页
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

// 旋转
const rotateLeft = () => {
  rotation.value = (rotation.value - 90) % 360
}

const rotateRight = () => {
  rotation.value = (rotation.value + 90) % 360
}

// 切换文件列表显示
const toggleSidebar = () => {
  emit('update:visible', !props.visible)
}

// 选择文件
const selectFile = (index: number) => {
  emit('update:currentIndex', index)
}

// ==================== 拖拽分割条 ====================
const startDrag = (e: MouseEvent) => {
  e.preventDefault()
  isDragging.value = true
  dragStartX = e.clientX
  dragStartWidth = sidebarWidth.value
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  const diff = e.clientX - dragStartX
  const newWidth = Math.max(180, Math.min(400, dragStartWidth + diff))
  sidebarWidth.value = newWidth
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// ==================== 生命周期 ====================
watch(
  () => [props.currentIndex, props.files],
  () => {
    loadFilePreview()
  },
  { immediate: true, deep: true }
)

onUnmounted(() => {
  stopDrag()
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
})

// 格式化文件大小显示
const formatSize = (size: number): string => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

// 获取文件图标颜色
const getFileIconColor = (name: string): string => {
  if (isImage(name)) return '#52c41a'
  if (isExcel(name)) return '#52c41a'
  if (isWord(name)) return '#1677ff'
  if (isPdf(name)) return '#ff4d4f'
  if (isText(name)) return '#722ed1'
  return '#8c8c8c'
}

// 获取文件类型标签
const getFileTypeName = (name: string): string => {
  if (isImage(name)) return '图片'
  if (isExcel(name)) return 'Excel'
  if (isWord(name)) return 'Word'
  if (isPdf(name)) return 'PDF'
  if (isText(name)) return '文本'
  return '其他'
}
</script>

<template>
  <div class="preview-panel">
    <!-- 预览工具栏 -->
    <div class="preview-toolbar">
      <div class="toolbar-left">
        <n-button
          quaternary
          size="small"
          @click="toggleSidebar"
          class="toolbar-btn"
        >
          <template #icon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </template>
        </n-button>
        <div class="divider"></div>
        <span v-if="currentFile" class="file-name" :title="currentFile.name">
          {{ currentFile.name }}
        </span>
        <n-tag v-if="currentFile" size="small" :color="getFileIconColor(currentFile.name)" class="file-type-tag">
          {{ getFileTypeName(currentFile.name) }}
        </n-tag>
      </div>

      <div class="toolbar-right">
        <n-space size="small">
          <!-- 缩放控制 -->
          <n-button-group size="small">
            <n-button quaternary @click="zoomOut" :disabled="!currentFile">
              <template #icon>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </template>
            </n-button>
            <n-button quaternary style="min-width: 60px;">
              {{ scale }}%
            </n-button>
            <n-button quaternary @click="zoomIn" :disabled="!currentFile">
              <template #icon>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </template>
            </n-button>
          </n-button-group>

          <!-- 适配按钮 -->
          <n-button quaternary size="small" @click="fitWidth" :disabled="!currentFile" title="适配宽度">
            <template #icon>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" y1="9" x2="20" y2="9"></line>
                <line x1="4" y1="15" x2="20" y2="15"></line>
                <polyline points="9 3 4 9 9 15"></polyline>
                <polyline points="15 3 20 9 15 15"></polyline>
              </svg>
            </template>
          </n-button>

          <n-button quaternary size="small" @click="fitPage" :disabled="!currentFile" title="适配页面">
            <template #icon>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </template>
          </n-button>

          <n-button quaternary size="small" @click="resetZoom" :disabled="!currentFile" title="重置缩放">
            <template #icon>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
            </template>
          </n-button>

          <div class="divider"></div>

          <!-- 翻页控制 -->
          <n-button-group size="small">
            <n-button quaternary @click="prevPage" :disabled="!currentFile || currentPage <= 1">
              <template #icon>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </template>
            </n-button>
            <n-button quaternary style="min-width: 70px;">
              {{ currentPage }} / {{ totalPages }}
            </n-button>
            <n-button quaternary @click="nextPage" :disabled="!currentFile || currentPage >= totalPages">
              <template #icon>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </template>
            </n-button>
          </n-button-group>

          <div class="divider"></div>

          <!-- 旋转控制 -->
          <n-button quaternary size="small" @click="rotateLeft" :disabled="!currentFile || previewType !== 'image'" title="左旋90°">
            <template #icon>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
            </template>
          </n-button>
          <n-button quaternary size="small" @click="rotateRight" :disabled="!currentFile || previewType !== 'image'" title="右旋90°">
            <template #icon>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </template>
          </n-button>
        </n-space>
      </div>
    </div>

    <!-- 主体内容区域 -->
    <div class="preview-body">
      <!-- 左侧文件列表 -->
      <div
        v-show="visible"
        class="file-sidebar"
        :style="{ width: sidebarWidth + 'px' }"
      >
        <div class="sidebar-header">
          <span class="sidebar-title">文件列表</span>
          <n-tag size="small" type="info">{{ files.length }}</n-tag>
        </div>
        <div class="file-list">
          <div
            v-for="(file, index) in files"
            :key="index"
            class="file-item"
            :class="{ active: index === currentIndex }"
            @click="selectFile(index)"
          >
            <div class="file-icon" :style="{ backgroundColor: getFileIconColor(file.name) + '20', color: getFileIconColor(file.name) }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
            </div>
            <div class="file-info">
              <div class="file-item-name" :title="file.name">{{ file.name }}</div>
              <div class="file-item-size">{{ formatSize(file.size) }}</div>
            </div>
          </div>
          <n-empty v-if="files.length === 0" description="暂无文件" size="small" />
        </div>
      </div>

      <!-- 拖拽分割条 -->
      <div
        v-show="visible"
        class="resizer"
        :class="{ dragging: isDragging }"
        @mousedown="startDrag"
      >
        <div class="resizer-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>

      <!-- 右侧预览区域 -->
      <div class="preview-content">
        <!-- 加载状态 -->
        <div v-if="loading" class="preview-state">
          <n-spin size="large" />
          <span class="state-text">加载中...</span>
        </div>

        <!-- 空状态 -->
        <div v-else-if="previewType === 'empty'" class="preview-state">
          <n-empty description="请选择一个文件进行预览" />
        </div>

        <!-- 错误状态 -->
        <div v-else-if="previewType === 'error'" class="preview-state">
          <n-alert type="error" :show-icon="true" class="error-alert">
            {{ errorMsg }}
          </n-alert>
        </div>

        <!-- 不支持的格式 -->
        <div v-else-if="previewType === 'unsupported'" class="preview-state">
          <n-alert type="warning" :show-icon="true" class="error-alert">
            {{ errorMsg }}
          </n-alert>
        </div>

        <!-- 图片预览 -->
        <div v-else-if="previewType === 'image'" class="image-preview-container">
          <div class="image-wrapper">
            <img
              :src="imageUrl"
              :style="{
                transform: `scale(${scale / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center'
              }"
              class="preview-image"
              alt="预览图片"
              loading="lazy"
            />
          </div>
        </div>

        <!-- 文本预览 -->
        <div v-else-if="previewType === 'text'" class="text-preview-container">
          <div v-if="isTruncated" class="truncate-tip">
            <n-alert type="info" :show-icon="true" size="small">
              文件内容过大，仅显示前 {{ MAX_DISPLAY_LINES }} 行。
            </n-alert>
          </div>
          <pre
            class="text-content"
            :style="{ fontSize: `${scale * 0.14}px` }"
          >{{ displayContent }}</pre>
        </div>

        <!-- 表格预览（Excel） -->
        <div v-else-if="previewType === 'table'" class="table-preview-container">
          <div v-if="isTruncated" class="truncate-tip">
            <n-alert type="info" :show-icon="true" size="small">
              数据行数过多，仅显示前 {{ MAX_DISPLAY_LINES }} 行。
            </n-alert>
          </div>
          <div class="table-wrapper">
            <table
              class="preview-table"
              :style="{ fontSize: `${scale * 0.14}px` }"
            >
              <thead v-if="displayContent && displayContent.length > 0">
                <tr>
                  <th class="row-index">#</th>
                  <th
                    v-for="(cell, cellIndex) in displayContent[0]"
                    :key="cellIndex"
                    class="table-header"
                  >
                    {{ cell || `列${cellIndex + 1}` }}
                  </th>
                </tr>
              </thead>
              <tbody v-if="displayContent && displayContent.length > 1">
                <tr
                  v-for="(row, rowIndex) in displayContent.slice(1)"
                  :key="rowIndex"
                  class="table-row"
                >
                  <td class="row-index">{{ rowIndex + 1 }}</td>
                  <td
                    v-for="(cell, cellIndex) in row"
                    :key="cellIndex"
                    class="table-cell"
                  >
                    {{ cell !== undefined && cell !== null ? cell : '' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 变量定义 ==================== */
:root {
  --primary-color: #1677ff;
  --bg-color: #ffffff;
  --bg-secondary: #f5f7fa;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --border-color: #e5e7eb;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --radius-sm: 6px;
  --radius-md: 8px;
  --hover-bg: #f0f7ff;
}

/* 深色主题适配 */
.dark {
  --bg-color: #1f2937;
  --bg-secondary: #111827;
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
  --text-tertiary: #6b7280;
  --border-color: #374151;
  --hover-bg: #1e3a5f;
}

/* ==================== 容器样式 ==================== */
.preview-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--bg-color);
  overflow: hidden;
}

/* ==================== 工具栏样式 ==================== */
.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-color);
  flex-shrink: 0;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.toolbar-btn {
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background-color: var(--hover-bg);
}

.divider {
  width: 1px;
  height: 20px;
  background-color: var(--border-color);
  margin: 0 4px;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.file-type-tag {
  flex-shrink: 0;
}

/* ==================== 主体区域 ==================== */
.preview-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ==================== 左侧文件列表 ==================== */
.file-sidebar {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.file-item:hover {
  background-color: var(--hover-bg);
}

.file-item.active {
  background-color: var(--primary-color);
  color: white;
}

.file-item.active .file-item-name,
.file-item.active .file-item-size {
  color: white;
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.file-item-name {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.file-item-size {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* ==================== 拖拽分割条 ==================== */
.resizer {
  width: 5px;
  flex-shrink: 0;
  cursor: col-resize;
  background-color: transparent;
  position: relative;
  transition: background-color 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.resizer:hover,
.resizer.dragging {
  background-color: var(--primary-color);
}

.resizer-dots {
  display: flex;
  flex-direction: column;
  gap: 3px;
  position: absolute;
  z-index: 1;
}

.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background-color: var(--border-color);
  transition: background-color 0.15s ease;
}

.resizer:hover .dot,
.resizer.dragging .dot {
  background-color: var(--primary-color);
}

/* ==================== 预览区域 ==================== */
.preview-content {
  flex: 1;
  overflow: auto;
  position: relative;
  background-color: var(--bg-secondary);
}

/* 状态展示 */
.preview-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  padding: 40px;
}

.state-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.error-alert {
  max-width: 400px;
}

/* 图片预览 */
.image-preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.image-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  max-height: 100%;
  overflow: auto;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.2s ease;
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-sm);
}

/* 文本预览 */
.text-preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.truncate-tip {
  padding: 12px 16px;
  flex-shrink: 0;
}

.text-content {
  flex: 1;
  margin: 0;
  padding: 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--bg-color);
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 表格预览 */
.table-preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-wrapper {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.preview-table {
  border-collapse: collapse;
  width: 100%;
  background-color: var(--bg-color);
  box-shadow: var(--shadow-sm);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.table-header {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: 600;
  padding: 10px 14px;
  text-align: left;
  border-bottom: 2px solid var(--border-color);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}

.table-row {
  transition: background-color 0.15s ease;
}

.table-row:hover {
  background-color: var(--hover-bg);
}

.table-row:nth-child(even) {
  background-color: var(--bg-secondary);
}

.table-row:nth-child(even):hover {
  background-color: var(--hover-bg);
}

.table-cell {
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  white-space: nowrap;
}

.row-index {
  width: 50px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
  padding: 8px 6px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  position: sticky;
  left: 0;
  z-index: 1;
}

thead .row-index {
  position: sticky;
  left: 0;
  z-index: 2;
  background-color: var(--bg-secondary);
  border-bottom: 2px solid var(--border-color);
}

/* 滚动条样式 */
.file-list::-webkit-scrollbar,
.preview-content::-webkit-scrollbar,
.text-content::-webkit-scrollbar,
.table-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.file-list::-webkit-scrollbar-track,
.preview-content::-webkit-scrollbar-track,
.text-content::-webkit-scrollbar-track,
.table-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.file-list::-webkit-scrollbar-thumb,
.preview-content::-webkit-scrollbar-thumb,
.text-content::-webkit-scrollbar-thumb,
.table-wrapper::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 4px;
}

.file-list::-webkit-scrollbar-thumb:hover,
.preview-content::-webkit-scrollbar-thumb:hover,
.text-content::-webkit-scrollbar-thumb:hover,
.table-wrapper::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-tertiary);
}
</style>
