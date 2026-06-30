<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useSettingStore } from '@/stores/setting'
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()
const settingStore = useSettingStore()

// 菜单数据接口
interface MenuItem {
  name: string
  path: string
  icon: string
  badge?: number | string
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

// 主菜单组
const menuGroups: MenuGroup[] = [
  {
    title: '工作台',
    items: [{ name: '首页', path: '/', icon: '🏠' }]
  },
  {
    title: '文档处理',
    items: [
      { name: 'Excel 工具', path: '/excel', icon: '📊' },
      { name: 'Word 工具', path: '/word', icon: '📄' },
      { name: 'PDF 工具', path: '/pdf', icon: '📑' },
      { name: '批量打印', path: '/print', icon: '🖨️' }
    ]
  },
  {
    title: '智能识别',
    items: [{ name: 'OCR 识别', path: '/ocr', icon: '🔍' }]
  },
  {
    title: '批量工具',
    items: [
      { name: '批量重命名', path: '/batch-rename', icon: '📝' },
      { name: '编码转换', path: '/encoding-convert', icon: '🔤' }
    ]
  },
  {
    title: '辅助功能',
    items: [
      { name: '任务队列', path: '/task-queue', icon: '📋' },
      { name: '通用工具', path: '/tools', icon: '🔧' },
      { name: '工具箱', path: '/toolbox', icon: '🧰' }
    ]
  }
]

// 底部固定菜单
const footerMenuItems: MenuItem[] = [
  { name: '设置', path: '/settings', icon: '⚙️' }
]

// 是否折叠
const isCollapsed = computed(() => settingStore.sidebarCollapsed)

// 导航到指定页面
const goTo = (path: string) => {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <!-- 主菜单区域 -->
    <nav class="sidebar-menu">
      <template v-for="group in menuGroups" :key="group.title">
        <!-- 分组标题 -->
        <div class="menu-section">{{ group.title }}</div>
        <!-- 菜单项 -->
        <div
          v-for="item in group.items"
          :key="item.path"
          class="menu-item"
          :class="{ active: route.path === item.path }"
          :title="isCollapsed ? item.name : ''"
          @click="goTo(item.path)"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span class="menu-label">{{ item.name }}</span>
          <span v-if="item.badge && !isCollapsed" class="menu-badge">{{ item.badge }}</span>
        </div>
      </template>
    </nav>

    <!-- 底部固定菜单区域 -->
    <div class="sidebar-footer">
      <div class="sidebar-footer-menu">
        <div
          v-for="item in footerMenuItems"
          :key="item.path"
          class="menu-item"
          :class="{ active: route.path === item.path }"
          :title="isCollapsed ? item.name : ''"
          @click="goTo(item.path)"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span class="menu-label">{{ item.name }}</span>
        </div>
      </div>
      <!-- 品牌标识 -->
      <div class="sidebar-brand">
        <template v-if="!isCollapsed">
          <div class="sidebar-brand-text">v1.0.0 · 纯离线</div>
          <div class="sidebar-brand-text" style="margin-top: 2px; font-size: 10px">
            power by 小罗
          </div>
        </template>
        <template v-else>
          <div class="sidebar-brand-text">小罗</div>
        </template>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* 菜单徽章 */
.menu-badge {
  margin-left: auto;
  padding: 0 6px;
  height: 18px;
  line-height: 18px;
  font-size: 11px;
  background: var(--error-color);
  color: white;
  border-radius: 9px;
  min-width: 18px;
  text-align: center;
}
</style>
