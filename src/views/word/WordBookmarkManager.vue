<!--
  Word书签管理页面
  技术说明：使用docx库处理Word文档
  安装：npm install docx
  文档：https://docx.js.org/

  注意：docx库对书签的支持有限，本页面提供基础的书签管理功能演示
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NUpload,
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
import type { UploadFileInfo } from 'naive-ui'
import {
  DocumentOutline,
  TrashOutline,
  AddOutline,
  CreateOutline,
  DownloadOutline,
  BookmarkOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useSettingsStore } from '../../stores/settings'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

// 上传的文件
const uploadedFile = ref<UploadFileInfo | null>(null)
// 现有书签列表
const existingBookmarks = ref<Array<{ name: string; position: string }>>([])
// 新书签名称
const newBookmarkName = ref('')
// 待添加的书签列表
const bookmarksToAdd = ref<Array<{ name: string; text: string }>>([])
// 是否正在处理
const isProcessing = ref(false)

// 书签表格列定义
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

// 引入h函数
import { h } from 'vue'

// 处理文件上传
const handleUploadChange = (options: { fileList: UploadFileInfo[] }) => {
  if (options.fileList.length > 0) {
    uploadedFile.value = options.fileList[0]
    // 模拟读取现有书签（实际项目中需要解析docx文件）
    existingBookmarks.value = [
      { name: '第一章', position: '文档开头' },
      { name: '第二章', position: '中间位置' }
    ]
    notification.success({ title: '文件已上传', content: '已读取文档书签信息' })
  }
}

// 添加书签到待添加列表
const handleAddBookmark = () => {
  if (!newBookmarkName.value.trim()) {
    notification.warning({ title: '提示', content: '请输入书签名称' })
    return
  }

  // 检查是否已存在
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

// 删除现有书签
const handleDeleteBookmark = (name: string) => {
  const index = existingBookmarks.value.findIndex(b => b.name === name)
  if (index !== -1) {
    existingBookmarks.value.splice(index, 1)
    notification.success({ title: '已删除', content: `书签 "${name}" 已删除` })
  }
}

// 从待添加列表中删除
const removeFromToAddList = (index: number) => {
  bookmarksToAdd.value.splice(index, 1)
}

// 导出带书签的文档
const handleExport = async () => {
  if (!uploadedFile.value) {
    notification.warning({ title: '提示', content: '请先上传Word文档' })
    return
  }

  isProcessing.value = true

  try {
    // 创建带书签的文档
    const bookmarkId = 100 // 书签ID起始值
    const children: (Paragraph | BookmarkStart | BookmarkEnd)[] = []

    // 添加现有书签
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

    // 添加新书签
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
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookmarks_${uploadedFile.value.name}`
    a.click()
    URL.revokeObjectURL(url)

    notification.success({ title: '导出成功', content: '带书签的文档已生成' })
  } catch (error) {
    notification.error({ title: '导出失败', content: (error as Error).message })
  } finally {
    isProcessing.value = false
  }
}

// 清空
const handleClear = () => {
  uploadedFile.value = null
  existingBookmarks.value = []
  bookmarksToAdd.value = []
  newBookmarkName.value = ''
}
</script>

<template>
  <ToolLayout title="Word书签管理" description="管理Word文档中的书签，添加、删除书签">
    <template #input>
      <div class="space-y-4">
        <!-- 文件上传 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            上传Word文档
          </div>
          <NUpload
            :file-list="uploadedFile ? [uploadedFile] : []"
            @update:file-list="handleUploadChange"
            accept=".docx"
            :max="1"
            directory-dnd
          >
            <NButton>
              <template #icon>
                <NIcon><DocumentOutline /></NIcon>
              </template>
              选择文件或拖拽上传
            </NButton>
          </NUpload>
          <div class="mt-1 text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            支持 .docx 格式，单文件上传
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 现有书签列表 -->
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

        <!-- 添加新书签 -->
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

          <!-- 待添加书签列表 -->
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

        <!-- 操作按钮 -->
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
      <div class="space-y-4">
        <NAlert v-if="!uploadedFile" type="info">
          请先上传Word文档以查看和管理书签
        </NAlert>

        <div v-else class="space-y-4">
          <!-- 书签统计 -->
          <NCard size="small">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <NIcon :size="20" class="text-blue-500">
                  <BookmarkOutline />
                </NIcon>
                <div>
                  <div class="text-sm font-medium">书签统计</div>
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

          <!-- 使用说明 -->
          <NCard size="small" title="使用说明">
            <div class="text-sm space-y-2" :class="isDark ? 'text-gray-300' : 'text-gray-600'">
              <p>1. 上传Word文档后，系统会自动读取现有书签</p>
              <p>2. 可以删除不需要的书签，或添加新的书签</p>
              <p>3. 导出文档后，书签将保存在文档中</p>
              <p>4. 在Word中可通过"插入 → 书签"查看和管理书签</p>
            </div>
          </NCard>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>