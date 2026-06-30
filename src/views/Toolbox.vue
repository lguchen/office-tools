<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NH3,
  NInput,
  NGrid,
  NGi,
  NCard,
  NTag,
  NEmpty,
  NSpace,
  NButton,
  useMessage
} from 'naive-ui'

const router = useRouter()
const message = useMessage()

// 搜索关键词
const searchKeyword = ref('')

// 当前选中的分类
const activeCategory = ref<string>('all')

// 工具分类
const categories = [
  { key: 'all', label: '全部', icon: '📦' },
  { key: 'file', label: '文件处理', icon: '📁' },
  { key: 'image', label: '图片工具', icon: '🖼️' },
  { key: 'text', label: '文本工具', icon: '📝' },
  { key: 'encode', label: '编码转换', icon: '🔐' },
  { key: 'developer', label: '开发工具', icon: '⚡' }
]

// 工具列表数据
interface ToolItem {
  id: string
  name: string
  description: string
  icon: string
  category: string
  route?: string
  status: 'available' | 'coming-soon'
}

const tools: ToolItem[] = [
  // 文件处理
  {
    id: 'hash-check',
    name: '文件哈希校验',
    description: '计算文件 MD5、SHA1、SHA256 等哈希值，校验文件完整性',
    icon: '🔍',
    category: 'file',
    status: 'available'
  },
  {
    id: 'batch-rename',
    name: '批量重命名',
    description: '支持多种重命名规则：序号、前缀、后缀、替换等',
    icon: '📝',
    category: 'file',
    route: '/tools',
    status: 'available'
  },
  {
    id: 'encoding-convert',
    name: '编码转换',
    description: 'TXT/CSV 文件编码转换 UTF-8、GBK 等格式互转',
    icon: '🔤',
    category: 'file',
    route: '/tools',
    status: 'available'
  },
  {
    id: 'file-search',
    name: '文件检索',
    description: '按扩展名、关键词快速检索本地文件',
    icon: '🔎',
    category: 'file',
    route: '/tools',
    status: 'available'
  },

  // 图片工具
  {
    id: 'image-compress',
    name: '图片压缩',
    description: '批量压缩 JPG、PNG、WebP 图片，支持质量调节',
    icon: '🗜️',
    category: 'image',
    status: 'coming-soon'
  },
  {
    id: 'image-format',
    name: '图片格式转换',
    description: 'JPG、PNG、WebP、GIF、BMP 等格式互转',
    icon: '🔄',
    category: 'image',
    status: 'coming-soon'
  },
  {
    id: 'qrcode',
    name: '二维码生成',
    description: '生成自定义内容的二维码，支持 Logo、颜色自定义',
    icon: '📱',
    category: 'image',
    status: 'available'
  },
  {
    id: 'screenshot',
    name: '截图工具',
    description: '区域截图、全屏截图、长截图，支持标注',
    icon: '📸',
    category: 'image',
    status: 'coming-soon'
  },

  // 文本工具
  {
    id: 'json-format',
    name: 'JSON 格式化',
    description: 'JSON 格式化、压缩、转义、排序等操作',
    icon: '📋',
    category: 'text',
    status: 'available'
  },
  {
    id: 'text-diff',
    name: '文本对比',
    description: '对比两段文本的差异，高亮显示不同之处',
    icon: '📊',
    category: 'text',
    status: 'coming-soon'
  },
  {
    id: 'regex-test',
    name: '正则表达式测试',
    description: '实时测试正则表达式，显示匹配结果',
    icon: '🎯',
    category: 'text',
    status: 'coming-soon'
  },

  // 编码转换
  {
    id: 'base64',
    name: 'Base64 转换',
    description: '文本、图片、文件与 Base64 互转',
    icon: '🔐',
    category: 'encode',
    status: 'available'
  },
  {
    id: 'url-encode',
    name: 'URL 编码解码',
    description: 'URL 编码与解码工具',
    icon: '🌐',
    category: 'encode',
    status: 'available'
  },
  {
    id: 'unicode',
    name: 'Unicode 转换',
    description: '中文与 Unicode 编码互转',
    icon: '🔡',
    category: 'encode',
    status: 'coming-soon'
  },

  // 开发工具
  {
    id: 'color-picker',
    name: '颜色取色器',
    description: '屏幕取色，支持 RGB、HEX、HSL 格式转换',
    icon: '🎨',
    category: 'developer',
    status: 'coming-soon'
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    description: 'Unix 时间戳与日期时间互转',
    icon: '⏰',
    category: 'developer',
    status: 'available'
  },
  {
    id: 'uuid-gen',
    name: 'UUID 生成器',
    description: '批量生成 UUID v1、v4',
    icon: '🆔',
    category: 'developer',
    status: 'available'
  },
  {
    id: 'ip-query',
    name: 'IP 地址查询',
    description: '查询 IP 地址归属地、运营商等信息',
    icon: '🌍',
    category: 'developer',
    status: 'coming-soon'
  }
]

// 计算过滤后的工具列表
const filteredTools = computed(() => {
  let result = tools

  // 分类筛选
  if (activeCategory.value !== 'all') {
    result = result.filter((tool) => tool.category === activeCategory.value)
  }

  // 搜索筛选
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase().trim()
    result = result.filter(
      (tool) =>
        tool.name.toLowerCase().includes(keyword) ||
        tool.description.toLowerCase().includes(keyword)
    )
  }

  return result
})

// 点击工具卡片
const handleToolClick = (tool: ToolItem) => {
  if (tool.status === 'coming-soon') {
    message.info('该功能即将上线，敬请期待~')
    return
  }

  if (tool.route) {
    router.push(tool.route)
  } else {
    message.info(`正在打开 ${tool.name}...`)
  }
}

// 切换分类
const switchCategory = (category: string) => {
  activeCategory.value = category
}
</script>

<template>
  <div class="toolbox-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <NH3 style="margin: 0;">🛠️ 工具箱</NH3>
      <p class="page-subtitle">精选实用小工具，提升办公效率</p>
    </div>

    <!-- 搜索和筛选区域 -->
    <div class="toolbar">
      <div class="search-box">
        <NInput
          v-model:value="searchKeyword"
          placeholder="搜索工具..."
          clearable
          size="large"
          style="width: 320px;"
        >
          <template #prefix>
            <span style="font-size: 16px;">🔍</span>
          </template>
        </NInput>
      </div>

      <div class="category-tabs">
        <div
          v-for="cat in categories"
          :key="cat.key"
          class="category-tab"
          :class="{ active: activeCategory === cat.key }"
          @click="switchCategory(cat.key)"
        >
          <span class="category-icon">{{ cat.icon }}</span>
          <span>{{ cat.label }}</span>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <span style="color: var(--text-secondary); font-size: 13px;">
        共找到 <strong style="color: var(--primary-color);">{{ filteredTools.length }}</strong> 个工具
      </span>
    </div>

    <!-- 工具卡片网格 -->
    <div v-if="filteredTools.length > 0" class="tools-grid">
      <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
        <NGi v-for="tool in filteredTools" :key="tool.id">
          <NCard
            class="tool-card"
            hoverable
            :bordered="true"
            :border-radius="8"
            @click="handleToolClick(tool)"
          >
            <div class="tool-card-inner">
              <div class="tool-icon-wrapper">
                <span class="tool-icon">{{ tool.icon }}</span>
              </div>

              <div class="tool-info">
                <div class="tool-name">
                  <span>{{ tool.name }}</span>
                  <NTag
                    v-if="tool.status === 'coming-soon'"
                    size="small"
                    type="warning"
                    style="margin-left: 6px;"
                  >
                    即将上线
                  </NTag>
                </div>
                <div class="tool-desc">{{ tool.description }}</div>
              </div>

              <div class="tool-arrow">
                <span style="color: var(--text-tertiary); font-size: 14px;">→</span>
              </div>
            </div>
          </NCard>
        </NGi>
      </NGrid>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <NEmpty description="没有找到相关工具">
        <NButton type="primary" @click="searchKeyword = ''; activeCategory = 'all'">
          查看全部工具
        </NButton>
      </NEmpty>
    </div>
  </div>
</template>

<style scoped>
.toolbox-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 16px;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 4px 0 0 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.search-box {
  flex-shrink: 0;
}

.category-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.category-tab:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.category-tab.active {
  background: rgba(22, 119, 255, 0.1);
  color: var(--primary-color);
  border-color: var(--primary-color);
  font-weight: 500;
}

.category-icon {
  font-size: 14px;
}

.stats-bar {
  margin-bottom: 12px;
  padding: 0 4px;
}

.tools-grid {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.tool-card {
  cursor: pointer;
  transition: all 0.2s ease !important;
  height: 100%;
}

.tool-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1) !important;
}

.tool-card-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.15), rgba(22, 119, 255, 0.05));
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-icon {
  font-size: 24px;
}

.tool-info {
  flex: 1;
}

.tool-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
}

.tool-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tool-arrow {
  text-align: right;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .tools-grid :deep(.n-grid) {
    grid-template-columns: repeat(3, 1fr) !important;
  }
}

@media (max-width: 900px) {
  .tools-grid :deep(.n-grid) {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

@media (max-width: 600px) {
  .tools-grid :deep(.n-grid) {
    grid-template-columns: 1fr !important;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box :deep(.n-input) {
    width: 100% !important;
  }

  .category-tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }
}

/* 覆盖 Naive UI 暗色模式样式 */
:deep(.n-card) {
  background: var(--bg-color) !important;
  border-color: var(--border-color) !important;
}

:deep(.n-input) {
  background: var(--bg-color) !important;
  border-color: var(--border-color) !important;
}

:deep(.n-input__input-el) {
  color: var(--text-primary) !important;
}

:deep(.n-empty) {
  color: var(--text-tertiary) !important;
}

:deep(.n-empty__description) {
  color: var(--text-tertiary) !important;
}
</style>
