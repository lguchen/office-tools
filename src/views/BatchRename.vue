<script setup lang="ts">
// ==================== 批量重命名工具 ====================
// 功能：文件批量重命名，支持多种重命名模式和实时预览
// 技术栈：Vue3 + TypeScript + NaiveUI + Tauri v2

import { ref, computed, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'
import FileUploader from '@/components/FileUploader.vue'
import { useTaskStore } from '@/stores/task'
import { isTauri } from '@/utils/tauriUtils'

// ==================== 类型定义 ====================

/** 文件状态 */
type FileStatus = 'pending' | 'processing' | 'success' | 'failed'

/** 文件列表项 */
interface FileItem {
  id: string
  name: string
  path: string
  size: number
  type: string
  status: FileStatus
  checked: boolean
  newName?: string
  errorMsg?: string
  file?: File
}

/** 基础命名配置 */
interface BasicRenameConfig {
  enabled: boolean
  prefix: string
  suffix: string
  startNumber: number
  digitCount: number
  useNumber: boolean
}

/** 查找替换配置 */
interface ReplaceConfig {
  enabled: boolean
  searchText: string
  replaceText: string
  useRegex: boolean
  caseSensitive: boolean
}

/** 大小写转换配置 */
interface CaseConfig {
  enabled: boolean
  mode: 'none' | 'upper' | 'lower' | 'capitalize' | 'title'
}

/** 日期配置 */
interface DateConfig {
  enabled: boolean
  position: 'prefix' | 'suffix'
  format: string
}

/** 扩展名配置 */
interface ExtensionConfig {
  enabled: boolean
  newExtension: string
}

/** 完整重命名配置 */
interface RenameConfig {
  basic: BasicRenameConfig
  replace: ReplaceConfig
  case: CaseConfig
  date: DateConfig
  extension: ExtensionConfig
}

// ==================== 状态定义 ====================

const message = useMessage()
const taskStore = useTaskStore()

/** 文件列表 - 统一管理所有文件 */
const fileList = ref<FileItem[]>([])

/** 是否正在重命名 */
const isRenaming = ref(false)

/** 全选状态 */
const isAllChecked = computed({
  get: () => fileList.value.length > 0 && fileList.value.every(f => f.checked),
  set: (val: boolean) => {
    fileList.value.forEach(f => {
      if (f.status === 'pending') f.checked = val
    })
  }
})

/** 已勾选的文件数量 */
const checkedCount = computed(() => fileList.value.filter(f => f.checked).length)

// ==================== 重命名配置 ====================

const renameConfig = ref<RenameConfig>({
  basic: {
    enabled: true,
    prefix: '',
    suffix: '',
    startNumber: 1,
    digitCount: 3,
    useNumber: true
  },
  replace: {
    enabled: false,
    searchText: '',
    replaceText: '',
    useRegex: false,
    caseSensitive: true
  },
  case: {
    enabled: false,
    mode: 'none'
  },
  date: {
    enabled: false,
    position: 'prefix',
    format: 'YYYYMMDD'
  },
  extension: {
    enabled: false,
    newExtension: ''
  }
})

/** 当前激活的配置面板 */
const activePanel = ref('basic')

const panelOptions = [
  { key: 'basic', label: '基础命名', icon: '📝' },
  { key: 'replace', label: '查找替换', icon: '🔄' },
  { key: 'case', label: '大小写', icon: '🔤' },
  { key: 'date', label: '日期', icon: '📅' },
  { key: 'extension', label: '扩展名', icon: '📎' }
]

// ==================== 文件上传处理 ====================

/**
 * 处理文件选择
 * 将上传的File对象转换为统一的FileItem格式
 */
const handleFilesSelected = async (files: File[]) => {
  try {
    const newItems: FileItem[] = []
    
    for (const file of files) {
      const path = (file as any).path || file.name
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      
      newItems.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        name: file.name,
        path: path,
        size: file.size,
        type: ext,
        status: 'pending',
        checked: true,
        file: file
      })
    }
    
    fileList.value.push(...newItems)
    message.success(`成功添加 ${newItems.length} 个文件`)
  } catch (error: any) {
    console.error('添加文件失败:', error)
    message.error('添加文件失败：' + (error.message || '未知错误'))
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
    if (isRenaming.value) {
      message.warning('正在重命名中，无法清空')
      return
    }
    fileList.value = []
    message.info('已清空文件列表')
  } catch (error: any) {
    console.error('清空文件失败:', error)
    message.error('清空文件失败：' + (error.message || '未知错误'))
  }
}

// ==================== 重命名核心逻辑 ====================

/**
 * 获取文件名和扩展名
 */
const splitFileName = (fileName: string): { name: string; ext: string } => {
  const lastDotIndex = fileName.lastIndexOf('.')
  if (lastDotIndex > 0) {
    return {
      name: fileName.slice(0, lastDotIndex),
      ext: fileName.slice(lastDotIndex + 1)
    }
  }
  return { name: fileName, ext: '' }
}

/**
 * 格式化日期
 */
const formatDate = (date: Date, format: string): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return format
    .replace(/YYYY/g, String(year))
    .replace(/MM/g, month)
    .replace(/DD/g, day)
    .replace(/HH/g, hours)
    .replace(/mm/g, minutes)
    .replace(/ss/g, seconds)
}

/**
 * 首字母大写
 */
const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * 标题格式（每个单词首字母大写）
 */
const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  })
}

/**
 * 生成新文件名
 * 按照配置顺序依次应用各种重命名规则
 */
const generateNewFileName = (originalName: string, index: number): string => {
  try {
    let { name, ext } = splitFileName(originalName)
    const cfg = renameConfig.value

    // 1. 基础命名（前缀 + 序号 + 后缀）
    if (cfg.basic.enabled) {
      if (cfg.basic.useNumber) {
        const num = (cfg.basic.startNumber + index).toString().padStart(cfg.basic.digitCount, '0')
        name = `${cfg.basic.prefix}${num}${cfg.basic.suffix}`
      } else {
        name = `${cfg.basic.prefix}${name}${cfg.basic.suffix}`
      }
    }

    // 2. 查找替换
    if (cfg.replace.enabled && cfg.replace.searchText) {
      try {
        if (cfg.replace.useRegex) {
          const flags = cfg.replace.caseSensitive ? 'g' : 'gi'
          const regex = new RegExp(cfg.replace.searchText, flags)
          name = name.replace(regex, cfg.replace.replaceText)
        } else {
          if (cfg.replace.caseSensitive) {
            name = name.split(cfg.replace.searchText).join(cfg.replace.replaceText)
          } else {
            const regex = new RegExp(cfg.replace.searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
            name = name.replace(regex, cfg.replace.replaceText)
          }
        }
      } catch (regexError) {
        console.warn('正则表达式错误:', regexError)
      }
    }

    // 3. 大小写转换
    if (cfg.case.enabled) {
      switch (cfg.case.mode) {
        case 'upper':
          name = name.toUpperCase()
          break
        case 'lower':
          name = name.toLowerCase()
          break
        case 'capitalize':
          name = capitalizeFirstLetter(name)
          break
        case 'title':
          name = toTitleCase(name)
          break
      }
    }

    // 4. 日期前缀/后缀
    if (cfg.date.enabled) {
      const dateStr = formatDate(new Date(), cfg.date.format)
      if (cfg.date.position === 'prefix') {
        name = dateStr + name
      } else {
        name = name + dateStr
      }
    }

    // 5. 扩展名修改
    if (cfg.extension.enabled && cfg.extension.newExtension) {
      ext = cfg.extension.newExtension.replace(/^\./, '')
    }

    return ext ? `${name}.${ext}` : name
  } catch (error: any) {
    console.error('生成新文件名失败:', error)
    return originalName
  }
}

/**
 * 实时预览 - 监听配置变化更新预览
 */
watch(
  renameConfig,
  () => {
    updatePreview()
  },
  { deep: true }
)

watch(
  fileList,
  () => {
    updatePreview()
  },
  { deep: true }
)

/**
 * 更新所有文件的预览名称
 */
const updatePreview = () => {
  let index = 0
  for (const item of fileList.value) {
    if (item.checked && item.status === 'pending') {
      item.newName = generateNewFileName(item.name, index)
      index++
    } else {
      item.newName = item.name
    }
  }
}

// ==================== 执行重命名 ====================

/**
 * 开始批量重命名
 * 调用Rust命令执行文件重命名，加入任务队列
 */
const startRename = async () => {
  try {
    // 参数校验
    const checkedFiles = fileList.value.filter(f => f.checked && f.status === 'pending')
    if (checkedFiles.length === 0) {
      message.warning('请先选择要重命名的文件')
      return
    }

    if (!isTauri()) {
      message.warning('浏览器环境下无法修改本地文件，请在Tauri中运行')
      return
    }

    if (isRenaming.value) {
      message.warning('正在重命名中，请稍候...')
      return
    }

    isRenaming.value = true

    // 准备任务数据
    const renamePairs: Array<{ old_path: string; new_name: string }> = []
    let validIndex = 0
    
    for (const item of checkedFiles) {
      if (!item.path) {
        message.error(`文件 ${item.name} 没有有效的路径信息`)
        continue
      }
      
      const newName = generateNewFileName(item.name, validIndex)
      item.newName = newName
      
      // 计算新路径（同目录）
      const lastSlash = Math.max(item.path.lastIndexOf('/'), item.path.lastIndexOf('\\'))
      const newPath = lastSlash >= 0 
        ? item.path.slice(0, lastSlash + 1) + newName
        : newName
      
      renamePairs.push({
        old_path: item.path,
        new_name: newPath
      })
      
      item.status = 'processing'
      validIndex++
    }

    if (renamePairs.length === 0) {
      message.error('没有有效的重命名任务')
      isRenaming.value = false
      return
    }

    taskStore.addLog('info', `开始批量重命名，共 ${renamePairs.length} 个文件`)

    // 调用Rust命令执行重命名
    const results = await invoke<Array<{ old_path: string; new_path: string; success: boolean; error?: string }>>(
      'batch_rename',
      { files: renamePairs }
    )

    // 处理结果
    let successCount = 0
    let failCount = 0

    for (const result of results) {
      const item = fileList.value.find(f => f.path === result.old_path)
      if (item) {
        if (result.success) {
          item.status = 'success'
          item.name = result.new_path.split(/[\\/]/).pop() || item.newName || item.name
          item.path = result.new_path
          successCount++
        } else {
          item.status = 'failed'
          item.errorMsg = result.error || '重命名失败'
          failCount++
        }
      }
    }

    // 统计结果
    if (failCount === 0) {
      message.success(`成功重命名 ${successCount} 个文件`)
      taskStore.addLog('success', `批量重命名完成：成功 ${successCount} 个`)
    } else {
      message.warning(`重命名完成：成功 ${successCount} 个，失败 ${failCount} 个`)
      taskStore.addLog('warning', `批量重命名完成：成功 ${successCount} 个，失败 ${failCount} 个`)
    }

    isRenaming.value = false
  } catch (error: any) {
    console.error('批量重命名失败:', error)
    message.error('批量重命名失败：' + (error.message || '未知错误'))
    taskStore.addLog('error', '批量重命名失败：' + (error.message || '未知错误'))
    
    // 重置处理中文件的状态
    fileList.value.forEach(f => {
      if (f.status === 'processing') {
        f.status = 'pending'
      }
    })
    
    isRenaming.value = false
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
    processing: 'info',
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
    pending: '待处理',
    processing: '处理中',
    success: '成功',
    failed: '失败'
  }
  return map[status]
}

/**
 * 获取文件图标
 */
const getFileIcon = (ext: string): string => {
  const iconMap: Record<string, string> = {
    xlsx: '📊', xls: '📊', csv: '📊',
    docx: '📄', doc: '📄',
    pdf: '📑',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', webp: '🖼️',
    txt: '📝',
    zip: '📦', rar: '📦', '7z': '📦',
    mp3: '🎵', wav: '🎵',
    mp4: '🎬', avi: '🎬',
    js: '⚡', ts: '⚡', html: '🌐', css: '🎨'
  }
  return iconMap[ext.toLowerCase()] || '📁'
}

// ==================== 日期格式选项 ====================

const dateFormatOptions = [
  { label: 'YYYYMMDD', value: 'YYYYMMDD' },
  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
  { label: 'YYYY_MM_DD', value: 'YYYY_MM_DD' },
  { label: 'YYYYMMDD_HHmmss', value: 'YYYYMMDD_HHmmss' },
  { label: 'YYYY-MM-DD HH-mm-ss', value: 'YYYY-MM-DD HH-mm-ss' }
]
</script>

<template>
  <div class="batch-rename-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">📝 批量重命名</h2>
        <p class="page-desc">支持多种重命名模式，实时预览效果</p>
      </div>
      <div class="header-actions">
        <n-button @click="resetFailed" :disabled="isRenaming">
          重置失败
        </n-button>
        <n-button @click="clearFiles" :disabled="isRenaming || fileList.length === 0">
          清空列表
        </n-button>
        <n-button 
          type="primary" 
          @click="startRename" 
          :loading="isRenaming"
          :disabled="checkedCount === 0 || isRenaming"
        >
          {{ isRenaming ? '重命名中...' : `开始重命名 (${checkedCount})` }}
        </n-button>
      </div>
    </div>

    <!-- 三栏布局 -->
    <div class="main-content">
      <!-- 左侧：文件列表 -->
      <div class="left-panel">
        <div class="panel-card">
          <div class="panel-header">
            <span class="panel-title">📁 文件列表 ({{ fileList.length }})</span>
            <n-checkbox 
              v-model:checked="isAllChecked" 
              :disabled="fileList.length === 0 || isRenaming"
            >
              全选
            </n-checkbox>
          </div>
          
          <!-- 文件上传区域 -->
          <FileUploader 
            @files-selected="handleFilesSelected"
            hint-text="拖拽文件到此处，或点击选择文件"
            icon="📁"
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
                :class="{ 'file-row-failed': item.status === 'failed' }"
              >
                <n-checkbox 
                  v-model:checked="item.checked" 
                  :disabled="item.status !== 'pending' && item.status !== 'failed'"
                  class="file-checkbox"
                />
                <span class="file-icon">{{ getFileIcon(item.type) }}</span>
                <div class="file-info">
                  <div class="file-name" :title="item.name">{{ item.name }}</div>
                  <div class="file-meta">
                    <span>{{ formatFileSize(item.size) }}</span>
                    <n-tag :type="getStatusType(item.status)" size="tiny">
                      {{ getStatusText(item.status) }}
                    </n-tag>
                  </div>
                  <div v-if="item.errorMsg" class="file-error">{{ item.errorMsg }}</div>
                </div>
                <n-button 
                  text 
                  size="small" 
                  @click="removeFile(item.id)"
                  :disabled="isRenaming"
                  class="remove-btn"
                >
                  删除
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：重命名配置 -->
      <div class="center-panel">
        <div class="panel-card">
          <div class="panel-header">
            <span class="panel-title">⚙️ 重命名配置</span>
          </div>
          
          <!-- 配置选项卡 -->
          <div class="config-tabs">
            <div 
              v-for="tab in panelOptions" 
              :key="tab.key"
              class="config-tab"
              :class="{ active: activePanel === tab.key }"
              @click="activePanel = tab.key"
            >
              <span class="tab-icon">{{ tab.icon }}</span>
              <span class="tab-label">{{ tab.label }}</span>
              <n-switch 
                v-model:value="(renameConfig as any)[tab.key].enabled"
                size="small"
                @click.stop
              />
            </div>
          </div>

          <!-- 基础命名配置 -->
          <div v-show="activePanel === 'basic'" class="config-content">
            <div class="config-section">
              <div class="config-item">
                <label class="config-label">使用序号</label>
                <n-switch v-model:value="renameConfig.basic.useNumber" />
              </div>
              
              <div class="config-item">
                <label class="config-label">前缀</label>
                <n-input 
                  v-model:value="renameConfig.basic.prefix" 
                  placeholder="例如：文件_"
                  :disabled="!renameConfig.basic.enabled"
                />
              </div>
              
              <div v-if="renameConfig.basic.useNumber" class="config-item">
                <label class="config-label">起始序号</label>
                <n-input-number 
                  v-model:value="renameConfig.basic.startNumber" 
                  :min="0"
                  :disabled="!renameConfig.basic.enabled"
                  style="width: 100%"
                />
              </div>
              
              <div v-if="renameConfig.basic.useNumber" class="config-item">
                <label class="config-label">补零位数</label>
                <n-input-number 
                  v-model:value="renameConfig.basic.digitCount" 
                  :min="1" 
                  :max="10"
                  :disabled="!renameConfig.basic.enabled"
                  style="width: 100%"
                />
              </div>
              
              <div class="config-item">
                <label class="config-label">后缀</label>
                <n-input 
                  v-model:value="renameConfig.basic.suffix" 
                  placeholder="例如：_备份"
                  :disabled="!renameConfig.basic.enabled"
                />
              </div>
            </div>
            
            <div class="config-hint">
              <span class="hint-title">预览示例：</span>
              <span class="hint-value">
                {{ renameConfig.basic.prefix }}
                <span v-if="renameConfig.basic.useNumber">
                  {{ String(renameConfig.basic.startNumber).padStart(renameConfig.basic.digitCount, '0') }}
                </span>
                <span v-else>文件名</span>
                {{ renameConfig.basic.suffix }}.ext
              </span>
            </div>
          </div>

          <!-- 查找替换配置 -->
          <div v-show="activePanel === 'replace'" class="config-content">
            <div class="config-section">
              <div class="config-item">
                <label class="config-label">查找内容</label>
                <n-input 
                  v-model:value="renameConfig.replace.searchText" 
                  placeholder="输入要查找的内容"
                  :disabled="!renameConfig.replace.enabled"
                />
              </div>
              
              <div class="config-item">
                <label class="config-label">替换为</label>
                <n-input 
                  v-model:value="renameConfig.replace.replaceText" 
                  placeholder="输入替换内容"
                  :disabled="!renameConfig.replace.enabled"
                />
              </div>
              
              <div class="config-item">
                <label class="config-label">使用正则</label>
                <n-switch v-model:value="renameConfig.replace.useRegex" :disabled="!renameConfig.replace.enabled" />
              </div>
              
              <div class="config-item">
                <label class="config-label">区分大小写</label>
                <n-switch v-model:value="renameConfig.replace.caseSensitive" :disabled="!renameConfig.replace.enabled" />
              </div>
            </div>
            
            <div class="config-hint">
              <span class="hint-title">提示：</span>
              <span class="hint-text">
                {{ renameConfig.replace.useRegex ? '支持正则表达式语法' : '普通字符串替换，全部替换匹配项' }}
              </span>
            </div>
          </div>

          <!-- 大小写配置 -->
          <div v-show="activePanel === 'case'" class="config-content">
            <div class="config-section">
              <div class="config-item full-width">
                <label class="config-label">转换方式</label>
                <n-radio-group 
                  v-model:value="renameConfig.case.mode" 
                  :disabled="!renameConfig.case.enabled"
                >
                  <n-space vertical>
                    <n-radio value="none">不转换</n-radio>
                    <n-radio value="upper">全部大写</n-radio>
                    <n-radio value="lower">全部小写</n-radio>
                    <n-radio value="capitalize">首字母大写</n-radio>
                    <n-radio value="title">每个单词首字母大写</n-radio>
                  </n-space>
                </n-radio-group>
              </div>
            </div>
          </div>

          <!-- 日期配置 -->
          <div v-show="activePanel === 'date'" class="config-content">
            <div class="config-section">
              <div class="config-item">
                <label class="config-label">位置</label>
                <n-radio-group v-model:value="renameConfig.date.position" :disabled="!renameConfig.date.enabled">
                  <n-radio value="prefix">前缀</n-radio>
                  <n-radio value="suffix">后缀</n-radio>
                </n-radio-group>
              </div>
              
              <div class="config-item">
                <label class="config-label">日期格式</label>
                <n-select 
                  v-model:value="renameConfig.date.format" 
                  :options="dateFormatOptions"
                  :disabled="!renameConfig.date.enabled"
                />
              </div>
            </div>
            
            <div class="config-hint">
              <span class="hint-title">当前日期：</span>
              <span class="hint-value">{{ formatDate(new Date(), renameConfig.date.format) }}</span>
            </div>
          </div>

          <!-- 扩展名配置 -->
          <div v-show="activePanel === 'extension'" class="config-content">
            <div class="config-section">
              <div class="config-item">
                <label class="config-label">新扩展名</label>
                <n-input 
                  v-model:value="renameConfig.extension.newExtension" 
                  placeholder="例如：txt"
                  :disabled="!renameConfig.extension.enabled"
                />
              </div>
            </div>
            
            <div class="config-hint">
              <span class="hint-title">提示：</span>
              <span class="hint-text">修改文件扩展名，不包含点号（.）</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：实时预览 -->
      <div class="right-panel">
        <div class="panel-card">
          <div class="panel-header">
            <span class="panel-title">👁️ 实时预览</span>
            <span class="preview-count">{{ checkedCount }} 个文件</span>
          </div>
          
          <div class="preview-container">
            <n-empty 
              v-if="checkedCount === 0" 
              description="请选择文件以预览"
              :show-icon="false"
            />
            
            <div v-else class="preview-list">
              <div 
                v-for="item in fileList.filter(f => f.checked)" 
                :key="item.id" 
                class="preview-item"
              >
                <div class="preview-old">
                  <span class="preview-icon">{{ getFileIcon(item.type) }}</span>
                  <span class="preview-name" :title="item.name">{{ item.name }}</span>
                </div>
                <div class="preview-arrow">→</div>
                <div class="preview-new">
                  <span class="preview-icon">{{ getFileIcon(item.type) }}</span>
                  <span class="preview-name new-name" :title="item.newName">
                    {{ item.newName || item.name }}
                  </span>
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
.batch-rename-container {
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

/* ==================== 三栏主内容 ==================== */
.main-content {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

.left-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 300px;
}

.right-panel {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
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

.preview-count {
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
}

.file-row:hover {
  background: var(--bg-secondary);
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

/* ==================== 配置选项卡 ==================== */
.config-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.config-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 13px;
  color: var(--text-secondary);
  border: 1px solid transparent;
}

.config-tab:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.config-tab.active {
  background: rgba(22, 119, 255, 0.08);
  color: var(--primary-color);
  border-color: rgba(22, 119, 255, 0.2);
}

.tab-icon {
  font-size: 14px;
}

.tab-label {
  flex: 1;
}

/* ==================== 配置内容 ==================== */
.config-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-item.full-width {
  flex-direction: column;
  align-items: flex-start;
}

.config-item.full-width .config-label {
  width: auto;
  text-align: left;
  margin-bottom: 8px;
}

.config-label {
  width: 100px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: right;
}

.config-hint {
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
}

.hint-title {
  color: var(--text-tertiary);
  margin-right: 6px;
}

.hint-value {
  color: var(--primary-color);
  font-weight: 500;
  font-family: 'Consolas', 'Monaco', monospace;
}

.hint-text {
  color: var(--text-secondary);
}

/* ==================== 预览区域 ==================== */
.preview-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.preview-old,
.preview-new {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.preview-name {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
}

.preview-name.new-name {
  color: var(--primary-color);
  font-weight: 500;
}

.preview-arrow {
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
  padding-left: 24px;
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 1200px) {
  .main-content {
    flex-direction: column;
    overflow-y: auto;
  }
  
  .left-panel,
  .center-panel,
  .right-panel {
    width: 100%;
    min-height: 300px;
  }
}
</style>
