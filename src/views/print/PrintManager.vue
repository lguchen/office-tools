<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NIcon, NTag } from 'naive-ui'
import {
  PrintOutline,
  DocumentTextOutline,
  CreateOutline,
  ListOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../../stores/settings'

const router = useRouter()
const settingsStore = useSettingsStore()
const isDark = ref(settingsStore.theme === 'dark')

const stats = ref([
  { label: '今日打印', value: 0, icon: PrintOutline, color: 'text-blue-400' },
  { label: '待打印任务', value: 0, icon: CreateOutline, color: 'text-yellow-400' },
  { label: '已完成', value: 0, icon: DocumentTextOutline, color: 'text-green-400' },
])

const quickActions = ref([
  { title: '文件打印', desc: '单文件/批量打印', icon: PrintOutline, path: '/print/single' },
  { title: '打印队列', desc: '管理打印任务', icon: DocumentTextOutline, path: '/print/queue' },
])

const formats = ['PDF', 'Word (.docx)', 'Excel (.xlsx)', '图片 (PNG/JPG)', '文本 (.txt)', 'Markdown']
</script>

<template>
  <ToolLayout title="打印中心" description="文档打印管理，支持单文件和批量打印">
    <template #input>
      <div class="space-y-6">
        <!-- 统计卡片 - 使用CSS Grid -->
        <div class="grid grid-cols-3 gap-4">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="p-4 rounded-lg border transition-colors"
            :class="isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'"
          >
            <div class="flex items-center gap-3">
              <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', isDark ? 'bg-gray-700' : 'bg-gray-100', stat.color]">
                <NIcon size="20">
                  <stat.icon />
                </NIcon>
              </div>
              <div>
                <div class="text-xl font-bold">{{ stat.value }}</div>
                <div class="text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">{{ stat.label }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="text-lg font-semibold" :class="isDark ? 'text-blue-400' : 'text-blue-600'">快捷操作</div>

        <div class="grid grid-cols-2 gap-4">
          <div
            v-for="action in quickActions"
            :key="action.title"
            class="p-6 rounded-lg border cursor-pointer transition-all hover:border-blue-500/50"
            :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'"
            @click="router.push(action.path)"
          >
            <div class="flex flex-col items-center text-center">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-3" :class="isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-500'">
                <NIcon size="24">
                  <action.icon />
                </NIcon>
              </div>
              <div class="font-semibold">{{ action.title }}</div>
              <div class="text-sm mt-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">{{ action.desc }}</div>
            </div>
          </div>
        </div>

        <!-- 支持格式 -->
        <div class="text-lg font-semibold" :class="isDark ? 'text-blue-400' : 'text-blue-600'">支持格式</div>

        <div class="p-4 rounded-lg border" :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'">
          <div class="flex flex-wrap gap-2">
            <NTag v-for="format in formats" :key="format" type="info">{{ format }}</NTag>
          </div>
        </div>
      </div>
    </template>

    <template #output>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="text-lg font-semibold" :class="isDark ? 'text-blue-400' : 'text-blue-600'">最近打印</div>
          <NButton text size="small" @click="router.push('/print/queue')">
            查看全部
          </NButton>
        </div>

        <div class="text-center py-12" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
          <NIcon size="48" class="mb-3 opacity-30">
            <ListOutline />
          </NIcon>
          <div>暂无打印记录</div>
          <div class="text-sm mt-2">选择左侧快捷操作开始打印</div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>