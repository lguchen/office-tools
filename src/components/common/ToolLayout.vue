<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NSpace, NButton } from 'naive-ui'
import { useSettingsStore } from '../../stores/settings'

interface Props {
  title: string
  description?: string
  showOutput?: boolean
}

withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
  showOutput: true
})

const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')
</script>

<template>
  <div class="tool-layout h-full flex flex-col">
    <div class="mb-4">
      <h2 class="text-2xl font-bold" :class="isDark ? 'text-blue-400' : 'text-blue-600'">{{ title }}</h2>
      <p v-if="description" class="mt-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">{{ description }}</p>
    </div>
    <div class="flex-1 grid grid-cols-1 gap-4" :class="{ 'lg:grid-cols-2': showOutput }">
      <NCard title="输入" class="h-full">
        <slot name="input" />
      </NCard>
      <NCard v-if="showOutput" title="输出" class="h-full">
        <slot name="output" />
      </NCard>
      <NCard v-else class="h-full">
        <slot name="output" />
      </NCard>
    </div>
  </div>
</template>

<style scoped>
.tool-layout {
  height: calc(100vh - 8rem);
}
</style>
