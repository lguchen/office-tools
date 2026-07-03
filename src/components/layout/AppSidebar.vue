<script setup lang="ts">
import { ref, h, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NMenu, NIcon, NButton } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import {
  HomeOutline,
  DocumentTextOutline,
  TextOutline,
  KeyOutline,
  CodeSlashOutline,
  SettingsOutline,
  PrintOutline,
  CreateOutline,
  FileTrayOutline,
  ChevronBackOutline,
  ChevronForwardOutline,
  GridOutline
} from '@vicons/ionicons5'
const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const menuOptions: MenuOption[] = [
  {
    label: '首页',
    key: 'home',
    icon: () => h(NIcon, null, { default: () => h(HomeOutline) }),
    path: '/'
  },
  {
    label: '文本处理',
    key: 'text',
    icon: () => h(NIcon, null, { default: () => h(TextOutline) }),
    children: [
      { label: '文本替换', key: 'text-replace', path: '/text/replace' },
      { label: '文本去重', key: 'text-dedup', path: '/text/dedup' },
      { label: '文本排序', key: 'text-sort', path: '/text/sort' },
      { label: '文本统计', key: 'text-stats', path: '/text/stats' },
      { label: '大小写转换', key: 'text-case', path: '/text/case' }
    ]
  },
  {
    label: '编码解码',
    key: 'codec',
    icon: () => h(NIcon, null, { default: () => h(KeyOutline) }),
    children: [
      { label: 'Base64编解码', key: 'codec-base64', path: '/codec/base64' },
      { label: 'URL编解码', key: 'codec-url', path: '/codec/url' },
      { label: '哈希计算', key: 'codec-hash', path: '/codec/hash' },
      { label: 'Unicode转换', key: 'codec-unicode', path: '/codec/unicode' }
    ]
  },
  {
    label: 'JSON工具',
    key: 'json',
    icon: () => h(NIcon, null, { default: () => h(CodeSlashOutline) }),
    children: [
      { label: 'JSON格式化', key: 'json-format', path: '/json/format' },
      { label: 'JSON校验', key: 'json-validate', path: '/json/validate' },
      { label: 'JSON压缩', key: 'json-compress', path: '/json/compress' }
    ]
  },
  {
    label: '计算转换',
    key: 'calculate',
    icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
    children: [
      { label: '时间戳转换', key: 'calculate-timestamp', path: '/calculate/timestamp' },
      { label: '进制转换', key: 'calculate-base', path: '/calculate/base' },
      { label: 'UUID生成', key: 'calculate-uuid', path: '/calculate/uuid' }
    ]
  },
  {
    label: '图片处理',
    key: 'image',
    icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
    children: [
      { label: '图片压缩', key: 'image-compress', path: '/image/compress' },
      { label: '格式转换', key: 'image-convert', path: '/image/convert' },
      { label: '尺寸调整', key: 'image-resize', path: '/image/resize' },
      { label: '取色器', key: 'image-color', path: '/image/color' }
    ]
  },
  {
    label: 'PDF工具箱',
    key: 'pdf',
    icon: () => h(NIcon, null, { default: () => h(DocumentTextOutline) }),
    children: [
      { label: 'PDF合并', key: 'pdf-merge', path: '/pdf/merge' },
      { label: 'PDF拆分', key: 'pdf-split', path: '/pdf/split' },
      { label: 'PDF压缩', key: 'pdf-compress', path: '/pdf/compress' },
      { label: 'PDF转图片', key: 'pdf-to-images', path: '/pdf/to-images' }
    ]
  },
  // 新增：Excel工具箱
  {
    label: 'Excel工具箱',
    key: 'excel',
    icon: () => h(NIcon, null, { default: () => h(GridOutline) }),
    children: [
      { label: '快捷键查询', key: 'excel-shortcuts', path: '/excel/shortcuts' },
      { label: '函数说明', key: 'excel-functions', path: '/excel/functions' },
      { label: '数据处理', key: 'excel-process', path: '/excel/process' },
      { label: '公式生成器', key: 'excel-formula', path: '/excel/formula' },
      { label: '拆分合并', key: 'excel-split-merge', path: '/excel/split-merge' },
      { label: '条件格式', key: 'excel-conditional', path: '/excel/conditional' },
      { label: '数据验证', key: 'excel-validation', path: '/excel/validation' }
    ]
  },
  // 新增：Word工具箱
  {
    label: 'Word工具箱',
    key: 'word',
    icon: () => h(NIcon, null, { default: () => h(DocumentTextOutline) }),
    children: [
      { label: '快捷键查询', key: 'word-shortcuts', path: '/word/shortcuts' },
      { label: '批量内容处理', key: 'word-content', path: '/word/content' },
      { label: '批量格式统一', key: 'word-format', path: '/word/format' },
      { label: '书签管理', key: 'word-bookmark', path: '/word/bookmark' },
      { label: '特殊字符处理', key: 'word-special', path: '/word/special' },
      { label: '页面布局设置', key: 'word-layout', path: '/word/layout' },
      { label: '文档合并', key: 'word-merge', path: '/word/merge' }
    ]
  },
  {
    label: '系统辅助',
    key: 'system',
    icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
    children: [
      { label: '二维码生成', key: 'system-qrcode', path: '/system/qrcode' },
      { label: '二维码扫描', key: 'system-qrcode-scan', path: '/system/qrcode-scan' }
    ]
  },
  {
    label: '打印中心',
    key: 'print',
    icon: () => h(NIcon, null, { default: () => h(PrintOutline) }),
    children: [
      { label: '打印管理', key: 'print-manager', path: '/print/manager' },
      { label: '文件打印', key: 'print-single', path: '/print/single' },
      { label: '打印队列', key: 'print-queue', path: '/print/queue' }
    ]
  }
]

const findItemByKey = (key: string): MenuOption | undefined => {
  for (const option of menuOptions) {
    if (option.key === key) return option
    if (option.children) {
      for (const child of option.children) {
        if (child.key === key) return child
      }
    }
  }
  return undefined
}

const activeKey = computed(() => {
  const path = route.path
  for (const option of menuOptions) {
    if ((option as any).path === path) {
      return option.key as string
    }
    if (option.children) {
      for (const child of option.children) {
        if ((child as any).path === path) {
          return child.key as string
        }
      }
    }
  }
  return 'home'
})

const handleMenuSelect = (key: string) => {
  const item = findItemByKey(key)
  if (item && (item as any).path) {
    router.push((item as any).path)
  }
}

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <aside
    class="border-r flex flex-col transition-all duration-300 ease-in-out flex-shrink-0"
    :class="[
      collapsed ? 'w-14' : 'w-60',
      'bg-white border-gray-200'
    ]"
  >
    <div
      class="p-3 border-b flex-shrink-0 flex items-center justify-between transition-colors duration-300 border-gray-200"
    >
      <h1
        v-if="!collapsed"
        class="text-base font-bold whitespace-nowrap text-blue-600"
      >轻量化办公文档工具箱</h1>
      <button
        class="p-1.5 rounded transition-colors flex-shrink-0 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        @click="toggleCollapse"
        :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
      >
        <NIcon v-if="!collapsed" size="16"><ChevronBackOutline /></NIcon>
        <NIcon v-else size="16"><ChevronForwardOutline /></NIcon>
      </button>
    </div>
    <div class="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
      <NMenu
        :value="activeKey"
        :options="menuOptions"
        :indent="collapsed ? 0 : 24"
        :collapsed="collapsed"
        :collapsed-width="56"
        :default-expand-all="false"
        @update:value="handleMenuSelect"
      />
    </div>
  </aside>
</template>
