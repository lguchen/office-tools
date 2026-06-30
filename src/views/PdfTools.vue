<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useMessage } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'
import FileUploader from '@/components/FileUploader.vue'
import { useTaskStore, type TaskItem } from '@/stores/task'
import { usePrintStore } from '@/stores/print'
import { useSettingStore } from '@/stores/setting'
import {
  readPDF,
  mergePDFs,
  splitPDF,
  extractPages,
  imagesToPDF,
  compressPDF,
  downloadPDF,
  type PDFFile
} from '@/utils/pdfUtils'
import { isTauri } from '@/utils/tauriUtils'

// ============== 类型定义 ==============
// 文件列表项 - 统一用 fileList 数组管理
interface FileItem {
  id: string
  name: string
  path: string
  size: number
  type: string
  status: 'pending' | 'processing' | 'success' | 'failed'
  pdfFile?: PDFFile
}

// 格式转换配置
interface ConvertOptions {
  outputFormat: 'images' | 'text' | 'word'
  imageFormat?: 'png' | 'jpg'
  dpi?: number
}

// 合并PDF配置
interface MergeOptions {
  outputName: string
}

// 拆分PDF配置
interface SplitOptions {
  mode: 'every_page' | 'custom_range' | 'by_count'
  pageRanges?: string
  pageCount?: number
}

// 批量打印配置
interface PrintOptions {
  copies: number
  pageRange: 'all' | 'custom'
  startPage: number
  endPage: number
}

// ============== 基础状态 ==============
const message = useMessage()
const taskStore = useTaskStore()
const printStore = usePrintStore()
const settingStore = useSettingStore()

// 当前激活的功能标签
const activeTab = ref<'convert' | 'merge' | 'split' | 'print'>('convert')

// 文件列表 - 统一用 fileList 数组管理
const fileList = ref<FileItem[]>([])

// 当前预览的文件索引
const currentPreviewIndex = ref(0)

// 预览面板拖拽状态
const isResizing = ref(false)

// 右侧面板显示模式
const rightPanelMode = ref<'files' | 'tasks'>('files')

// ============== 各功能配置对象 - 确保初始化完整 ==============
// 格式转换配置
const convertOptions = ref<ConvertOptions>({
  outputFormat: 'images',
  imageFormat: 'png',
  dpi: 150
})

// 合并PDF配置
const mergeOptions = ref<MergeOptions>({
  outputName: '合并结果.pdf'
})

// 拆分PDF配置
const splitOptions = ref<SplitOptions>({
  mode: 'every_page',
  pageRanges: '',
  pageCount: 1
})

// 批量打印配置
const printOptions = ref<PrintOptions>({
  copies: 1,
  pageRange: 'all',
  startPage: 1,
  endPage: 1
})

// ============== 计算属性 ==============
// 当前预览的文件
const currentPreviewFile = computed(() => {
  if (fileList.value.length === 0) return null
  return fileList.value[currentPreviewIndex.value] || null
})

// 当前预览文件的页数
const currentPageCount = computed(() => {
  return currentPreviewFile.value?.pdfFile?.pageCount || 0
})

// ============== 文件上传处理 ==============
/**
 * 处理文件选择 - 使用 FileUploader 组件
 * @param files 选择的文件数组
 */
const handleFilesSelected = async (files: File[]) => {
  try {
    for (const file of files) {
      // 检查是否已存在
      const exists = fileList.value.some((f) => f.name === file.name)
      if (exists) {
        message.warning(`文件 ${file.name} 已存在`)
        continue
      }

      const filePath = (file as any).path || file.name
      const fileSize = file.size || 0

      // 创建文件项 - 统一结构
      const fileItem: FileItem = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        name: file.name,
        path: filePath,
        size: fileSize,
        type: getFileType(file.name),
        status: 'pending'
      }

      fileList.value.push(fileItem)

      // 异步读取文件内容
      try {
        fileItem.status = 'processing'
        const pdfFile = await readPDF(file)
        // 保存真实路径（Tauri环境下）
        if ((file as any).path) {
          pdfFile.path = (file as any).path
        }
        fileItem.pdfFile = pdfFile
        fileItem.status = 'success'
        taskStore.addLog('success', `加载文件成功：${file.name} (${pdfFile.pageCount}页)`)
      } catch (e: any) {
        fileItem.status = 'failed'
        taskStore.addLog('error', `加载文件失败：${file.name} - ${e.message}`)
        message.error(`加载文件失败：${file.name}`)
      }
    }
  } catch (e: any) {
    message.error(`处理文件失败：${e.message}`)
    taskStore.addLog('error', `处理文件失败：${e.message}`)
  }
}

/**
 * 获取文件类型
 */
const getFileType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return ext
}

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 移除文件
 */
const removeFile = (id: string) => {
  try {
    const index = fileList.value.findIndex((f) => f.id === id)
    if (index > -1) {
      const fileName = fileList.value[index].name
      fileList.value.splice(index, 1)
      if (currentPreviewIndex.value >= fileList.value.length) {
        currentPreviewIndex.value = Math.max(0, fileList.value.length - 1)
      }
      taskStore.addLog('info', `移除文件：${fileName}`)
    }
  } catch (e: any) {
    message.error(`移除文件失败：${e.message}`)
  }
}

/**
 * 清空文件列表
 */
const clearFiles = () => {
  try {
    fileList.value = []
    currentPreviewIndex.value = 0
    message.info('已清空文件列表')
    taskStore.addLog('info', '已清空文件列表')
  } catch (e: any) {
    message.error(`清空文件失败：${e.message}`)
  }
}

// ============== 格式转换功能 ==============
/**
 * 执行格式转换
 */
const doFormatConvert = async () => {
  if (fileList.value.length === 0) {
    message.warning('请先添加PDF文件')
    return
  }

  try {
    // 添加任务到队列
    const tasks = fileList.value.map((f) => ({
      name: f.name,
      type: `pdf-convert-${convertOptions.value.outputFormat}`,
      inputPath: f.path
    }))
    taskStore.addTasks(tasks)

    // 开始批量处理
    taskStore.startBatch(async (task: TaskItem, onProgress: (p: number) => void) => {
      onProgress(10)

      // 找到对应的文件
      const fileItem = fileList.value.find((f) => f.name === task.name)
      if (!fileItem?.pdfFile) {
        throw new Error('文件未找到或未加载')
      }

      onProgress(30)

      // 根据输出格式处理
      if (convertOptions.value.outputFormat === 'images') {
        // 转图片 - 使用 Rust IPC 处理（Tauri环境）
        if (isTauri()) {
          try {
            const result = await invoke('pdf_to_images', {
              inputPath: fileItem.path,
              format: convertOptions.value.imageFormat || 'png',
              dpi: convertOptions.value.dpi || 150
            })
            task.outputPath = result as string
            onProgress(100)
          } catch (e: any) {
            throw new Error(`转图片失败：${e.message}`)
          }
        } else {
          // 浏览器环境暂不支持复杂转换
          throw new Error('浏览器环境暂不支持图片转换，请使用桌面端')
        }
      } else if (convertOptions.value.outputFormat === 'text') {
        // 转文本 - 简单提取页面文本
        if (isTauri()) {
          try {
            const result = await invoke('pdf_to_text', {
              inputPath: fileItem.path
            })
            const text = result as string
            const outputName = `${fileItem.name.replace(/\.[^.]+$/, '')}.txt`
            
            try {
              const savePath = await invoke('save_text_file', {
                content: text,
                fileName: outputName
              })
              task.outputPath = savePath as string
            } catch {
              // 回退到浏览器下载
              const blob = new Blob([text], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = outputName
              a.click()
              URL.revokeObjectURL(url)
            }
            onProgress(100)
          } catch (e: any) {
            throw new Error(`转文本失败：${e.message}`)
          }
        } else {
          throw new Error('浏览器环境暂不支持文本提取，请使用桌面端')
        }
      } else if (convertOptions.value.outputFormat === 'word') {
        // 转Word
        if (isTauri()) {
          try {
            const result = await invoke('pdf_to_word', {
              inputPath: fileItem.path
            })
            task.outputPath = result as string
            onProgress(100)
          } catch (e: any) {
            throw new Error(`转Word失败：${e.message}`)
          }
        } else {
          throw new Error('浏览器环境暂不支持Word转换，请使用桌面端')
        }
      }

      onProgress(100)
    })

    message.success(`已添加 ${fileList.value.length} 个转换任务到队列`)
    rightPanelMode.value = 'tasks'
  } catch (e: any) {
    message.error(`格式转换失败：${e.message}`)
    taskStore.addLog('error', `格式转换失败：${e.message}`)
  }
}

// ============== 合并PDF功能 ==============
/**
 * 执行PDF合并
 */
const doMerge = async () => {
  if (fileList.value.length < 2) {
    message.warning('请至少添加2个PDF文件')
    return
  }

  try {
    // 添加合并任务（单个任务）
    taskStore.addTasks([{
      name: mergeOptions.value.outputName,
      type: 'pdf-merge',
      inputPath: fileList.value.map(f => f.path).join('|')
    }])

    // 开始处理
    taskStore.startBatch(async (task: TaskItem, onProgress: (p: number) => void) => {
      onProgress(10)

      // 收集所有已加载的PDF文件
      const pdfFiles = fileList.value
        .filter((f) => f.pdfFile && f.status === 'success')
        .map((f) => f.pdfFile!)

      if (pdfFiles.length < 2) {
        throw new Error('可合并的有效文件不足2个')
      }

      onProgress(40)

      // Tauri 环境使用 Rust 后端合并
      if (isTauri()) {
        try {
          const inputPaths = fileList.value
            .filter((f) => f.status === 'success')
            .map((f) => f.path)
          
          const result = await invoke('merge_pdfs', {
            inputPaths,
            outputName: mergeOptions.value.outputName
          })
          task.outputPath = result as string
          onProgress(100)
          return
        } catch (e: any) {
          console.warn('Rust 合并失败，回退到前端处理:', e)
        }
      }

      // 前端合并（回退方案）
      const mergedData = await mergePDFs(pdfFiles)
      onProgress(80)

      // 保存或下载
      if (isTauri()) {
        try {
          const savePath = await invoke('save_pdf_file', {
            data: Array.from(mergedData),
            fileName: mergeOptions.value.outputName
          })
          task.outputPath = savePath as string
        } catch {
          downloadPDF(mergedData, mergeOptions.value.outputName)
        }
      } else {
        downloadPDF(mergedData, mergeOptions.value.outputName)
      }

      onProgress(100)
    })

    message.success('已添加合并任务到队列')
    rightPanelMode.value = 'tasks'
  } catch (e: any) {
    message.error(`合并失败：${e.message}`)
    taskStore.addLog('error', `合并失败：${e.message}`)
  }
}

// ============== 拆分PDF功能 ==============
/**
 * 执行PDF拆分
 */
const doSplit = async () => {
  if (fileList.value.length === 0) {
    message.warning('请先添加PDF文件')
    return
  }

  const firstFile = fileList.value[0]
  if (!firstFile?.pdfFile) {
    message.warning('文件未加载完成')
    return
  }

  try {
    // 添加拆分任务
    taskStore.addTasks([{
      name: `${firstFile.name} - 拆分`,
      type: 'pdf-split',
      inputPath: firstFile.path
    }])

    // 开始处理
    taskStore.startBatch(async (task: TaskItem, onProgress: (p: number) => void) => {
      onProgress(10)

      const fileItem = fileList.value[0]
      if (!fileItem?.pdfFile) {
        throw new Error('文件未找到或未加载')
      }

      const pageCount = fileItem.pdfFile.pageCount
      onProgress(30)

      // Tauri 环境使用 Rust 后端拆分
      if (isTauri()) {
        try {
          let result: string
          if (splitOptions.value.mode === 'every_page') {
            result = await invoke('split_pdf', {
              inputPath: fileItem.path,
              mode: 'every_page'
            }) as string
          } else if (splitOptions.value.mode === 'custom_range') {
            result = await invoke('split_pdf', {
              inputPath: fileItem.path,
              mode: 'custom_range',
              ranges: splitOptions.value.pageRanges || ''
            }) as string
          } else {
            result = await invoke('split_pdf', {
              inputPath: fileItem.path,
              mode: 'by_count',
              pageCount: splitOptions.value.pageCount || 1
            }) as string
          }
          task.outputPath = result
          onProgress(100)
          return
        } catch (e: any) {
          console.warn('Rust 拆分失败，回退到前端处理:', e)
        }
      }

      // 前端拆分（回退方案）
      if (splitOptions.value.mode === 'every_page') {
        // 每页一个文件
        const results = await splitPDF(fileItem.pdfFile)
        onProgress(70)

        if (isTauri()) {
          // 保存所有拆分文件
          for (const r of results) {
            const outputName = `${fileItem.name.replace(/\.[^.]+$/, '')}_第${r.page}页.pdf`
            try {
              await invoke('save_pdf_file', {
                data: Array.from(r.data),
                fileName: outputName
              })
            } catch {
              downloadPDF(r.data, outputName)
            }
          }
        } else {
          for (const r of results) {
            const outputName = `${fileItem.name.replace(/\.[^.]+$/, '')}_第${r.page}页.pdf`
            downloadPDF(r.data, outputName)
          }
        }
      } else if (splitOptions.value.mode === 'custom_range') {
        // 自定义范围
        const ranges = parsePageRanges(splitOptions.value.pageRanges || '', pageCount)
        if (ranges.length === 0) {
          throw new Error('页码范围格式不正确')
        }

        onProgress(60)
        const indices: number[] = []
        for (const range of ranges) {
          for (let i = range.start - 1; i < range.end; i++) {
            if (i >= 0 && i < pageCount) {
              indices.push(i)
            }
          }
        }

        const data = await extractPages(fileItem.pdfFile, indices)
        onProgress(80)

        const outputName = `${fileItem.name.replace(/\.[^.]+$/, '')}_提取页.pdf`
        if (isTauri()) {
          try {
            const savePath = await invoke('save_pdf_file', {
              data: Array.from(data),
              fileName: outputName
            })
            task.outputPath = savePath as string
          } catch {
            downloadPDF(data, outputName)
          }
        } else {
          downloadPDF(data, outputName)
        }
      } else if (splitOptions.value.mode === 'by_count') {
        // 按页数拆分
        const perCount = splitOptions.value.pageCount || 1
        const totalFiles = Math.ceil(pageCount / perCount)
        onProgress(50)

        for (let i = 0; i < totalFiles; i++) {
          const startIdx = i * perCount
          const endIdx = Math.min(startIdx + perCount, pageCount)
          const indices: number[] = []
          for (let j = startIdx; j < endIdx; j++) {
            indices.push(j)
          }

          const data = await extractPages(fileItem.pdfFile, indices)
          const outputName = `${fileItem.name.replace(/\.[^.]+$/, '')}_第${startIdx + 1}-${endIdx}页.pdf`
          
          if (isTauri()) {
            try {
              await invoke('save_pdf_file', {
                data: Array.from(data),
                fileName: outputName
              })
            } catch {
              downloadPDF(data, outputName)
            }
          } else {
            downloadPDF(data, outputName)
          }

          onProgress(50 + Math.round((i + 1) / totalFiles * 50))
        }
      }

      onProgress(100)
    })

    message.success('已添加拆分任务到队列')
    rightPanelMode.value = 'tasks'
  } catch (e: any) {
    message.error(`拆分失败：${e.message}`)
    taskStore.addLog('error', `拆分失败：${e.message}`)
  }
}

/**
 * 解析页码范围字符串
 * 支持格式: "1-3,5,7-9"
 */
const parsePageRanges = (str: string, maxPage: number): { start: number; end: number }[] => {
  const result: { start: number; end: number }[] = []
  const parts = str.split(',').map((s) => s.trim()).filter(Boolean)

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-')
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
        result.push({
          start: Math.min(start, maxPage),
          end: Math.min(end, maxPage)
        })
      }
    } else {
      const page = parseInt(part, 10)
      if (!isNaN(page) && page > 0 && page <= maxPage) {
        result.push({ start: page, end: page })
      }
    }
  }

  return result
}

// ============== 批量打印功能 ==============
/**
 * 打开打印面板
 */
const doBatchPrint = () => {
  if (fileList.value.length === 0) {
    message.warning('请先添加PDF文件')
    return
  }

  try {
    const firstFile = fileList.value[0]
    if (!firstFile?.pdfFile) {
      message.warning('文件未加载完成')
      return
    }

    const pageCount = firstFile.pdfFile.pageCount

    // 构建打印预览内容
    const content = `
      <div style="padding: 40px; text-align: center;">
        <div style="font-size: 64px; margin-bottom: 20px;">📑</div>
        <div style="font-size: 16px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px; word-break: break-all;">${firstFile.name}</div>
        <div style="font-size: 13px; color: var(--text-tertiary);">PDF文档 · ${pageCount}页</div>
      </div>
    `

    // 设置打印预览
    printStore.setPreview(content, 'pdf', pageCount)

    // 设置待打印文件路径
    printStore.filePaths = fileList.value
      .filter((f) => f.pdfFile && f.status === 'success')
      .map((f) => f.path)

    // 显示打印面板
    printStore.showPanel()

    message.info('已打开打印面板')
    taskStore.addLog('info', '打开打印面板')
  } catch (e: any) {
    message.error(`打印失败：${e.message}`)
    taskStore.addLog('error', `打印失败：${e.message}`)
  }
}

// ============== 执行当前功能 ==============
/**
 * 根据当前激活的 Tab 执行对应功能
 */
const executeAction = () => {
  try {
    switch (activeTab.value) {
      case 'convert':
        doFormatConvert()
        break
      case 'merge':
        doMerge()
        break
      case 'split':
        doSplit()
        break
      case 'print':
        doBatchPrint()
        break
    }
  } catch (e: any) {
    message.error(`操作失败：${e.message}`)
    taskStore.addLog('error', `操作失败：${e.message}`)
  }
}

// ============== 预览面板拖拽调整宽度 ==============
/**
 * 开始拖拽调整预览面板宽度
 */
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = settingStore.previewWidth

  const onMove = (ev: MouseEvent) => {
    const diff = startX - ev.clientX
    const newWidth = startWidth + diff
    settingStore.setPreviewWidth(newWidth)
  }

  const onUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// ============== 生命周期 ==============
onMounted(() => {
  // 初始化配置，确保所有配置对象都有默认值
  nextTick(() => {
    if (fileList.value.length > 0 && currentPageCount.value > 0) {
      printOptions.value.endPage = currentPageCount.value
    }
  })
})

onUnmounted(() => {
  // 清理工作
})
</script>

<template>
  <div class="pdf-tools-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">📑 PDF 批量处理</h2>
      <p class="page-desc">支持格式转换、合并、拆分、批量打印，纯本地处理，安全可靠</p>
    </div>

    <!-- 主内容区 - 左右分栏布局 -->
    <div class="main-container">
      <!-- 左侧：功能区 -->
      <div class="left-panel">
        <!-- 文件上传区 - 使用 FileUploader 组件，支持pdf格式 -->
        <n-card class="upload-card" :bordered="false" size="small">
          <FileUploader
            :accept="['pdf']"
            :multiple="true"
            hint-text="拖拽PDF文件到此处，或点击选择"
            icon="📑"
            @files-selected="handleFilesSelected"
          />
        </n-card>

        <!-- 功能标签页 - 格式转换、合并PDF、拆分PDF、批量打印 -->
        <n-tabs v-model:value="activeTab" class="function-tabs" type="line" size="medium">
          <!-- 格式转换 -->
          <n-tab-pane name="convert" tab="格式转换">
            <n-card class="config-card" :bordered="false" size="small">
              <div class="config-title">⚙ 转换配置</div>
              <n-form label-placement="left" label-width="100px">
                <n-form-item label="输出格式">
                  <n-select
                    v-model:value="convertOptions.outputFormat"
                    :options="[
                      { label: '图片 (PNG/JPG)', value: 'images' },
                      { label: '文本 (.txt)', value: 'text' },
                      { label: 'Word (.docx)', value: 'word' }
                    ]"
                    style="width: 100%"
                  />
                </n-form-item>
                <n-form-item v-if="convertOptions.outputFormat === 'images'" label="图片格式">
                  <n-radio-group v-model:value="convertOptions.imageFormat">
                    <n-radio value="png">PNG</n-radio>
                    <n-radio value="jpg">JPG</n-radio>
                  </n-radio-group>
                </n-form-item>
                <n-form-item v-if="convertOptions.outputFormat === 'images'" label="分辨率(DPI)">
                  <n-select
                    v-model:value="convertOptions.dpi"
                    :options="[
                      { label: '72 DPI (低)', value: 72 },
                      { label: '150 DPI (中)', value: 150 },
                      { label: '300 DPI (高)', value: 300 }
                    ]"
                    style="width: 100%"
                  />
                </n-form-item>
              </n-form>
              <div class="config-tip">
                将 PDF 转换为指定格式，支持批量处理多个文件
              </div>
            </n-card>
          </n-tab-pane>

          <!-- 合并PDF -->
          <n-tab-pane name="merge" tab="合并PDF">
            <n-card class="config-card" :bordered="false" size="small">
              <div class="config-title">⚙ 合并配置</div>
              <n-form label-placement="left" label-width="100px">
                <n-form-item label="输出文件名">
                  <n-input
                    v-model:value="mergeOptions.outputName"
                    placeholder="请输入输出文件名"
                    clearable
                  />
                </n-form-item>
              </n-form>
              <div class="config-tip">
                按文件列表顺序合并所有PDF文件，至少需要2个文件
              </div>
            </n-card>
          </n-tab-pane>

          <!-- 拆分PDF -->
          <n-tab-pane name="split" tab="拆分PDF">
            <n-card class="config-card" :bordered="false" size="small">
              <div class="config-title">⚙ 拆分配置</div>
              <n-form label-placement="left" label-width="100px">
                <n-form-item label="拆分方式">
                  <n-radio-group v-model:value="splitOptions.mode">
                    <n-radio value="every_page">每页一个</n-radio>
                    <n-radio value="custom_range">自定义范围</n-radio>
                    <n-radio value="by_count">按页数拆分</n-radio>
                  </n-radio-group>
                </n-form-item>
                <n-form-item v-if="splitOptions.mode === 'custom_range'" label="页码范围">
                  <n-input
                    v-model:value="splitOptions.pageRanges"
                    placeholder="例如: 1-3,5,7-9"
                    clearable
                  />
                </n-form-item>
                <n-form-item v-if="splitOptions.mode === 'by_count'" label="每页数量">
                  <n-input-number
                    v-model:value="splitOptions.pageCount"
                    :min="1"
                    :max="999"
                    style="width: 100%"
                  />
                </n-form-item>
              </n-form>
              <div class="config-tip">
                将PDF文件按指定方式拆分为多个文件，对列表中第一个文件操作
              </div>
            </n-card>
          </n-tab-pane>

          <!-- 批量打印 -->
          <n-tab-pane name="print" tab="批量打印">
            <n-card class="config-card" :bordered="false" size="small">
              <div class="config-title">⚙ 打印配置</div>
              <n-form label-placement="left" label-width="100px">
                <n-form-item label="打印份数">
                  <n-input-number
                    v-model:value="printOptions.copies"
                    :min="1"
                    :max="99"
                    style="width: 100%"
                  />
                </n-form-item>
                <n-form-item label="打印范围">
                  <n-radio-group v-model:value="printOptions.pageRange">
                    <n-radio value="all">全部</n-radio>
                    <n-radio value="custom">自定义</n-radio>
                  </n-radio-group>
                </n-form-item>
                <n-form-item v-if="printOptions.pageRange === 'custom'" label="起始页">
                  <n-input-number
                    v-model:value="printOptions.startPage"
                    :min="1"
                    style="width: 100%"
                  />
                </n-form-item>
                <n-form-item v-if="printOptions.pageRange === 'custom'" label="结束页">
                  <n-input-number
                    v-model:value="printOptions.endPage"
                    :min="1"
                    style="width: 100%"
                  />
                </n-form-item>
              </n-form>
              <div class="config-tip">
                打开打印面板进行预览和打印设置，支持批量打印多个文件
              </div>
            </n-card>
          </n-tab-pane>
        </n-tabs>

        <!-- 文件列表 -->
        <n-card class="file-list-card" :bordered="false" size="small">
          <div class="file-list-header">
            <span class="file-list-title">📑 文件列表 ({{ fileList.length }})</span>
            <n-button
              v-if="fileList.length > 0"
              size="small"
              quaternary
              @click="clearFiles"
            >
              清空
            </n-button>
          </div>

          <div v-if="fileList.length === 0" class="empty-state">
            暂无文件，请添加
          </div>

          <div v-else class="file-list-scroll">
            <div
              v-for="(file, idx) in fileList"
              :key="file.id"
              class="file-item"
              :class="{ active: currentPreviewIndex === idx }"
              @click="currentPreviewIndex = idx"
            >
              <span class="file-icon">📑</span>
              <div class="file-info">
                <div class="file-name">{{ file.name }}</div>
                <div class="file-meta">
                  <span>{{ formatFileSize(file.size) }}</span>
                  <span v-if="file.pdfFile">{{ file.pdfFile.pageCount }}页</span>
                  <span class="file-status" :class="file.status">
                    {{ file.status === 'pending' ? '等待' : file.status === 'processing' ? '加载中' : file.status === 'success' ? '就绪' : '失败' }}
                  </span>
                </div>
              </div>
              <n-button
                size="tiny"
                type="error"
                quaternary
                @click.stop="removeFile(file.id)"
              >
                移除
              </n-button>
            </div>
          </div>
        </n-card>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <n-button
            type="primary"
            size="medium"
            @click="executeAction"
            :disabled="fileList.length === 0"
          >
            开始处理
          </n-button>
        </div>
      </div>

      <!-- 拖拽分隔条 - 支持拖拽分割 -->
      <div
        v-if="settingStore.previewPanelVisible"
        class="resize-handle"
        :class="{ resizing: isResizing }"
        @mousedown="startResize"
      >
        <div class="resizer-handle"></div>
      </div>

      <!-- 右侧：预览和任务面板 -->
      <div
        v-if="settingStore.previewPanelVisible"
        class="right-panel"
      >
        <div class="preview-header">
          <n-radio-group v-model:value="rightPanelMode" size="small">
            <n-radio-button value="files">文件预览</n-radio-button>
            <n-radio-button value="tasks">任务进度</n-radio-button>
          </n-radio-group>
        </div>

        <!-- 文件预览模式 -->
        <div v-if="rightPanelMode === 'files'" class="preview-content">
          <div v-if="fileList.length > 0" class="preview-selector">
            <n-select
              :value="currentPreviewIndex"
              @update:value="(v: number) => currentPreviewIndex = v"
              :options="fileList.map((f, i) => ({ label: f.name, value: i }))"
              size="small"
              style="width: 100%"
            />
          </div>

          <div v-if="currentPreviewFile" class="preview-pdf">
            <div class="pdf-preview-card">
              <div class="pdf-icon">📑</div>
              <div class="pdf-name">{{ currentPreviewFile.name }}</div>
              <div class="pdf-meta">
                <span>{{ formatFileSize(currentPreviewFile.size) }}</span>
                <span v-if="currentPageCount > 0">· {{ currentPageCount }} 页</span>
              </div>
            </div>
            <div class="preview-info-list">
              <div class="info-item">
                <span class="info-label">文件路径</span>
                <span class="info-value" :title="currentPreviewFile.path">
                  {{ currentPreviewFile.path }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">文件类型</span>
                <span class="info-value">{{ currentPreviewFile.type.toUpperCase() }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">加载状态</span>
                <span class="info-value" :class="currentPreviewFile.status">
                  {{ currentPreviewFile.status === 'pending' ? '等待加载' : currentPreviewFile.status === 'processing' ? '加载中...' : currentPreviewFile.status === 'success' ? '加载成功' : '加载失败' }}
                </span>
              </div>
            </div>
          </div>

          <div v-else class="preview-empty">
            加载文件后预览
          </div>
        </div>

        <!-- 任务进度模式 -->
        <div v-else class="task-content">
          <!-- 任务统计 -->
          <div class="task-stats">
            <div class="stat-item">
              <span class="stat-value">{{ taskStore.totalCount }}</span>
              <span class="stat-label">总任务</span>
            </div>
            <div class="stat-item success">
              <span class="stat-value">{{ taskStore.successCount }}</span>
              <span class="stat-label">成功</span>
            </div>
            <div class="stat-item failed">
              <span class="stat-value">{{ taskStore.failedCount }}</span>
              <span class="stat-label">失败</span>
            </div>
            <div class="stat-item progress">
              <span class="stat-value">{{ taskStore.overallProgress }}%</span>
              <span class="stat-label">进度</span>
            </div>
          </div>

          <!-- 任务控制按钮 -->
          <div class="task-controls">
            <n-button
              size="small"
              @click="taskStore.pauseBatch"
              :disabled="!taskStore.isRunning"
            >
              暂停
            </n-button>
            <n-button
              size="small"
              @click="taskStore.resumeBatch"
              :disabled="!taskStore.isPaused"
            >
              继续
            </n-button>
            <n-button
              size="small"
              @click="taskStore.retryFailed"
              :disabled="taskStore.failedCount === 0"
            >
              重试失败
            </n-button>
            <n-button
              size="small"
              type="error"
              quaternary
              @click="taskStore.clearTasks"
            >
              清空
            </n-button>
          </div>

          <!-- 任务列表 -->
          <div class="task-list-header">
            <span>任务列表</span>
          </div>
          <div class="task-list-scroll">
            <div v-if="taskStore.tasks.length === 0" class="empty-state">
              暂无任务
            </div>
            <div
              v-for="task in taskStore.tasks"
              :key="task.id"
              class="task-item"
            >
              <div class="task-info">
                <span class="task-name" :title="task.name">{{ task.name }}</span>
                <span class="task-type">{{ task.type }}</span>
              </div>
              <div class="task-progress">
                <n-progress
                  :percentage="task.progress"
                  :status="task.status === 'failed' ? 'error' : task.status === 'success' ? 'success' : undefined"
                  :show-indicator="false"
                  height="6"
                />
              </div>
              <div class="task-status-row">
                <span class="task-status-text" :class="task.status">
                  {{ task.status === 'pending' ? '等待中' : task.status === 'running' ? '处理中' : task.status === 'success' ? '已完成' : task.status === 'failed' ? '失败' : '已暂停' }}
                </span>
                <span v-if="task.error" class="task-error" :title="task.error">
                  {{ task.error }}
                </span>
              </div>
            </div>
          </div>

          <!-- 日志区域 -->
          <div class="log-header">
            <span>运行日志</span>
          </div>
          <div class="log-scroll">
            <div
              v-for="log in taskStore.logs.slice().reverse()"
              :key="log.id"
              class="log-item"
              :class="log.level"
            >
              <span class="log-time">{{ new Date(log.time).toLocaleTimeString() }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
            <div v-if="taskStore.logs.length === 0" class="empty-state">
              暂无日志
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-tools-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: var(--bg-color);
}

/* 页面头部 */
.page-header {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.page-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

/* 主容器 */
.main-container {
  flex: 1;
  display: flex;
  gap: 0;
  min-height: 0;
}

/* 左侧面板 */
.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding-right: 12px;
  overflow-y: auto;
}

.upload-card {
  background: var(--bg-color);
  border-radius: 8px;
}

/* 功能标签页 */
.function-tabs {
  background: var(--bg-color);
  border-radius: 8px;
}

.config-card {
  background: var(--bg-color);
  border-radius: 8px;
}

.config-title {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.config-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

/* 文件列表卡片 */
.file-list-card {
  background: var(--bg-color);
  border-radius: 8px;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.file-list-title {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary);
}

.empty-state {
  text-align: center;
  color: var(--text-tertiary);
  padding: 20px 0;
  font-size: 13px;
}

.file-list-scroll {
  max-height: 240px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  gap: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.file-item:hover {
  background: var(--bg-secondary);
}

.file-item.active {
  background: rgba(22, 119, 255, 0.08);
}

.file-icon {
  font-size: 20px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}

.file-status {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
}

.file-status.pending {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.file-status.processing {
  background: rgba(22, 119, 255, 0.1);
  color: var(--primary-color);
}

.file-status.success {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.file-status.failed {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

/* 拖拽分隔条 */
.resize-handle {
  width: 6px;
  flex-shrink: 0;
  cursor: col-resize;
  transition: background 0.15s;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-handle:hover,
.resize-handle.resizing {
  background: var(--primary-color);
  opacity: 0.3;
}

.resizer-handle {
  width: 2px;
  height: 40px;
  background: var(--border-color);
  border-radius: 1px;
  transition: background 0.15s;
}

.resize-handle:hover .resizer-handle,
.resize-handle.resizing .resizer-handle {
  background: var(--primary-color);
}

/* 右侧预览面板 */
.right-panel {
  width: var(--preview-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  border-radius: 8px 0 0 8px;
  overflow: hidden;
  min-width: 0;
}

.preview-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px;
  gap: 10px;
  overflow: hidden;
}

.preview-selector {
  flex-shrink: 0;
}

.preview-pdf {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.pdf-preview-card {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
}

.pdf-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.pdf-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
  word-break: break-all;
}

.pdf-meta {
  font-size: 12px;
  color: var(--text-tertiary);
  display: flex;
  justify-content: center;
  gap: 8px;
}

.preview-info-list {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-color);
  gap: 10px;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.info-value {
  font-size: 12px;
  color: var(--text-primary);
  text-align: right;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.info-value.success {
  color: #52c41a;
}

.info-value.failed {
  color: #ff4d4f;
}

.info-value.processing {
  color: var(--primary-color);
}

.info-value.pending {
  color: var(--text-tertiary);
}

.preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

/* 任务面板 */
.task-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.task-stats {
  display: flex;
  justify-content: space-around;
  padding: 12px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.stat-item.success .stat-value {
  color: #52c41a;
}

.stat-item.failed .stat-value {
  color: #ff4d4f;
}

.stat-item.progress .stat-value {
  color: var(--primary-color);
}

.task-controls {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.task-list-header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.task-list-scroll {
  max-height: 180px;
  overflow-y: auto;
  flex-shrink: 0;
}

.task-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-color);
}

.task-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  gap: 8px;
}

.task-name {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.task-type {
  font-size: 10px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.task-progress {
  margin-bottom: 4px;
}

.task-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.task-status-text {
  font-size: 11px;
}

.task-status-text.pending {
  color: var(--text-tertiary);
}

.task-status-text.running {
  color: var(--primary-color);
}

.task-status-text.success {
  color: #52c41a;
}

.task-status-text.failed {
  color: #ff4d4f;
}

.task-status-text.paused {
  color: #faad14;
}

.task-error {
  font-size: 10px;
  color: #ff4d4f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: right;
}

.log-header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.log-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  background: var(--bg-color);
}

.log-item {
  font-size: 11px;
  line-height: 1.6;
  padding: 2px 0;
  display: flex;
  gap: 8px;
}

.log-time {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.log-message {
  color: var(--text-secondary);
  word-break: break-all;
}

.log-item.success .log-message {
  color: #52c41a;
}

.log-item.error .log-message {
  color: #ff4d4f;
}

.log-item.warning .log-message {
  color: #faad14;
}

.log-item.info .log-message {
  color: var(--text-secondary);
}

/* 深色主题适配 */
:deep(.dark) .upload-card,
:deep(.dark) .config-card,
:deep(.dark) .file-list-card,
:deep(.dark) .function-tabs {
  background: var(--bg-color);
}

:deep(.dark) .pdf-preview-card,
:deep(.dark) .preview-info-list {
  background: var(--bg-secondary);
}

:deep(.dark) .task-item,
:deep(.dark) .log-scroll,
:deep(.dark) .task-stats {
  background: var(--bg-color);
}

/* 响应式 */
@media (max-width: 768px) {
  .main-container {
    flex-direction: column;
  }

  .resize-handle {
    display: none;
  }

  .right-panel {
    width: 100% !important;
    height: 300px;
    border-left: none;
    border-top: 1px solid var(--border-color);
    border-radius: 0;
  }
}
</style>
