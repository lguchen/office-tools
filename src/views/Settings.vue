<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingStore, type ThemeMode, type Language } from '@/stores/setting'
import { useTaskStore } from '@/stores/task'
import {
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NMenu,
  NH3,
  NCard,
  NSpace,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NSwitch,
  NSelect,
  NSlider,
  NColorPicker,
  NDivider,
  NDescriptions,
  NDescriptionsItem,
  NTag,
  NEmpty,
  NIcon,
  useMessage,
  type MenuOption
} from 'naive-ui'

const settingStore = useSettingStore()
const taskStore = useTaskStore()
const message = useMessage()

// 当前激活的设置菜单
const activeKey = ref('general')

// 设置菜单项
const menuOptions: MenuOption[] = [
  {
    label: '通用设置',
    key: 'general',
    icon: () => h('span', { style: 'font-size: 16px;' }, '⚙️')
  },
  {
    label: '外观设置',
    key: 'appearance',
    icon: () => h('span', { style: 'font-size: 16px;' }, '🎨')
  },
  {
    label: '托盘设置',
    key: 'tray',
    icon: () => h('span', { style: 'font-size: 16px;' }, '📥')
  },
  {
    label: '文件关联',
    key: 'file-association',
    icon: () => h('span', { style: 'font-size: 16px;' }, '📁')
  },
  {
    label: '快捷键',
    key: 'shortcuts',
    icon: () => h('span', { style: 'font-size: 16px;' }, '⌨️')
  },
  {
    label: '关于',
    key: 'about',
    icon: () => h('span', { style: 'font-size: 16px;' }, 'ℹ️')
  }
]

// 主题选项
const themeOptions = [
  { label: '浅色模式', value: 'light' as ThemeMode },
  { label: '深色模式', value: 'dark' as ThemeMode },
  { label: '跟随系统', value: 'auto' as ThemeMode }
]

// 语言选项
const languageOptions = [
  { label: '简体中文', value: 'zh-CN' as Language },
  { label: 'English', value: 'en-US' as Language }
]

// 预设主色调
const presetColors = [
  '#1677ff',
  '#13c2c2',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#eb2f96',
  '#fa8c16'
]

// 应用版本号
const appVersion = 'v1.0.0'

// 技术栈列表
const techStack = [
  { name: 'Tauri', version: '2.0' },
  { name: 'Vue', version: '3.4' },
  { name: 'Naive UI', version: '2.38' },
  { name: 'Pinia', version: '2.1' },
  { name: 'Rust', version: '1.x' }
]

// 选择输出目录
const selectOutputDir = async () => {
  try {
    if (window.__TAURI_INTERNALS__) {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const dir = await open({ directory: true, multiple: false })
      if (dir) {
        settingStore.outputDir = dir as string
        message.success('输出目录已更新')
      }
    } else {
      message.warning('浏览器环境下无法选择本地目录')
    }
  } catch (e) {
    console.error(e)
    message.error('选择目录失败')
  }
}

// 重置输出目录
const resetOutputDir = () => {
  settingStore.outputDir = ''
  message.info('已重置为默认输出目录')
}

// 导出日志
const exportLogs = () => {
  const text = taskStore.exportLogs()
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `任务日志_${new Date().toLocaleDateString().replace(/\//g, '-')}.txt`
  a.click()
  URL.revokeObjectURL(url)
  message.success('日志已导出')
}

// 清空日志
const clearLogs = () => {
  taskStore.clearTasks()
  message.info('日志已清空')
}

// 处理快捷键输入
const handleShortcutInput = (key: keyof typeof settingStore.shortcuts, event: KeyboardEvent) => {
  event.preventDefault()
  const keys: string[] = []
  if (event.ctrlKey) keys.push('Ctrl')
  if (event.shiftKey) keys.push('Shift')
  if (event.altKey) keys.push('Alt')
  if (event.metaKey) keys.push('Meta')

  // 排除修饰键本身
  const keyName = event.key
  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(keyName)) {
    keys.push(keyName === ' ' ? 'Space' : keyName.length === 1 ? keyName.toUpperCase() : keyName)
  }

  if (keys.length > 0) {
    settingStore.updateShortcut(key, keys.join('+'))
  }
}

// 应用启动时加载设置
onMounted(() => {
  settingStore.loadSettings()
})

// 辅助函数：创建图标 VNode
const h = (tag: string, props: any, children?: any) => {
  return { tag, props, children }
}
</script>

<template>
  <div class="settings-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <NH3 style="margin: 0;">⚙️ 系统设置</NH3>
      <p class="page-subtitle">个性化配置与系统选项</p>
    </div>

    <!-- 主内容区：左右分栏布局 -->
    <NLayout has-sider style="height: calc(100vh - 160px); min-height: 500px;">
      <!-- 左侧菜单 -->
      <NLayoutSider
        width="200"
        bordered
        style="background: var(--bg-secondary);"
      >
        <NMenu
          :options="menuOptions"
          :value="activeKey"
          :indent="24"
          @update:value="(v: string) => (activeKey = v)"
          style="border-right: none;"
        />
      </NLayoutSider>

      <!-- 右侧内容 -->
      <NLayoutContent
        style="padding: 24px; overflow-y: auto; background: var(--bg-color);"
      >
        <!-- 通用设置 -->
        <div v-show="activeKey === 'general'" class="settings-content">
          <NCard title="通用设置" bordered :border-radius="8">
            <NForm label-placement="left" label-width="120">
              <NFormItem label="主题模式">
                <NSpace>
                  <div
                    v-for="opt in themeOptions"
                    :key="opt.value"
                    class="theme-option"
                    :class="{ active: settingStore.theme === opt.value }"
                    @click="settingStore.toggleTheme(opt.value)"
                  >
                    <span class="theme-icon">
                      {{ opt.value === 'light' ? '☀️' : opt.value === 'dark' ? '🌙' : '🖥️' }}
                    </span>
                    <span>{{ opt.label }}</span>
                  </div>
                </NSpace>
              </NFormItem>

              <NFormItem label="界面语言">
                <NSelect
                  v-model:value="settingStore.language"
                  :options="languageOptions"
                  style="width: 200px;"
                  @update:value="() => message.info('语言设置将在下次启动时生效')"
                />
              </NFormItem>

              <NFormItem label="默认输出目录">
                <NSpace>
                  <NInput
                    :value="settingStore.outputDir || '原文件夹/output'"
                    readonly
                    style="width: 400px;"
                  />
                  <NButton type="primary" @click="selectOutputDir">选择目录</NButton>
                  <NButton @click="resetOutputDir">重置</NButton>
                </NSpace>
              </NFormItem>

              <NFormItem label="开机自启">
                <NSwitch
                  v-model:value="settingStore.autoStart"
                  @update:value="(v: boolean) => message.success(v ? '已开启开机自启' : '已关闭开机自启')"
                />
              </NFormItem>
            </NForm>
          </NCard>
        </div>

        <!-- 外观设置 -->
        <div v-show="activeKey === 'appearance'" class="settings-content">
          <NCard title="外观设置" bordered :border-radius="8">
            <NForm label-placement="left" label-width="120">
              <NFormItem label="主色调">
                <NSpace vertical>
                  <NSpace>
                    <div
                      v-for="color in presetColors"
                      :key="color"
                      class="color-preset"
                      :style="{ backgroundColor: color }"
                      :class="{ active: settingStore.primaryColor === color }"
                      @click="settingStore.setPrimaryColor(color)"
                    />
                    <NColorPicker
                      v-model:value="settingStore.primaryColor"
                      :show-alpha="false"
                      @update:value="(v: string) => settingStore.setPrimaryColor(v)"
                    />
                  </NSpace>
                </NSpace>
              </NFormItem>

              <NFormItem label="窗口透明度">
                <div style="width: 300px;">
                  <NSlider
                    v-model:value="settingStore.windowOpacity"
                    :min="0.5"
                    :max="1"
                    :step="0.05"
                    @update:value="(v: number) => settingStore.setWindowOpacity(v)"
                  />
                  <div style="text-align: right; color: var(--text-tertiary); font-size: 12px; margin-top: 4px;">
                    {{ Math.round(settingStore.windowOpacity * 100) }}%
                  </div>
                </div>
              </NFormItem>

              <NFormItem label="磨砂效果">
                <NSwitch
                  v-model:value="settingStore.acrylicEffect"
                  @update:value="(v: boolean) => {
                    message.success(v ? '已开启磨砂效果' : '已关闭磨砂效果')
                  }"
                />
              </NFormItem>
            </NForm>
          </NCard>
        </div>

        <!-- 托盘设置 -->
        <div v-show="activeKey === 'tray'" class="settings-content">
          <NCard title="托盘设置" bordered :border-radius="8">
            <NForm label-placement="left" label-width="160">
              <NFormItem label="关闭时最小化到托盘">
                <NSwitch v-model:value="settingStore.minimizeToTray" />
              </NFormItem>

              <NFormItem label="托盘气泡提示">
                <NSwitch v-model:value="settingStore.trayNotification" />
              </NFormItem>

              <NFormItem label="显示预览面板">
                <NSwitch v-model:value="settingStore.previewPanelVisible" />
              </NFormItem>
            </NForm>

            <NDivider />

            <div style="font-size: 13px; color: var(--text-tertiary); line-height: 1.6;">
              <p>💡 提示：开启最小化到托盘后，点击关闭按钮不会退出程序，而是最小化到系统托盘。</p>
              <p style="margin-top: 8px;">💡 托盘气泡提示会在任务完成、错误发生时通过系统通知提醒您。</p>
            </div>
          </NCard>
        </div>

        <!-- 文件关联设置 -->
        <div v-show="activeKey === 'file-association'" class="settings-content">
          <NCard title="文件关联设置" bordered :border-radius="8">
            <p style="margin-bottom: 16px; color: var(--text-secondary); font-size: 13px;">
              选择要与本软件关联的文件类型，双击这些文件时将使用本软件打开
            </p>
            <NForm label-placement="left" label-width="120">
              <NFormItem label="PDF 文件">
                <NSwitch
                  v-model:value="settingStore.fileAssociation.pdf"
                  @update:value="(v: boolean) => settingStore.updateFileAssociation('pdf', v)"
                />
              </NFormItem>

              <NFormItem label="Word 文档">
                <NSwitch
                  v-model:value="settingStore.fileAssociation.docx"
                  @update:value="(v: boolean) => settingStore.updateFileAssociation('docx', v)"
                />
              </NFormItem>

              <NFormItem label="Excel 表格">
                <NSwitch
                  v-model:value="settingStore.fileAssociation.xlsx"
                  @update:value="(v: boolean) => settingStore.updateFileAssociation('xlsx', v)"
                />
              </NFormItem>

              <NFormItem label="文本文件">
                <NSwitch
                  v-model:value="settingStore.fileAssociation.txt"
                  @update:value="(v: boolean) => settingStore.updateFileAssociation('txt', v)"
                />
              </NFormItem>

              <NFormItem label="PNG 图片">
                <NSwitch
                  v-model:value="settingStore.fileAssociation.png"
                  @update:value="(v: boolean) => settingStore.updateFileAssociation('png', v)"
                />
              </NFormItem>

              <NFormItem label="JPG 图片">
                <NSwitch
                  v-model:value="settingStore.fileAssociation.jpg"
                  @update:value="(v: boolean) => settingStore.updateFileAssociation('jpg', v)"
                />
              </NFormItem>
            </NForm>

            <NDivider />

            <div style="text-align: right;">
              <NButton type="primary" @click="message.success('文件关联设置已应用')">应用设置</NButton>
            </div>
          </NCard>
        </div>

        <!-- 快捷键设置 -->
        <div v-show="activeKey === 'shortcuts'" class="settings-content">
          <NCard title="快捷键设置" bordered :border-radius="8">
            <p style="margin-bottom: 16px; color: var(--text-secondary); font-size: 13px;">
              点击输入框后按下您想要的快捷键组合
            </p>
            <NForm label-placement="left" label-width="160">
              <NFormItem label="显示/隐藏主窗口">
                <NInput
                  :value="settingStore.shortcuts.showMainWindow"
                  readonly
                  style="width: 200px;"
                  @keydown="(e: KeyboardEvent) => handleShortcutInput('showMainWindow', e)"
                  placeholder="点击后按快捷键"
                />
              </NFormItem>

              <NFormItem label="快速截图">
                <NInput
                  :value="settingStore.shortcuts.quickCapture"
                  readonly
                  style="width: 200px;"
                  @keydown="(e: KeyboardEvent) => handleShortcutInput('quickCapture', e)"
                  placeholder="点击后按快捷键"
                />
              </NFormItem>

              <NFormItem label="全屏截图">
                <NInput
                  :value="settingStore.shortcuts.screenshot"
                  readonly
                  style="width: 200px;"
                  @keydown="(e: KeyboardEvent) => handleShortcutInput('screenshot', e)"
                  placeholder="点击后按快捷键"
                />
              </NFormItem>
            </NForm>

            <NDivider />

            <div style="text-align: right;">
              <NButton @click="message.info('已恢复默认快捷键')">恢复默认</NButton>
            </div>
          </NCard>
        </div>

        <!-- 关于页面 -->
        <div v-show="activeKey === 'about'" class="settings-content">
          <NCard title="关于" bordered :border-radius="8">
            <div style="text-align: center; padding: 20px 0;">
              <div class="app-logo">📦</div>
              <div style="font-size: 18px; font-weight: 600; margin-top: 12px;">轻办公文档助手</div>
              <div style="color: var(--text-secondary); margin-top: 4px;">{{ appVersion }}</div>
              <NTag style="margin-top: 8px;" type="success" size="small">
                纯本地离线
              </NTag>
            </div>

            <NDivider />

            <div style="margin-top: 20px;">
              <div style="font-weight: 500; margin-bottom: 12px;">技术栈</div>
              <NDescriptions :column="2" bordered :label-style="{ width: '120px' }">
                <NDescriptionsItem v-for="tech in techStack" :key="tech.name" :label="tech.name">
                  {{ tech.version }}
                </NDescriptionsItem>
              </NDescriptions>
            </div>

            <NDivider />

            <div style="margin-top: 20px;">
              <div style="font-weight: 500; margin-bottom: 12px;">致谢</div>
              <div style="color: var(--text-secondary); font-size: 13px; line-height: 1.8;">
                <p>感谢所有开源项目的贡献者，是你们让这个项目成为可能。</p>
                <p style="margin-top: 8px;">特别感谢：</p>
                <ul style="padding-left: 20px; margin-top: 4px;">
                  <li>Tauri 团队 - 提供强大的桌面应用框架</li>
                  <li>Vue.js 团队 - 提供优秀的前端框架</li>
                  <li>Naive UI 团队 - 提供精美的 UI 组件库</li>
                </ul>
              </div>
            </div>

            <NDivider />

            <div style="margin-top: 20px;">
              <div style="font-weight: 500; margin-bottom: 12px;">日志管理</div>
              <NSpace>
                <NButton @click="exportLogs">导出日志</NButton>
                <NButton @click="clearLogs" type="warning">清空日志</NButton>
                <span style="color: var(--text-tertiary); font-size: 13px;">
                  当前日志：{{ taskStore.logs.length }} 条
                </span>
              </NSpace>
            </div>

            <div style="text-align: center; color: var(--text-tertiary); font-size: 12px; margin-top: 30px;">
              <p>© 2024 轻办公文档助手 All Rights Reserved</p>
              <p style="margin-top: 4px;">Made with ❤️ by 小罗</p>
            </div>
          </NCard>
        </div>
      </NLayoutContent>
    </NLayout>
  </div>
</template>

<style scoped>
.settings-page {
  height: 100%;
}

.page-header {
  margin-bottom: 16px;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 4px 0 0 0;
}

.settings-content {
  max-width: 700px;
}

/* 主题选项样式 */
.theme-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--bg-color);
  font-size: 14px;
}

.theme-option:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.theme-option.active {
  border-color: var(--primary-color);
  background: rgba(22, 119, 255, 0.08);
  color: var(--primary-color);
  font-weight: 500;
}

.theme-icon {
  font-size: 18px;
}

/* 预设颜色 */
.color-preset {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s ease;
}

.color-preset:hover {
  transform: scale(1.1);
}

.color-preset.active {
  border-color: white;
  box-shadow: 0 0 0 2px var(--primary-color);
}

/* 应用 Logo */
.app-logo {
  width: 80px;
  height: 80px;
  margin: 0 auto;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.3);
}

/* 覆盖 Naive UI 暗色模式样式 */
:deep(.n-layout) {
  background: var(--bg-color);
}

:deep(.n-layout-sider) {
  background: var(--bg-secondary) !important;
}

:deep(.n-menu) {
  background: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
}

:deep(.n-card) {
  background: var(--bg-color) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

:deep(.n-card__header) {
  border-color: var(--border-color) !important;
}

:deep(.n-input) {
  background: var(--bg-color) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

:deep(.n-input__input-el) {
  color: var(--text-primary) !important;
}

:deep(.n-select) {
  background: var(--bg-color) !important;
  border-color: var(--border-color) !important;
}

:deep(.n-select .n-base-selection-label) {
  color: var(--text-primary) !important;
}

:deep(.n-descriptions .n-descriptions-table-wrapper) {
  border-color: var(--border-color) !important;
}

:deep(.n-descriptions-item__label) {
  background: var(--bg-secondary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-secondary) !important;
}

:deep(.n-descriptions-item__content) {
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

:deep(.n-divider) {
  background-color: var(--border-color) !important;
}
</style>
