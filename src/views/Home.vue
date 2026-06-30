<script setup lang="ts">
import { useRouter } from 'vue-router'
// === 新增：Windows兼容拖拽 ===
import { useDragDrop } from '@/composables/useDragDrop'

const router = useRouter()

interface ToolCard {
  name: string
  desc: string
  icon: string
  path: string
  color: string
}

const toolCards: ToolCard[] = [
  { name: 'Excel工具', desc: '合并、拆分、数据清洗、格式转换', icon: '📊', path: '/excel', color: '#217346' },
  { name: 'Word工具', desc: '文档合并、拆分、格式统一、内容处理', icon: '📄', path: '/word', color: '#2b579a' },
  { name: 'PDF工具', desc: '合并、拆分、压缩、格式转换', icon: '📑', path: '/pdf', color: '#d93025' },
  { name: 'OCR识别', desc: '图片文字识别、批量识别、导出表格', icon: '🔍', path: '/ocr', color: '#1677ff' },
  { name: '通用工具', desc: '批量重命名、编码转换、文件检索', icon: '🛠', path: '/tools', color: '#faad14' },
  { name: '系统设置', desc: '主题、输出路径、托盘设置', icon: '⚙', path: '/settings', color: '#8c8c8c' }
]

const recentTasks = [
  { name: 'Q2财务报表合并.xlsx', time: '10分钟前', type: 'Excel合并' },
  { name: '合同文档批量转换.pdf', time: '30分钟前', type: 'Word转PDF' },
  { name: '发票图片识别.xlsx', time: '1小时前', type: 'OCR识别' }
]

// === 新增：Windows兼容拖拽逻辑 ===
const { isDragOver, handleDragOver, handleDragEnter, handleDragLeave, handleDrop, resetDrag } = useDragDrop({
  accept: /\.(xlsx|xls|csv|docx?|doc|pdf|jpg|jpeg|png|bmp|gif|tiff|webp)$/i,
  onFilesDropped: (fileArr) => {
    handleFilesDropped(fileArr)
  }
})

// === 新增：处理拖拽文件，根据文件类型跳转到对应工具 ===
const handleFilesDropped = (files: File[]) => {
  if (files.length === 0) return
  const firstFile = files[0]
  const name = firstFile.name.toLowerCase()

  if (/\.(xlsx|xls|csv)$/i.test(name)) {
    router.push('/excel')
  } else if (/\.(docx?|doc)$/i.test(name)) {
    router.push('/word')
  } else if (/\.pdf$/i.test(name)) {
    router.push('/pdf')
  } else if (/\.(jpg|jpeg|png|bmp|gif|tiff|webp)$/i.test(name)) {
    router.push('/ocr')
  }
}

// === 修改：原 handleFileDrop 替换为统一拖拽逻辑 ===
const handleFileDrop = (e: DragEvent) => {
  handleDrop(e)
}

const goTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div>
    <!-- === 新增：拖拽上传区域 === -->
    <div
      class="drop-zone"
      :class="{ 'drag-over': isDragOver }"
      style="margin-bottom: 20px;"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @drop="handleFileDrop"
    >
      <div style="font-size: 36px; margin-bottom: 8px;">📁</div>
      <div style="font-size: 15px; color: var(--text-primary); margin-bottom: 4px;">拖拽文件到此处，自动识别并跳转</div>
      <div style="font-size: 12px; color: var(--text-tertiary);">支持 Excel、Word、PDF、图片等格式</div>
    </div>

    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 4px;">工作台</h2>
      <p style="color: var(--text-secondary); font-size: 13px;">选择一个工具开始处理您的文档</p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
      <div
        v-for="tool in toolCards"
        :key="tool.path"
        class="tool-card"
        @click="goTo(tool.path)"
      >
        <div class="tool-card-icon" :style="{ background: tool.color + '15', color: tool.color }">
          {{ tool.icon }}
        </div>
        <div style="font-weight: 500; font-size: 15px;">{{ tool.name }}</div>
        <div style="font-size: 12px; color: var(--text-tertiary); line-height: 1.5;">{{ tool.desc }}</div>
      </div>
    </div>

    <div class="card" style="padding: 16px;">
      <div style="font-weight: 500; margin-bottom: 12px; font-size: 15px;">📋 最近任务</div>
      <div v-for="task in recentTasks" :key="task.name" class="file-item" style="border-radius: 4px; border: none; padding: 10px 12px;">
        <span style="font-size: 18px;">📁</span>
        <div style="flex: 1;">
          <div style="font-size: 13px;">{{ task.name }}</div>
          <div style="font-size: 11px; color: var(--text-tertiary);">{{ task.type }} · {{ task.time }}</div>
        </div>
      </div>
      <div v-if="recentTasks.length === 0" style="text-align:center; color:var(--text-tertiary); padding:20px 0; font-size:13px;">
        暂无最近任务
      </div>
    </div>
  </div>
</template>
