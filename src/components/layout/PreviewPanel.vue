<script setup lang="ts">
import { useTaskStore } from '@/stores/task'
import { ref, computed, watch, nextTick } from 'vue'

const taskStore = useTaskStore()
const activeTab = ref<'preview' | 'log'>('log')
const logContainer = ref<HTMLElement | null>(null)

const recentLogs = computed(() => taskStore.logs.slice(-100))

watch(
  () => taskStore.logs.length,
  () => {
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight
      }
    })
  }
)

const formatTime = (ts: number) => {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="preview-panel">
    <div style="display:flex; border-bottom: 1px solid var(--border-color);">
      <div
        :style="{
          flex: 1,
          padding: '10px 12px',
          cursor: 'pointer',
          textAlign: 'center',
          fontSize: '13px',
          color: activeTab === 'preview' ? 'var(--primary-color)' : 'var(--text-secondary)',
          borderBottom: activeTab === 'preview' ? '2px solid var(--primary-color)' : '2px solid transparent'
        }"
        @click="activeTab = 'preview'"
      >
        预览
      </div>
      <div
        :style="{
          flex: 1,
          padding: '10px 12px',
          cursor: 'pointer',
          textAlign: 'center',
          fontSize: '13px',
          color: activeTab === 'log' ? 'var(--primary-color)' : 'var(--text-secondary)',
          borderBottom: activeTab === 'log' ? '2px solid var(--primary-color)' : '2px solid transparent'
        }"
        @click="activeTab = 'log'"
      >
        日志
      </div>
    </div>

    <div v-show="activeTab === 'preview'" style="flex:1; padding:12px; overflow-y:auto;">
      <div v-if="taskStore.tasks.length === 0" style="color:var(--text-tertiary); text-align:center; padding:40px 0; font-size:13px;">
        暂无任务
      </div>
      <div v-else>
        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
            <span style="color:var(--text-secondary);">总进度</span>
            <span style="color:var(--text-primary); font-weight:500;">{{ taskStore.overallProgress }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar-fill" :style="{ width: taskStore.overallProgress + '%' }"></div>
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-bottom:12px; font-size:12px;">
          <div style="flex:1; text-align:center; padding:6px; background:var(--bg-color); border-radius:4px;">
            <div style="color:var(--text-tertiary);">总数</div>
            <div style="color:var(--text-primary); font-weight:500;">{{ taskStore.totalCount }}</div>
          </div>
          <div style="flex:1; text-align:center; padding:6px; background:var(--bg-color); border-radius:4px;">
            <div style="color:var(--text-tertiary);">成功</div>
            <div style="color:#52c41a; font-weight:500;">{{ taskStore.successCount }}</div>
          </div>
          <div style="flex:1; text-align:center; padding:6px; background:var(--bg-color); border-radius:4px;">
            <div style="color:var(--text-tertiary);">失败</div>
            <div style="color:#ff4d4f; font-weight:500;">{{ taskStore.failedCount }}</div>
          </div>
        </div>
        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:6px;">任务列表</div>
        <div v-for="task in taskStore.tasks.slice(0, 20)" :key="task.id" style="padding:6px 0; border-bottom:1px solid var(--border-color); font-size:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">{{ task.name }}</span>
            <span class="task-status" :class="task.status">
              {{ task.status === 'pending' ? '等待' : task.status === 'running' ? '处理中' : task.status === 'success' ? '完成' : task.status === 'failed' ? '失败' : '暂停' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'log'" class="log-panel" ref="logContainer">
      <div v-for="log in recentLogs" :key="log.id" class="log-item" :class="log.level">
        [{{ formatTime(log.time) }}] {{ log.message }}
      </div>
      <div v-if="recentLogs.length === 0" style="color:var(--text-tertiary); text-align:center; padding:40px 0;">
        暂无日志
      </div>
    </div>

    <div style="border-top: 1px solid var(--border-color); padding: 8px; display: flex; gap: 6px;">
      <button
        class="btn"
        style="flex:1; font-size:12px; padding:4px 8px;"
        @click="taskStore.isPaused ? taskStore.resumeBatch() : taskStore.pauseBatch()"
        :disabled="taskStore.tasks.filter(t => t.status === 'running').length === 0 && taskStore.tasks.filter(t => t.status === 'pending').length === 0"
      >
        {{ taskStore.isPaused ? '继续' : '暂停' }}
      </button>
      <button
        class="btn"
        style="flex:1; font-size:12px; padding:4px 8px;"
        @click="taskStore.retryFailed()"
      >
        重试失败
      </button>
      <button
        class="btn"
        style="flex:1; font-size:12px; padding:4px 8px;"
        @click="taskStore.clearTasks()"
      >
        清空
      </button>
    </div>
  </div>
</template>
