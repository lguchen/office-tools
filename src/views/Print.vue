<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'
import FileUploader from '@/components/FileUploader.vue'
import { usePrintStore } from '@/stores/print'
import { isTauri } from '@/utils/tauriUtils'
import {
  NCard,
  NButton,
  NForm,
  NFormItem,
  NSelect,
  NInputNumber,
  NRadioGroup,
  NRadio,
  NInput,
  NSwitch,
  NSpin,
  NEmpty,
  NTooltip,
  NProgress,
  NTag,
  NTabs,
  NTabPane,
  NScrollbar
} from 'naive-ui'

// ============== 类型定义 ==============
interface PrintFileItem {
  id: string
  name: string
  path: string
  size: number
  type: string
  file?: File
  previewUrl?: string
  pageCount?: number
  status: 'pending' | 'printing' | 'completed' | 'failed'
  progress: number
  error?: string
}

interface PrintConfig {
  printerName: string
  paperSize: string
  orientation: 'portrait' | 'landscape'
  copies: number
  pageRange: 'all' | 'custom'
  customPageRange: string
  colorMode: 'color' | 'grayscale'
  duplex: boolean
}

// ============== 基础状态 ==============
const message = useMessage()
const printStore = usePrintStore()
const settingStore = useSettingStore()

// 文件列表
const fileList = ref<PrintFileItem[]>([])

// 当前预览的文件索引
const currentPreviewIndex = ref(0)

// 打印机加载状态
const isLoadingPrinters = ref(false)

// 打印中状态
const isPrinting = ref(false)

// 打印配置
const printConfig = ref<PrintConfig>({
  printerName: '',
  paperSize: 'A4',
  orientation: 'portrait',
  copies: 1,
  pageRange: 'all',
  customPageRange: '',
  colorMode: 'color',
  duplex: false
})

// 进度监听函数
let progressUnlisten: (() => void) | null = null

// ============== 计算属性 ==============
// 打印机选项列表
const printerOptions = computed(() => {
  return printStore.printers.map((p) => ({
    label: `${p.name}${p.is_default ? ' (默认)' : ''}${p.is_offline ? ' [离线]' : ''}`,
    value: p.name,
    disabled: p.is_offline
  }))
})

// 当前选中的打印机信息
const currentPrinter = computed(() => {
  return printStore.printers.find((p) => p.name === printConfig.value.printerName)
})

// 当前预览的文件
const currentPreviewFile = computed(() => {
  if (fileList.value.length === 0) return null
  return fileList.value[currentPreviewIndex.value] || null
})

// 已完成的任务数
const completedCount = computed(() => {
  return fileList.value.filter((f) => f.status === 'completed').length
})

// 失败的任务数
const failedCount = computed(() => {
  return fileList.value.filter((f) => f.status === 'failed').length
})

// 纸张尺寸选项
const paperSizeOptions = [
  { label: 'A4 (210×297mm)', value: 'A4' },
  { label: 'A3 (297×420mm)', value: 'A3' },
  { label: 'A5 (148×210mm)', value: 'A5' },
  { label: 'B5 (176×250mm)', value: 'B5' },
  { label: 'Letter (8.5×11英寸)', value: 'Letter' },
  { label: 'Legal (8.5×14英寸)', value: 'Legal' }
]

// ============== 文件处理 ==============
// 处理文件选择
const handleFilesSelected = async (files: File[]) => {
  try {
    for (const file of files) {
      const filePath = (file as any).path || ''
      const fileItem: PrintFileItem = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        name: file.name,
        path: filePath,
        size: file.size,
        type: getFileType(file.name),
        file: file,
        status: 'pending',
        progress: 0
      }

      // 生成预览（图片类型）
      if (fileItem.type === 'image') {
        try {
          fileItem.previewUrl = await generateImagePreview(file)
        } catch (e) {
          console.warn('生成图片预览失败', e)
        }
      }

      fileList.value.push(fileItem)
    }
    message.success(`已添加 ${files.length} 个文件`)
  } catch (e: any) {
    console.error('处理文件失败', e)
    message.error('添加文件失败：' + (e.message || '未知错误'))
  }
}

// 获取文件类型
const getFileType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp']
  const excelExts = ['xlsx', 'xls', 'csv']
  const wordExts = ['docx', 'doc']
  const pdfExts = ['pdf']

  if (imageExts.includes(ext)) return 'image'
  if (excelExts.includes(ext)) return 'excel'
  if (wordExts.includes(ext)) return 'word'
  if (pdfExts.includes(ext)) return 'pdf'
  return 'other'
}

// 获取文件图标
const getFileIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    image: '🖼',
    excel: '📊',
    word: '📄',
    pdf: '📑',
    other: '📁'
  }
  return iconMap[type] || '📁'
}

// 生成图片预览
const generateImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0) + ' ' + sizes[i]
}

// 获取状态标签类型
const getStatusType = (status: string): 'default' | 'info' | 'success' | 'error' | 'warning' => {
  const typeMap: Record<string, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
    pending: 'default',
    printing: 'info',
    completed: 'success',
    failed: 'error'
  }
  return typeMap[status] || 'default'
}

// 获取状态文本
const getStatusText = (status: string): string => {
  const textMap: Record<string, string> = {
    pending: '等待中',
    printing: '打印中',
    completed: '已完成',
    failed: '失败'
  }
  return textMap[status] || status
}

// 移除文件
const removeFile = (index: number) => {
  try {
    fileList.value.splice(index, 1)
    if (currentPreviewIndex.value >= fileList.value.length) {
      currentPreviewIndex.value = Math.max(0, fileList.value.length - 1)
    }
  } catch (e: any) {
    console.error('移除文件失败', e)
    message.error('移除文件失败：' + (e.message || '未知错误'))
  }
}

// 清空文件列表
const clearFiles = () => {
  try {
    fileList.value = []
    currentPreviewIndex.value = 0
    message.info('已清空文件列表')
  } catch (e: any) {
    console.error('清空文件失败', e)
    message.error('清空文件失败：' + (e.message || '未知错误'))
  }
}

// 选择预览文件
const selectPreviewFile = (index: number) => {
  currentPreviewIndex.value = index
}

// ============== 打印机相关 ==============
// 加载打印机列表
const loadPrinters = async () => {
  isLoadingPrinters.value = true
  try {
    await printStore.loadPrinters()

    // 如果有默认打印机，自动选中
    if (printStore.printers.length > 0) {
      const defaultPrinter = printStore.printers.find((p) => p.is_default) || printStore.printers[0]
      if (!printConfig.value.printerName) {
        printConfig.value.printerName = defaultPrinter.name
      }
    }
  } catch (e: any) {
    console.error('加载打印机列表失败', e)
    message.error('加载打印机列表失败：' + (e.message || '未知错误'))
  } finally {
    isLoadingPrinters.value = false
  }
}

// 刷新打印机列表
const refreshPrinters = async () => {
  isLoadingPrinters.value = true
  try {
    await printStore.refreshPrinters()
    message.success('打印机列表已刷新')
  } catch (e: any) {
    console.error('刷新打印机列表失败', e)
    message.error('刷新打印机列表失败：' + (e.message || '未知错误'))
  } finally {
    isLoadingPrinters.value = false
  }
}

// ============== 打印功能 ==============
// 开始打印
const startPrint = async () => {
  // 校验
  if (fileList.value.length === 0) {
    message.warning('请先添加要打印的文件')
    return
  }
  if (!printConfig.value.printerName) {
    message.warning('请选择打印机')
    return
  }
  if (!isTauri()) {
    message.warning('当前环境不支持系统打印功能')
    return
  }

  isPrinting.value = true

  try {
    // 重置所有文件状态
    fileList.value.forEach((f) => {
      f.status = 'pending'
      f.progress = 0
      f.error = undefined
    })

    // 收集待打印文件路径
    const filesToPrint = fileList.value
      .filter((f) => f.path)
      .map((f) => ({ path: f.path, name: f.name }))

    if (filesToPrint.length === 0) {
      message.warning('没有可打印的文件（缺少文件路径）')
      isPrinting.value = false
      return
    }

    // 调用批量打印
    const result = await invoke('batch_print_files', {
      files: filesToPrint.map((f) => f.path),
      printerName: printConfig.value.printerName,
      params: {
        paper_size: printConfig.value.paperSize,
        orientation: printConfig.value.orientation,
        copies: printConfig.value.copies,
        page_range:
          printConfig.value.pageRange === 'custom'
            ? printConfig.value.customPageRange
            : 'all',
        color_mode: printConfig.value.colorMode,
        duplex: printConfig.value.duplex
      }
    })

    if (result) {
      message.success('打印任务已发送到打印机')
    } else {
      message.error('打印任务发送失败')
    }
  } catch (e: any) {
    console.error('打印失败', e)
    message.error('打印失败：' + (e.message || '未知错误'))
  } finally {
    isPrinting.value = false
  }
}

// 打印单个文件
const printSingleFile = async (fileItem: PrintFileItem) => {
  if (!printConfig.value.printerName) {
    message.warning('请选择打印机')
    return
  }
  if (!fileItem.path) {
    message.warning('文件路径无效，无法打印')
    return
  }
  if (!isTauri()) {
    message.warning('当前环境不支持系统打印功能')
    return
  }

  try {
    fileItem.status = 'printing'
    fileItem.progress = 50

    const result = await invoke('print_file', {
      filePath: fileItem.path,
      printerName: printConfig.value.printerName,
      params: {
        paper_size: printConfig.value.paperSize,
        orientation: printConfig.value.orientation,
        copies: printConfig.value.copies,
        page_range:
          printConfig.value.pageRange === 'custom'
            ? printConfig.value.customPageRange
            : 'all',
        color_mode: printConfig.value.colorMode,
        duplex: printConfig.value.duplex
      }
    })

    if (result) {
      fileItem.status = 'completed'
      fileItem.progress = 100
      message.success(`${fileItem.name} 打印完成`)
    } else {
      fileItem.status = 'failed'
      fileItem.error = '打印失败'
      message.error(`${fileItem.name} 打印失败`)
    }
  } catch (e: any) {
    console.error('打印失败', e)
    fileItem.status = 'failed'
    fileItem.error = e.message || '未知错误'
    message.error(`${fileItem.name} 打印失败：${e.message || '未知错误'}`)
  }
}

// 设置打印进度监听
const setupProgressListener = async () => {
  if (!isTauri()) return
  if (progressUnlisten) return

  try {
    const { listen } = await import('@tauri-apps/api/event')
    progressUnlisten = await listen('print-progress', (event: any) => {
      const data = event.payload as {
        file: string
        status: string
        progress?: number
        error?: string
      }

      // 更新对应文件的状态
      const fileItem = fileList.value.find((f) => f.name === data.file || f.path === data.file)
      if (fileItem) {
        if (data.status === 'printing') {
          fileItem.status = 'printing'
          fileItem.progress = data.progress || 50
        } else if (data.status === 'completed') {
          fileItem.status = 'completed'
          fileItem.progress = 100
        } else if (data.status === 'failed') {
          fileItem.status = 'failed'
          fileItem.error = data.error || '打印失败'
        }
      }
    })
  } catch (e) {
    console.warn('设置打印进度监听失败', e)
  }
}

// ============== 生命周期 ==============
onMounted(() => {
  loadPrinters()
  setupProgressListener()
})

onUnmounted(() => {
  if (progressUnlisten) {
    progressUnlisten()
    progressUnlisten = null
  }
})
</script>

<template>
  <div class="print-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">🖨 批量打印</h2>
      <p class="page-desc">支持 Excel、Word、PDF、图片等多种格式文件批量打印</p>
    </div>

    <!-- 主内容区：左右分栏 -->
    <div class="main-content">
      <!-- 左侧：文件上传和列表 -->
      <div class="left-panel">
        <!-- 文件上传区 -->
        <n-card class="upload-card" :bordered="false" size="small">
          <FileUploader
            :accept="['xlsx', 'xls', 'csv', 'docx', 'doc', 'pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp']"
            :multiple="true"
            hint-text="拖拽文件到此处，或点击选择文件"
            icon="🖨"
            @files-selected="handleFilesSelected"
          />
        </n-card>

        <!-- 文件列表 -->
        <n-card class="file-list-card" :bordered="false" size="small">
          <div class="card-header">
            <span class="card-title">📋 待打印文件 ({{ fileList.length }})</span>
            <div class="card-actions">
              <n-tag v-if="completedCount > 0" type="success" size="small">
                完成 {{ completedCount }}
              </n-tag>
              <n-tag v-if="failedCount > 0" type="error" size="small">
                失败 {{ failedCount }}
              </n-tag>
              <n-button
                v-if="fileList.length > 0"
                text
                size="tiny"
                @click="clearFiles"
              >
                清空
              </n-button>
            </div>
          </div>

          <div class="file-list-container">
            <n-empty v-if="fileList.length === 0" description="暂无文件，请添加" size="small" />
            <n-scrollbar v-else>
              <div class="file-list">
                <div
                  v-for="(file, index) in fileList"
                  :key="file.id"
                  class="file-item"
                  :class="{ active: currentPreviewIndex === index }"
                  @click="selectPreviewFile(index)"
                >
                  <span class="file-icon">{{ getFileIcon(file.type) }}</span>
                  <div class="file-info">
                    <div class="file-name" :title="file.name">{{ file.name }}</div>
                    <div class="file-meta">
                      <span class="file-size">{{ formatFileSize(file.size) }}</span>
                      <n-tag size="tiny" :type="getStatusType(file.status)">
                        {{ getStatusText(file.status) }}
                      </n-tag>
                    </div>
                    <n-progress
                      v-if="file.status === 'printing'"
                      :percentage="file.progress"
                      size="tiny"
                      :show-indicator="false"
                      style="margin-top: 4px"
                    />
                    <div v-if="file.error" class="file-error">{{ file.error }}</div>
                  </div>
                  <div class="file-actions">
                    <n-tooltip content="打印">
                      <n-button
                        text
                        size="tiny"
                        :disabled="isPrinting || file.status === 'printing'"
                        @click.stop="printSingleFile(file)"
                      >
                        🖨
                      </n-button>
                    </n-tooltip>
                    <n-tooltip content="移除">
                      <n-button text size="tiny" @click.stop="removeFile(index)">
                        ✕
                      </n-button>
                    </n-tooltip>
                  </div>
                </div>
              </div>
            </n-scrollbar>
          </div>
        </n-card>
      </div>

      <!-- 右侧：打印参数和预览 -->
      <div class="right-panel">
        <!-- 打印机选择 -->
        <n-card class="printer-card" :bordered="false" size="small">
          <div class="card-header">
            <span class="card-title">🖨 打印机</span>
            <n-tooltip content="刷新打印机列表">
              <n-button text size="tiny" :loading="isLoadingPrinters" @click="refreshPrinters">
                🔄
              </n-button>
            </n-tooltip>
          </div>

          <n-form size="small">
            <n-form-item label="选择打印机">
              <n-select
                v-model:value="printConfig.printerName"
                :options="printerOptions"
                placeholder="请选择打印机"
                :loading="isLoadingPrinters"
                filterable
                clearable
              />
            </n-form-item>

            <div v-if="currentPrinter" class="printer-info">
              <span
                class="status-dot"
                :class="{ offline: currentPrinter.is_offline }"
              ></span>
              <span :class="{ 'text-offline': currentPrinter.is_offline }">
                {{ currentPrinter.status }}
              </span>
              <span class="printer-port">端口: {{ currentPrinter.port }}</span>
            </div>
          </n-form>
        </n-card>

        <!-- 打印参数配置 -->
        <n-card class="params-card" :bordered="false" size="small">
          <template #header>
            <span class="card-title">⚙ 打印参数</span>
          </template>

          <n-tabs type="line" size="small">
            <!-- 基础设置 -->
            <n-tab-pane name="basic" tab="基础">
              <n-form size="small" label-placement="left" label-width="80">
                <n-form-item label="纸张大小">
                  <n-select
                    v-model:value="printConfig.paperSize"
                    :options="paperSizeOptions"
                    style="width: 100%"
                  />
                </n-form-item>

                <n-form-item label="打印方向">
                  <n-radio-group v-model:value="printConfig.orientation">
                    <n-radio value="portrait">纵向</n-radio>
                    <n-radio value="landscape">横向</n-radio>
                  </n-radio-group>
                </n-form-item>

                <n-form-item label="打印份数">
                  <n-input-number
                    v-model:value="printConfig.copies"
                    :min="1"
                    :max="999"
                    style="width: 100%"
                  />
                </n-form-item>

                <n-form-item label="打印范围">
                  <n-radio-group v-model:value="printConfig.pageRange">
                    <n-radio value="all">全部</n-radio>
                    <n-radio value="custom">指定页</n-radio>
                  </n-radio-group>
                </n-form-item>

                <n-form-item v-if="printConfig.pageRange === 'custom'" label="页码范围">
                  <n-input
                    v-model:value="printConfig.customPageRange"
                    placeholder="如: 1-5,10,12-15"
                  />
                </n-form-item>
              </n-form>
            </n-tab-pane>

            <!-- 高级设置 -->
            <n-tab-pane name="advanced" tab="高级">
              <n-form size="small" label-placement="left" label-width="80">
                <n-form-item label="色彩模式">
                  <n-radio-group v-model:value="printConfig.colorMode">
                    <n-radio value="color">彩色</n-radio>
                    <n-radio value="grayscale">黑白</n-radio>
                  </n-radio-group>
                </n-form-item>

                <n-form-item label="双面打印">
                  <n-switch v-model:value="printConfig.duplex" />
                </n-form-item>
              </n-form>
            </n-tab-pane>
          </n-tabs>
        </n-card>

        <!-- 打印预览 -->
        <n-card class="preview-card" :bordered="false" size="small">
          <div class="card-header">
            <span class="card-title">👁 打印预览</span>
            <span v-if="currentPreviewFile" class="preview-filename">
              {{ currentPreviewFile.name }}
            </span>
          </div>

          <div class="preview-area">
            <n-empty v-if="!currentPreviewFile" description="选择文件后预览" size="small" />
            <div v-else class="preview-content">
              <!-- 图片预览 -->
              <img
                v-if="currentPreviewFile.type === 'image' && currentPreviewFile.previewUrl"
                :src="currentPreviewFile.previewUrl"
                :alt="currentPreviewFile.name"
                class="preview-image"
              />
              <!-- PDF预览 -->
              <div v-else-if="currentPreviewFile.type === 'pdf'" class="preview-placeholder">
                <div class="placeholder-icon">📑</div>
                <div class="placeholder-text">PDF 文件</div>
                <div class="placeholder-desc">{{ currentPreviewFile.name }}</div>
              </div>
              <!-- Word预览 -->
              <div v-else-if="currentPreviewFile.type === 'word'" class="preview-placeholder">
                <div class="placeholder-icon">📄</div>
                <div class="placeholder-text">Word 文档</div>
                <div class="placeholder-desc">{{ currentPreviewFile.name }}</div>
              </div>
              <!-- Excel预览 -->
              <div v-else-if="currentPreviewFile.type === 'excel'" class="preview-placeholder">
                <div class="placeholder-icon">📊</div>
                <div class="placeholder-text">Excel 表格</div>
                <div class="placeholder-desc">{{ currentPreviewFile.name }}</div>
              </div>
              <!-- 其他文件 -->
              <div v-else class="preview-placeholder">
                <div class="placeholder-icon">📁</div>
                <div class="placeholder-text">未知文件类型</div>
                <div class="placeholder-desc">{{ currentPreviewFile.name }}</div>
              </div>
            </div>
          </div>
        </n-card>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <n-button size="medium" @click="clearFiles" :disabled="fileList.length === 0">
            清空列表
          </n-button>
          <n-button
            type="primary"
            size="medium"
            :loading="isPrinting"
            :disabled="fileList.length === 0 || !printConfig.printerName"
            @click="startPrint"
          >
            {{ isPrinting ? '打印中...' : '开始打印' }}
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  box-sizing: border-box;
}

/* 页面标题 */
.page-header {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--text-primary);
}

.page-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow: hidden;
}

/* 左侧面板 */
.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

/* 右侧面板 */
.right-panel {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 卡片通用样式 */
.upload-card,
.file-list-card,
.printer-card,
.params-card,
.preview-card {
  background: var(--bg-color);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 文件列表 */
.file-list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.file-list-container {
  flex: 1;
  overflow: hidden;
  min-height: 200px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.file-item:hover {
  background: var(--bg-secondary);
}

.file-item.active {
  background: rgba(22, 119, 255, 0.08);
  border-color: rgba(22, 119, 255, 0.2);
}

.file-icon {
  font-size: 24px;
  flex-shrink: 0;
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
  margin-top: 4px;
}

.file-size {
  font-size: 11px;
  color: var(--text-tertiary);
}

.file-error {
  font-size: 11px;
  color: #ff4d4f;
  margin-top: 4px;
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* 打印机信息 */
.printer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: -4px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #52c41a;
  display: inline-block;
}

.status-dot.offline {
  background: #ff4d4f;
}

.text-offline {
  color: #ff4d4f;
}

.printer-port {
  margin-left: auto;
  color: var(--text-tertiary);
}

/* 预览区域 */
.preview-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.preview-filename {
  font-size: 12px;
  color: var(--text-tertiary);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-area {
  flex: 1;
  background: var(--bg-secondary);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  min-height: 200px;
}

.preview-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.preview-placeholder {
  text-align: center;
  color: var(--text-tertiary);
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.placeholder-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.placeholder-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  word-break: break-all;
  max-width: 200px;
}

/* 操作栏 */
.action-bar {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.action-bar button {
  flex: 1;
}

/* 响应式适配 */
@media (max-width: 900px) {
  .main-content {
    flex-direction: column;
  }

  .right-panel {
    width: 100%;
    max-height: 400px;
  }

  .preview-card {
    min-height: 150px;
  }
}
</style>
