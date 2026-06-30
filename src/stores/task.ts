import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 任务状态类型
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'paused' | 'cancelled'

// 日志级别
export type LogLevel = 'info' | 'success' | 'error' | 'warning'

// 任务项接口
export interface TaskItem {
  id: string
  name: string
  type: string
  inputPath: string
  outputPath?: string
  status: TaskStatus
  progress: number
  error?: string
  startTime?: number
  endTime?: number
  logs: LogItem[]
}

// 日志项接口
export interface LogItem {
  id: string
  time: number
  level: LogLevel
  message: string
}

export const useTaskStore = defineStore('task', () => {
  // ========== 状态 ==========
  const tasks = ref<TaskItem[]>([])
  const logs = ref<LogItem[]>([])
  const isPaused = ref(false)
  const isRunning = ref(false)
  let runningTaskIndex = -1
  let processFn: ((task: TaskItem, onProgress: (p: number) => void, onLog: (level: LogLevel, message: string) => void) => Promise<void>) | null = null

  // ========== 计算属性 ==========
  // 任务总数
  const totalCount = computed(() => tasks.value.length)

  // 成功数
  const successCount = computed(() => tasks.value.filter((t) => t.status === 'success').length)

  // 失败数
  const failedCount = computed(() => tasks.value.filter((t) => t.status === 'failed').length)

  // 进行中数
  const runningCount = computed(() => tasks.value.filter((t) => t.status === 'running').length)

  // 等待中数
  const pendingCount = computed(() => tasks.value.filter((t) => t.status === 'pending').length)

  // 已取消数
  const cancelledCount = computed(() => tasks.value.filter((t) => t.status === 'cancelled').length)

  // 已暂停数
  const pausedCount = computed(() => tasks.value.filter((t) => t.status === 'paused').length)

  // 已完成数（成功+失败+已取消）
  const completedCount = computed(() => successCount.value + failedCount.value + cancelledCount.value)

  // 总体进度
  const overallProgress = computed(() => {
    if (tasks.value.length === 0) return 0
    const total = tasks.value.reduce((sum, t) => sum + t.progress, 0)
    return Math.round(total / tasks.value.length)
  })

  // ========== 工具方法 ==========
  // 生成唯一ID
  const generateId = (): string => {
    return Date.now().toString() + Math.random().toString(36).slice(2, 8)
  }

  // 添加日志到指定任务
  const addTaskLog = (taskId: string, level: LogLevel, message: string) => {
    const task = tasks.value.find((t) => t.id === taskId)
    if (task) {
      task.logs.push({
        id: generateId(),
        time: Date.now(),
        level,
        message
      })
      // 限制单任务日志数量
      if (task.logs.length > 200) {
        task.logs = task.logs.slice(-200)
      }
    }
  }

  // 获取任务耗时
  const getTaskDuration = (task: TaskItem): string => {
    if (!task.startTime) return '0秒'
    const end = task.endTime || Date.now()
    const diff = Math.floor((end - task.startTime) / 1000)
    if (diff < 60) return `${diff}秒`
    if (diff < 3600) return `${Math.floor(diff / 60)}分${diff % 60}秒`
    const hours = Math.floor(diff / 3600)
    const mins = Math.floor((diff % 3600) / 60)
    return `${hours}时${mins}分`
  }

  // 格式化时间
  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // ========== 全局日志方法（向后兼容） ==========
  // 添加全局日志
  const addLog = (level: LogLevel, message: string) => {
    logs.value.push({
      id: generateId(),
      time: Date.now(),
      level,
      message
    })
    if (logs.value.length > 500) {
      logs.value = logs.value.slice(-500)
    }
  }

  // 导出日志
  const exportLogs = (): string => {
    return logs.value
      .map((log) => {
        const time = new Date(log.time).toLocaleString()
        return `[${time}] [${log.level.toUpperCase()}] ${log.message}`
      })
      .join('\n')
  }

  // ========== 任务管理方法 ==========
  // 添加任务
  const addTasks = (items: Omit<TaskItem, 'id' | 'status' | 'progress' | 'logs'>[]) => {
    const newTasks: TaskItem[] = items.map((item) => ({
      ...item,
      id: generateId(),
      status: 'pending' as TaskStatus,
      progress: 0,
      logs: []
    }))
    tasks.value.push(...newTasks)
    newTasks.forEach((task) => {
      addTaskLog(task.id, 'info', '任务已添加，等待处理')
    })
  }

  // 清空所有任务
  const clearTasks = () => {
    tasks.value = []
    logs.value = []
    runningTaskIndex = -1
    isPaused.value = false
    isRunning.value = false
    processFn = null
  }

  // 清空已完成任务（成功、失败、已取消）
  const clearCompleted = () => {
    tasks.value = tasks.value.filter(
      (t) => t.status === 'pending' || t.status === 'running' || t.status === 'paused'
    )
  }

  // 清空失败任务
  const clearFailed = () => {
    tasks.value = tasks.value.filter((t) => t.status !== 'failed')
  }

  // 删除单个任务
  const removeTask = (taskId: string) => {
    const index = tasks.value.findIndex((t) => t.id === taskId)
    if (index > -1) {
      // 如果是正在运行的任务，不允许删除
      if (tasks.value[index].status === 'running') {
        return false
      }
      tasks.value.splice(index, 1)
      return true
    }
    return false
  }

  // ========== 批量控制方法 ==========
  // 开始批量处理
  const startBatch = async (
    processor: (task: TaskItem, onProgress: (p: number) => void, onLog: (level: LogLevel, message: string) => void) => Promise<void>
  ) => {
    if (isRunning.value) {
      return
    }
    processFn = processor
    isPaused.value = false
    const pendingIdx = tasks.value.findIndex((t) => t.status === 'pending')
    if (pendingIdx < 0) {
      return
    }
    runNext()
  }

  // 运行下一个任务
  const runNext = async () => {
    if (!processFn) return
    if (isPaused.value) return
    if (isRunning.value) return

    const idx = tasks.value.findIndex((t) => t.status === 'pending')
    if (idx < 0) {
      isRunning.value = false
      return
    }

    isRunning.value = true
    runningTaskIndex = idx
    const task = tasks.value[idx]
    task.status = 'running'
    task.startTime = Date.now()
    task.progress = 0
    addTaskLog(task.id, 'info', '开始处理任务')

    // 进度回调
    const onProgress = (p: number) => {
      task.progress = Math.min(100, Math.max(0, Math.round(p)))
    }

    // 日志回调
    const onLog = (level: LogLevel, message: string) => {
      addTaskLog(task.id, level, message)
    }

    try {
      await processFn(task, onProgress, onLog)
      task.status = 'success'
      task.progress = 100
      task.endTime = Date.now()
      addTaskLog(task.id, 'success', `任务处理完成，耗时 ${getTaskDuration(task)}`)
    } catch (e: any) {
      if (task.status === 'cancelled') {
        addTaskLog(task.id, 'warning', '任务已取消')
      } else {
        task.status = 'failed'
        task.error = e?.message || '处理失败'
        task.endTime = Date.now()
        addTaskLog(task.id, 'error', `任务失败：${task.error}`)
      }
    }

    // 检查暂停状态
    if (isPaused.value) {
      isRunning.value = false
      return
    }

    setTimeout(runNext, 50)
  }

  // 暂停批量
  const pauseBatch = () => {
    if (!isRunning.value && pendingCount.value === 0) {
      return
    }
    isPaused.value = true
  }

  // 继续批量
  const resumeBatch = () => {
    if (!processFn) return
    if (!isPaused.value) return
    if (pendingCount.value === 0) return

    isPaused.value = false
    if (!isRunning.value) {
      runNext()
    }
  }

  // 重试所有失败任务
  const retryFailed = () => {
    const failedTasks = tasks.value.filter((t) => t.status === 'failed')
    if (failedTasks.length === 0) return

    failedTasks.forEach((t) => {
      t.status = 'pending'
      t.progress = 0
      t.error = undefined
      t.startTime = undefined
      t.endTime = undefined
      t.logs = []
      addTaskLog(t.id, 'info', '任务已重置，准备重试')
    })

    // 如果有处理函数且未运行且未暂停，自动继续
    if (processFn && !isRunning.value && !isPaused.value) {
      runNext()
    }
  }

  // ========== 单个任务控制方法 ==========
  // 取消单个任务
  const cancelTask = (taskId: string) => {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) return false

    if (task.status === 'pending') {
      task.status = 'cancelled'
      task.endTime = Date.now()
      addTaskLog(taskId, 'warning', '任务已取消')
      return true
    }

    if (task.status === 'running') {
      task.status = 'cancelled'
      task.endTime = Date.now()
      addTaskLog(taskId, 'warning', '任务取消中，将在当前操作后生效')
      return true
    }

    return false
  }

  // 暂停单个任务
  const pauseTask = (taskId: string) => {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) return false

    if (task.status === 'pending') {
      task.status = 'paused'
      addTaskLog(taskId, 'info', '任务已暂停')
      return true
    }

    if (task.status === 'running') {
      // 运行中的任务标记为暂停，完成当前步骤后生效
      task.status = 'paused'
      addTaskLog(taskId, 'info', '任务将在当前操作后暂停')
      return true
    }

    return false
  }

  // 继续单个任务
  const resumeTask = (taskId: string) => {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) return false

    if (task.status === 'paused') {
      task.status = 'pending'
      addTaskLog(taskId, 'info', '任务已恢复，等待处理')
      // 如果有处理函数且未运行且未暂停，自动继续
      if (processFn && !isRunning.value && !isPaused.value) {
        runNext()
      }
      return true
    }

    return false
  }

  // 重试单个任务
  const retryTask = (taskId: string) => {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) return false

    if (task.status === 'failed' || task.status === 'cancelled') {
      task.status = 'pending'
      task.progress = 0
      task.error = undefined
      task.startTime = undefined
      task.endTime = undefined
      task.logs = []
      addTaskLog(taskId, 'info', '任务已重置，准备重试')
      // 如果有处理函数且未运行且未暂停，自动继续
      if (processFn && !isRunning.value && !isPaused.value) {
        runNext()
      }
      return true
    }

    return false
  }

  // 全部开始（将暂停的任务恢复）
  const startAll = () => {
    const pausedTasks = tasks.value.filter((t) => t.status === 'paused')
    pausedTasks.forEach((t) => {
      t.status = 'pending'
      addTaskLog(t.id, 'info', '任务已恢复')
    })

    if (isPaused.value) {
      isPaused.value = false
    }

    if (processFn && !isRunning.value) {
      runNext()
    }
  }

  // 全部暂停
  const pauseAll = () => {
    // 暂停待处理任务
    tasks.value.forEach((t) => {
      if (t.status === 'pending') {
        t.status = 'paused'
        addTaskLog(t.id, 'info', '任务已暂停')
      }
    })
    // 设置批量暂停标志
    isPaused.value = true
  }

  // 全部取消
  const cancelAll = () => {
    tasks.value.forEach((t) => {
      if (t.status === 'pending' || t.status === 'paused') {
        t.status = 'cancelled'
        t.endTime = Date.now()
        addTaskLog(t.id, 'warning', '任务已取消')
      }
    })
    // 运行中的任务标记为取消
    const runningTask = tasks.value.find((t) => t.status === 'running')
    if (runningTask) {
      runningTask.status = 'cancelled'
      runningTask.endTime = Date.now()
    }
    isPaused.value = true
  }

  // ========== 返回 ==========
  return {
    // 状态
    tasks,
    logs,
    isPaused,
    isRunning,
    // 计算属性
    totalCount,
    successCount,
    failedCount,
    runningCount,
    pendingCount,
    cancelledCount,
    pausedCount,
    completedCount,
    overallProgress,
    // 工具方法
    getTaskDuration,
    formatTime,
    addLog,
    addTaskLog,
    exportLogs,
    // 任务管理
    addTasks,
    clearTasks,
    clearCompleted,
    clearFailed,
    removeTask,
    // 批量控制
    startBatch,
    pauseBatch,
    resumeBatch,
    retryFailed,
    // 单个任务控制
    cancelTask,
    pauseTask,
    resumeTask,
    retryTask,
    // 全部控制
    startAll,
    pauseAll,
    cancelAll
  }
})
