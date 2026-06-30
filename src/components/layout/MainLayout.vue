<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingStore } from '@/stores/setting'
import { useTaskStore } from '@/stores/task'
import Sidebar from './Sidebar.vue'
import PreviewPanel from './PreviewPanel.vue'
import PrintPanel from '@/components/PrintPanel.vue'
import { usePrintStore } from '@/stores/print'

const route = useRoute()
const settingStore = useSettingStore()
const taskStore = useTaskStore()
const printStore = usePrintStore()

// 窗口控制
const isMaximized = ref(false)

// 主题图标
const themeIcon = computed(() => {
  if (settingStore.theme === 'light') return '☀️'
  if (settingStore.theme === 'dark') return '🌙'
  return '🖥️'
})

// 当前页面标题
const currentPageTitle = computed(() => {
  return (route.meta?.title as string) || '轻办公文档助手'
})

// 任务进度
const taskProgress = computed(() => taskStore.overallProgress)
const hasRunningTask = computed(() => taskStore.isRunning)

// 预览面板拖拽调整宽度
const isResizing = ref(false)
let startX = 0
let startWidth = 0

const startResize = (e: MouseEvent) => {
  e.preventDefault()
  isResizing.value = true
  startX = e.clientX
  startWidth = settingStore.previewWidth
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const onResize = (e: MouseEvent) => {
  if (!isResizing.value) return
  const diff = startX - e.clientX
  const newWidth = startWidth + diff
  settingStore.setPreviewWidth(newWidth)
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// 窗口控制函数
const minimizeWindow = () => {
  if (window.__TAURI_INTERNALS__) {
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().minimize()
    })
  }
}

const toggleMaximize = () => {
  if (window.__TAURI_INTERNALS__) {
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      const win = getCurrentWindow()
      if (isMaximized.value) {
        win.unmaximize()
      } else {
        win.maximize()
      }
      isMaximized.value = !isMaximized.value
    })
  }
}

const closeWindow = () => {
  if (window.__TAURI_INTERNALS__) {
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().close()
    })
  } else {
    window.close()
  }
}

// 切换主题
const toggleTheme = () => {
  const modes = ['light', 'dark', 'auto'] as const
  const idx = modes.indexOf(settingStore.theme as any)
  const next = modes[(idx + 1) % modes.length]
  settingStore.toggleTheme(next as any)
}

// 切换侧边栏
const toggleSidebar = () => {
  settingStore.toggleSidebar()
}

onMounted(() => {
  // 监听窗口最大化事件
  if (window.__TAURI_INTERNALS__) {
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      const win = getCurrentWindow()
      win.onResized(() => {
        win.isMaximized().then((maximized) => {
          isMaximized.value = maximized
        })
      })
    })
  }
})

onUnmounted(() => {
  stopResize()
})
</script>

<template>
  <div class="app-layout">
    <!-- ========== 顶部标题栏 ========== -->
    <header class="titlebar">
      <!-- 左侧区域 -->
      <div class="titlebar-left">
        <!-- 菜单按钮 -->
        <div class="titlebar-icon-btn" @click="toggleSidebar" title="切换侧边栏">
          <span v-if="!settingStore.sidebarCollapsed">◀</span>
          <span v-else>▶</span>
        </div>
        <!-- Logo -->
        <div class="titlebar-logo">轻</div>
        <!-- 标题 -->
        <span class="titlebar-title">轻办公文档助手</span>
      </div>

      <!-- 中间搜索区域（可拖拽区域） -->
      <div class="titlebar-drag">
        <div class="titlebar-center">
          <div class="titlebar-search">
            <span class="titlebar-search-icon">🔍</span>
            <span class="titlebar-search-text">搜索功能、文件、设置...</span>
            <span class="titlebar-search-shortcut">Ctrl+K</span>
          </div>
        </div>
      </div>

      <!-- 右侧操作区域 -->
      <div class="titlebar-right">
        <!-- 预览面板切换 -->
        <div
          class="titlebar-icon-btn"
          @click="settingStore.togglePreviewPanel()"
          title="切换预览面板"
        >
          {{ settingStore.previewPanelVisible ? '👁️' : '🙈' }}
        </div>

        <!-- 主题切换 -->
        <div class="titlebar-icon-btn" @click="toggleTheme" :title="'主题：' + settingStore.theme">
          {{ themeIcon }}
        </div>

        <!-- 用户头像 -->
        <div class="titlebar-avatar" title="用户设置">👤</div>

        <!-- 窗口控制按钮 -->
        <div class="titlebar-actions">
          <div class="titlebar-btn" @click="minimizeWindow" title="最小化">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="5.5" width="8" height="1" rx="0.5" />
            </svg>
          </div>
          <div class="titlebar-btn" @click="toggleMaximize" title="最大化">
            <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1">
              <rect x="2.5" y="2.5" width="7" height="7" rx="0.5" />
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M3.5 2.5h4v4h-4z M5.5 5.5h4v4h-4z" />
            </svg>
          </div>
          <div class="titlebar-btn close" @click="closeWindow" title="关闭">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 5.293l3.146-3.147.708.708L6.707 6l3.147 3.146-.708.708L6 6.707l-3.146 3.147-.708-.708L5.293 6 2.146 2.854l.708-.708L6 5.293z" />
            </svg>
          </div>
        </div>
      </div>
    </header>

    <!-- ========== 主布局区域 ========== -->
    <div class="main-layout">
      <!-- 侧边栏 -->
      <Sidebar />

      <!-- 内容区域 -->
      <div class="content-area">
        <!-- 主内容区 -->
        <div class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>

        <!-- 预览面板拖拽条 -->
        <div
          v-if="settingStore.previewPanelVisible"
          class="preview-resizer"
          :class="{ resizing: isResizing }"
          @mousedown="startResize"
        >
          <div class="resizer-handle"></div>
        </div>

        <!-- 预览面板 -->
        <PreviewPanel v-if="settingStore.previewPanelVisible" />

        <!-- 打印面板 -->
        <PrintPanel v-if="printStore.isPanelVisible" @close="printStore.hidePanel()" />
      </div>
    </div>

    <!-- ========== 底部状态栏 ========== -->
    <footer class="statusbar">
      <!-- 左侧信息 -->
      <div class="statusbar-left">
        <div class="statusbar-item">
          <span class="statusbar-icon">📍</span>
          <span>{{ currentPageTitle }}</span>
        </div>
        <div class="statusbar-divider"></div>
        <div class="statusbar-item">
          <span class="statusbar-icon">📄</span>
          <span>共 {{ taskStore.totalCount }} 个任务</span>
        </div>
      </div>

      <!-- 右侧状态 -->
      <div class="statusbar-right">
        <!-- 任务进度 -->
        <div v-if="hasRunningTask" class="statusbar-progress">
          <span class="statusbar-icon">⚙️</span>
          <div class="statusbar-progress-bar">
            <div class="statusbar-progress-fill" :style="{ width: taskProgress + '%' }"></div>
          </div>
          <span>{{ taskProgress }}%</span>
        </div>

        <div v-if="hasRunningTask" class="statusbar-divider"></div>

        <!-- 网络状态 -->
        <div class="statusbar-item" title="纯离线运行">
          <span class="statusbar-icon">🔒</span>
          <span>纯离线</span>
        </div>

        <div class="statusbar-divider"></div>

        <!-- 版本信息 -->
        <div class="statusbar-item">
          <span class="statusbar-icon">v1.0.0</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* 组件级样式可以在这里添加 */
</style>
