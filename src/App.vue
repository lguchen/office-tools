<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, darkTheme, lightTheme } from 'naive-ui'
import { computed, watch, onMounted } from 'vue'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'
import { useSettingsStore } from './stores/settings'
import { useTheme } from './composables/useTheme'

const settingsStore = useSettingsStore()
const { isDark, injectThemeColors } = useTheme()

const theme = computed(() => {
  return settingsStore.theme === 'dark' ? darkTheme : lightTheme
})

watch(isDark, () => {
  injectThemeColors()
}, { immediate: true })

onMounted(() => {
  injectThemeColors()
})
</script>

<template>
  <NConfigProvider :theme="theme">
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <div
            class="h-screen flex flex-col transition-colors duration-300"
            :class="isDark ? 'bg-gray-900' : 'bg-gray-50'"
          >
            <AppHeader />
            <div class="flex-1 flex overflow-hidden">
              <AppSidebar />
              <main class="flex-1 overflow-auto p-4">
                <router-view />
              </main>
            </div>
            <AppFooter />
          </div>
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
