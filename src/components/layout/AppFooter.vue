<script setup lang="ts">
import { useTheme } from '../../composables/useTheme'

const { isDark } = useTheme()
</script>

<template>
  <footer
    class="h-8 border-t flex items-center px-4 text-sm transition-colors duration-300"
    :class="isDark
      ? 'bg-gray-800 border-gray-700 text-gray-500'
      : 'bg-white border-gray-200 text-gray-400'
    "
  >
    <span>轻量化办公文档工具箱 v1.0.0</span>
    <span class="flex-1"></span>
    <span>完全离线 · 秒开即用</span>
  </footer>
</template>
