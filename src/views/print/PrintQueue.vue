<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NIcon, NTag } from 'naive-ui'
import {
  PrintOutline,
  TrashOutline,
  RefreshOutline,
  CreateOutline,
  TextOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useNotification } from 'naive-ui'
import { useSettingsStore } from '../../stores/settings'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = ref(settingsStore.theme === 'dark')

interface PrintJob {
  id: string
  name: string
  printer: string
  status: 'queued' | 'printing' | 'completed' | 'failed' | 'cancelled'
  pages: number
  submittedAt: string
  size: string
}

const activeTab = ref('all')

const jobs = ref<PrintJob[]>([])

const filteredJobs = computed(() => {
  if (activeTab.value === 'all') return jobs.value
  return jobs.value.filter(j => j.status === activeTab.value)
})

const stats = computed(() => ({
  all: jobs.value.length,
  queued: jobs.value.filter(j => j.status === 'queued').length,
  printing: jobs.value.filter(j => j.status === 'printing').length,
  completed: jobs.value.filter(j => j.status === 'completed').length,
  failed: jobs.value.filter(j => j.status === 'failed').length,
}))

const statusConfig: Record<string, { color: string; text: string; icon: any; bgClass: string }> = {
  queued: { color: 'warning', text: '队列中', icon: TextOutline, bgClass: 'bg-yellow-500/20 text-yellow-400' },
  printing: { color: 'info', text: '打印中', icon: TextOutline, bgClass: 'bg-blue-500/20 text-blue-400' },
  completed: { color: 'success', text: '已完成', icon: CreateOutline, bgClass: 'bg-green-500/20 text-green-400' },
  failed: { color: 'error', text: '失败', icon: TrashOutline, bgClass: 'bg-red-500/20 text-red-400' },
  cancelled: { color: 'default', text: '已取消', icon: TrashOutline, bgClass: 'bg-gray-500/20 text-gray-400' }
}

const getStatusInfo = (status: string) => statusConfig[status] || statusConfig.queued

const cancelJob = (id: string) => {
  const job = jobs.value.find(j => j.id === id)
  if (job && (job.status === 'queued' || job.status === 'printing')) {
    job.status = 'cancelled'
    notification.info({ title: '已取消', content: '打印任务已取消' })
  }
}

const removeJob = (id: string) => {
  jobs.value = jobs.value.filter(j => j.id !== id)
}

const clearCompleted = () => {
  jobs.value = jobs.value.filter(j => j.status !== 'completed' && j.status !== 'cancelled' && j.status !== 'failed')
  notification.success({ title: '已清理', content: '已清除历史任务' })
}

const refresh = () => {
  notification.info({ title: '已刷新', content: '任务列表已更新' })
}

const tabs = ['all', 'queued', 'printing', 'completed', 'failed']
const tabLabels: Record<string, string> = { all: '全部', queued: '等待中', printing: '打印中', completed: '已完成', failed: '失败' }
</script>

<template>
  <ToolLayout title="打印队列" description="查看和管理打印任务">
    <template #input>
      <div class="space-y-4">
        <div class="flex gap-2">
          <NButton @click="refresh">
            <template #icon>
              <NIcon><RefreshOutline /></NIcon>
            </template>
            刷新
          </NButton>
          <NButton @click="clearCompleted">
            <template #icon>
              <NIcon><TrashOutline /></NIcon>
            </template>
            清除历史
          </NButton>
        </div>

        <div class="p-4 rounded-lg border" :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'">
          <div class="grid grid-cols-5 gap-4 text-center">
            <div class="p-2">
              <div class="text-2xl font-bold text-gray-300">{{ stats.all }}</div>
              <div class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">全部</div>
            </div>
            <div class="p-2">
              <div class="text-2xl font-bold text-yellow-500">{{ stats.queued }}</div>
              <div class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">等待中</div>
            </div>
            <div class="p-2">
              <div class="text-2xl font-bold text-blue-500">{{ stats.printing }}</div>
              <div class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">打印中</div>
            </div>
            <div class="p-2">
              <div class="text-2xl font-bold text-green-500">{{ stats.completed }}</div>
              <div class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">已完成</div>
            </div>
            <div class="p-2">
              <div class="text-2xl font-bold text-red-500">{{ stats.failed }}</div>
              <div class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">失败</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <!-- Tab导航 - 简化实现 -->
        <div class="flex gap-2 mb-4 border-b pb-2" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
          <button
            v-for="tab in tabs"
            :key="tab"
            class="px-3 py-1 rounded text-sm transition-colors"
            :class="activeTab === tab
              ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600')
              : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')"
            @click="activeTab = tab"
          >
            {{ tabLabels[tab] }}
          </button>
        </div>

        <div class="flex-1 overflow-auto min-h-0 space-y-2">
          <!-- 空状态 -->
          <div v-if="filteredJobs.length === 0" class="text-center py-12" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            <NIcon size="48" class="mb-3 opacity-30">
              <PrintOutline />
            </NIcon>
            <div>暂无任务</div>
          </div>

          <!-- 任务列表 -->
          <div
            v-for="job in filteredJobs"
            :key="job.id"
            class="p-3 rounded-lg border transition-colors hover:border-blue-500/30"
            :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', getStatusInfo(job.status).bgClass]">
                  <NIcon :size="20">
                    <component :is="getStatusInfo(job.status).icon" />
                  </NIcon>
                </div>
                <div>
                  <div class="font-medium">{{ job.name }}</div>
                  <div class="text-xs flex items-center gap-3" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                    <span>{{ job.printer }}</span>
                    <span>{{ job.pages }} 页</span>
                    <span>{{ job.size }}</span>
                    <span>{{ job.submittedAt }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <NTag :type="getStatusInfo(job.status).color as any" size="small">
                  {{ getStatusInfo(job.status).text }}
                </NTag>
                <NButton
                  v-if="job.status === 'queued' || job.status === 'printing'"
                  text
                  size="tiny"
                  @click="cancelJob(job.id)"
                >
                  取消
                </NButton>
                <NButton
                  v-if="job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'"
                  text
                  size="tiny"
                  class="text-gray-400"
                  @click="removeJob(job.id)"
                >
                  <NIcon><TrashOutline /></NIcon>
                </NButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>