<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingStore } from '@/stores/setting'

const settingStore = useSettingStore()
const isMaximized = ref(false)

const themeLabel = computed(() => {
  if (settingStore.theme === 'light') return '☀'
  if (settingStore.theme === 'dark') return '🌙'
  return '🖥'
})

const minimize = () => {
  // ponytail: Tauri API 调用，浏览器环境降级
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

const close = () => {
  if (window.__TAURI_INTERNALS__) {
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().close()
    })
  } else {
    window.close()
  }
}

const toggleTheme = () => {
  const modes = ['light', 'dark', 'auto'] as const
  const idx = modes.indexOf(settingStore.theme as any)
  const next = modes[(idx + 1) % modes.length]
  settingStore.toggleTheme(next as any)
}
</script>

<template>
  <div class="titlebar">
    <div class="titlebar-drag">
      <div class="titlebar-logo">轻</div>
      <span class="titlebar-title">轻办公文档助手</span>
    </div>
    <div class="titlebar-actions">
      <div class="titlebar-btn" @click="settingStore.togglePreviewPanel()" title="切换预览面板">
        {{ settingStore.previewPanelVisible ? '👁' : '🙈' }}
      </div>
      <div class="titlebar-btn" @click="toggleTheme" :title="'主题：' + settingStore.theme">
        {{ themeLabel }}
      </div>
      <div class="titlebar-btn" @click="minimize" title="最小化">
        —
      </div>
      <div class="titlebar-btn" @click="toggleMaximize" title="最大化">
        ▢
      </div>
      <div class="titlebar-btn close" @click="close" title="关闭">
        ✕
      </div>
    </div>
  </div>
</template>
