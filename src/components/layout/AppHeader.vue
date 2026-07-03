<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NInput, NIcon } from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'

const router = useRouter()

const searchQuery = ref('')
const searchResults = ref<Array<{ label: string; path: string }>>([])

const tools = [
  { label: 'PDF合并', path: '/pdf/merge' },
  { label: 'PDF拆分', path: '/pdf/split' },
  { label: 'PDF压缩', path: '/pdf/compress' },
  { label: 'PDF转图片', path: '/pdf/to-images' },
  { label: 'Excel转换', path: '/convert/excel' },
  { label: 'Markdown转换', path: '/convert/markdown' },
  { label: '文本替换', path: '/text/replace' },
  { label: '文本去重', path: '/text/dedup' },
  { label: '文本排序', path: '/text/sort' },
  { label: '文本统计', path: '/text/stats' },
  { label: 'Base64编码', path: '/codec/base64' },
  { label: 'URL编码', path: '/codec/url' },
  { label: '哈希计算', path: '/codec/hash' },
  { label: 'JSON格式化', path: '/json/format' },
  { label: 'JSON校验', path: '/json/validate' }
]

const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  const query = searchQuery.value.toLowerCase()
  searchResults.value = tools.filter(t => t.label.toLowerCase().includes(query)).slice(0, 5)
}

const selectResult = (path: string) => {
  router.push(path)
  searchQuery.value = ''
  searchResults.value = []
}
</script>

<template>
  <header class="h-14 border-b flex items-center px-4 gap-4 transition-colors duration-300 bg-white border-gray-200">
    <div class="flex-1 max-w-md relative">
      <NInput
        v-model:value="searchQuery"
        placeholder="搜索工具..."
        clearable
        @update:value="handleSearch"
        @keyup.enter="searchResults.length > 0 && selectResult(searchResults[0].path)"
      >
        <template #prefix>
          <NIcon><SearchOutline /></NIcon>
        </template>
      </NInput>
      <div
        v-if="searchResults.length > 0"
        class="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-50 overflow-hidden transition-colors duration-300 bg-white border border-gray-200"
      >
        <div
          v-for="result in searchResults"
          :key="result.path"
          class="px-4 py-2 cursor-pointer transition-colors duration-200 hover:bg-gray-100"
          @click="selectResult(result.path)"
        >
          {{ result.label }}
        </div>
      </div>
    </div>
  </header>
</template>
