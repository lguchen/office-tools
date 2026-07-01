<script setup lang="ts">
import { ref } from 'vue'
import { NCard, NGrid, NGi, NButton, NIcon, NStatistic, NSpace, NTag } from 'naive-ui'
import {
  PrintOutline,
  DocumentTextOutline,
  CreateOutline,
  AddOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const stats = ref([
  { label: '今日打印', value: 0, icon: PrintOutline, color: 'text-blue-400' },
  { label: '待打印任务', value: 0, icon: CreateOutline, color: 'text-yellow-400' },
  { label: '已完成', value: 0, icon: DocumentTextOutline, color: 'text-green-400' },
])

const quickActions = ref([
  { title: '文件打印', desc: '单文件/批量打印', icon: PrintOutline, path: '/print/single' },
  { title: '打印队列', desc: '管理打印任务', icon: DocumentTextOutline, path: '/print/queue' },
])
</script>

<template>
  <ToolLayout title="打印中心" description="文档打印管理，支持单文件和批量打印">
    <template #input>
      <div class="space-y-6">
        <NGrid :cols="3" :x-gap="16" :y-gap="16">
          <NGi v-for="stat in stats" :key="stat.label">
            <NCard>
              <div class="flex items-center gap-3">
                <div :class="['w-10 h-10 rounded-lg flex items-center justify-center bg-gray-800', stat.color]">
                  <NIcon size="20"><component :is="stat.icon" /></NIcon>
                </div>
                <div>
                  <NStatistic :value="stat.value" class="!text-xl" />
                  <div class="text-sm text-gray-400">{{ stat.label }}</div>
                </div>
              </div>
            </NCard>
          </NGi>
        </NGrid>

        <div class="text-lg font-semibold text-blue-400">快捷操作</div>

        <NGrid :cols="2" :x-gap="16" :y-gap="16">
          <NGi v-for="action in quickActions" :key="action.title">
            <NCard
              hoverable
              class="cursor-pointer transition-all hover:border-blue-500/50"
              @click="router.push(action.path)"
            >
              <div class="flex flex-col items-center text-center py-4">
                <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3 text-blue-400">
                  <NIcon size="24"><component :is="action.icon" /></NIcon>
                </div>
                <div class="font-semibold">{{ action.title }}</div>
                <div class="text-sm text-gray-400 mt-1">{{ action.desc }}</div>
              </div>
            </NCard>
          </NGi>
        </NGrid>

        <div class="text-lg font-semibold text-blue-400">支持格式</div>

        <NCard>
          <div class="flex flex-wrap gap-2">
            <NTag type="info">PDF</NTag>
            <NTag type="info">Word (.docx)</NTag>
            <NTag type="info">Excel (.xlsx)</NTag>
            <NTag type="info">图片 (PNG/JPG)</NTag>
            <NTag type="info">文本 (.txt)</NTag>
            <NTag type="info">Markdown</NTag>
          </div>
        </NCard>
      </div>
    </template>

    <template #output>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="text-lg font-semibold text-blue-400">最近打印</div>
          <NButton text size="small" @click="router.push('/print/queue')">
            查看全部
          </NButton>
        </div>

        <div class="space-y-3">
          <div class="text-center text-gray-500 py-12">
            <NIcon size="48" class="mb-3 opacity-30"><ListOutline /></NIcon>
            <div>暂无打印记录</div>
            <div class="text-sm mt-2">选择左侧快捷操作开始打印</div>
          </div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
