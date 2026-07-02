<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTheme } from '../../composables/useTheme'
import { NInput, NCard, NTag, NButton, NIcon, NMenu, NScrollbar } from 'naive-ui'
import { SearchOutline, CopyOutline, CheckmarkOutline } from '@vicons/ionicons5'
import { excelShortcuts, excelShortcutCategories } from '../../data/excelShortcuts'
import { useNotification } from 'naive-ui'

const notification = useNotification()
const { isDark } = useTheme()

// 搜索关键词
const searchQuery = ref('')
// 当前选中的分类
const selectedCategory = ref<string | null>(null)
// 复制成功的快捷键
const copiedKey = ref<string | null>(null)

// 根据分类和搜索过滤快捷键
const filteredShortcuts = computed(() => {
  let result = excelShortcuts

  // 按分类过滤
  if (selectedCategory.value) {
    result = result.filter(s => s.category === selectedCategory.value)
  }

  // 按搜索关键词过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.keys.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query) ||
      (s.tip && s.tip.toLowerCase().includes(query))
    )
  }

  return result
})

// 复制快捷键到剪贴板
const handleCopy = async (keys: string) => {
  try {
    await navigator.clipboard.writeText(keys)
    copiedKey.value = keys
    notification.success({ title: '复制成功', content: `${keys} 已复制到剪贴板`, duration: 1500 })
    setTimeout(() => {
      copiedKey.value = null
    }, 2000)
  } catch (e) {
    notification.error({ title: '复制失败', content: (e as Error).message })
  }
}

// 菜单选项
const menuOptions = computed(() => [
  {
    label: '全部',
    key: 'all'
  },
  ...excelShortcutCategories.map(cat => ({
    label: cat,
    key: cat
  }))
])

// 处理菜单选择
const handleMenuSelect = (key: string) => {
  selectedCategory.value = key === 'all' ? null : key
}
</script>

<template>
  <div class="h-full flex flex-col p-4">
    <!-- 标题 -->
    <div class="mb-4 flex-shrink-0">
      <h2 class="text-xl font-bold" :class="isDark ? 'text-blue-400' : 'text-blue-600'">Excel快捷键查询</h2>
      <p class="mt-1 text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">快速查找Excel常用快捷键</p>
    </div>

    <!-- 搜索框 -->
    <div class="mb-4 flex-shrink-0">
      <NInput
        v-model:value="searchQuery"
        placeholder="搜索快捷键或描述..."
        clearable
        size="large"
      >
        <template #prefix>
          <NIcon><SearchOutline /></NIcon>
        </template>
      </NInput>
    </div>

    <!-- 主体内容 -->
    <div class="flex-1 flex gap-4 min-h-0">
      <!-- 左侧分类导航 -->
      <div class="w-48 flex-shrink-0 rounded-lg border overflow-hidden"
        :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'"
      >
        <div class="px-4 py-2 border-b font-medium"
          :class="isDark ? 'border-gray-700 text-gray-200' : 'border-gray-200 text-gray-700'"
        >
          分类
        </div>
        <NScrollbar class="max-h-[calc(100%-40px)]">
          <NMenu
            :options="menuOptions"
            :value="selectedCategory || 'all'"
            @update:value="handleMenuSelect"
            :inverted="isDark"
          />
        </NScrollbar>
      </div>

      <!-- 右侧快捷键列表 -->
      <div class="flex-1 min-h-0 rounded-lg border overflow-hidden"
        :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'"
      >
        <div class="px-4 py-2 border-b font-medium"
          :class="isDark ? 'border-gray-700 text-gray-200' : 'border-gray-200 text-gray-700'"
        >
          快捷键列表
          <span class="ml-2 text-sm font-normal" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
            共 {{ filteredShortcuts.length }} 条
          </span>
        </div>
        <NScrollbar class="h-[calc(100%-40px)]">
          <div class="p-4">
            <div v-if="filteredShortcuts.length === 0" class="text-center py-8" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              没有找到匹配的快捷键
            </div>
            <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <NCard
                v-for="shortcut in filteredShortcuts"
                :key="shortcut.keys + shortcut.description"
                size="small"
                hoverable
                class="cursor-pointer transition-all"
                :class="isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'"
                @click="handleCopy(shortcut.keys)"
              >
                <div class="flex items-start gap-3">
                  <!-- 快捷键 -->
                  <div class="flex-shrink-0">
                    <div class="flex items-center gap-1">
                      <NTag
                        v-for="(key, idx) in shortcut.keys.split('+')"
                        :key="idx"
                        :type="copiedKey === shortcut.keys ? 'success' : 'default'"
                        size="small"
                        :bordered="false"
                        class="font-mono font-semibold"
                      >
                        {{ key }}
                      </NTag>
                    </div>
                  </div>
                  <!-- 描述 -->
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                      {{ shortcut.description }}
                    </div>
                    <div v-if="shortcut.tip" class="mt-1 text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                      💡 {{ shortcut.tip }}
                    </div>
                  </div>
                  <!-- 复制图标 -->
                  <div class="flex-shrink-0">
                    <NIcon v-if="copiedKey === shortcut.keys" :size="18" class="text-green-500">
                      <CheckmarkOutline />
                    </NIcon>
                    <NIcon v-else :size="18" :class="isDark ? 'text-gray-400' : 'text-gray-400'">
                      <CopyOutline />
                    </NIcon>
                  </div>
                </div>
              </NCard>
            </div>
          </div>
        </NScrollbar>
      </div>
    </div>
  </div>
</template>