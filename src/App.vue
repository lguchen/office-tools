<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingStore } from '@/stores/setting'
import MainLayout from '@/components/layout/MainLayout.vue'

const settingStore = useSettingStore()

onMounted(async () => {
  settingStore.loadSettings()
})
</script>

<template>
  <MainLayout />
</template>

<style>
/* App 级别的全局样式在 styles/index.css 中定义 */
</style>
