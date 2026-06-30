<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { useTaskStore, type TaskItem, type TaskStatus, type LogItem } from '@/stores/task'
import {
  NCard,
  NButton,
  NProgress,
  NTag,
  NTabs,
  NTabPane,
  NSpace,
  NEmpty,
  NTooltip,
  NScrollbar,
  NIcon,
  NStatistic,
  NDivider,
  NDropdown
} from 'naive-ui'

// ========== 基础配置 ==========
const message = useMessage()
const dialog = useDialog()
const taskStore = useTaskStore()

// 当前选中的筛选状态
const activeTab = ref<TaskStatus | 'all'>('all')

// 展开的任务ID集合
const expandedTaskIds = ref<Set<string>>(new Set())

// 模拟运行定时器（用于演示，实际项目中移除）
let demoTimer: number | null = null

// ========== 状态配置 ==========
// 状态标签配置
const statusConfig: Record<TaskStatus, { label: string; type: 'default' | 'info' | 'success' | 'error' | 'warning' }> = {
  pending: { label: '等待中', type: 'default' },
  running: { label: '进行中', type: 'info' },
  success: { label: '已完成', type: 'success' },
  failed: { label: '失败', type: 'error' },
  paused: { label: '已暂停', type: 'warning' },
  cancelled: { label: '已取消', type: 'default' }
}

// 状态图标
const statusIcons: Record<TaskStatus, string> = {
  pending: '⏳',
  running: '⚡',
  success: '✅',
  failed: '❌',
  paused: '⏸',
  cancelled: '🚫'
}

// 任务类型图标
const typeIcons: Record<string, string> = {
  excel: '📊',
  word: '📄',
  pdf: '📑',
  image: '🖼',
  ocr: '🔍',
  print: '🖨',
  rename: '📝',
  other: '📁'
}

// ========== 计算属性 ==========
// 根据筛选状态过滤任务
const filteredTasks = computed(() => {
  if (activeTab.value === 'all') {
    return taskStore.tasks
  }
  return taskStore.tasks.filter((t) => t.status === activeTab.value)
})

// 各状态任务数量
const statusCounts = computed(() => ({
  all: taskStore.totalCount,
  pending: taskStore.pendingCount,
  running: taskStore.runningCount,
  success: taskStore.successCount,
  failed: taskStore.failedCount,
  paused: taskStore.pausedCount,
  cancelled: taskStore.cancelledCount
}))

// ========== 工具方法 ==========
// 获取文件名称（从路径中提取）
const getFileName = (path: string): string => {
  if (!path) return '-'
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

// 获取任务类型图标
const getTypeIcon = (type: string): string => {
  return typeIcons[type] || typeIcons.other
}

// 获取日志级别样式
const getLogLevelClass = (level: string): string => {
  const classMap: Record<string, string> = {
    info: 'log-info',
    success: 'log-success',
    error: 'log-error',
    warning: 'log-warning'
  }
  return classMap[level] || 'log-info'
}

// 格式化日志时间
const formatLogTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// ========== 任务展开/收起 ==========
const toggleTaskExpand = (taskId: string) => {
  if (expandedTaskIds.value.has(taskId)) {
    expandedTaskIds.value.delete(taskId)
  } else {
    expandedTaskIds.value.add(taskId)
  }
}

const isTaskExpanded = (taskId: string): boolean => {
  return expandedTaskIds.value.has(taskId)
}

// ========== 单个任务操作 ==========
// 暂停任务
const handlePauseTask = (task: TaskItem) => {
  const result = taskStore.pauseTask(task.id)
  if (result) {
    message.info(`已暂停任务：${task.name}`)
  } else {
    message.warning('无法暂停该任务')
  }
}

// 继续任务
const handleResumeTask = (task: TaskItem) => {
  const result = taskStore.resumeTask(task.id)
  if (result) {
    message.success(`已继续任务：${task.name}`)
  } else {
    message.warning('无法继续该任务')
  }
}

// 取消任务
const handleCancelTask = (task: TaskItem) => {
  dialog.warning({
    title: '确认取消',
    content: `确定要取消任务「${task.name}」吗？`,
    positiveText: '取消任务',
    negativeText: '返回',
    onPositiveClick: () => {
      const result = taskStore.cancelTask(task.id)
      if (result) {
        message.info(`已取消任务：${task.name}`)
      }
    }
  })
}

// 重试任务
const handleRetryTask = (task: TaskItem) => {
  const result = taskStore.retryTask(task.id)
  if (result) {
    message.success(`已重试任务：${task.name}`)
  } else {
    message.warning('无法重试该任务')
  }
}

// 删除任务
const handleRemoveTask = (task: TaskItem) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除任务「${task.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      const result = taskStore.removeTask(task.id)
      if (result) {
        message.success('任务已删除')
        expandedTaskIds.value.delete(task.id)
      } else {
        message.error('删除失败，运行中的任务无法删除')
      }
    }
  })
}

// ========== 批量操作 ==========
// 全部开始
const handleStartAll = () => {
  if (taskStore.pausedCount === 0 && taskStore.pendingCount === 0) {
    message.warning('没有可开始的任务')
    return
  }
  taskStore.startAll()
  message.success('已开始所有任务')
}

// 全部暂停
const handlePauseAll = () => {
  if (taskStore.pendingCount === 0 && taskStore.runningCount === 0) {
    message.warning('没有可暂停的任务')
    return
  }
  taskStore.pauseAll()
  message.info('已暂停所有任务')
}

// 全部取消
const handleCancelAll = () => {
  if (taskStore.totalCount === 0) {
    message.warning('没有任务')
    return
  }
  dialog.warning({
    title: '确认取消全部',
    content: '确定要取消所有待处理和运行中的任务吗？',
    positiveText: '全部取消',
    negativeText: '返回',
    onPositiveClick: () => {
      taskStore.cancelAll()
      message.info('已取消所有任务')
    }
  })
}

// 重试所有失败
const handleRetryFailed = () => {
  if (taskStore.failedCount === 0) {
    message.warning('没有失败的任务')
    return
  }
  taskStore.retryFailed()
  message.success(`已重试 ${taskStore.failedCount} 个失败任务`)
}

// 清空已完成
const handleClearCompleted = () => {
  if (taskStore.successCount === 0 && taskStore.failedCount === 0 && taskStore.cancelledCount === 0) {
    message.warning('没有已完成的任务')
    return
  }
  dialog.warning({
    title: '确认清空',
    content: '确定要清空所有已完成、失败和已取消的任务吗？',
    positiveText: '清空',
    negativeText: '取消',
    onPositiveClick: () => {
      taskStore.clearCompleted()
      message.success('已清空已完成任务')
      expandedTaskIds.value.clear()
    }
  })
}

// 清空所有
const handleClearAll = () => {
  if (taskStore.totalCount === 0) {
    message.warning('任务队列为空')
    return
  }
  dialog.warning({
    title: '确认清空',
    content: '确定要清空所有任务吗？此操作不可恢复。',
    positiveText: '全部清空',
    negativeText: '取消',
    onPositiveClick: () => {
      taskStore.clearTasks()
      message.success('已清空所有任务')
      expandedTaskIds.value.clear()
    }
  })
}

// ========== 演示数据（实际项目中移除） ==========
const addDemoTasks = () => {
  const demoTasks = [
    { name: '财务报表合并.xlsx', type: 'excel', inputPath: 'C:\\Documents\\财务报表合并.xlsx' },
    { name: '合同文档转换.pdf', type: 'pdf', inputPath: 'C:\\Documents\\合同文档转换.pdf' },
    { name: '发票图片识别.jpg', type: 'ocr', inputPath: 'C:\\Pictures\\发票图片识别.jpg' },
    { name: '产品说明书.docx', type: 'word', inputPath: 'C:\\Documents\\产品说明书.docx' },
    { name: '员工照片批量重命名.png', type: 'rename', inputPath: 'C:\\Pictures\\员工照片批量重命名.png' },
    { name: '季度报告打印.pdf', type: 'print', inputPath: 'C:\\Documents\\季度报告打印.pdf' }
  ]
  taskStore.addTasks(demoTasks)
  message.success(`已添加 ${demoTasks.length} 个演示任务`)
}

// 模拟运行演示（实际项目中移除）
const startDemo = async () => {
  if (demoTimer) {
    message.warning('演示已在运行中')
    return
  }
  if (taskStore.totalCount === 0) {
    addDemoTasks()
  }

  // 模拟处理函数
  const mockProcessor = async (
    task: TaskItem,
    onProgress: (p: number) => void,
    onLog: (level: any, message: string) => void
  ) => {
    onLog('info', `正在处理：${task.name}`)
    const steps = 10
    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      onProgress((i / steps) * 100)
      onLog('info', `进度 ${i * 10}%`)
    }
    // 模拟部分任务失败
    if (Math.random() > 0.7) {
      throw new Error('模拟处理失败')
    }
  }

  try {
    await taskStore.startBatch(mockProcessor as any)
    message.success('演示已开始')
  } catch (e) {
    console.error(e)
  }
}

// ========== 生命周期 ==========
onMounted(() => {
  // 页面加载时可添加一些演示数据
  if (taskStore.totalCount === 0) {
    // addDemoTasks()
  }
})

onUnmounted(() => {
  if (demoTimer) {
    clearInterval(demoTimer)
    demoTimer = null
  }
})
</script>

<template>
  <div class="task-queue-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">📋 任务队列</h2>
        <p class="page-desc">查看和管理所有任务的处理状态</p>
      </div>
      <div class="header-actions">
        <n-space>
          <n-button size="small" @click="addDemoTasks">
            添加演示任务
          </n-button>
          <n-button size="small" type="primary" @click="startDemo">
            运行演示
          </n-button>
        </n-space>
      </div>
    </div>

    <!-- 统计信息卡片 -->
    <div class="stats-section">
      <n-card class="stat-card" :bordered="false" size="small">
        <n-statistic label="任务总数" :value="statusCounts.all">
          <template #prefix>
            <span class="stat-icon">📊</span>
          </template>
        </n-statistic>
      </n-card>
      <n-card class="stat-card stat-success" :bordered="false" size="small">
        <n-statistic label="已完成" :value="statusCounts.success">
          <template #prefix>
            <span class="stat-icon">✅</span>
          </template>
        </n-statistic>
      </n-card>
      <n-card class="stat-card stat-running" :bordered="false" size="small">
        <n-statistic label="进行中" :value="statusCounts.running">
          <template #prefix>
            <span class="stat-icon">⚡</span>
          </template>
        </n-statistic>
      </n-card>
      <n-card class="stat-card stat-failed" :bordered="false" size="small">
        <n-statistic label="失败" :value="statusCounts.failed">
          <template #prefix>
            <span class="stat-icon">❌</span>
          </template>
        </n-statistic>
      </n-card>
      <n-card class="stat-card stat-pending" :bordered="false" size="small">
        <n-statistic label="等待中" :value="statusCounts.pending">
          <template #prefix>
            <span class="stat-icon">⏳</span>
          </template>
        </n-statistic>
      </n-card>
    </div>

    <!-- 主内容区 -->
    <n-card class="main-card" :bordered="false" size="small">
      <!-- 操作栏 -->
      <div class="action-bar">
        <div class="action-left">
          <n-space :size="8">
            <n-tooltip content="开始所有任务">
              <n-button size="small" type="primary" @click="handleStartAll">
                ▶ 全部开始
              </n-button>
            </n-tooltip>
            <n-tooltip content="暂停所有任务">
              <n-button size="small" @click="handlePauseAll">
                ⏸ 全部暂停
              </n-button>
            </n-tooltip>
            <n-tooltip content="取消所有任务">
              <n-button size="small" @click="handleCancelAll">
                🚫 全部取消
              </n-button>
            </n-tooltip>
            <n-divider vertical />
            <n-tooltip content="重试所有失败任务">
              <n-button size="small" @click="handleRetryFailed">
                🔄 重试失败
              </n-button>
            </n-tooltip>
          </n-space>
        </div>
        <div class="action-right">
          <n-space :size="8">
            <n-tooltip content="清空已完成/失败/取消的任务">
              <n-button size="small" text @click="handleClearCompleted">
                清空已完成
              </n-button>
            </n-tooltip>
            <n-tooltip content="清空所有任务">
              <n-button size="small" text type="error" @click="handleClearAll">
                清空全部
              </n-button>
            </n-tooltip>
          </n-space>
        </div>
      </div>

      <!-- 状态筛选标签 -->
      <div class="tabs-wrapper">
        <n-tabs v-model:value="activeTab" type="line" size="small" class="status-tabs">
          <n-tab-pane name="all" tab="全部" />
          <n-tab-pane name="pending" :tab="`等待中 (${statusCounts.pending})`" />
          <n-tab-pane name="running" :tab="`进行中 (${statusCounts.running})`" />
          <n-tab-pane name="success" :tab="`已完成 (${statusCounts.success})`" />
          <n-tab-pane name="failed" :tab="`失败 (${statusCounts.failed})`" />
          <n-tab-pane name="paused" :tab="`已暂停 (${statusCounts.paused})`" />
          <n-tab-pane name="cancelled" :tab="`已取消 (${statusCounts.cancelled})`" />
        </n-tabs>
      </div>

      <!-- 任务列表 -->
      <div class="task-list-container">
        <n-empty
          v-if="filteredTasks.length === 0"
          :description="`暂无${activeTab === 'all' ? '' : statusConfig[activeTab as TaskStatus]?.label || ''}任务`"
          size="large"
        />

        <n-scrollbar v-else class="task-list-scroll">
          <div class="task-list">
            <div
              v-for="task in filteredTasks"
              :key="task.id"
              class="task-item"
              :class="{ expanded: isTaskExpanded(task.id) }"
            >
              <!-- 任务主信息行 -->
              <div class="task-header" @click="toggleTaskExpand(task.id)">
                <!-- 展开箭头 -->
                <div class="expand-icon">
                  {{ isTaskExpanded(task.id) ? '▼' : '▶' }}
                </div>

                <!-- 任务图标和名称 -->
                <div class="task-info">
                  <span class="task-type-icon">{{ getTypeIcon(task.type) }}</span>
                  <div class="task-name-wrap">
                    <div class="task-name" :title="task.name">
                      {{ task.name }}
                    </div>
                    <div class="task-file" :title="task.inputPath">
                      📁 {{ getFileName(task.inputPath) }}
                    </div>
                  </div>
                </div>

                <!-- 进度条 -->
                <div class="task-progress">
                  <n-progress
                    :percentage="task.progress"
                    :status="task.status === 'failed' ? 'error' : task.status === 'success' ? 'success' : undefined"
                    :show-indicator="false"
                    size="small"
                  />
                </div>

                <!-- 状态标签 -->
                <div class="task-status">
                  <n-tag :type="statusConfig[task.status].type" size="small" round>
                    {{ statusIcons[task.status] }} {{ statusConfig[task.status].label }}
                  </n-tag>
                </div>

                <!-- 时间信息 -->
                <div class="task-time">
                  <div class="time-label">开始时间</div>
                  <div class="time-value">{{ taskStore.formatTime(task.startTime) }}</div>
                </div>

                <div class="task-duration">
                  <div class="time-label">耗时</div>
                  <div class="time-value">{{ taskStore.getTaskDuration(task) }}</div>
                </div>

                <!-- 操作按钮 -->
                <div class="task-actions" @click.stop>
                  <n-space :size="4">
                    <!-- 暂停/继续按钮 -->
                    <n-tooltip v-if="task.status === 'pending' || task.status === 'running'" content="暂停">
                      <n-button text size="tiny" @click="handlePauseTask(task)">
                        ⏸
                      </n-button>
                    </n-tooltip>
                    <n-tooltip v-if="task.status === 'paused'" content="继续">
                      <n-button text size="tiny" type="primary" @click="handleResumeTask(task)">
                        ▶
                      </n-button>
                    </n-tooltip>

                    <!-- 重试按钮 -->
                    <n-tooltip v-if="task.status === 'failed' || task.status === 'cancelled'" content="重试">
                      <n-button text size="tiny" type="primary" @click="handleRetryTask(task)">
                        🔄
                      </n-button>
                    </n-tooltip>

                    <!-- 取消按钮 -->
                    <n-tooltip
                      v-if="task.status === 'pending' || task.status === 'running' || task.status === 'paused'"
                      content="取消"
                    >
                      <n-button text size="tiny" @click="handleCancelTask(task)">
                        🚫
                      </n-button>
                    </n-tooltip>

                    <!-- 删除按钮 -->
                    <n-tooltip content="删除">
                      <n-button
                        text
                        size="tiny"
                        type="error"
                        :disabled="task.status === 'running'"
                        @click="handleRemoveTask(task)"
                      >
                        🗑
                      </n-button>
                    </n-tooltip>
                  </n-space>
                </div>
              </div>

              <!-- 展开的详情区域 -->
              <div v-show="isTaskExpanded(task.id)" class="task-detail">
                <div class="detail-grid">
                  <!-- 基本信息 -->
                  <div class="detail-section">
                    <div class="detail-title">📋 基本信息</div>
                    <div class="detail-item">
                      <span class="detail-label">任务ID：</span>
                      <span class="detail-value">{{ task.id }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">任务类型：</span>
                      <span class="detail-value">{{ task.type }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">输入路径：</span>
                      <span class="detail-value file-path" :title="task.inputPath">{{ task.inputPath }}</span>
                    </div>
                    <div v-if="task.outputPath" class="detail-item">
                      <span class="detail-label">输出路径：</span>
                      <span class="detail-value file-path" :title="task.outputPath">{{ task.outputPath }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">开始时间：</span>
                      <span class="detail-value">{{ taskStore.formatTime(task.startTime) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">结束时间：</span>
                      <span class="detail-value">{{ taskStore.formatTime(task.endTime) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">总耗时：</span>
                      <span class="detail-value">{{ taskStore.getTaskDuration(task) }}</span>
                    </div>
                    <div v-if="task.error" class="detail-item error-item">
                      <span class="detail-label">错误信息：</span>
                      <span class="detail-value">{{ task.error }}</span>
                    </div>
                  </div>

                  <!-- 任务日志 -->
                  <div class="detail-section log-section">
                    <div class="detail-title">📝 任务日志</div>
                    <div class="log-container">
                      <n-scrollbar class="log-scrollbar">
                        <div class="log-list">
                          <div v-if="task.logs.length === 0" class="log-empty">
                            暂无日志
                          </div>
                          <div
                            v-for="log in task.logs"
                            :key="log.id"
                            class="log-item"
                            :class="getLogLevelClass(log.level)"
                          >
                            <span class="log-time">[{{ formatLogTime(log.time) }}]</span>
                            <span class="log-level">[{{ log.level.toUpperCase() }}]</span>
                            <span class="log-message">{{ log.message }}</span>
                          </div>
                        </div>
                      </n-scrollbar>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </div>
    </n-card>
  </div>
</template>

<style scoped>
/* ========== 页面整体布局 ========== */
.task-queue-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  box-sizing: border-box;
  gap: 16px;
  overflow: hidden;
}

/* ========== 页面标题 ========== */
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
  flex-shrink: 0;
}

/* ========== 统计卡片区域 ========== */
.stats-section {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  flex-shrink: 0;
}

.stat-card {
  background: var(--bg-color);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
}

.stat-icon {
  font-size: 20px;
}

.stat-success :deep(.n-statistic-value) {
  color: #18a058;
}

.stat-running :deep(.n-statistic-value) {
  color: #1677ff;
}

.stat-failed :deep(.n-statistic-value) {
  color: #d03050;
}

.stat-pending :deep(.n-statistic-value) {
  color: #f0a020;
}

/* ========== 主卡片 ========== */
.main-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--bg-color);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  padding: 16px;
}

/* ========== 操作栏 ========== */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.action-left,
.action-right {
  display: flex;
  align-items: center;
}

/* ========== 状态筛选标签 ========== */
.tabs-wrapper {
  flex-shrink: 0;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.status-tabs {
  margin-bottom: -1px;
}

/* ========== 任务列表容器 ========== */
.task-list-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.task-list-scroll {
  height: 100%;
  max-height: 100%;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 8px;
}

/* ========== 任务项 ========== */
.task-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  background: var(--bg-secondary);
}

.task-item:hover {
  border-color: rgba(22, 119, 255, 0.3);
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.08);
}

.task-item.expanded {
  border-color: rgba(22, 119, 255, 0.4);
}

/* 任务头部 */
.task-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.task-header:hover {
  background: rgba(22, 119, 255, 0.04);
}

/* 展开图标 */
.expand-icon {
  width: 16px;
  text-align: center;
  font-size: 10px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

/* 任务信息 */
.task-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 0 0 240px;
}

.task-type-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.task-name-wrap {
  min-width: 0;
  flex: 1;
}

.task-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-file {
  font-size: 11px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

/* 进度条 */
.task-progress {
  flex: 1;
  min-width: 120px;
}

/* 状态标签 */
.task-status {
  flex-shrink: 0;
  width: 90px;
  text-align: center;
}

/* 时间信息 */
.task-time,
.task-duration {
  flex-shrink: 0;
  width: 100px;
  text-align: center;
}

.time-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 2px;
}

.time-value {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 操作按钮 */
.task-actions {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.task-item:hover .task-actions {
  opacity: 1;
}

/* ========== 任务详情区域 ========== */
.task-detail {
  padding: 0 16px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-color);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 16px;
  padding-top: 16px;
}

.detail-section {
  background: var(--bg-secondary);
  border-radius: 6px;
  padding: 12px;
}

.detail-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.detail-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  font-size: 12px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-label {
  color: var(--text-tertiary);
  flex-shrink: 0;
  width: 80px;
}

.detail-value {
  color: var(--text-secondary);
  flex: 1;
  word-break: break-all;
}

.file-path {
  font-family: monospace;
  font-size: 11px;
}

.error-item .detail-value {
  color: #d03050;
}

/* ========== 日志区域 ========== */
.log-section {
  display: flex;
  flex-direction: column;
}

.log-container {
  flex: 1;
  min-height: 180px;
  max-height: 240px;
}

.log-scrollbar {
  height: 100%;
}

.log-list {
  padding: 4px;
}

.log-empty {
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
  padding: 40px 0;
}

.log-item {
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  line-height: 1.6;
  padding: 2px 4px;
  border-radius: 3px;
  margin-bottom: 2px;
  display: flex;
  gap: 8px;
}

.log-time {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.log-level {
  flex-shrink: 0;
  font-weight: 600;
}

.log-message {
  flex: 1;
  word-break: break-all;
}

.log-info .log-level {
  color: #1677ff;
}

.log-success .log-level {
  color: #18a058;
}

.log-error {
  background: rgba(208, 48, 80, 0.08);
}

.log-error .log-level {
  color: #d03050;
}

.log-warning .log-level {
  color: #f0a020;
}

/* ========== 响应式适配 ========== */
@media (max-width: 1200px) {
  .stats-section {
    grid-template-columns: repeat(3, 1fr);
  }

  .task-time,
  .task-duration {
    display: none;
  }
}

@media (max-width: 900px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }

  .task-info {
    flex: 0 0 180px;
  }

  .task-progress {
    min-width: 80px;
  }

  .task-status {
    width: 70px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .stats-section {
    grid-template-columns: 1fr;
  }

  .action-bar {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }

  .task-header {
    flex-wrap: wrap;
  }

  .task-actions {
    opacity: 1;
  }
}
</style>
