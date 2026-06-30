<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'
import FileUploader from '@/components/FileUploader.vue'
import PreviewPanel from '@/components/layout/PreviewPanel.vue'
import { useTaskStore } from '@/stores/task'
import { isTauri } from '@/utils/tauriUtils'

// ==================== 类型定义 ====================

/** 文件处理状态 */
type FileStatus = 'pending' | 'processing' | 'success' | 'failed'

/** 文件列表项 */
interface FileItem {
  id: string
  name: string
  path: string
  size: number
  type: string
  status: FileStatus
  progress: number
  errorMsg?: string
  file?: File
}

/** 格式转换配置 */
interface ConvertOptions {
  targetFormat: 'xlsx' | 'xls' | 'csv'
  sheetIndex: number
}

/** 数据清理配置 */
interface CleanOptions {
  removeEmptyRows: boolean
  removeEmptyCols: boolean
  removeDuplicateRows: boolean
  trimCells: boolean
}

/** 数据合并配置 */
interface MergeOptions {
  skipEmptyRows: boolean
  removeDuplicates: boolean
  mergeSheets: boolean
  headerRowIndex: number
}

/** 拆分表格配置 */
interface SplitOptions {
  mode: 'sheet' | 'column' | 'row'
  sheetIndex: number
  columnIndex: number
  rowCount: number
}

/** 批量打印配置 */
interface PrintOptions {
  copies: number
  paperSize: 'A4' | 'A3' | 'Letter'
  orientation: 'portrait' | 'landscape'
  fitToPage: boolean
}

/** 高级功能配置 */
interface AdvancedOptions {
  functionType: 'protect' | 'unprotect' | 'addWatermark' | 'removeWatermark'
  password: string
  watermarkText: string
}

// ==================== 状态定义 ====================

const message = useMessage()
const taskStore = useTaskStore()

/** 当前选中的Tab */
const currentTab = ref('convert')

/** 文件列表 - 统一管理所有文件 */
const fileList = ref<FileItem[]>([])

/** 右侧面板宽度 */
const rightPanelWidth = ref(380)

/** 是否正在拖拽调整宽度 */
const isResizing = ref(false)

/** Tab配置 */
const tabs = [
  { key: 'convert', name: '格式转换', icon: '🔄' },
  { key: 'clean', name: '数据清理', icon: '🧹' },
  { key: 'merge', name: '数据合并', icon: '🔗' },
  { key: 'split', name: '拆分表格', icon: '✂️' },
  { key: 'print', name: '批量打印', icon: '🖨️' },
  { key: 'advanced', name: '高级功能', icon: '⚙️' }
]

// ==================== 各功能区配置 ====================

/** 格式转换选项 */
const convertOptions = ref<ConvertOptions>({
  targetFormat: 'xlsx',
  sheetIndex: 0
})

/** 数据清理选项 */
const cleanOptions = ref<CleanOptions>({
  removeEmptyRows: true,
  removeEmptyCols: true,
  removeDuplicateRows: false,
  trimCells: true
})

/** 数据合并选项 */
const mergeOptions = ref<MergeOptions>({
  skipEmptyRows: true,
  removeDuplicates: false,
  mergeSheets: false,
  headerRowIndex: 1
})

/** 拆分表格选项 */
const splitOptions = ref<SplitOptions>({
  mode: 'sheet',
  sheetIndex: 0,
  columnIndex: 0,
  rowCount: 1000
})

/** 批量打印选项 */
const printOptions = ref<PrintOptions>({
  copies: 1,
  paperSize: 'A4',
  orientation: 'portrait',
  fitToPage: true
})

/** 高级功能选项 */
const advancedOptions = ref<AdvancedOptions>({
  functionType: 'protect',
  password: '',
  watermarkText: '机密文件'
})

// ==================== 计算属性 ====================

/** 待处理文件数量 */
const pendingCount = computed(() => fileList.value.filter(f => f.status === 'pending').length)

/** 处理中文件数量 */
const processingCount = computed(() => fileList.value.filter(f => f.status === 'processing').length)

/** 成功文件数量 */
const successCount = computed(() => fileList.value.filter(f => f.status === 'success').length)

/** 失败文件数量 */
const failedCount = computed(() => fileList.value.filter(f => f.status === 'failed').length)

/** 是否有文件 */
const hasFiles = computed(() => fileList.value.length > 0)

/** 是否可以开始处理 */
const canProcess = computed(() => {
  if (fileList.value.length === 0) return false
  if (currentTab.value === 'merge' && fileList.value.length < 2) return false
  return fileList.value.some(f => f.status === 'pending' || f.status === 'failed')
})

// ==================== 文件上传与管理 ====================

/**
 * 生成唯一ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * 处理文件选择
 */
async function handleFilesSelected(files: File[]) {
  try {
    for (const file of files) {
      const path = (file as any).path || ''
      const fileItem: FileItem = {
        id: generateId(),
        name: file.name,
        path: path,
        size: file.size,
        type: getFileExtension(file.name),
        status: 'pending',
        progress: 0,
        file: file
      }
      fileList.value.push(fileItem)
    }
    message.success(`已添加 ${files.length} 个文件`)
    taskStore.addLog('info', `添加 ${files.length} 个Excel文件`)
  } catch (e: any) {
    message.error('添加文件失败：' + (e.message || '未知错误'))
    taskStore.addLog('error', '添加文件失败：' + (e.message || '未知错误'))
  }
}

/**
 * 移除单个文件
 */
function removeFile(id: string) {
  const index = fileList.value.findIndex(f => f.id === id)
  if (index > -1) {
    const file = fileList.value[index]
    fileList.value.splice(index, 1)
    taskStore.addLog('info', `移除文件：${file.name}`)
  }
}

/**
 * 清空文件列表
 */
function clearFileList() {
  fileList.value = []
  taskStore.addLog('info', '清空文件列表')
}

/**
 * 重置文件状态
 */
function resetFileStatus(id: string) {
  const file = fileList.value.find(f => f.id === id)
  if (file) {
    file.status = 'pending'
    file.progress = 0
    file.errorMsg = undefined
  }
}

// ==================== 批量处理逻辑 ====================

/**
 * 获取当前功能对应的任务类型
 */
function getTaskType(): string {
  const typeMap: Record<string, string> = {
    convert: 'excel_convert',
    clean: 'excel_clean',
    merge: 'excel_merge',
    split: 'excel_split',
    print: 'excel_print',
    advanced: 'excel_advanced'
  }
  return typeMap[currentTab.value] || 'excel_process'
}

/**
 * 获取当前功能的配置参数
 */
function getCurrentOptions(): Record<string, any> {
  switch (currentTab.value) {
    case 'convert':
      return { ...convertOptions.value }
    case 'clean':
      return { ...cleanOptions.value }
    case 'merge':
      return { ...mergeOptions.value }
    case 'split':
      return { ...splitOptions.value }
    case 'print':
      return { ...printOptions.value }
    case 'advanced':
      return { ...advancedOptions.value }
    default:
      return {}
  }
}

/**
 * 更新文件状态
 */
function updateFileStatus(filePath: string, status: FileStatus, progress?: number, errorMsg?: string) {
  const file = fileList.value.find(f => f.path === filePath || f.name === filePath)
  if (file) {
    file.status = status
    if (progress !== undefined) file.progress = progress
    if (errorMsg !== undefined) file.errorMsg = errorMsg
  }
}

/**
 * 开始批量处理
 */
async function startProcessing() {
  if (!canProcess.value) {
    message.warning('没有可处理的文件')
    return
  }

  try {
    // 重置所有失败的文件为待处理状态
    fileList.value.forEach(f => {
      if (f.status === 'failed') {
        f.status = 'pending'
        f.progress = 0
        f.errorMsg = undefined
      }
    })

    // 获取待处理文件
    const pendingFiles = fileList.value.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) {
      message.warning('没有待处理的文件')
      return
    }

    // 特殊处理：合并功能只需要一个任务
    if (currentTab.value === 'merge') {
      const taskType = getTaskType()
      const options = getCurrentOptions()

      // 添加任务到任务队列
      taskStore.addTasks([{
        name: `合并 ${pendingFiles.length} 个文件`,
        type: taskType,
        inputPath: pendingFiles.map(f => f.path).join('|')
      }])

      taskStore.addLog('info', `开始合并 ${pendingFiles.length} 个文件`)

      // 标记所有文件为处理中
      pendingFiles.forEach(f => {
        f.status = 'processing'
        f.progress = 0
      })

      // 启动批量处理
      taskStore.startBatch(async (task, onProgress) => {
        onProgress(10)
        
        try {
          const inputPaths = task.inputPath.split('|')
          const result = await invoke('excel_merge', {
            inputPaths,
            options
          })
          
          onProgress(100)
          
          // 更新文件状态为成功
          pendingFiles.forEach(f => {
            f.status = 'success'
            f.progress = 100
          })
          
          taskStore.addLog('success', `文件合并完成：${result}`)
        } catch (e: any) {
          // 更新文件状态为失败
          pendingFiles.forEach(f => {
            f.status = 'failed'
            f.errorMsg = e.message || '合并失败'
          })
          throw e
        }
      })

      return
    }

    // 其他功能：每个文件一个任务
    const taskType = getTaskType()
    const options = getCurrentOptions()

    // 添加任务到任务队列
    taskStore.addTasks(
      pendingFiles.map(f => ({
        name: f.name,
        type: taskType,
        inputPath: f.path
      }))
    )

    taskStore.addLog('info', `开始处理 ${pendingFiles.length} 个文件`)

    // 启动批量处理
    taskStore.startBatch(async (task, onProgress) => {
      onProgress(5)

      // 更新文件状态为处理中
      updateFileStatus(task.inputPath, 'processing', 5)

      try {
        let result: any

        // 根据不同功能调用不同的Rust命令
        switch (currentTab.value) {
          case 'convert':
            result = await invoke('excel_convert', {
              inputPath: task.inputPath,
              targetFormat: convertOptions.value.targetFormat,
              options
            })
            break

          case 'clean':
            result = await invoke('excel_clean', {
              inputPath: task.inputPath,
              options
            })
            break

          case 'split':
            result = await invoke('excel_split', {
              inputPath: task.inputPath,
              options
            })
            break

          case 'print':
            result = await invoke('excel_print', {
              inputPath: task.inputPath,
              options
            })
            break

          case 'advanced':
            result = await invoke('excel_advanced', {
              inputPath: task.inputPath,
              functionType: advancedOptions.value.functionType,
              options
            })
            break

          default:
            throw new Error('未知的功能类型')
        }

        onProgress(100)
        updateFileStatus(task.inputPath, 'success', 100)
        taskStore.addLog('success', `处理完成：${task.name}`)
      } catch (e: any) {
        const errorMsg = e.message || '处理失败'
        updateFileStatus(task.inputPath, 'failed', 0, errorMsg)
        taskStore.addLog('error', `处理失败：${task.name} - ${errorMsg}`)
        throw e
      }
    })

    message.success('已添加到任务队列，开始处理')
  } catch (e: any) {
    message.error('启动处理失败：' + (e.message || '未知错误'))
    taskStore.addLog('error', '启动处理失败：' + (e.message || '未知错误'))
  }
}

// ==================== 拖拽调整宽度 ====================

let startX = 0
let startWidth = 0

/**
 * 开始拖拽调整右侧面板宽度
 */
function startResize(e: MouseEvent) {
  isResizing.value = true
  startX = e.clientX
  startWidth = rightPanelWidth.value

  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

/**
 * 拖拽移动中
 */
function handleResizeMove(e: MouseEvent) {
  if (!isResizing.value) return
  const diff = startX - e.clientX
  const newWidth = Math.max(280, Math.min(700, startWidth + diff))
  rightPanelWidth.value = newWidth
}

/**
 * 停止拖拽
 */
function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// ==================== 生命周期 ====================

onMounted(() => {
  // 初始化
})

onUnmounted(() => {
  // 清理事件监听
  stopResize()
})
</script>

<template>
  <div class="excel-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">📊 Excel批量处理工具</h2>
      <p class="page-desc">支持 xlsx / xls / csv 格式，纯本地处理，数据安全</p>
    </div>

    <!-- 主体内容：左右分栏 -->
    <div class="main-container">
      <!-- 左侧：操作区 -->
      <div class="left-panel">
        <!-- 文件上传区 -->
        <div class="upload-section">
          <FileUploader
            :accept="['xlsx', 'xls', 'csv']"
            :multiple="true"
            icon="📁"
            hint-text="拖拽Excel文件到此处，或点击选择"
            @files-selected="handleFilesSelected"
          />
        </div>

        <!-- 功能Tab切换 -->
        <div class="tabs-section">
          <div class="tabs-nav">
            <div
              v-for="tab in tabs"
              :key="tab.key"
              class="tab-item"
              :class="{ active: currentTab === tab.key }"
              @click="currentTab = tab.key"
            >
              <span class="tab-icon">{{ tab.icon }}</span>
              <span class="tab-name">{{ tab.name }}</span>
            </div>
          </div>
        </div>

        <!-- 功能配置区 -->
        <div class="config-section">
          <div class="config-card">
            <div class="config-title">
              <span>⚙ 操作配置</span>
              <span class="config-subtitle">{{ tabs.find(t => t.key === currentTab)?.name }}</span>
            </div>

            <!-- 格式转换配置 -->
            <div v-if="currentTab === 'convert'" class="config-content">
              <div class="form-item">
                <label class="form-label">目标格式</label>
                <div class="form-control">
                  <select v-model="convertOptions.targetFormat" class="form-select">
                    <option value="xlsx">XLSX (Excel 2007+)</option>
                    <option value="xls">XLS (Excel 97-2003)</option>
                    <option value="csv">CSV (逗号分隔)</option>
                  </select>
                </div>
              </div>
              <div class="form-item">
                <label class="form-label">工作表索引</label>
                <div class="form-control">
                  <input
                    type="number"
                    v-model.number="convertOptions.sheetIndex"
                    class="form-input"
                    min="0"
                  />
                </div>
              </div>
              <div class="form-tip">
                将选中的Excel文件转换为指定格式
              </div>
            </div>

            <!-- 数据清理配置 -->
            <div v-if="currentTab === 'clean'" class="config-content">
              <div class="form-item checkbox-item">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="cleanOptions.removeEmptyRows" />
                  <span>删除空行</span>
                </label>
              </div>
              <div class="form-item checkbox-item">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="cleanOptions.removeEmptyCols" />
                  <span>删除空列</span>
                </label>
              </div>
              <div class="form-item checkbox-item">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="cleanOptions.removeDuplicateRows" />
                  <span>删除重复行</span>
                </label>
              </div>
              <div class="form-item checkbox-item">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="cleanOptions.trimCells" />
                  <span>清除单元格空格</span>
                </label>
              </div>
              <div class="form-tip">
                自动清理Excel中的无效数据
              </div>
            </div>

            <!-- 数据合并配置 -->
            <div v-if="currentTab === 'merge'" class="config-content">
              <div class="form-item checkbox-item">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="mergeOptions.skipEmptyRows" />
                  <span>跳过空行</span>
                </label>
              </div>
              <div class="form-item checkbox-item">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="mergeOptions.removeDuplicates" />
                  <span>自动去重</span>
                </label>
              </div>
              <div class="form-item checkbox-item">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="mergeOptions.mergeSheets" />
                  <span>合并所有工作表</span>
                </label>
              </div>
              <div class="form-item">
                <label class="form-label">表头行号</label>
                <div class="form-control">
                  <input
                    type="number"
                    v-model.number="mergeOptions.headerRowIndex"
                    class="form-input"
                    min="1"
                  />
                </div>
              </div>
              <div class="form-tip">
                将多个Excel文件合并为一个文件（至少需要2个文件）
              </div>
            </div>

            <!-- 拆分表格配置 -->
            <div v-if="currentTab === 'split'" class="config-content">
              <div class="form-item">
                <label class="form-label">拆分方式</label>
                <div class="form-control">
                  <select v-model="splitOptions.mode" class="form-select">
                    <option value="sheet">按工作表拆分</option>
                    <option value="column">按列内容拆分</option>
                    <option value="row">按行数拆分</option>
                  </select>
                </div>
              </div>
              <div v-if="splitOptions.mode === 'column'" class="form-item">
                <label class="form-label">工作表索引</label>
                <div class="form-control">
                  <input
                    type="number"
                    v-model.number="splitOptions.sheetIndex"
                    class="form-input"
                    min="0"
                  />
                </div>
              </div>
              <div v-if="splitOptions.mode === 'column'" class="form-item">
                <label class="form-label">列索引</label>
                <div class="form-control">
                  <input
                    type="number"
                    v-model.number="splitOptions.columnIndex"
                    class="form-input"
                    min="0"
                  />
                </div>
              </div>
              <div v-if="splitOptions.mode === 'row'" class="form-item">
                <label class="form-label">每个文件行数</label>
                <div class="form-control">
                  <input
                    type="number"
                    v-model.number="splitOptions.rowCount"
                    class="form-input"
                    min="1"
                  />
                </div>
              </div>
              <div class="form-tip">
                将Excel文件按指定规则拆分为多个文件
              </div>
            </div>

            <!-- 批量打印配置 -->
            <div v-if="currentTab === 'print'" class="config-content">
              <div class="form-item">
                <label class="form-label">打印份数</label>
                <div class="form-control">
                  <input
                    type="number"
                    v-model.number="printOptions.copies"
                    class="form-input"
                    min="1"
                    max="99"
                  />
                </div>
              </div>
              <div class="form-item">
                <label class="form-label">纸张大小</label>
                <div class="form-control">
                  <select v-model="printOptions.paperSize" class="form-select">
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>
              </div>
              <div class="form-item">
                <label class="form-label">打印方向</label>
                <div class="form-control">
                  <select v-model="printOptions.orientation" class="form-select">
                    <option value="portrait">纵向</option>
                    <option value="landscape">横向</option>
                  </select>
                </div>
              </div>
              <div class="form-item checkbox-item">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="printOptions.fitToPage" />
                  <span>适应页面宽度</span>
                </label>
              </div>
              <div class="form-tip">
                批量打印多个Excel文件
              </div>
            </div>

            <!-- 高级功能配置 -->
            <div v-if="currentTab === 'advanced'" class="config-content">
              <div class="form-item">
                <label class="form-label">功能类型</label>
                <div class="form-control">
                  <select v-model="advancedOptions.functionType" class="form-select">
                    <option value="protect">加密保护</option>
                    <option value="unprotect">解除保护</option>
                    <option value="addWatermark">添加水印</option>
                    <option value="removeWatermark">移除水印</option>
                  </select>
                </div>
              </div>
              <div v-if="advancedOptions.functionType === 'protect' || advancedOptions.functionType === 'unprotect'" class="form-item">
                <label class="form-label">密码</label>
                <div class="form-control">
                  <input
                    type="password"
                    v-model="advancedOptions.password"
                    class="form-input"
                    placeholder="请输入密码"
                  />
                </div>
              </div>
              <div v-if="advancedOptions.functionType === 'addWatermark'" class="form-item">
                <label class="form-label">水印文字</label>
                <div class="form-control">
                  <input
                    type="text"
                    v-model="advancedOptions.watermarkText"
                    class="form-input"
                    placeholder="请输入水印文字"
                  />
                </div>
              </div>
              <div class="form-tip">
                高级Excel处理功能
              </div>
            </div>
          </div>
        </div>

        <!-- 文件列表 -->
        <div class="file-list-section">
          <div class="file-list-card">
            <div class="file-list-header">
              <span class="file-list-title">
                📄 文件列表
                <span class="file-count">({{ fileList.length }})</span>
              </span>
              <div class="file-list-actions">
                <span v-if="successCount > 0" class="status-badge success">成功 {{ successCount }}</span>
                <span v-if="failedCount > 0" class="status-badge failed">失败 {{ failedCount }}</span>
                <button
                  v-if="fileList.length > 0"
                  class="btn btn-secondary btn-sm"
                  @click="clearFileList"
                >
                  清空
                </button>
              </div>
            </div>

            <div v-if="fileList.length === 0" class="empty-state">
              <div class="empty-icon">📂</div>
              <div class="empty-text">暂无文件，请添加Excel文件</div>
            </div>

            <div v-else class="file-list-content">
              <div
                v-for="file in fileList"
                :key="file.id"
                class="file-item"
                :class="file.status"
              >
                <div class="file-icon">📊</div>
                <div class="file-info">
                  <div class="file-name" :title="file.name">{{ file.name }}</div>
                  <div class="file-meta">
                    <span>{{ formatFileSize(file.size) }}</span>
                    <span class="dot">·</span>
                    <span>{{ file.type.toUpperCase() }}</span>
                  </div>
                  <div v-if="file.status === 'processing'" class="file-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: file.progress + '%' }"></div>
                    </div>
                    <span class="progress-text">{{ file.progress }}%</span>
                  </div>
                  <div v-if="file.status === 'failed' && file.errorMsg" class="file-error">
                    {{ file.errorMsg }}
                  </div>
                </div>
                <div class="file-status">
                  <span v-if="file.status === 'pending'" class="status-tag pending">等待</span>
                  <span v-if="file.status === 'processing'" class="status-tag processing">处理中</span>
                  <span v-if="file.status === 'success'" class="status-tag success">成功</span>
                  <span v-if="file.status === 'failed'" class="status-tag failed">失败</span>
                </div>
                <button
                  class="file-remove-btn"
                  @click="removeFile(file.id)"
                  title="移除"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮区 -->
        <div class="action-section">
          <button
            class="btn btn-primary btn-large"
            :disabled="!canProcess"
            @click="startProcessing"
          >
            🚀 开始处理
          </button>
        </div>
      </div>

      <!-- 拖拽分割条 -->
      <div
        class="resize-handle"
        :class="{ resizing: isResizing }"
        @mousedown="startResize"
      >
        <div class="resize-icon">⋮⋮</div>
      </div>

      <!-- 右侧：预览/日志面板 -->
      <div
        class="right-panel"
        :style="{ width: rightPanelWidth + 'px' }"
      >
        <PreviewPanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 全局样式 ==================== */

.excel-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  box-sizing: border-box;
  background: var(--bg-color, #f5f5f5);
}

/* ==================== 页面头部 ==================== */

.page-header {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--text-primary, #262626);
}

.page-desc {
  font-size: 13px;
  margin: 0;
  color: var(--text-secondary, #8c8c8c);
}

/* ==================== 主容器 ==================== */

.main-container {
  flex: 1;
  display: flex;
  gap: 0;
  min-height: 0;
}

/* ==================== 左侧面板 ==================== */

.left-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 12px;
  overflow-y: auto;
}

/* ==================== 上传区 ==================== */

.upload-section {
  flex-shrink: 0;
}

/* ==================== Tab导航 ==================== */

.tabs-section {
  flex-shrink: 0;
}

.tabs-nav {
  display: flex;
  gap: 4px;
  background: var(--bg-secondary, #fafafa);
  padding: 4px;
  border-radius: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs-nav::-webkit-scrollbar {
  display: none;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: all 0.15s ease;
  color: var(--text-secondary, #8c8c8c);
}

.tab-item:hover {
  background: var(--bg-tertiary, #f0f0f0);
  color: var(--text-primary, #262626);
}

.tab-item.active {
  background: #1677ff;
  color: white;
}

.tab-icon {
  font-size: 14px;
}

.tab-name {
  font-weight: 500;
}

/* ==================== 配置区 ==================== */

.config-section {
  flex-shrink: 0;
}

.config-card {
  background: var(--bg-card, #ffffff);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color, #e8e8e8);
}

.config-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 14px;
  color: var(--text-primary, #262626);
}

.config-subtitle {
  font-size: 12px;
  font-weight: normal;
  color: var(--text-tertiary, #bfbfbf);
}

.config-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-label {
  width: 100px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-secondary, #8c8c8c);
  text-align: right;
}

.form-control {
  flex: 1;
  min-width: 0;
}

.form-input,
.form-select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border-color, #d9d9d9);
  border-radius: 6px;
  font-size: 13px;
  background: var(--bg-input, #ffffff);
  color: var(--text-primary, #262626);
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #1677ff;
}

.checkbox-item {
  gap: 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary, #262626);
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #1677ff;
}

.form-tip {
  font-size: 12px;
  color: var(--text-tertiary, #bfbfbf);
  padding: 8px;
  background: var(--bg-secondary, #fafafa);
  border-radius: 6px;
  margin-top: 4px;
}

/* ==================== 文件列表 ==================== */

.file-list-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.file-list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-card, #ffffff);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e8e8e8);
  overflow: hidden;
  min-height: 200px;
}

.file-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color, #e8e8e8);
  flex-shrink: 0;
}

.file-list-title {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary, #262626);
}

.file-count {
  font-weight: normal;
  color: var(--text-tertiary, #bfbfbf);
  font-size: 13px;
}

.file-list-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.status-badge.failed {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.file-list-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 10px;
  opacity: 0.5;
}

.empty-text {
  font-size: 13px;
  color: var(--text-tertiary, #bfbfbf);
}

.file-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 4px;
  transition: background 0.15s ease;
  position: relative;
}

.file-item:hover {
  background: var(--bg-secondary, #fafafa);
}

.file-item.success {
  background: rgba(82, 196, 26, 0.04);
}

.file-item.failed {
  background: rgba(255, 77, 79, 0.04);
}

.file-item.processing {
  background: rgba(22, 119, 255, 0.04);
}

.file-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #262626);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 12px;
  color: var(--text-tertiary, #bfbfbf);
  margin-top: 2px;
}

.file-meta .dot {
  margin: 0 6px;
}

.file-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--bg-secondary, #f0f0f0);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #1677ff;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: var(--text-tertiary, #bfbfbf);
  min-width: 36px;
  text-align: right;
}

.file-error {
  font-size: 12px;
  color: #ff4d4f;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-status {
  flex-shrink: 0;
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-tag.pending {
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-secondary, #8c8c8c);
}

.status-tag.processing {
  background: rgba(22, 119, 255, 0.1);
  color: #1677ff;
}

.status-tag.success {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.status-tag.failed {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.file-remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-tertiary, #bfbfbf);
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s ease;
}

.file-item:hover .file-remove-btn {
  opacity: 1;
}

.file-remove-btn:hover {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

/* ==================== 操作按钮区 ==================== */

.action-section {
  flex-shrink: 0;
  padding-top: 4px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #1677ff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4096ff;
}

.btn-secondary {
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-primary, #262626);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-tertiary, #e8e8e8);
}

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.btn-large {
  width: 100%;
  padding: 10px 20px;
  font-size: 14px;
  border-radius: 8px;
}

/* ==================== 拖拽分割条 ==================== */

.resize-handle {
  width: 8px;
  flex-shrink: 0;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: background 0.15s ease;
  position: relative;
  z-index: 10;
}

.resize-handle:hover,
.resize-handle.resizing {
  background: rgba(22, 119, 255, 0.1);
}

.resize-icon {
  font-size: 12px;
  color: var(--text-tertiary, #bfbfbf);
  letter-spacing: -2px;
  user-select: none;
}

.resize-handle:hover .resize-icon,
.resize-handle.resizing .resize-icon {
  color: #1677ff;
}

/* ==================== 右侧面板 ==================== */

.right-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-card, #ffffff);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e8e8e8);
  overflow: hidden;
}

/* ==================== 深色主题适配 ==================== */

@media (prefers-color-scheme: dark) {
  .excel-page {
    background: var(--bg-color, #1f1f1f);
  }

  .config-card,
  .file-list-card,
  .right-panel {
    background: var(--bg-card, #2a2a2a);
    border-color: var(--border-color, #3a3a3a);
  }

  .tabs-nav {
    background: var(--bg-secondary, #2a2a2a);
  }

  .tab-item:hover {
    background: var(--bg-tertiary, #3a3a3a);
  }

  .form-input,
  .form-select {
    background: var(--bg-input, #1f1f1f);
    border-color: var(--border-color, #3a3a3a);
    color: var(--text-primary, #e8e8e8);
  }

  .file-item:hover {
    background: var(--bg-secondary, #2a2a2a);
  }

  .btn-secondary {
    background: var(--bg-secondary, #2a2a2a);
    color: var(--text-primary, #e8e8e8);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-tertiary, #3a3a3a);
  }

  .form-tip {
    background: var(--bg-secondary, #2a2a2a);
  }

  .empty-icon {
    opacity: 0.3;
  }
}
</style>
