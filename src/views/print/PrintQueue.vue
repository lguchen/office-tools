<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NIcon, NTabs, NTabPane, NCard, NTag, NSpace, NEmpty } from 'naive-ui'
import {
  PrintOutline,
  TrashOutline,
  RefreshOutline,
  CreateOutline,
  TextOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useNotification } from 'naive-ui'

const notification = useNotification()

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

const jobs = ref<PrintJob[]>([
  // 示例数据 - 实际应用中从后端获取
])

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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'queued': return 'warning'
    case 'printing': return 'info'
    case 'completed': return 'success'
    case 'failed': return 'error'
    case 'cancelled': return 'default'
    default: return 'default'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'queued': return '队列中'
    case 'printing': return '打印中'
    case 'completed': return '已完成'
    case 'failed': return '失败'
    case 'cancelled': return '已取消'
    default: return status
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'queued':
    case 'printing': return TextOutline
    case 'completed': return CreateOutline
    case 'failed':
    case 'cancelled': return TrashOutline
    default: return TextOutline
  }
}

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

        <NCard size="small">
          <div class="grid grid-cols-5 gap-4 text-center">
            <div class="p-2">
              <div class="text-2xl font-bold text-gray-300">{{ stats.all }}</div>
              <div class="text-xs text-gray-500">全部</div>
            </div>
            <div class="p-2">
              <div class="text-2xl font-bold text-yellow-500">{{ stats.queued }}</div>
              <div class="text-xs text-gray-500">等待中</div>
            </div>
            <div class="p-2">
              <div class="text-2xl font-bold text-blue-500">{{ stats.printing }}</div>
              <div class="text-xs text-gray-500">打印中</div>
            </div>
            <div class="p-2">
              <div class="text-2xl font-bold text-green-500">{{ stats.completed }}</div>
              <div class="text-xs text-gray-500">已完成</div>
            </div>
            <div class="p-2">
              <div class="text-2xl font-bold text-red-500">{{ stats.failed }}</div>
              <div class="text-xs text-gray-500">失败</div>
            </div>
          </div>
        </NCard>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <NTabs v-model:value="activeTab" size="small" class="mb-0">
          <NTabPane name="all" tab="全部" />
          <NTabPane name="queued" tab="等待中" />
          <NTabPane name="printing" tab="打印中" />
          <NTabPane name="completed" tab="已完成" />
          <NTabPane name="failed" tab="失败" />
        </NTabs>

        <div class="flex-1 overflow-auto mt-4 min-h-0 space-y-2">
          <NEmpty v-if="filteredJobs.length === 0" description="暂无任务">
            <template #icon>
              <NIcon size="48" class="text-gray-600"><PrintOutline /></NIcon>
            </template>
          </NEmpty>

          <NCard v-for="job in filteredJobs" :key="job.id" size="small" class="hover:border-blue-500/30">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div :class="[
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  job.status === 'printing' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-700 text-gray-400'
                ]">
                  <NIcon :size="20"><component :is="getStatusIcon(job.status)" /></NIcon>
                </div>
                <div>
                  <div class="font-medium">{{ job.name }}</div>
                  <div class="text-xs text-gray-400 flex items-center gap-3">
                    <span>{{ job.printer }}</span>
                    <span>{{ job.pages }} 页</span>
                    <span>{{ job.size }}</span>
                    <span>{{ job.submittedAt }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <NTag :type="getStatusColor(job.status) as any" size="small">
                  {{ getStatusText(job.status) }}
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
          </NCard>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
