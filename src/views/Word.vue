<script setup lang="ts">
import { ref } from 'vue'
import { useTaskStore } from '@/stores/task'
// === 新增：Windows兼容拖拽 ===
import { useDragDrop } from '@/composables/useDragDrop'
// === 新增：打印功能 ===
import { usePrintStore } from '@/stores/print'
import {
  readWord,
  extractText,
  extractImages,
  extractTables,
  replaceText,
  cleanText,
  downloadText,
  downloadImage,
  mergeWordFiles,
  splitByPageBreak,
  wordToPdf,
  type WordFile
} from '@/utils/wordUtils'

const taskStore = useTaskStore()
// === 新增：打印Store ===
const printStore = usePrintStore()
const currentTab = ref('merge')
const files = ref<WordFile[]>([])
const previewFileIndex = ref(0)

// === 新增：Windows兼容拖拽逻辑 ===
const { isDragOver, handleDragOver, handleDragEnter, handleDragLeave, handleDrop, resetDrag } = useDragDrop({
  accept: /\.(docx?|doc)$/i,
  onFilesDropped: async (fileArr) => {
    await addFilesFromArray(fileArr)
  }
})

const tabs = [
  { key: 'merge', name: '文档合并', icon: '🔗' },
  { key: 'split', name: '文档拆分', icon: '✂️' },
  { key: 'format', name: '格式统一', icon: '🎨' },
  { key: 'replace', name: '内容处理', icon: '🔄' },
  { key: 'extract', name: '资源提取', icon: '📤' },
  { key: 'convert', name: '格式转换', icon: '🔄' }
]

const mergeOptions = ref({ pageBreak: true })
const replaceConfig = ref({ search: '', replace: '', useRegex: false })

// === 修改：原 handleFileDrop 替换为统一拖拽逻辑 ===
const handleFileDrop = async (e: DragEvent) => {
  const files = handleDrop(e)
  if (files.length > 0) {
    await addFilesFromArray(files)
  }
}

const handleFileSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files) {
    await addFiles(input.files)
    input.value = ''
  }
}

// === 新增：从File数组添加文件 ===
const addFilesFromArray = async (fileArr: File[]) => {
  for (const file of fileArr) {
    if (/\.(docx?|doc)$/i.test(file.name)) {
      try {
        const word = await readWord(file)
        files.value.push(word)
        taskStore.addLog('success', `加载文件：${file.name}`)
      } catch (e: any) {
        taskStore.addLog('error', `加载失败：${file.name} - ${e.message}`)
      }
    }
  }
}

const addFiles = async (fileList: FileList) => {
  const arr: File[] = []
  for (let i = 0; i < fileList.length; i++) {
    arr.push(fileList[i])
  }
  await addFilesFromArray(arr)
}

const removeFile = (index: number) => {
  files.value.splice(index, 1)
}

const clearFiles = () => {
  files.value = []
}

// 合并文档
const doMerge = () => {
  if (files.value.length < 2) {
    taskStore.addLog('warning', '请至少添加2个文件')
    return
  }
  const merged = mergeWordFiles(files.value, mergeOptions.value)
  downloadText(merged, '合并文档.txt')
  taskStore.addLog('success', `合并完成，共 ${files.value.length} 个文档`)
}

// 拆分文档
const doSplit = () => {
  if (files.value.length === 0) return
  const file = files.value[0]
  const parts = splitByPageBreak(file)
  parts.forEach((part, idx) => {
    downloadText(part, `${file.name.replace(/\.[^.]+$/, '')}_第${idx + 1}段.txt`)
  })
  taskStore.addLog('success', `拆分为 ${parts.length} 个文档`)
}

// 内容替换/清洗
const doReplace = () => {
  if (files.value.length === 0) return
  for (const file of files.value) {
    let text = file.text
    if (replaceConfig.value.search) {
      text = replaceText(file, replaceConfig.value.search, replaceConfig.value.replace, replaceConfig.value.useRegex)
    }
    text = cleanText({ ...file, text })
    downloadText(text, `${file.name.replace(/\.[^.]+$/, '')}_处理后.txt`)
  }
  taskStore.addLog('success', `处理完成，共 ${files.value.length} 个文件`)
}

// 资源提取
const doExtract = async () => {
  if (files.value.length === 0) return
  const file = files.value[0]
  const images = extractImages(file)
  const tables = extractTables(file)

  for (const img of images) {
    downloadImage(img.src, `${file.name.replace(/\.[^.]+$/, '')}_图片${img.index}.png`)
  }

  if (tables.length > 0) {
    const xlsx = await import('@/utils/excelUtils')
    const XLSX = await import('xlsx')
    tables.forEach((table, idx) => {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(table)
      XLSX.utils.book_append_sheet(wb, ws, `表格${idx + 1}`)
      xlsx.downloadBlob(xlsx.workbookToBlob(wb), `${file.name.replace(/\.[^.]+$/, '')}_表格${idx + 1}.xlsx`)
    })
  }

  taskStore.addLog('success', `提取完成：${images.length}张图片，${tables.length}个表格`)
}

// 格式转换
const doConvert = () => {
  if (files.value.length === 0) return
  for (const file of files.value) {
    const text = extractText(file)
    downloadText(text, `${file.name.replace(/\.[^.]+$/, '')}.txt`)
  }
  taskStore.addLog('success', `转换完成，共 ${files.value.length} 个文件`)
}

const executeAction = () => {
  switch (currentTab.value) {
    case 'merge':
      doMerge()
      break
    case 'split':
      doSplit()
      break
    case 'format':
    case 'replace':
      doReplace()
      break
    case 'extract':
      doExtract()
      break
    case 'convert':
      doConvert()
      break
  }
}

// === 新增：Word打印功能 ===
const openPrintPanel = () => {
  if (files.value.length === 0) return
  const file = files.value[0]
  if (!file) return
  
  const html = file.html || ''
  const pageCount = Math.max(1, Math.ceil(file.text.length / 1500))
  printStore.setPreview(html, 'html', pageCount)
  printStore.showPanel()
}

const currentFileText = () => {
  if (files.value.length === 0) return ''
  return files.value[previewFileIndex.value]?.text || ''
}
</script>

<template>
  <div>
    <div style="margin-bottom: 16px;">
      <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">📄 Word批量处理</h2>
      <p style="color: var(--text-secondary); font-size: 13px;">支持docx格式，纯本地处理</p>
    </div>

    <div style="display: flex; gap: 4px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px;">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        :style="{
          padding: '8px 14px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          whiteSpace: 'nowrap',
          background: currentTab === tab.key ? 'var(--primary-color)' : 'var(--bg-secondary)',
          color: currentTab === tab.key ? 'white' : 'var(--text-secondary)',
          transition: 'all 0.15s'
        }"
        @click="currentTab = tab.key"
      >
        {{ tab.icon }} {{ tab.name }}
      </div>
    </div>

    <div style="display: flex; gap: 16px;">
      <div style="flex: 1;">
        <div
          class="drop-zone"
          :class="{ 'drag-over': isDragOver }"
          style="margin-bottom: 12px;"
          @dragover="handleDragOver"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @drop="handleFileDrop"
          @click="($refs.fileInput as HTMLInputElement)?.click()"
        >
          <div style="font-size: 32px; margin-bottom: 8px;">📄</div>
          <div style="font-size: 14px; color: var(--text-primary); margin-bottom: 4px;">拖拽Word文件到此处，或点击选择</div>
          <div style="font-size: 12px; color: var(--text-tertiary);">支持 .docx 格式</div>
          <input ref="fileInput" type="file" multiple accept=".docx" style="display:none;" @change="handleFileSelect" />
        </div>

        <div class="card" style="padding: 16px; margin-bottom: 12px;">
          <div style="font-weight: 500; margin-bottom: 12px; font-size: 14px;">⚙ 操作配置</div>

          <template v-if="currentTab === 'merge'">
            <div class="form-row">
              <label class="form-label">分页分隔</label>
              <input type="checkbox" v-model="mergeOptions.pageBreak" />
            </div>
          </template>

          <template v-if="currentTab === 'replace' || currentTab === 'format'">
            <div class="form-row">
              <label class="form-label">查找内容</label>
              <input type="text" v-model="replaceConfig.search" class="form-input" style="flex:1;" placeholder="可选" />
            </div>
            <div class="form-row">
              <label class="form-label">替换为</label>
              <input type="text" v-model="replaceConfig.replace" class="form-input" style="flex:1;" placeholder="可选" />
            </div>
            <div class="form-row">
              <label class="form-label">正则模式</label>
              <input type="checkbox" v-model="replaceConfig.useRegex" />
            </div>
            <div class="form-row">
              <label class="form-label">清理空段落</label>
              <input type="checkbox" :checked="true" disabled />
            </div>
          </template>

          <template v-if="currentTab === 'split'">
            <div style="font-size: 13px; color: var(--text-secondary);">
              按段落拆分文档（空行分隔）
            </div>
          </template>

          <template v-if="currentTab === 'extract'">
            <div style="font-size: 13px; color: var(--text-secondary);">
              提取文档中的图片和表格
            </div>
          </template>

          <template v-if="currentTab === 'convert'">
            <div style="font-size: 13px; color: var(--text-secondary);">
              docx转纯文本格式
            </div>
          </template>
        </div>

        <div class="card" style="padding: 12px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-weight: 500; font-size: 14px;">📄 文件列表 ({{ files.length }})</span>
            <button v-if="files.length > 0" class="btn" style="font-size: 12px; padding: 4px 10px;" @click="clearFiles">清空</button>
          </div>
          <div v-if="files.length === 0" style="text-align:center; color:var(--text-tertiary); padding:20px 0; font-size:13px;">
            暂无文件，请添加
          </div>
          <div v-else style="max-height: 200px; overflow-y: auto;">
            <div
              v-for="(file, idx) in files"
              :key="idx"
              class="file-item"
              :style="{ background: previewFileIndex === idx ? 'var(--bg-secondary)' : '' }"
              @click="previewFileIndex = idx"
            >
              <span>📄</span>
              <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ file.name }}</span>
              <button class="btn" style="font-size: 11px; padding: 2px 8px;" @click.stop="removeFile(idx)">移除</button>
            </div>
          </div>
        </div>

        <div style="margin-top: 16px; display: flex; gap: 10px;">
          <button class="btn btn-primary" @click="executeAction" :disabled="files.length === 0">
            开始处理
          </button>
          <!-- === 新增：打印按钮 === -->
          <button class="btn" @click="openPrintPanel" :disabled="files.length === 0">
            🖨 打印
          </button>
        </div>
      </div>

      <div style="width: 320px; flex-shrink: 0;">
        <div class="card" style="padding: 12px; height: 100%;">
          <div style="font-weight: 500; margin-bottom: 10px; font-size: 14px;">👁 内容预览</div>
          <div v-if="files.length === 0" style="color: var(--text-tertiary); text-align: center; padding: 30px 0; font-size: 13px;">
            加载文件后预览
          </div>
          <div v-else style="max-height: 500px; overflow-y: auto; font-size: 13px; line-height: 1.8; color: var(--text-secondary); white-space: pre-wrap;">
            {{ currentFileText() }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
