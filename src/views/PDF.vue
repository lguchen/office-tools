<script setup lang="ts">
import { ref } from 'vue'
import { useTaskStore } from '@/stores/task'
// === 新增：Windows兼容拖拽 ===
import { useDragDrop } from '@/composables/useDragDrop'
// === 新增：打印功能 ===
import { usePrintStore } from '@/stores/print'
import {
  readPDF,
  mergePDFs,
  splitPDF,
  extractPages,
  imagesToPDF,
  compressPDF,
  downloadPDF,
  type PDFFile
} from '@/utils/pdfUtils'

const taskStore = useTaskStore()
// === 新增：打印Store ===
const printStore = usePrintStore()
const currentTab = ref('merge')
const files = ref<PDFFile[]>([])
const imageFiles = ref<File[]>([])
const extractConfig = ref({ start: 1, end: 1 })

// === 新增：Windows兼容拖拽逻辑 ===
const { isDragOver, handleDragOver, handleDragEnter, handleDragLeave, handleDrop, resetDrag } = useDragDrop({
  accept: /\.pdf$/i,
  onFilesDropped: async (fileArr) => {
    await addFilesFromArray(fileArr)
  }
})

const tabs = [
  { key: 'merge', name: 'PDF合并', icon: '🔗' },
  { key: 'split', name: 'PDF拆分', icon: '✂️' },
  { key: 'extract', name: '页面提取', icon: '📄' },
  { key: 'img2pdf', name: '图片转PDF', icon: '🖼' },
  { key: 'compress', name: 'PDF压缩', icon: '📦' }
]

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

const handleImageSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files) {
    imageFiles.value = Array.from(input.files)
    input.value = ''
  }
}

// === 新增：从File数组添加文件 ===
const addFilesFromArray = async (fileArr: File[]) => {
  for (const file of fileArr) {
    if (/\.pdf$/i.test(file.name)) {
      try {
        const pdf = await readPDF(file)
        files.value.push(pdf)
        taskStore.addLog('success', `加载文件：${file.name} (${pdf.pageCount}页)`)
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
  imageFiles.value = []
}

// 合并PDF
const doMerge = async () => {
  if (files.value.length < 2) {
    taskStore.addLog('warning', '请至少添加2个PDF文件')
    return
  }
  try {
    const merged = await mergePDFs(files.value)
    downloadPDF(merged, '合并结果.pdf')
    taskStore.addLog('success', `合并完成，共 ${files.value.length} 个文件`)
  } catch (e: any) {
    taskStore.addLog('error', '合并失败：' + e.message)
  }
}

// 拆分PDF
const doSplit = async () => {
  if (files.value.length === 0) return
  try {
    const file = files.value[0]
    const results = await splitPDF(file)
    for (const r of results) {
      downloadPDF(r.data, `${file.name.replace(/\.[^.]+$/, '')}_第${r.page}页.pdf`)
    }
    taskStore.addLog('success', `拆分为 ${results.length} 个文件`)
  } catch (e: any) {
    taskStore.addLog('error', '拆分失败：' + e.message)
  }
}

// 提取页面
const doExtract = async () => {
  if (files.value.length === 0) return
  try {
    const file = files.value[0]
    const start = Math.max(1, extractConfig.value.start)
    const end = Math.min(file.pageCount, extractConfig.value.end)
    if (start > end) {
      taskStore.addLog('error', '起始页不能大于结束页')
      return
    }
    const indices: number[] = []
    for (let i = start - 1; i < end; i++) {
      indices.push(i)
    }
    const data = await extractPages(file, indices)
    downloadPDF(data, `${file.name.replace(/\.[^.]+$/, '')}_第${start}-${end}页.pdf`)
    taskStore.addLog('success', `提取完成：第 ${start}-${end} 页`)
  } catch (e: any) {
    taskStore.addLog('error', '提取失败：' + e.message)
  }
}

// 图片转PDF
const doImgToPdf = async () => {
  if (imageFiles.value.length === 0) {
    taskStore.addLog('warning', '请选择图片')
    return
  }
  try {
    const data = await imagesToPDF(imageFiles.value)
    downloadPDF(data, '图片转PDF.pdf')
    taskStore.addLog('success', `转换完成，共 ${imageFiles.value.length} 张图片`)
  } catch (e: any) {
    taskStore.addLog('error', '转换失败：' + e.message)
  }
}

// PDF压缩
const doCompress = async () => {
  if (files.value.length === 0) return
  try {
    for (const file of files.value) {
      const data = await compressPDF(file)
      downloadPDF(data, `${file.name.replace(/\.[^.]+$/, '')}_压缩.pdf`)
    }
    taskStore.addLog('success', `压缩完成，共 ${files.value.length} 个文件`)
  } catch (e: any) {
    taskStore.addLog('error', '压缩失败：' + e.message)
  }
}

const executeAction = () => {
  switch (currentTab.value) {
    case 'merge':
      doMerge()
      break
    case 'split':
      doSplit()
      break
    case 'extract':
      doExtract()
      break
    case 'img2pdf':
      doImgToPdf()
      break
    case 'compress':
      doCompress()
      break
  }
}

// === 新增：PDF打印功能 ===
const openPrintPanel = () => {
  if (files.value.length === 0) return
  const file = files.value[0]
  if (!file) return
  
  const content = `
    <div style="padding: 40px; text-align: center;">
      <div style="font-size: 64px; margin-bottom: 20px;">📑</div>
      <div style="font-size: 16px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px; word-break: break-all;">${file.name}</div>
      <div style="font-size: 13px; color: var(--text-tertiary);">PDF文档 · ${file.pageCount}页</div>
    </div>
  `
  printStore.setPreview(content, 'pdf', file.pageCount)
  printStore.showPanel()
}
</script>

<template>
  <div>
    <div style="margin-bottom: 16px;">
      <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">📑 PDF工具</h2>
      <p style="color: var(--text-secondary); font-size: 13px;">PDF合并、拆分、转换、压缩，纯本地处理</p>
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
        <!-- 图片转PDF时显示图片上传 -->
        <template v-if="currentTab === 'img2pdf'">
          <div
            class="drop-zone"
            style="margin-bottom: 12px;"
            @click="($refs.imgInput as HTMLInputElement)?.click()"
          >
            <div style="font-size: 32px; margin-bottom: 8px;">🖼</div>
            <div style="font-size: 14px; color: var(--text-primary); margin-bottom: 4px;">点击选择图片</div>
            <div style="font-size: 12px; color: var(--text-tertiary);">支持 .jpg .png 格式</div>
            <input ref="imgInput" type="file" multiple accept="image/*" style="display:none;" @change="handleImageSelect" />
          </div>
          <div class="card" style="padding: 12px 16px;">
            <div style="font-weight: 500; margin-bottom: 10px; font-size: 14px;">🖼 图片列表 ({{ imageFiles.length }})</div>
            <div v-if="imageFiles.length === 0" style="text-align:center; color:var(--text-tertiary); padding:20px 0; font-size:13px;">
              暂无图片
            </div>
            <div v-else style="max-height: 200px; overflow-y: auto;">
              <div v-for="(file, idx) in imageFiles" :key="idx" class="file-item">
                <span>🖼</span>
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ file.name }}</span>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
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
            <div style="font-size: 32px; margin-bottom: 8px;">📑</div>
            <div style="font-size: 14px; color: var(--text-primary); margin-bottom: 4px;">拖拽PDF文件到此处，或点击选择</div>
            <div style="font-size: 12px; color: var(--text-tertiary);">支持 .pdf 格式</div>
            <input ref="fileInput" type="file" multiple accept=".pdf" style="display:none;" @change="handleFileSelect" />
          </div>

          <div class="card" style="padding: 16px; margin-bottom: 12px;">
            <div style="font-weight: 500; margin-bottom: 12px; font-size: 14px;">⚙ 操作配置</div>

            <template v-if="currentTab === 'extract'">
              <div class="form-row">
                <label class="form-label">起始页</label>
                <input type="number" v-model.number="extractConfig.start" class="form-input" style="flex:1;" min="1" />
              </div>
              <div class="form-row">
                <label class="form-label">结束页</label>
                <input type="number" v-model.number="extractConfig.end" class="form-input" style="flex:1;" min="1" />
              </div>
            </template>

            <template v-if="currentTab === 'merge'">
              <div style="font-size: 13px; color: var(--text-secondary);">
                按文件列表顺序合并所有PDF文件
              </div>
            </template>

            <template v-if="currentTab === 'split'">
              <div style="font-size: 13px; color: var(--text-secondary);">
                每页拆分为单独的PDF文件
              </div>
            </template>

            <template v-if="currentTab === 'compress'">
              <div style="font-size: 13px; color: var(--text-secondary);">
                优化PDF结构，减小文件体积
              </div>
            </template>
          </div>

          <div class="card" style="padding: 12px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 500; font-size: 14px;">📑 文件列表 ({{ files.length }})</span>
              <button v-if="files.length > 0" class="btn" style="font-size: 12px; padding: 4px 10px;" @click="clearFiles">清空</button>
            </div>
            <div v-if="files.length === 0" style="text-align:center; color:var(--text-tertiary); padding:20px 0; font-size:13px;">
              暂无文件，请添加
            </div>
            <div v-else style="max-height: 200px; overflow-y: auto;">
              <div v-for="(file, idx) in files" :key="idx" class="file-item">
                <span>📑</span>
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ file.name }}</span>
                <span style="font-size: 12px; color: var(--text-tertiary);">{{ file.pageCount }}页</span>
                <button class="btn" style="font-size: 11px; padding: 2px 8px;" @click="removeFile(idx)">移除</button>
              </div>
            </div>
          </div>
        </template>

        <div style="margin-top: 16px; display: flex; gap: 10px;">
          <button class="btn btn-primary" @click="executeAction" :disabled="currentTab === 'img2pdf' ? imageFiles.length === 0 : files.length === 0">
            开始处理
          </button>
          <!-- === 新增：打印按钮 === -->
          <button v-if="currentTab !== 'img2pdf'" class="btn" @click="openPrintPanel" :disabled="files.length === 0">
            🖨 打印
          </button>
        </div>
      </div>

      <div style="width: 320px; flex-shrink: 0;">
        <div class="card" style="padding: 12px;">
          <div style="font-weight: 500; margin-bottom: 10px; font-size: 14px;">ℹ 说明</div>
          <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.8;">
            <p>• 所有操作均在本地完成，不上传任何文件</p>
            <p>• 支持PDF文件合并、拆分、页面提取</p>
            <p>• 图片转PDF支持JPG、PNG格式</p>
            <p>• 压缩功能可优化PDF文件结构</p>
            <p style="margin-top: 8px; color: var(--text-tertiary);">
              💡 提示：转换后的文件会自动下载到默认下载目录
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
