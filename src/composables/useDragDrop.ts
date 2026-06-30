import { ref } from 'vue'

// === 新增：Windows兼容的文件拖拽上传工具 ===
// 修复Windows下Tauri WebView拖拽的若干问题：
// 1. dataTransfer.files 可能为空，用 items 作为备选
// 2. dragleave 在子元素间移动时误触发，用边界检测判断
// 3. 统一拖拽高亮样式和文件提取逻辑

export interface UseDragDropOptions {
  onFilesDropped?: (files: File[]) => void
  accept?: RegExp
}

export function useDragDrop(options: UseDragDropOptions = {}) {
  const isDragOver = ref(false)
  let dragCounter = 0

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 修复：Windows下有时dataTransfer为null，需判断
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
      e.dataTransfer.effectAllowed = 'copy'
    }
  }

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter++
    // 检查是否包含文件
    const hasFiles = e.dataTransfer?.types?.includes('Files')
    if (hasFiles) {
      isDragOver.value = true
    }
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter--
    // 修复：dragleave在子元素间移动时误触发
    // 用计数器 + 边界检测双重保障
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

  const handleDrop = (e: DragEvent): File[] => {
    e.preventDefault()
    e.stopPropagation()
    isDragOver.value = false
    dragCounter = 0

    // 修复：Windows兼容 - 多种方式提取文件
    const files: File[] = []
    const dt = e.dataTransfer

    if (dt) {
      // 方式1: 直接从 files 读取
      if (dt.files && dt.files.length > 0) {
        for (let i = 0; i < dt.files.length; i++) {
          const f = dt.files[i]
          if (!options.accept || options.accept.test(f.name)) {
            files.push(f)
          }
        }
      }
      // 方式2: 从 items 读取（Windows下有时files为空但items有）
      if (files.length === 0 && dt.items && dt.items.length > 0) {
        for (let i = 0; i < dt.items.length; i++) {
          const item = dt.items[i]
          if (item.kind === 'file') {
            const f = item.getAsFile()
            if (f && (!options.accept || options.accept.test(f.name))) {
              files.push(f)
            }
          }
        }
      }
    }

    if (files.length > 0 && options.onFilesDropped) {
      options.onFilesDropped(files)
    }

    return files
  }

  const resetDrag = () => {
    isDragOver.value = false
    dragCounter = 0
  }

  return {
    isDragOver,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    resetDrag
  }
}
