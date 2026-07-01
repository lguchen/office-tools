<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NIcon, NFormItem, NForm, NInputNumber, NSpace, NTag, NCard, NModal } from 'naive-ui'
import { PrintOutline, TrashOutline, EyeOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import PrintPreview from '../../components/print/PrintPreview.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import { useNotification } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'

const notification = useNotification()

interface PrintFile {
  id: string
  file: File
  name: string
  size: number
  status: 'pending' | 'printing' | 'done' | 'error'
}

const files = ref<PrintFile[]>([])
const copies = ref(1)
const isPrinting = ref(false)
const showPreviewModal = ref(false)
const previewFile = ref<File | null>(null)

const canPrint = computed(() => files.value.length > 0)
const pendingCount = computed(() => files.value.filter(f => f.status === 'pending').length)
const doneCount = computed(() => files.value.filter(f => f.status === 'done').length)

const handleFileUpload = (fileList: { name: string; path: string; size?: number; file?: File }[]) => {
  for (const item of fileList) {
    if (!item.file) continue
    const id = Date.now() + Math.random().toString(36).slice(2)
    files.value.push({
      id,
      file: item.file,
      name: item.name,
      size: item.size || item.file.size,
      status: 'pending'
    })
  }
}

const removeFile = (id: string) => {
  files.value = files.value.filter(f => f.id !== id)
}

const previewItem = (item: PrintFile) => {
  previewFile.value = item.file
  showPreviewModal.value = true
}

const handleBatchPrint = async () => {
  if (!canPrint.value) return
  isPrinting.value = true

  for (const item of files.value) {
    if (item.status !== 'pending') continue
    item.status = 'printing'
    try {
      const arrayBuffer = await item.file.arrayBuffer()
      const data = Array.from(new Uint8Array(arrayBuffer))

      const result = await invoke<boolean>('print_file', {
        data,
        fileName: item.name,
        printer: null,
        copies: copies.value
      })

      item.status = result ? 'done' : 'error'
    } catch (e) {
      item.status = 'error'
    }
  }

  isPrinting.value = false
  notification.success({
    title: '批量打印完成',
    content: `成功 ${doneCount.value} 个，失败 ${files.value.length - doneCount.value} 个`
  })
}

const handleClear = () => {
  files.value = []
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'default'
    case 'printing': return 'info'
    case 'done': return 'success'
    case 'error': return 'error'
    default: return 'default'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return '等待中'
    case 'printing': return '打印中'
    case 'done': return '已完成'
    case 'error': return '失败'
    default: return status
  }
}
</script>

<template>
  <ToolLayout title="批量打印" description="多文件批量打印，自动排队处理">
    <template #input>
      <div class="space-y-4">
        <NForm label-placement="left" label-width="100px" inline>
          <NFormItem label="每份打印">
            <NInputNumber v-model:value="copies" :min="1" :max="99" style="width: 100px;" />
            <span class="opacity-60 text-sm ml-2">份</span>
          </NFormItem>
        </NForm>

        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canPrint || pendingCount === 0" :loading="isPrinting" @click="handleBatchPrint">
            <template #icon>
              <NIcon><PrintOutline /></NIcon>
            </template>
            批量打印 ({{ pendingCount }})
          </NButton>
          <NButton @click="handleClear">清空列表</NButton>
        </div>

        <FileDropZone
          :show-file-list="false"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.bmp"
          tips="点击或拖拽添加多个文件"
          @files-selected="handleFileUpload"
        />
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <div class="flex items-center justify-between mb-3">
          <div class="font-medium">文件列表</div>
          <div class="text-sm opacity-60">共 {{ files.length }} 个文件</div>
        </div>
        <div class="flex-1 overflow-auto space-y-2 min-h-0">
          <div v-if="files.length === 0" class="flex items-center justify-center h-full opacity-50">
            暂无打印文件
          </div>
          <NCard
            v-for="item in files"
            :key="item.id"
            size="small"
            hoverable
            class="hover:border-blue-500/30 cursor-pointer"
            @click="previewItem(item)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <div class="text-2xl">📄</div>
                <div class="min-w-0">
                  <div class="font-medium truncate">{{ item.name }}</div>
                  <div class="text-xs opacity-60">{{ formatFileSize(item.size) }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <NButton text size="tiny" class="opacity-60 hover:opacity-100" @click.stop="previewItem(item)">
                  <NIcon><EyeOutline /></NIcon>
                </NButton>
                <NTag :type="getStatusColor(item.status) as any" size="small">
                  {{ getStatusText(item.status) }}
                </NTag>
                <NButton
                  text
                  size="tiny"
                  class="opacity-60 hover:opacity-100 hover:text-red-400"
                  @click.stop="removeFile(item.id)"
                >
                  <NIcon><TrashOutline /></NIcon>
                </NButton>
              </div>
            </div>
          </NCard>
        </div>
      </div>
    </template>
  </ToolLayout>

  <NModal
    v-model:show="showPreviewModal"
    preset="card"
    title="打印预览"
    :style="{ width: '800px' }"
    :mask-closable="true"
  >
    <div class="h-[600px]">
      <PrintPreview :file="previewFile" />
    </div>
  </NModal>
</template>
