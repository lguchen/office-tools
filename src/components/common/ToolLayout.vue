<script setup lang="ts">
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

</script>

<template>
  <div class="tool-layout h-full flex flex-col p-4">
    <div class="mb-4 flex-shrink-0">
      <h2 class="text-xl font-bold text-blue-600">{{ title }}</h2>
      <p v-if="description" class="mt-1 text-sm text-gray-500">{{ description }}</p>
    </div>
    <div
      class="flex-1 flex gap-4 min-h-0"
      :class="{ 'flex-col lg:flex-row': showOutput }"
    >
      <div class="flex-1 flex flex-col min-h-0 rounded-lg border overflow-hidden bg-white border-gray-200"
      >
        <div class="px-4 py-2 border-b font-medium flex-shrink-0 border-gray-200 text-gray-700"
        >
          输入
        </div>
        <div class="flex-1 p-4 overflow-auto min-h-0">
          <slot name="input" />
        </div>
      </div>
      <div v-if="showOutput" class="flex-1 flex flex-col min-h-0 rounded-lg border overflow-hidden bg-white border-gray-200"
      >
        <div class="px-4 py-2 border-b font-medium flex-shrink-0 border-gray-200 text-gray-700"
        >
          输出
        </div>
        <div class="flex-1 p-4 overflow-auto min-h-0">
          <slot name="output" />
        </div>
      </div>
      <div v-else class="flex-1 flex flex-col min-h-0 rounded-lg border overflow-hidden bg-white border-gray-200"
      >
        <div class="flex-1 p-4 overflow-auto min-h-0">
          <slot name="output" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-layout {
  height: 100%;
}
</style>
