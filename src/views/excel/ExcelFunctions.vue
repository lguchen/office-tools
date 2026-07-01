<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NCard, NTag, NIcon, NMenu, NScrollbar, NCollapse, NCollapseItem } from 'naive-ui'
import { SearchOutline, CopyOutline, CheckmarkOutline } from '@vicons/ionicons5'
import { excelFunctions, excelFunctionCategories } from '../../data/excelFunctions'
import { useNotification } from 'naive-ui'
import { useSettingsStore } from '../../stores/settings'
import type { ExcelFunction } from '../../data/excelFunctions'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

// 搜索关键词
const searchQuery = ref('')
// 当前选中的分类
const selectedCategory = ref<string | null>(null)
// 复制成功的语法
const copiedSyntax = ref<string | null>(null)
// 展开的卡片
const expandedNames = ref<string[]>([])

// 根据分类和搜索过滤函数
const filteredFunctions = computed(() => {
  let result = excelFunctions

  // 按分类过滤
  if (selectedCategory.value) {
    result = result.filter(f => f.category === selectedCategory.value)
  }

  // 按搜索关键词过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(f =>
      f.name.toLowerCase().includes(query) ||
      f.description.toLowerCase().includes(query) ||
      f.syntax.toLowerCase().includes(query) ||
      (f.tip && f.tip.toLowerCase().includes(query))
    )
  }

  return result
})

// 复制语法到剪贴板
const handleCopy = async (syntax: string) => {
  try {
    await navigator.clipboard.writeText(syntax)
    copiedSyntax.value = syntax
    notification.success({ title: '复制成功', content: `已复制: ${syntax}`, duration: 1500 })
    setTimeout(() => {
      copiedSyntax.value = null
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
  ...excelFunctionCategories.map(cat => ({
    label: cat,
    key: cat
  }))
])

// 处理菜单选择
const handleMenuSelect = (key: string) => {
  selectedCategory.value = key === 'all' ? null : key
}

// 切换卡片展开
const toggleExpand = (name: string) => {
  const index = expandedNames.value.indexOf(name)
  if (index === -1) {
    expandedNames.value.push(name)
  } else {
    expandedNames.value.splice(index, 1)
  }
}
</script>

<template>
  <div class="h-full flex flex-col p-4">
    <!-- 标题 -->
    <div class="mb-4 flex-shrink-0">
      <h2 class="text-xl font-bold" :class="isDark ? 'text-blue-400' : 'text-blue-600'">Excel函数说明</h2>
      <p class="mt-1 text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">查询Excel常用函数的语法和用法</p>
    </div>

    <!-- 搜索框 -->
    <div class="mb-4 flex-shrink-0">
      <NInput
        v-model:value="searchQuery"
        placeholder="搜索函数名称或描述..."
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

      <!-- 右侧函数列表 -->
      <div class="flex-1 min-h-0 rounded-lg border overflow-hidden"
        :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'"
      >
        <div class="px-4 py-2 border-b font-medium"
          :class="isDark ? 'border-gray-700 text-gray-200' : 'border-gray-200 text-gray-700'"
        >
          函数列表
          <span class="ml-2 text-sm font-normal" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
            共 {{ filteredFunctions.length }} 个
          </span>
        </div>
        <NScrollbar class="h-[calc(100%-40px)]">
          <div class="p-4">
            <div v-if="filteredFunctions.length === 0" class="text-center py-8" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              没有找到匹配的函数
            </div>
            <div v-else class="space-y-3">
              <NCard
                v-for="func in filteredFunctions"
                :key="func.name"
                size="small"
                hoverable
                class="cursor-pointer transition-all"
                :class="isDark ? 'bg-gray-700' : 'bg-gray-50'"
              >
                <!-- 函数头部 -->
                <div class="flex items-center justify-between" @click="toggleExpand(func.name)">
                  <div class="flex items-center gap-2">
                    <NTag type="info" size="small" class="font-mono font-bold">{{ func.name }}</NTag>
                    <span class="text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-700'">{{ func.description }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <NTag size="small" :bordered="false">{{ func.category }}</NTag>
                    <span class="text-xs transition-transform" :class="[
                      isDark ? 'text-gray-400' : 'text-gray-500',
                      expandedNames.includes(func.name) ? 'rotate-180' : ''
                    ]">▼</span>
                  </div>
                </div>

                <!-- 展开内容 -->
                <div v-if="expandedNames.includes(func.name)" class="mt-3 space-y-3">
                  <!-- 语法 -->
                  <div>
                    <div class="text-xs font-medium mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">语法</div>
                    <div
                      class="flex items-center gap-2 px-3 py-2 rounded font-mono text-sm cursor-pointer hover:opacity-80"
                      :class="isDark ? 'bg-gray-600 text-green-400' : 'bg-gray-200 text-green-600'"
                      @click.stop="handleCopy(func.syntax)"
                    >
                      <span>{{ func.syntax }}</span>
                      <NIcon v-if="copiedSyntax === func.syntax" :size="14" class="text-green-400">
                        <CheckmarkOutline />
                      </NIcon>
                      <NIcon v-else :size="14">
                        <CopyOutline />
                      </NIcon>
                    </div>
                  </div>

                  <!-- 参数 -->
                  <div v-if="func.parameters.length > 0">
                    <div class="text-xs font-medium mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">参数说明</div>
                    <div class="space-y-1">
                      <div v-for="(param, idx) in func.parameters" :key="idx" class="flex text-sm">
                        <span class="font-mono font-medium w-24 flex-shrink-0" :class="isDark ? 'text-blue-400' : 'text-blue-600'">{{ param.name }}</span>
                        <span :class="isDark ? 'text-gray-300' : 'text-gray-600'">{{ param.description }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 示例 -->
                  <div>
                    <div class="text-xs font-medium mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">示例</div>
                    <div class="px-3 py-2 rounded font-mono text-sm" :class="isDark ? 'bg-gray-600 text-yellow-400' : 'bg-gray-200 text-yellow-600'">
                      {{ func.example }}
                    </div>
                  </div>

                  <!-- 提示 -->
                  <div v-if="func.tip">
                    <div class="text-xs font-medium mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">提示</div>
                    <div class="text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-600'">
                      💡 {{ func.tip }}
                    </div>
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