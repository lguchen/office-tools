<script setup lang="ts">
// ==================== 编码转换工具 ====================
// 功能：文本文件编码批量转换，支持自动检测源编码、多种目标编码
// 技术栈：Vue3 + TypeScript + NaiveUI + Tauri v2

import { ref, computed, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'
import FileUploader from '@/components/FileUploader.vue'
import { useTaskStore } from '@/stores/task'
import { isTauri } from '@/utils/tauriUtils'

// ==================== 类型定义 ====================

/** 文件处理状态 */
type FileStatus = 'pending' | 'detecting' | 'success' | 'failed'

/** 文件列表项 */
interface FileItem {
  id: string
  name: string
  path: string
  size: number
  type: string
  status: FileStatus
  checked: boolean
  sourceEncoding?: string
  sourcePreview?: string
  targetPreview?: string
  errorMsg?: string
  file?: File
}

/** 目标编码选项 */
interface EncodingOption {
  label: string
  value: string
}

// ==================== 状态定义 ====================

const message = useMessage()
const taskStore = useTaskStore()

/** 文件列表 - 统一管理所有文件 */
const fileList = ref<FileItem[]>([])

/** 是否正在转换 */
const isConverting = ref(false)

/** 当前选中的文件（用于预览） */
const selectedFileId = ref<string | null>(null)

/** 目标编码 */
const targetEncoding = ref('utf-8')

/** 是否添加 BOM (仅 UTF-8/UTF-16 有效) */
const addBom = ref(false)

/** 输出目录模式：same=同目录，custom=自定义目录 */
const outputMode = ref<'same' | 'custom'>('same')

/** 自定义输出目录 */
const customOutputDir = ref('')

/** 输出文件名后缀 */
const outputSuffix = ref('_converted')

// ==================== 编码选项 ====================

const encodingOptions: EncodingOption[] = [
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'GBK', value: 'gbk' },
  { label: 'GB2312', value: 'gb2312' },
  { label: 'GB18030', value: 'gb18030' },
  { label: 'ISO-8859-1', value: 'iso-8859-1' },
  { label: 'UTF-16LE', value: 'utf-16le' },
  { label: 'UTF-16BE', value: 'utf-16be' },
  { label: 'Big5', value: 'big5' },
  { label: 'Shift_JIS', value: 'shift_jis' },
  { label: 'EUC-KR', value: 'euc-kr' }
]

// ==================== 计算属性 ====================

/** 全选状态 */
const isAllChecked = computed({
  get: () => fileList.value.length > 0 && fileList.value.every(f => f.checked),
  set: (val: boolean) => {
    fileList.value.forEach(f => {
      if (f.status !== 'detecting') f.checked = val
    })
  }
})

/** 已勾选的文件数量 */
const checkedCount = computed(() => fileList.value.filter(f => f.checked).length)

/** 当前选中的文件 */
const selectedFile = computed(() => {
  if (!selectedFileId.value) return null
  return fileList.value.find(f => f.id === selectedFileId.value) || null
})

/** 是否支持 BOM */
const supportsBom = computed(() => {
  const enc = targetEncoding.value.toLowerCase()
  return enc === 'utf-8' || enc === 'utf-16le' || enc === 'utf-16be'
})

// ==================== 文件上传处理 ====================

/**
 * 处理文件选择
 * 将上传的 File 对象转换为统一的 FileItem 格式
 */
const handleFilesSelected = async (files: File[]) => {
  try {
    const newItems: FileItem[] = []

    for (const file of files) {
      const path = (file as any).path || file.name
      const ext = file.name.split('.').pop()?.toLowerCase() || ''

      const item: FileItem = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        name: file.name,
        path: path,
        size: file.size,
        type: ext,
        status: 'pending',
        checked: true,
        file: file
      }

      newItems.push(item)
    }

    fileList.value.push(...newItems)

    // 默认选中第一个文件用于预览
    if (!selectedFileId.value && newItems.length > 0) {
      selectedFileId.value = newItems[0].id
    }

    message.success(`成功添加 ${newItems.length} 个文件`)

    // 异步检测已添加文件的编码
    for (const item of newItems) {
      detectFileEncoding(item.id)
    }
  } catch (error: any) {
    console.error('添加文件失败:', error)
    message.error('添加文件失败：' + (error.message || '未知错误'))
  }
}

/**
 * 检测文件编码
 */
const detectFileEncoding = async (fileId: string) => {
  const item = fileList.value.find(f => f.id === fileId)
  if (!item) return

  try {
    item.status = 'detecting'

    // Tauri 环境下调用 Rust 检测编码
    if (isTauri() && item.path && item.file) {
      try {
        const result = await invoke<{ encoding: string; confidence: number }>(
          'detect_encoding',
          { filePath: item.path }
        )
        item.sourceEncoding = result.encoding
        item.status = 'success'

        // 读取预览内容
        await loadPreview(item)
        return
      } catch (rustError) {
        console.warn('Rust 编码检测失败，使用前端方式:', rustError)
      }
    }

    // 前端回退：尝试读取文件并做简单检测
    if (item.file) {
      const buffer = await item.file.arrayBuffer()
      const detected = detectEncodingFromBuffer(buffer)
      item.sourceEncoding = detected

      // 读取预览内容
      await loadPreview(item)
      item.status = 'success'
    } else {
      item.status = 'failed'
      item.errorMsg = '无法读取文件内容'
    }
  } catch (error: any) {
    console.error('编码检测失败:', error)
    item.status = 'failed'
    item.errorMsg = error.message || '编码检测失败'
  }
}

/**
 * 从 ArrayBuffer 简单检测编码（前端回退方案）
 * 基于 BOM 和常见特征的简单检测
 */
const detectEncodingFromBuffer = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)

  // 检查 BOM
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'utf-8-bom'
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'utf-16le'
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return 'utf-16be'
  }

  // 简单启发式检测
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    // 如果能正常解码为 UTF-8 且包含非 ASCII 字符，很可能是 UTF-8
    if (/[^\x00-\x7F]/.test(text)) {
      return 'utf-8'
    }
    return 'ascii'
  } catch {
    // UTF-8 解码失败，可能是 GBK 或其他编码
    return 'gbk'
  }
}

/**
 * 加载文件预览内容
 */
const loadPreview = async (item: FileItem) => {
  try {
    if (!item.file) return

    const text = await item.file.text()
    const lines = text.split(/\r?\n/).slice(0, 20)
    item.sourcePreview = lines.join('\n')

    // 生成目标预览（用 TextDecoder/Encoder 模拟）
    await updateTargetPreview(item)
  } catch (error: any) {
    console.error('加载预览失败:', error)
  }
}

/**
 * 更新目标编码预览
 */
const updateTargetPreview = async (item: FileItem) => {
  try {
    if (!item.sourcePreview) {
      item.targetPreview = ''
      return
    }

    // 前端环境下，仅展示预览效果
    // 实际转换由 Rust 端完成
    item.targetPreview = item.sourcePreview
  } catch (error: any) {
    console.error('更新预览失败:', error)
  }
}

/**
 * 移除单个文件
 */
const removeFile = (id: string) => {
  try {
    const index = fileList.value.findIndex(f => f.id === id)
    if (index > -1) {
      fileList.value.splice(index, 1)
      if (selectedFileId.value === id) {
        selectedFileId.value = fileList.value.length > 0 ? fileList.value[0].id : null
      }
    }
  } catch (error: any) {
    console.error('移除文件失败:', error)
    message.error('移除文件失败：' + (error.message || '未知错误'))
  }
}

/**
 * 清空文件列表
 */
const clearFiles = () => {
  try {
    if (isConverting.value) {
      message.warning('正在转换中，无法清空')
      return
    }
    fileList.value = []
    selectedFileId.value = null
    message.info('已清空文件列表')
  } catch (error: any) {
    console.error('清空文件失败:', error)
    message.error('清空文件失败：' + (error.message || '未知错误'))
  }
}

/**
 * 选中文件进行预览
 */
const selectFile = (id: string) => {
  selectedFileId.value = id
}

// ==================== 编码转换核心逻辑 ====================

/**
 * 开始批量转换
 * 调用 Rust 命令执行编码转换，加入任务队列
 */
const startConvert = async () => {
  try {
    // 参数校验
    const checkedFiles = fileList.value.filter(f => f.checked && f.status !== 'detecting')
    if (checkedFiles.length === 0) {
      message.warning('请先选择要转换的文件')
      return
    }

    if (!isTauri()) {
      message.warning('浏览器环境下无法保存转换后的文件，请在 Tauri 中运行')
      return
    }

    if (isConverting.value) {
      message.warning('正在转换中，请稍候...')
      return
    }

    isConverting.value = true

    // 准备任务数据
    const convertTasks: Array<{
      input_path: string
      output_path: string
      source_encoding: string
      target_encoding: string
      add_bom: boolean
    }> = []

    for (const item of checkedFiles) {
      if (!item.path) {
        message.error(`文件 ${item.name} 没有有效的路径信息`)
        continue
      }

      // 计算输出路径
      let outputPath: string
      if (outputMode.value === 'custom' && customOutputDir.value) {
        const lastDot = item.name.lastIndexOf('.')
        const baseName = lastDot > 0 ? item.name.slice(0, lastDot) : item.name
        const ext = lastDot > 0 ? item.name.slice(lastDot) : ''
        outputPath = `${customOutputDir.value}/${baseName}${outputSuffix.value}${ext}`
      } else {
        const lastSlash = Math.max(item.path.lastIndexOf('/'), item.path.lastIndexOf('\\'))
        const lastDot = item.name.lastIndexOf('.')
        const baseName = lastDot > 0 ? item.name.slice(0, lastDot) : item.name
        const ext = lastDot > 0 ? item.name.slice(lastDot) : ''
        outputPath = lastSlash >= 0
          ? item.path.slice(0, lastSlash + 1) + baseName + outputSuffix.value + ext
          : baseName + outputSuffix.value + ext
      }

      convertTasks.push({
        input_path: item.path,
        output_path: outputPath,
        source_encoding: item.sourceEncoding || 'auto',
        target_encoding: targetEncoding.value,
        add_bom: supportsBom.value && addBom.value
      })

      item.status = 'detecting' // 复用为处理中状态
    }

    if (convertTasks.length === 0) {
      message.error('没有有效的转换任务')
      isConverting.value = false
      return
    }

    taskStore.addLog('info', `开始编码转换，共 ${convertTasks.length} 个文件`)

    // 加入任务队列
    taskStore.addTasks(
      convertTasks.map((task, index) => ({
        name: checkedFiles[index].name,
        type: 'encoding_convert',
        inputPath: task.input_path,
        outputPath: task.output_path
      }))
    )

    // 调用 Rust 命令执行批量转换
    const results = await invoke<
      Array<{
        input_path: string
        output_path: string
        success: boolean
        source_encoding?: string
        error?: string
      }>
    >('batch_convert_encoding', {
      tasks: convertTasks
    })

    // 处理结果
    let successCount = 0
    let failCount = 0

    for (const result of results) {
      const item = fileList.value.find(f => f.path === result.input_path)
      if (item) {
        if (result.success) {
          item.status = 'success'
          item.sourceEncoding = result.source_encoding || item.sourceEncoding
          successCount++
        } else {
          item.status = 'failed'
          item.errorMsg = result.error || '转换失败'
          failCount++
        }
      }

      // 更新任务队列中的状态
      const task = taskStore.tasks.find(t => t.inputPath === result.input_path)
      if (task) {
        if (result.success) {
          task.status = 'success'
          task.progress = 100
        } else {
          task.status = 'failed'
          task.error = result.error
        }
      }
    }

    // 统计结果
    if (failCount === 0) {
      message.success(`成功转换 ${successCount} 个文件`)
      taskStore.addLog('success', `编码转换完成：成功 ${successCount} 个`)
    } else {
      message.warning(`转换完成：成功 ${successCount} 个，失败 ${failCount} 个`)
      taskStore.addLog('warning', `编码转换完成：成功 ${successCount} 个，失败 ${failCount} 个`)
    }

    isConverting.value = false
  } catch (error: any) {
    console.error('批量转换失败:', error)
    message.error('批量转换失败：' + (error.message || '未知错误'))
    taskStore.addLog('error', '批量转换失败：' + (error.message || '未知错误'))

    // 重置处理中文件的状态
    fileList.value.forEach(f => {
      if (f.status === 'detecting') {
        f.status = 'pending'
      }
    })

    isConverting.value = false
  }
}

/**
 * 选择自定义输出目录
 */
const selectOutputDir = async () => {
  try {
    if (!isTauri()) {
      message.warning('浏览器环境下无法选择本地目录')
      return
    }

    const { open } = await import('@tauri-apps/plugin-dialog')
    const result = await open({
      directory: true,
      multiple: false
    })

    if (result && typeof result === 'string') {
      customOutputDir.value = result
    }
  } catch (error: any) {
    console.error('选择目录失败:', error)
    message.error('选择目录失败：' + (error.message || '未知错误'))
  }
}

/**
 * 重置失败的文件
 */
const resetFailed = () => {
  try {
    let count = 0
    fileList.value.forEach(f => {
      if (f.status === 'failed') {
        f.status = 'pending'
        f.errorMsg = undefined
        f.checked = true
        count++
      }
    })
    if (count > 0) {
      message.info(`已重置 ${count} 个失败的文件`)
    } else {
      message.info('没有失败的文件')
    }
  } catch (error: any) {
    console.error('重置失败文件出错:', error)
    message.error('重置失败：' + (error.message || '未知错误'))
  }
}

// ==================== 监听配置变化，更新预览 ====================

watch([targetEncoding, addBom], () => {
  // 当目标编码变化时，更新所有文件的预览
  for (const item of fileList.value) {
    if (item.sourcePreview) {
      updateTargetPreview(item)
    }
  }
})

// ==================== 工具函数 ====================

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 获取文件状态对应的标签类型
 */
const getStatusType = (status: FileStatus): 'default' | 'info' | 'success' | 'error' | 'warning' => {
  const map: Record<FileStatus, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
    pending: 'default',
    detecting: 'info',
    success: 'success',
    failed: 'error'
  }
  return map[status]
}

/**
 * 获取文件状态对应的文本
 */
const getStatusText = (status: FileStatus): string => {
  const map: Record<FileStatus, string> = {
    pending: '待检测',
    detecting: '检测中',
    success: '已检测',
    failed: '失败'
  }
  return map[status]
}

/**
 * 获取文件图标
 */
const getFileIcon = (ext: string): string => {
  const iconMap: Record<string, string> = {
    txt: '📝',
    csv: '📊',
    html: '🌐',
    htm: '🌐',
    xml: '📄',
    json: '📋',
    js: '⚡',
    ts: '⚡',
    css: '🎨',
    md: '📑',
    log: '📜'
  }
  return iconMap[ext.toLowerCase()] || '📄'
}
</script>

<template>
  <div class="encoding-convert-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">🔤 编码转换</h2>
        <p class="page-desc">支持多种文本编码互转，自动检测源文件编码</p>
      </div>
      <div class="header-actions">
        <n-button @click="resetFailed" :disabled="isConverting">
          重置失败
        </n-button>
        <n-button @click="clearFiles" :disabled="isConverting || fileList.length === 0">
          清空列表
        </n-button>
        <n-button
          type="primary"
          @click="startConvert"
          :loading="isConverting"
          :disabled="checkedCount === 0 || isConverting"
        >
          {{ isConverting ? '转换中...' : `开始转换 (${checkedCount})` }}
        </n-button>
      </div>
    </div>

    <!-- 左右分栏布局 -->
    <div class="main-content">
      <!-- 左侧：文件列表 -->
      <div class="left-panel">
        <div class="panel-card">
          <div class="panel-header">
            <span class="panel-title">📁 文件列表 ({{ fileList.length }})</span>
            <n-checkbox
              v-model:checked="isAllChecked"
              :disabled="fileList.length === 0 || isConverting"
            >
              全选
            </n-checkbox>
          </div>

          <!-- 文件上传区域 -->
          <FileUploader
            @files-selected="handleFilesSelected"
            :accept="['txt', 'csv', 'html', 'htm', 'xml', 'json', 'js', 'css', 'md', 'log']"
            hint-text="拖拽文本文件到此处，或点击选择"
            icon="📄"
            :multiple="true"
          />

          <!-- 文件列表 -->
          <div class="file-list-container">
            <n-empty
              v-if="fileList.length === 0"
              description="暂无文件，请添加文件"
              :show-icon="false"
            />

            <div v-else class="file-scroll-list">
              <div
                v-for="item in fileList"
                :key="item.id"
                class="file-row"
                :class="{
                  'file-row-selected': selectedFileId === item.id,
                  'file-row-failed': item.status === 'failed'
                }"
                @click="selectFile(item.id)"
              >
                <n-checkbox
                  v-model:checked="item.checked"
                  :disabled="item.status === 'detecting'"
                  class="file-checkbox"
                  @click.stop
                />
                <span class="file-icon">{{ getFileIcon(item.type) }}</span>
                <div class="file-info">
                  <div class="file-name" :title="item.name">{{ item.name }}</div>
                  <div class="file-meta">
                    <span>{{ formatFileSize(item.size) }}</span>
                    <n-tag :type="getStatusType(item.status)" size="tiny">
                      {{ getStatusText(item.status) }}
                    </n-tag>
                    <n-tag v-if="item.sourceEncoding" size="tiny" type="info">
                      {{ item.sourceEncoding.toUpperCase() }}
                    </n-tag>
                  </div>
                  <div v-if="item.errorMsg" class="file-error">{{ item.errorMsg }}</div>
                </div>
                <n-button
                  text
                  size="small"
                  @click.stop="removeFile(item.id)"
                  :disabled="isConverting"
                  class="remove-btn"
                >
                  删除
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：配置 + 预览 -->
      <div class="right-panel">
        <!-- 转换配置 -->
        <div class="panel-card config-card">
          <div class="panel-header">
            <span class="panel-title">⚙️ 转换配置</span>
          </div>
          <div class="config-content">
            <!-- 目标编码 -->
            <div class="config-item">
              <label class="config-label">目标编码</label>
              <n-select
                v-model:value="targetEncoding"
                :options="encodingOptions"
                :disabled="isConverting"
              />
            </div>

            <!-- 添加 BOM -->
            <div class="config-item" v-if="supportsBom">
              <label class="config-label">添加 BOM</label>
              <n-switch v-model:value="addBom" :disabled="isConverting" />
              <span class="config-hint">
                字节顺序标记，部分 Windows 程序需要
              </span>
            </div>

            <!-- 输出位置 -->
            <div class="config-item">
              <label class="config-label">输出位置</label>
              <n-radio-group v-model:value="outputMode" :disabled="isConverting">
                <n-radio value="same">同目录</n-radio>
                <n-radio value="custom">自定义目录</n-radio>
              </n-radio-group>
            </div>

            <!-- 自定义目录选择 -->
            <div class="config-item" v-if="outputMode === 'custom'">
              <label class="config-label">输出目录</label>
              <n-input
                v-model:value="customOutputDir"
                placeholder="选择输出目录"
                :disabled="isConverting"
                readonly
                style="flex: 1"
              >
                <template #suffix>
                  <n-button text size="small" @click="selectOutputDir" :disabled="isConverting">
                    浏览
                  </n-button>
                </template>
              </n-input>
            </div>

            <!-- 文件名后缀 -->
            <div class="config-item">
              <label class="config-label">文件后缀</label>
              <n-input
                v-model:value="outputSuffix"
                placeholder="_converted"
                :disabled="isConverting"
                style="flex: 1"
              />
              <span class="config-hint">转换后文件名追加的后缀</span>
            </div>
          </div>
        </div>

        <!-- 预览区域 -->
        <div class="panel-card preview-card">
          <div class="panel-header">
            <span class="panel-title">👁️ 内容预览</span>
            <span v-if="selectedFile" class="preview-meta">
              {{ selectedFile.sourceEncoding?.toUpperCase() }} → {{ targetEncoding.toUpperCase() }}
            </span>
          </div>

          <div class="preview-container">
            <n-empty
              v-if="!selectedFile"
              description="请选择文件以预览"
              :show-icon="false"
            />

            <div v-else class="preview-content">
              <!-- 源文件预览 -->
              <div class="preview-section">
                <div class="preview-section-header">
                  <span class="preview-section-title">
                    源文件
                    <n-tag size="tiny" type="info" style="margin-left: 8px">
                      {{ selectedFile.sourceEncoding?.toUpperCase() || '未知' }}
                    </n-tag>
                  </span>
                </div>
                <div class="preview-text">
                  <pre v-if="selectedFile.sourcePreview">{{ selectedFile.sourcePreview }}</pre>
                  <span v-else class="preview-placeholder">加载中...</span>
                </div>
              </div>

              <!-- 转换箭头 -->
              <div class="preview-arrow">
                <span>↓ 转换</span>
              </div>

              <!-- 目标文件预览 -->
              <div class="preview-section">
                <div class="preview-section-header">
                  <span class="preview-section-title">
                    目标文件
                    <n-tag size="tiny" type="success" style="margin-left: 8px">
                      {{ targetEncoding.toUpperCase() }}
                    </n-tag>
                  </span>
                </div>
                <div class="preview-text">
                  <pre v-if="selectedFile.targetPreview">{{ selectedFile.targetPreview }}</pre>
                  <span v-else class="preview-placeholder">加载中...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 容器布局 ==================== */
.encoding-convert-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

.header-actions {
  display: flex;
  gap: 8px;
}

/* ==================== 左右分栏主内容 ==================== */
.main-content {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

.left-panel {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  min-width: 0;
}

/* ==================== 面板卡片 ==================== */
.panel-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  min-height: 0;
}

.panel-card.config-card {
  flex-shrink: 0;
  flex: none;
}

.panel-card.preview-card {
  min-height: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.panel-title {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary);
}

.preview-meta {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* ==================== 文件列表 ==================== */
.file-list-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

.file-scroll-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.15s ease;
  cursor: pointer;
}

.file-row:hover {
  background: var(--bg-secondary);
  border-color: var(--primary-color);
}

.file-row-selected {
  background: rgba(22, 119, 255, 0.06);
  border-color: var(--primary-color);
}

.file-row-failed {
  border-color: #ff4d4f;
  background: rgba(255, 77, 79, 0.03);
}

.file-checkbox {
  flex-shrink: 0;
}

.file-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.file-error {
  font-size: 12px;
  color: #ff4d4f;
  margin-top: 4px;
}

.remove-btn {
  flex-shrink: 0;
}

/* ==================== 配置区域 ==================== */
.config-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-label {
  width: 90px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: right;
}

.config-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* ==================== 预览区域 ==================== */
.preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px;
  gap: 8px;
}

.preview-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.preview-section-header {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.preview-section-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.preview-text {
  flex: 1;
  overflow: auto;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.preview-text pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.preview-placeholder {
  color: var(--text-tertiary);
  font-style: italic;
}

.preview-arrow {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 900px) {
  .main-content {
    flex-direction: column;
    overflow-y: auto;
  }

  .left-panel,
  .right-panel {
    width: 100%;
    min-height: 300px;
  }
}
</style>
