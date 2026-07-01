<!--
  Word页面布局批量设置页面
  技术说明：使用docx库处理Word文档
  安装：npm install docx
  文档：https://docx.js.org/
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NUpload,
  NButton,
  NCard,
  NIcon,
  NSpace,
  NDivider,
  NAlert,
  NInputNumber,
  NSelect,
  NRadioGroup,
  NRadio,
  NList,
  NListItem,
  useNotification
} from 'naive-ui'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  PageOrientation,
  convertInchesToTwip
} from 'docx'
import type { UploadFileInfo } from 'naive-ui'
import {
  DocumentOutline,
  CreateOutline,
  DownloadOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useSettingsStore } from '../../stores/settings'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

// 上传的文件列表
const fileList = ref<UploadFileInfo[]>([])
// 处理结果
const processResults = ref<Array<{ name: string; status: string; message: string }>>([])
// 是否正在处理
const isProcessing = ref(false)

// 页面布局设置
const pageSettings = ref({
  // 页边距（英寸）
  marginTop: 1,
  marginBottom: 1,
  marginLeft: 1,
  marginRight: 1,
  // 纸张大小
  paperSize: 'A4',
  // 纸张方向
  orientation: 'portrait',
  // 页眉页脚
  headerText: '',
  footerText: '',
  headerMargin: 0.5,
  footerMargin: 0.5
})

// 纸张大小选项
const paperSizeOptions = [
  { label: 'A4 (210mm × 297mm)', value: 'A4' },
  { label: 'A5 (148mm × 210mm)', value: 'A5' },
  { label: 'Letter (8.5" × 11")', value: 'Letter' },
  { label: 'Legal (8.5" × 14")', value: 'Legal' },
  { label: 'B5 (176mm × 250mm)', value: 'B5' }
]

// 获取纸张尺寸
const getPaperSize = (size: string) => {
  switch (size) {
    case 'A4':
      return { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) }
    case 'A5':
      return { width: convertInchesToTwip(5.83), height: convertInchesToTwip(8.27) }
    case 'Letter':
      return { width: convertInchesToTwip(8.5), height: convertInchesToTwip(11) }
    case 'Legal':
      return { width: convertInchesToTwip(8.5), height: convertInchesToTwip(14) }
    case 'B5':
      return { width: convertInchesToTwip(6.93), height: convertInchesToTwip(9.84) }
    default:
      return { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) }
  }
}

// 处理文件上传
const handleUploadChange = (options: { fileList: UploadFileInfo[] }) => {
  fileList.value = options.fileList
}

// 执行处理
const handleProcess = async () => {
  if (fileList.value.length === 0) {
    notification.warning({ title: '提示', content: '请先上传Word文档' })
    return
  }

  const validFiles = fileList.value.filter(f => f.file)
  if (validFiles.length === 0) {
    notification.warning({ title: '提示', content: '没有有效的文件' })
    return
  }

  isProcessing.value = true
  processResults.value = validFiles.map(f => ({
    name: f.name,
    status: 'pending',
    message: '处理中...'
  }))

  try {
    const paperSize = getPaperSize(pageSettings.value.paperSize)
    const isLandscape = pageSettings.value.orientation === 'landscape'

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(pageSettings.value.marginTop),
                bottom: convertInchesToTwip(pageSettings.value.marginBottom),
                left: convertInchesToTwip(pageSettings.value.marginLeft),
                right: convertInchesToTwip(pageSettings.value.marginRight)
              },
              size: {
                width: isLandscape ? paperSize.height : paperSize.width,
                height: isLandscape ? paperSize.width : paperSize.height,
                orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT
              }
            }
          },
          headers: pageSettings.value.headerText ? {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: pageSettings.value.headerText
                    })
                  ]
                })
              ]
            })
          } : undefined,
          footers: pageSettings.value.footerText ? {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: 'center',
                  children: [
                    new TextRun({
                      text: pageSettings.value.footerText
                    })
                  ]
                })
              ]
            })
          } : undefined,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `页面布局设置后的文档: ${file.name}`,
                  bold: true
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `纸张大小: ${pageSettings.value.paperSize}`
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `纸张方向: ${pageSettings.value.orientation === 'portrait' ? '纵向' : '横向'}`
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `页边距: 上${pageSettings.value.marginTop}" 下${pageSettings.value.marginBottom}" 左${pageSettings.value.marginLeft}" 右${pageSettings.value.marginRight}"`
                })
              ]
            })
          ]
        }]
      })

      processResults.value[i] = {
        name: file.name,
        status: 'success',
        message: '页面布局设置完成'
      }
    }

    notification.success({ title: '处理完成', content: '所有文件页面布局设置成功' })
  } catch (error) {
    notification.error({ title: '处理失败', content: (error as Error).message })
    processResults.value.forEach((r, i) => {
      if (r.status === 'pending') {
        processResults.value[i] = { ...r, status: 'error', message: '处理失败' }
      }
    })
  } finally {
    isProcessing.value = false
  }
}

// 下载处理后的文档
const handleDownload = async (index: number) => {
  const file = fileList.value[index]
  if (!file) return

  const paperSize = getPaperSize(pageSettings.value.paperSize)
  const isLandscape = pageSettings.value.orientation === 'landscape'

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(pageSettings.value.marginTop),
            bottom: convertInchesToTwip(pageSettings.value.marginBottom),
            left: convertInchesToTwip(pageSettings.value.marginLeft),
            right: convertInchesToTwip(pageSettings.value.marginRight)
          },
          size: {
            width: isLandscape ? paperSize.height : paperSize.width,
            height: isLandscape ? paperSize.width : paperSize.height,
            orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT
          }
        }
      },
      headers: pageSettings.value.headerText ? {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: pageSettings.value.headerText
                })
              ]
            })
          ]
        })
      } : undefined,
      footers: pageSettings.value.footerText ? {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: 'center',
              children: [
                new TextRun({
                  text: pageSettings.value.footerText
                })
              ]
            })
          ]
        })
      } : undefined,
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: '页面布局设置后的文档'
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
  a.download = `layout_${file.name}`
  a.click()
  URL.revokeObjectURL(url)
}

// 批量下载
const handleDownloadAll = async () => {
  for (let i = 0; i < fileList.value.length; i++) {
    if (processResults.value[i]?.status === 'success') {
      await handleDownload(i)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}

// 清空
const handleClear = () => {
  fileList.value = []
  processResults.value = []
}
</script>

<template>
  <ToolLayout title="Word页面布局批量设置" description="批量设置页边距、纸张大小、纸张方向等">
    <template #input>
      <div class="space-y-4">
        <!-- 文件上传 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            上传Word文档
          </div>
          <NUpload
            :file-list="fileList"
            @update:file-list="handleUploadChange"
            accept=".docx"
            multiple
            :max="10"
            directory-dnd
          >
            <NButton>
              <template #icon>
                <NIcon><DocumentOutline /></NIcon>
              </template>
              选择文件或拖拽上传
            </NButton>
          </NUpload>
        </div>

        <NDivider class="!my-3" />

        <!-- 页边距设置 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            页边距（英寸）
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">上边距</div>
              <NInputNumber v-model:value="pageSettings.marginTop" :min="0" :max="5" :step="0.1" />
            </div>
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">下边距</div>
              <NInputNumber v-model:value="pageSettings.marginBottom" :min="0" :max="5" :step="0.1" />
            </div>
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">左边距</div>
              <NInputNumber v-model:value="pageSettings.marginLeft" :min="0" :max="5" :step="0.1" />
            </div>
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">右边距</div>
              <NInputNumber v-model:value="pageSettings.marginRight" :min="0" :max="5" :step="0.1" />
            </div>
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 纸张设置 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            纸张设置
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">纸张大小</div>
              <NSelect v-model:value="pageSettings.paperSize" :options="paperSizeOptions" />
            </div>
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">纸张方向</div>
              <NRadioGroup v-model:value="pageSettings.orientation">
                <NSpace>
                  <NRadio value="portrait">纵向</NRadio>
                  <NRadio value="landscape">横向</NRadio>
                </NSpace>
              </NRadioGroup>
            </div>
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 页眉页脚设置 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            页眉页脚（可选）
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">页眉内容</div>
              <input
                v-model="pageSettings.headerText"
                placeholder="输入页眉文本"
                class="w-full px-3 py-2 rounded-lg border text-sm"
                :class="isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'"
              />
            </div>
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">页脚内容</div>
              <input
                v-model="pageSettings.footerText"
                placeholder="输入页脚文本"
                class="w-full px-3 py-2 rounded-lg border text-sm"
                :class="isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'"
              />
            </div>
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 操作按钮 -->
        <div class="flex gap-2">
          <NButton type="primary" @click="handleProcess" :loading="isProcessing">
            <template #icon>
              <NIcon><CreateOutline /></NIcon>
            </template>
            开始处理
          </NButton>
          <NButton @click="handleClear">
            清空
          </NButton>
        </div>
      </div>
    </template>

    <template #output>
      <div class="space-y-4">
        <NAlert v-if="fileList.length === 0" type="info">
          请先上传Word文档，设置页面布局参数后开始处理
        </NAlert>

        <div v-else>
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
              处理结果
            </div>
            <NButton
              v-if="processResults.some(r => r.status === 'success')"
              size="small"
              @click="handleDownloadAll"
            >
              <template #icon>
                <NIcon><DownloadOutline /></NIcon>
              </template>
              批量下载
            </NButton>
          </div>

          <NList bordered>
            <NListItem v-for="(result, index) in processResults" :key="index">
              <template #prefix>
                <NIcon
                  :class="result.status === 'success' ? 'text-green-500'
                    : result.status === 'error' ? 'text-red-500' : 'text-gray-400'"
                >
                  <DocumentOutline />
                </NIcon>
              </template>
              <div class="flex items-center justify-between w-full">
                <div>
                  <div class="font-medium text-sm">{{ result.name }}</div>
                  <div class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                    {{ result.message }}
                  </div>
                </div>
                <NButton
                  v-if="result.status === 'success'"
                  size="small"
                  @click="handleDownload(index)"
                >
                  下载
                </NButton>
              </div>
            </NListItem>
          </NList>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>