<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NIcon, NButton } from 'naive-ui'
import {
  DocumentTextOutline,
  FileTrayOutline,
  TextOutline,
  KeyOutline,
  CodeSlashOutline,
  CreateOutline,
  PrintOutline
} from '@vicons/ionicons5'
import { useSettingsStore } from '../stores/settings'

const router = useRouter()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

interface ToolCategory {
  name: string
  icon: any
  color: string
  tools: { name: string; path: string; desc: string }[]
}

const categories: ToolCategory[] = [
  {
    name: '文本处理',
    icon: TextOutline,
    color: 'text-green-400',
    tools: [
      { name: '文本替换', path: '/text/replace', desc: '批量替换文本内容' },
      { name: '文本去重', path: '/text/dedup', desc: '删除重复行' },
      { name: '文本排序', path: '/text/sort', desc: '按多种方式排序' },
      { name: '文本统计', path: '/text/stats', desc: '统计字符、单词、行数' },
      { name: '大小写转换', path: '/text/case', desc: '字母大小写转换' }
    ]
  },
  {
    name: '编码解码',
    icon: KeyOutline,
    color: 'text-purple-400',
    tools: [
      { name: 'Base64编解码', path: '/codec/base64', desc: 'Base64编码解码' },
      { name: 'URL编解码', path: '/codec/url', desc: 'URL编码解码' },
      { name: '哈希计算', path: '/codec/hash', desc: 'MD5/SHA1/SHA256/SHA512' },
      { name: 'Unicode转换', path: '/codec/unicode', desc: 'Unicode编码互转' }
    ]
  },
  {
    name: 'JSON工具',
    icon: CodeSlashOutline,
    color: 'text-blue-400',
    tools: [
      { name: 'JSON格式化', path: '/json/format', desc: '格式化美化JSON' },
      { name: 'JSON校验', path: '/json/validate', desc: '验证JSON语法' },
      { name: 'JSON压缩', path: '/json/compress', desc: '压缩去除空白' }
    ]
  },
  {
    name: '计算转换',
    icon: CreateOutline,
    color: 'text-yellow-400',
    tools: [
      { name: '时间戳转换', path: '/calculate/timestamp', desc: 'Unix时间戳与日期互转' },
      { name: '进制转换', path: '/calculate/base', desc: '2/8/10/16进制互转' },
      { name: 'UUID生成', path: '/calculate/uuid', desc: '批量生成UUID' }
    ]
  },
  {
    name: '图片处理',
    icon: CreateOutline,
    color: 'text-pink-400',
    tools: [
      { name: '图片压缩', path: '/image/compress', desc: '减小图片文件大小' },
      { name: '格式转换', path: '/image/convert', desc: '多种图片格式互转' },
      { name: '尺寸调整', path: '/image/resize', desc: '调整图片尺寸' },
      { name: '取色器', path: '/image/color', desc: '从图片中取色' }
    ]
  },
  {
    name: '文档转换',
    icon: FileTrayOutline,
    color: 'text-orange-400',
    tools: [
      { name: 'Excel转换', path: '/convert/excel', desc: 'Excel与CSV互转' },
      { name: 'Markdown转换', path: '/convert/markdown', desc: 'Markdown与HTML互转' },
      { name: '编码转换', path: '/convert/encoding', desc: '文件编码互转(GBK/UTF-8)' }
    ]
  },
  {
    name: 'PDF工具箱',
    icon: DocumentTextOutline,
    color: 'text-red-400',
    tools: [
      { name: 'PDF合并', path: '/pdf/merge', desc: '将多个PDF文件合并为一个' },
      { name: 'PDF拆分', path: '/pdf/split', desc: '按页码范围拆分PDF' },
      { name: 'PDF压缩', path: '/pdf/compress', desc: '减小PDF文件大小' },
      { name: 'PDF转图片', path: '/pdf/to-images', desc: '将PDF页面转为图片' }
    ]
  },
  {
    name: '系统辅助',
    icon: CreateOutline,
    color: 'text-cyan-400',
    tools: [
      { name: '二维码生成', path: '/system/qrcode', desc: '生成二维码图片' },
      { name: '二维码扫描', path: '/system/qrcode-scan', desc: '识别二维码内容' }
    ]
  },
  {
    name: '打印中心',
    icon: PrintOutline,
    color: 'text-indigo-400',
    tools: [
      { name: '打印管理', path: '/print/manager', desc: '打印任务总览' },
      { name: '文件打印', path: '/print/single', desc: '单文件/批量打印' },
      { name: '打印队列', path: '/print/queue', desc: '管理打印任务' }
    ]
  }
]

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="home-view p-6">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2" :class="isDark ? 'text-blue-400' : 'text-blue-600'">欢迎使用轻量化办公文档工具箱</h1>
      <p :class="isDark ? 'text-gray-400' : 'text-gray-500'">完全离线、秒开即用，聚焦办公文档场景的高效工具集</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="category in categories" :key="category.name">
        <NCard class="hover:border-blue-500/50 transition-colors h-full">
            <template #header>
              <div class="flex items-center gap-2">
                <NIcon :size="24" :class="category.color">
                  <component :is="category.icon" />
                </NIcon>
                <span class="font-bold">{{ category.name }}</span>
              </div>
            </template>
            <div class="space-y-1">
              <div
                v-for="tool in category.tools"
                :key="tool.path"
                class="flex items-center justify-between p-2 rounded cursor-pointer transition-colors"
                :class="isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'"
                @click="navigateTo(tool.path)"
              >
                <div>
                  <div class="font-medium text-sm">{{ tool.name }}</div>
                  <div class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">{{ tool.desc }}</div>
                </div>
                <NButton size="tiny" quaternary>
                  打开
                </NButton>
              </div>
            </div>
          </NCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
