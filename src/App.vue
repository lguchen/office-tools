<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, lightTheme } from 'naive-ui'
import { onMounted } from 'vue'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'
import { useTheme } from './composables/useTheme'

const { injectThemeColors } = useTheme()

onMounted(() => {
  injectThemeColors()
})
</script>

<template>
  <NConfigProvider :theme="lightTheme">
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <div class="h-screen flex flex-col bg-gray-50">
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
