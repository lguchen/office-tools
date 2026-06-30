<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'
import FileUploader from '@/components/FileUploader.vue'
import { useTaskStore, type TaskItem } from '@/stores/task'
import { usePrintStore } from '@/stores/print'
import { useSettingStore } from '@/stores/setting'
import {
  readWord,
  extractText,
  replaceText,
  cleanText,
  downloadText,
  wordToPdf,
  type WordFile
} from '@/utils/wordUtils'
import { isTauri } from '@/utils/tauriUtils'

// ============== 类型定义 ==============
interface FileItem {
  id: string
  name: string
  path: string
  size: number
  type: string
  status: 'pending' | 'processing' | 'success' | 'failed'
  wordFile?: WordFile
}

interface FormatConvertOptions {
  outputFormat: 'txt' | 'pdf' | 'html'
}

interface ReplaceOptions {
  search: string
  replace: string
  useRegex: boolean
  cleanEmpty: boolean
}

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
const activeTab = ref<'convert' | 'replace' | 'print'>('convert')

// 文件列表
const fileList = ref<FileItem[]>([])

// 当前预览的文件索引
const currentPreviewIndex = ref(0)

// 预览面板拖拽状态
const isResizing = ref(false)

// ============== 各功能配置 ==============
// 格式转换配置 - 确保初始化完整
const formatOptions = ref<FormatConvertOptions>({
  outputFormat: 'txt'
})

// 内容替换配置 - 确保初始化完整
const replaceOptions = ref<ReplaceOptions>({
  search: '',
  replace: '',
  useRegex: false,
  cleanEmpty: true
})

// 批量打印配置 - 确保初始化完整
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

// 预览文件的文本内容 - 修复 previewFiles 未定义问题
const previewText = computed(() => {
  if (!currentPreviewFile.value?.wordFile) return ''
  return currentPreviewFile.value.wordFile.text
})

// 预览文件的 HTML 内容
const previewHtml = computed(() => {
  if (!currentPreviewFile.value?.wordFile) return ''
  return currentPreviewFile.value.wordFile.html
})

// ============== 文件上传处理 ==============
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

      // 创建文件项 - 统一用 fileList 数组管理
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
        const wordFile = await readWord(file)
        fileItem.wordFile = wordFile
        fileItem.status = 'success'
        taskStore.addLog('success', `加载文件成功：${file.name}`)
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

// 获取文件类型
const getFileType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return ext
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// 移除文件
const removeFile = (id: string) => {
  try {
    const index = fileList.value.findIndex((f) => f.id === id)
    if (index > -1) {
      fileList.value.splice(index, 1)
      if (currentPreviewIndex.value >= fileList.value.length) {
        currentPreviewIndex.value = Math.max(0, fileList.value.length - 1)
      }
      taskStore.addLog('info', `移除文件：${fileList.value[index]?.name || ''}`)
    }
  } catch (e: any) {
    message.error(`移除文件失败：${e.message}`)
  }
}

// 清空文件列表
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
const doFormatConvert = async () => {
  if (fileList.value.length === 0) {
    message.warning('请先添加文件')
    return
  }

  try {
    // 添加任务到队列 - 使用 useTaskStore 的 addTasks 方法
    const tasks = fileList.value.map((f) => ({
      name: f.name,
      type: `word-convert-${formatOptions.value.outputFormat}`,
      inputPath: f.path
    }))
    taskStore.addTasks(tasks)

    // 开始批量处理
    taskStore.startBatch(async (task: TaskItem, onProgress: (p: number) => void) => {
      onProgress(10)

      // 找到对应的文件
      const fileItem = fileList.value.find((f) => f.name === task.name)
      if (!fileItem?.wordFile) {
        throw new Error('文件未找到或未加载')
      }

      onProgress(30)

      // 根据输出格式处理
      if (formatOptions.value.outputFormat === 'txt') {
        const text = extractText(fileItem.wordFile)
        const outputName = `${fileItem.name.replace(/\.[^.]+$/, '')}.txt`

        if (isTauri()) {
          // Tauri 环境下使用 Rust 后端保存 - 修复与 Rust IPC 交互的参数传递
          try {
            const savePath = await invoke('save_text_file', {
              content: text,
              fileName: outputName
            })
            task.outputPath = savePath as string
          } catch (e) {
            // 如果 Rust 调用失败，回退到浏览器方式
            console.warn('Rust 保存失败，回退到浏览器下载:', e)
            downloadText(text, outputName)
          }
        } else {
          downloadText(text, outputName)
        }
      } else if (formatOptions.value.outputFormat === 'html') {
        const html = fileItem.wordFile.html
        const outputName = `${fileItem.name.replace(/\.[^.]+$/, '')}.html`

        if (isTauri()) {
          try {
            const savePath = await invoke('save_text_file', {
              content: html,
              fileName: outputName
            })
            task.outputPath = savePath as string
          } catch (e) {
            console.warn('Rust 保存失败，回退到浏览器下载:', e)
            downloadText(html, outputName)
          }
        } else {
          downloadText(html, outputName)
        }
      } else if (formatOptions.value.outputFormat === 'pdf') {
        // PDF 转换 - 通过浏览器打印实现
        wordToPdf(fileItem.wordFile)
      }

      onProgress(100)
    })

    message.success(`已添加 ${fileList.value.length} 个转换任务到队列`)
  } catch (e: any) {
    message.error(`格式转换失败：${e.message}`)
    taskStore.addLog('error', `格式转换失败：${e.message}`)
  }
}

// ============== 内容替换功能 ==============
const doReplace = async () => {
  if (fileList.value.length === 0) {
    message.warning('请先添加文件')
    return
  }

  if (!replaceOptions.value.search && !replaceOptions.value.cleanEmpty) {
    message.warning('请输入查找内容或启用清理空段落')
    return
  }

  try {
    // 添加任务到队列
    const tasks = fileList.value.map((f) => ({
      name: f.name,
      type: 'word-replace',
      inputPath: f.path
    }))
    taskStore.addTasks(tasks)

    // 开始批量处理
    taskStore.startBatch(async (task: TaskItem, onProgress: (p: number) => void) => {
      onProgress(10)

      const fileItem = fileList.value.find((f) => f.name === task.name)
      if (!fileItem?.wordFile) {
        throw new Error('文件未找到或未加载')
      }

      onProgress(30)

      let text = fileItem.wordFile.text

      // 执行替换
      if (replaceOptions.value.search) {
        try {
          text = replaceText(
            fileItem.wordFile,
            replaceOptions.value.search,
            replaceOptions.value.replace,
            replaceOptions.value.useRegex
          )
        } catch (e: any) {
          throw new Error(`替换失败：${e.message}`)
        }
      }

      onProgress(60)

      // 清理空段落
      if (replaceOptions.value.cleanEmpty) {
        text = cleanText({ ...fileItem.wordFile, text })
      }

      onProgress(80)

      // 下载结果
      const outputName = `${fileItem.name.replace(/\.[^.]+$/, '')}_处理后.txt`

      if (isTauri()) {
        try {
          const savePath = await invoke('save_text_file', {
            content: text,
            fileName: outputName
          })
          task.outputPath = savePath as string
        } catch (e) {
          console.warn('Rust 保存失败，回退到浏览器下载:', e)
          downloadText(text, outputName)
        }
      } else {
        downloadText(text, outputName)
      }

      onProgress(100)
    })

    message.success(`已添加 ${fileList.value.length} 个替换任务到队列`)
  } catch (e: any) {
    message.error(`内容替换失败：${e.message}`)
    taskStore.addLog('error', `内容替换失败：${e.message}`)
  }
}

// ============== 批量打印功能 ==============
const doBatchPrint = () => {
  if (fileList.value.length === 0) {
    message.warning('请先添加文件')
    return
  }

  try {
    const firstFile = fileList.value[0]
    if (!firstFile?.wordFile) {
      message.warning('文件未加载完成')
      return
    }

    const html = firstFile.wordFile.html || ''
    const pageCount = Math.max(1, Math.ceil(firstFile.wordFile.text.length / 1500))

    // 设置打印预览
    printStore.setPreview(html, 'html', pageCount)

    // 设置待打印文件路径
    printStore.filePaths = fileList.value
      .filter((f) => f.wordFile)
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
const executeAction = () => {
  try {
    switch (activeTab.value) {
      case 'convert':
        doFormatConvert()
        break
      case 'replace':
        doReplace()
        break
      case 'print':
        doBatchPrint()
        break
    }
  } catch (e: any) {
    message.error(`操作失败：${e.message}`)
  }
}

// ============== 预览面板拖拽调整宽度 ==============
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

// ============== 切换预览显示模式 ==============
const previewMode = ref<'text' | 'html'>('text')
</script>

<template>
  <div class="word-tools-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">📄 Word 批量处理</h2>
      <p class="page-desc">支持 docx/doc 格式，纯本地处理，安全可靠</p>
    </div>

    <!-- 主内容区 - 左右分栏布局 -->
    <div class="main-container">
      <!-- 左侧：功能区 -->
      <div class="left-panel">
        <!-- 文件上传区 - 使用 FileUploader 组件 -->
        <n-card class="upload-card" :bordered="false" size="small">
          <FileUploader
            :accept="['docx', 'doc']"
            :multiple="true"
            hint-text="拖拽Word文件到此处，或点击选择"
            icon="📄"
            @files-selected="handleFilesSelected"
          />
        </n-card>

        <!-- 功能标签页 - 格式转换、内容替换、批量打印 -->
        <n-tabs v-model:value="activeTab" class="function-tabs" type="line" size="medium">
          <!-- 格式转换 -->
          <n-tab-pane name="convert" tab="格式转换">
            <n-card class="config-card" :bordered="false" size="small">
              <div class="config-title">⚙ 转换配置</div>
              <n-form label-placement="left" label-width="100px">
                <n-form-item label="输出格式">
                  <n-select
                    v-model:value="formatOptions.outputFormat"
                    :options="[
                      { label: '纯文本 (.txt)', value: 'txt' },
                      { label: 'HTML (.html)', value: 'html' },
                      { label: 'PDF (.pdf)', value: 'pdf' }
                    ]"
                    style="width: 100%"
                  />
                </n-form-item>
              </n-form>
              <div class="config-tip">
                将 Word 文档转换为指定格式，支持批量处理
              </div>
            </n-card>
          </n-tab-pane>

          <!-- 内容替换 -->
          <n-tab-pane name="replace" tab="内容替换">
            <n-card class="config-card" :bordered="false" size="small">
              <div class="config-title">⚙ 替换配置</div>
              <n-form label-placement="left" label-width="100px">
                <n-form-item label="查找内容">
                  <n-input
                    v-model:value="replaceOptions.search"
                    placeholder="输入要查找的内容"
                    clearable
                  />
                </n-form-item>
                <n-form-item label="替换为">
                  <n-input
                    v-model:value="replaceOptions.replace"
                    placeholder="输入替换内容"
                    clearable
                  />
                </n-form-item>
                <n-form-item label="正则模式">
                  <n-switch v-model:value="replaceOptions.useRegex" />
                </n-form-item>
                <n-form-item label="清理空段落">
                  <n-switch v-model:value="replaceOptions.cleanEmpty" />
                </n-form-item>
              </n-form>
              <div class="config-tip">
                支持普通替换和正则表达式替换，可同时清理空段落
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
                打开打印面板进行预览和打印设置
              </div>
            </n-card>
          </n-tab-pane>
        </n-tabs>

        <!-- 文件列表 -->
        <n-card class="file-list-card" :bordered="false" size="small">
          <div class="file-list-header">
            <span class="file-list-title">📄 文件列表 ({{ fileList.length }})</span>
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
              <span class="file-icon">📄</span>
              <div class="file-info">
                <div class="file-name">{{ file.name }}</div>
                <div class="file-meta">
                  <span>{{ formatFileSize(file.size) }}</span>
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

      <!-- 右侧：预览面板 -->
      <div
        v-if="settingStore.previewPanelVisible"
        class="right-panel"
      >
        <div class="preview-header">
          <span class="preview-title">👁 内容预览</span>
          <n-radio-group v-model:value="previewMode" size="small">
            <n-radio-button value="text">文本</n-radio-button>
            <n-radio-button value="html">HTML</n-radio-button>
          </n-radio-group>
        </div>

        <div v-if="fileList.length > 0" class="preview-content">
          <div class="preview-selector">
            <n-select
              :value="currentPreviewIndex"
              @update:value="(v: number) => currentPreviewIndex = v"
              :options="fileList.map((f, i) => ({ label: f.name, value: i }))"
              size="small"
              style="width: 100%"
            />
          </div>

          <!-- 文本预览 -->
          <div v-if="previewMode === 'text'" class="preview-text">
            {{ previewText || '暂无内容' }}
          </div>

          <!-- HTML 预览 -->
          <div
            v-else
            class="preview-html"
            v-html="previewHtml || '<p>暂无内容</p>'"
          ></div>
        </div>

        <div v-else class="preview-empty">
          加载文件后预览
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.word-tools-page {
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
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.preview-title {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary);
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

.preview-text {
  flex: 1;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--bg-color);
  border-radius: 6px;
  padding: 12px;
  border: 1px solid var(--border-color);
}

.preview-html {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-color);
  border-radius: 6px;
  padding: 12px;
  border: 1px solid var(--border-color);
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-primary);
}

.preview-html :deep(img) {
  max-width: 100%;
  height: auto;
}

.preview-html :deep(table) {
  border-collapse: collapse;
  width: 100%;
}

.preview-html :deep(td),
.preview-html :deep(th) {
  border: 1px solid var(--border-color);
  padding: 6px 8px;
}

.preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

/* 深色主题适配 */
:deep(.dark) .upload-card,
:deep(.dark) .config-card,
:deep(.dark) .file-list-card,
:deep(.dark) .function-tabs {
  background: var(--bg-color);
}

:deep(.dark) .preview-text,
:deep(.dark) .preview-html {
  background: var(--bg-secondary);
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
