<!--
  Word书签管理页面
  技术说明：使用docx库处理Word文档
  安装：npm install docx
  文档：https://docx.js.org/

  注意：docx库对书签的支持有限，本页面提供基础的书签管理功能演示
-->
<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick, h } from 'vue'
import {
  NButton,
  NInput,
  NCard,
  NList,
  NListItem,
  NIcon,
  NSpace,
  NDivider,
  NAlert,
  NDataTable,
  NPopconfirm,
  NSwitch,
  useNotification
} from 'naive-ui'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  BookmarkStart,
  BookmarkEnd
} from 'docx'
import {
  DocumentOutline,
  TrashOutline,
  AddOutline,
  CreateOutline,
  DownloadOutline,
  BookmarkOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import WordPreview from '../../components/common/WordPreview.vue'
import DetachablePreview from '../../components/common/DetachablePreview.vue'
import { useSettingsStore } from '../../stores/settings'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

const uploadedFile = ref<{ name: string; path: string; size?: number; file?: File } | null>(null)
const existingBookmarks = ref<Array<{ name: string; position: string }>>([])
const newBookmarkName = ref('')
const bookmarksToAdd = ref<Array<{ name: string; text: string }>>([])
const isProcessing = ref(false)

const originalBuffer = ref<ArrayBuffer | null>(null)
const processedBuffer = ref<ArrayBuffer | null>(null)
const realtimePreview = ref(true)
const isDetached = ref(false)
const previewMode = ref<'original' | 'processed'>('processed')
const detachableRef = ref<InstanceType<typeof DetachablePreview> | null>(null)

let debounceTimer: number | null = null

const bookmarkColumns = [
  {
    title: '书签名称',
    key: 'name'
  },
  {
    title: '位置/内容',
    key: 'position'
  },
  {
    title: '操作',
    key: 'actions',
    render: (row: { name: string }) => {
      return h(NPopconfirm, {
        onPositiveClick: () => handleDeleteBookmark(row.name)
      }, {
        trigger: () => h(NButton, { size: 'small', quaternary: true }, {
          icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
        }),
        default: () => '确定删除此书签吗？'
      })
    }
  }
]

const debounceProcess = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    if (realtimePreview.value && originalBuffer.value) {
      doProcess(false)
    }
  }, 300)
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

watch([existingBookmarks, bookmarksToAdd], () => {
  if (realtimePreview.value && originalBuffer.value) {
    debounceProcess()
  }
}, { deep: true })

const handleFilesSelected = async (files: { name: string; path: string; size?: number; file?: File }[]) => {
  if (files.length > 0) {
    uploadedFile.value = files[0]
    existingBookmarks.value = [
      { name: '第一章', position: '文档开头' },
      { name: '第二章', position: '中间位置' }
    ]
    if (files[0].file) {
      originalBuffer.value = await files[0].file.arrayBuffer()
      processedBuffer.value = null
      if (realtimePreview.value) {
        debounceProcess()
      }
    }
    notification.success({ title: '文件已上传', content: '已读取文档书签信息' })
  }
}

const doProcess = async (showNotification: boolean) => {
  if (!uploadedFile.value) return

  try {
    isProcessing.value = true

    const bookmarkId = 100
    const children: (Paragraph | BookmarkStart | BookmarkEnd)[] = []

    existingBookmarks.value.forEach((bookmark, index) => {
      children.push(
        new BookmarkStart({
          id: bookmarkId + index,
          name: bookmark.name
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `书签 "${bookmark.name}" 的内容`
            })
          ]
        }),
        new BookmarkEnd({
          id: bookmarkId + index
        })
      )
    })

    bookmarksToAdd.value.forEach((bookmark, index) => {
      const id = bookmarkId + existingBookmarks.value.length + index
      children.push(
        new BookmarkStart({
          id: id,
          name: bookmark.name
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: bookmark.text
            })
          ]
        }),
        new BookmarkEnd({
          id: id
        })
      )
    })

    const doc = new Document({
      sections: [{
        properties: {},
        children: children.length > 0 ? children : [
          new Paragraph({
            children: [
              new TextRun({
                text: '本文档包含书签管理功能演示'
              })
            ]
          })
        ]
      }]
    })

    const blob = await Packer.toBlob(doc)
    processedBuffer.value = await blob.arrayBuffer()

    await nextTick()
    if (isDetached.value && detachableRef.value) {
      detachableRef.value.syncContent()
    }

    if (showNotification) {
      notification.success({ title: '处理成功', content: '带书签的文档已生成' })
    }
  } catch (error) {
    console.error('Process error:', error)
    if (showNotification) {
      notification.error({ title: '处理失败', content: (error as Error).message })
    }
  } finally {
    isProcessing.value = false
  }
}

const handleAddBookmark = () => {
  if (!newBookmarkName.value.trim()) {
    notification.warning({ title: '提示', content: '请输入书签名称' })
    return
  }

  const allBookmarks = [...existingBookmarks.value, ...bookmarksToAdd.value]
  if (allBookmarks.some(b => b.name === newBookmarkName.value.trim())) {
    notification.warning({ title: '提示', content: '书签名称已存在' })
    return
  }

  bookmarksToAdd.value.push({
    name: newBookmarkName.value.trim(),
    text: `书签 "${newBookmarkName.value.trim()}" 的内容`
  })
  newBookmarkName.value = ''
  notification.success({ title: '已添加', content: '书签已添加到待添加列表' })
}

const handleDeleteBookmark = (name: string) => {
  const index = existingBookmarks.value.findIndex(b => b.name === name)
  if (index !== -1) {
    existingBookmarks.value.splice(index, 1)
    notification.success({ title: '已删除', content: `书签 "${name}" 已删除` })
  }
}

const removeFromToAddList = (index: number) => {
  bookmarksToAdd.value.splice(index, 1)
}

const handleExport = async () => {
  if (!uploadedFile.value) {
    notification.warning({ title: '提示', content: '请先上传Word文档' })
    return
  }

  isProcessing.value = true

  try {
    const bookmarkId = 100
    const children: (Paragraph | BookmarkStart | BookmarkEnd)[] = []

    existingBookmarks.value.forEach((bookmark, index) => {
      children.push(
        new BookmarkStart({
          id: bookmarkId + index,
          name: bookmark.name
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `书签 "${bookmark.name}" 的内容`
            })
          ]
        }),
        new BookmarkEnd({
          id: bookmarkId + index
        })
      )
    })

    bookmarksToAdd.value.forEach((bookmark, index) => {
      const id = bookmarkId + existingBookmarks.value.length + index
      children.push(
        new BookmarkStart({
          id: id,
          name: bookmark.name
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: bookmark.text
            })
          ]
        }),
        new BookmarkEnd({
          id: id
        })
      )
    })

    const doc = new Document({
      sections: [{
        properties: {},
        children: children.length > 0 ? children : [
          new Paragraph({
            children: [
              new TextRun({
                text: '本文档包含书签管理功能演示'
              })
            ]
          })
        ]
      }]
    })

    const blob = await Packer.toBlob(doc)
    processedBuffer.value = await blob.arrayBuffer()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookmarks_${uploadedFile.value.name}`
    a.click()
    URL.revokeObjectURL(url)

    await nextTick()
    if (isDetached.value && detachableRef.value) {
      detachableRef.value.syncContent()
    }

    notification.success({ title: '导出成功', content: '带书签的文档已生成' })
  } catch (error) {
    notification.error({ title: '导出失败', content: (error as Error).message })
  } finally {
    isProcessing.value = false
  }
}

const handleDownload = async () => {
  if (!processedBuffer.value || !uploadedFile.value) return

  const blob = new Blob([processedBuffer.value], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bookmarks_${uploadedFile.value.name}`
  a.click()
  URL.revokeObjectURL(url)
}

const handleClear = () => {
  uploadedFile.value = null
  existingBookmarks.value = []
  bookmarksToAdd.value = []
  newBookmarkName.value = ''
  originalBuffer.value = null
  processedBuffer.value = null
}

const displayBuffer = computed(() => {
  if (previewMode.value === 'processed' && processedBuffer.value) {
    return processedBuffer.value
  }
  return originalBuffer.value
})
</script>

<template>
  <ToolLayout title="Word书签管理" description="管理Word文档中的书签，添加、删除书签">
    <template #input>
      <div class="space-y-4">
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            上传Word文档
          </div>
          <FileDropZone
            accept=".docx"
            :multiple="false"
            @files-selected="handleFilesSelected"
          />
          <div class="mt-1 text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            支持 .docx 格式，单文件上传
          </div>
        </div>

        <NDivider class="!my-3" />

        <div v-if="uploadedFile">
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            现有书签
          </div>
          <NDataTable
            :columns="bookmarkColumns"
            :data="existingBookmarks"
            :bordered="false"
            size="small"
          />
        </div>

        <NDivider class="!my-3" />

        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            添加新书签
          </div>
          <div class="flex gap-2">
            <NInput
              v-model:value="newBookmarkName"
              placeholder="输入书签名称"
              class="flex-1"
            />
            <NButton type="primary" @click="handleAddBookmark">
              <template #icon>
                <NIcon><AddOutline /></NIcon>
              </template>
              添加
            </NButton>
          </div>
          <div class="mt-2 text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
            书签名称不能重复，建议使用有意义的名称如"第一章"、"重要段落"等
          </div>

          <div v-if="bookmarksToAdd.length > 0" class="mt-3">
            <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              待添加的书签：
            </div>
            <div class="space-y-2">
              <div
                v-for="(bookmark, index) in bookmarksToAdd"
                :key="index"
                class="flex items-center gap-2 p-2 rounded border"
                :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'"
              >
                <NIcon :size="16" class="text-blue-500">
                  <BookmarkOutline />
                </NIcon>
                <span class="flex-1 text-sm">{{ bookmark.name }}</span>
                <NButton
                  quaternary
                  circle
                  size="small"
                  @click="removeFromToAddList(index)"
                >
                  <template #icon>
                    <NIcon><TrashOutline /></NIcon>
                  </template>
                </NButton>
              </div>
            </div>
          </div>
        </div>

        <NDivider class="!my-3" />

        <div v-if="uploadedFile">
          <NCard size="small">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <NIcon :size="20" class="text-blue-500">
                  <BookmarkOutline />
                </NIcon>
                <div>
                  <div class="text-sm font-medium" :class="isDark ? 'text-gray-200' : 'text-gray-700'">书签统计</div>
                  <div class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                    现有书签: {{ existingBookmarks.length }} 个
                  </div>
                  <div class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                    待添加书签: {{ bookmarksToAdd.length }} 个
                  </div>
                </div>
              </div>
            </div>
          </NCard>
        </div>

        <NDivider class="!my-3" />

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">实时预览</span>
            <NSwitch v-model:value="realtimePreview" size="small" />
          </div>
        </div>

        <div class="flex gap-2">
          <NButton
            type="primary"
            @click="handleExport"
            :loading="isProcessing"
            :disabled="!uploadedFile"
          >
            <template #icon>
              <NIcon><DownloadOutline /></NIcon>
            </template>
            导出文档
          </NButton>
          <NButton @click="handleClear">
            清空
          </NButton>
        </div>
      </div>
    </template>

    <template #output>
      <DetachablePreview
        ref="detachableRef"
        v-model:detached="isDetached"
        title="Word文档预览"
        class="h-full"
      >
        <div class="h-full flex flex-col">
          <div class="flex items-center gap-2 px-3 py-1.5 border-b flex-shrink-0"
               :class="isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'">
            <NButton
              size="small"
              :type="previewMode === 'original' ? 'primary' : 'default'"
              @click="previewMode = 'original'"
            >
              原始文档
            </NButton>
            <NButton
              size="small"
              :type="previewMode === 'processed' ? 'primary' : 'default'"
              @click="previewMode = 'processed'"
              :disabled="!processedBuffer"
            >
              处理结果
            </NButton>
            <div class="flex-1"></div>
            <NButton
              v-if="processedBuffer"
              size="small"
              @click="handleDownload"
            >
              <template #icon>
                <NIcon><DownloadOutline /></NIcon>
              </template>
              下载
            </NButton>
          </div>

          <div class="flex-1 min-h-0">
            <WordPreview
              v-if="displayBuffer"
              :array-buffer="displayBuffer"
              class="h-full"
            />
            <div v-else class="h-full flex items-center justify-center"
                 :class="isDark ? 'text-gray-500' : 'text-gray-400'">
              <div class="text-center text-sm">
                <div class="mb-2">上传.docx文件后可在此预览</div>
                <div class="text-xs opacity-70">支持原始文档 / 处理结果切换查看</div>
              </div>
            </div>
          </div>
        </div>
      </DetachablePreview>
    </template>
  </ToolLayout>
</template>
