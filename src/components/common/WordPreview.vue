<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { NIcon, NButton, NSlider, NSpin } from 'naive-ui'
import { AddOutline, RemoveOutline, ChevronBackOutline, ChevronForwardOutline } from '@vicons/ionicons5'
interface Props {
  file?: File | null
  arrayBuffer?: ArrayBuffer | null
  zoom?: number
}

const props = withDefaults(defineProps<Props>(), {
  file: null,
  arrayBuffer: null,
  zoom: 1
})

const emit = defineEmits<{
  (e: 'update:zoom', v: number): void
  (e: 'loaded', data: { pageCount: number }): void
  (e: 'error', err: Error): void
}>()

const previewContainerRef = ref<HTMLDivElement | null>(null)
const isLoading = ref(false)
const currentPage = ref(1)
const totalPages = ref(0)
const localZoom = ref(props.zoom)
const docxModule = ref<any>(null)

watch(() => props.zoom, (v) => {
  localZoom.value = v
  applyZoom()
})

watch(localZoom, (v) => {
  emit('update:zoom', v)
  applyZoom()
})

const applyZoom = () => {
  if (!previewContainerRef.value) return
  const docContainer = previewContainerRef.value.querySelector('.docx-wrapper')
  if (docContainer) {
    ;(docContainer as HTMLElement).style.transform = `scale(${localZoom.value})`
    ;(docContainer as HTMLElement).style.transformOrigin = 'top center'
  }
}

const loadDocx = async () => {
  let buffer: ArrayBuffer | null = null

  if (props.arrayBuffer) {
    buffer = props.arrayBuffer
  } else if (props.file) {
    buffer = await props.file.arrayBuffer()
  }

  if (!buffer) return

  isLoading.value = true

  try {
    if (!docxModule.value) {
      docxModule.value = await import('docx-preview')
    }

    if (previewContainerRef.value) {
      previewContainerRef.value.innerHTML = ''
    }

    const result = await docxModule.value.renderAsync(
      buffer,
      previewContainerRef.value,
      null,
      {
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        useBase64URL: true,
        experimental: true,
        trimXmlDeclaration: true,
        debug: false
      }
    )

    totalPages.value = result?.pageCount || 1
    currentPage.value = 1

    emit('loaded', { pageCount: totalPages.value })

    await nextTick()
    applyZoom()
  } catch (e) {
    console.error('Failed to render docx:', e)
    emit('error', e as Error)
    if (previewContainerRef.value) {
      previewContainerRef.value.innerHTML = `<div style="padding:20px;color:#dc2626;text-align:center;">文档渲染失败，请确保是有效的.docx文件</div>`
    }
  } finally {
    isLoading.value = false
  }
}

watch([() => props.file, () => props.arrayBuffer], () => {
  loadDocx()
}, { immediate: false })

onMounted(() => {
  if (props.file || props.arrayBuffer) {
    loadDocx()
  }
})

const zoomIn = () => {
  localZoom.value = Math.min(localZoom.value + 0.1, 3)
}

const zoomOut = () => {
  localZoom.value = Math.max(localZoom.value - 0.1, 0.3)
}

const goToPrevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    scrollToPage(currentPage.value)
  }
}

const goToNextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    scrollToPage(currentPage.value)
  }
}

const scrollToPage = (pageNum: number) => {
  if (!previewContainerRef.value) return
  const pages = previewContainerRef.value.querySelectorAll('[data-page-number]')
  const page = pages[pageNum - 1]
  if (page) {
    page.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

defineExpose({
  reload: loadDocx,
  getElement: () => previewContainerRef.value
})
</script>

<template>
  <div class="word-preview h-full flex flex-col bg-gray-100">
    <div class="flex items-center justify-between px-3 py-2 border-b flex-shrink-0 border-gray-200 bg-white">
      <div class="flex items-center gap-2">
        <NButton size="small" text @click="zoomOut" :disabled="localZoom <= 0.3">
          <template #icon><NIcon><RemoveOutline /></NIcon></template>
        </NButton>
        <div class="w-24">
          <NSlider :value="localZoom * 100" :min="30" :max="300" @update:value="v => localZoom = v / 100" />
        </div>
        <NButton size="small" text @click="zoomIn" :disabled="localZoom >= 3">
          <template #icon><NIcon><AddOutline /></NIcon></template>
        </NButton>
        <span class="text-xs ml-1 text-gray-500">{{ Math.round(localZoom * 100) }}%</span>
      </div>

      <div class="flex items-center gap-1">
        <NButton size="small" text @click="goToPrevPage" :disabled="currentPage <= 1">
          <template #icon><NIcon><ChevronBackOutline /></NIcon></template>
        </NButton>
        <span class="text-xs text-gray-500">
          {{ totalPages > 0 ? `${currentPage} / ${totalPages}` : '--' }}
        </span>
        <NButton size="small" text @click="goToNextPage" :disabled="currentPage >= totalPages">
          <template #icon><NIcon><ChevronForwardOutline /></NIcon></template>
        </NButton>
      </div>
    </div>

    <div class="flex-1 min-h-0 overflow-auto relative">
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center z-10 bg-white/80">
        <NSpin size="large" />
      </div>
      <div ref="previewContainerRef" class="word-doc-container w-full h-full p-4 overflow-auto flex justify-center">
        <div v-if="!file && !arrayBuffer" class="h-full flex items-center justify-center text-gray-400">
          <div class="text-center text-sm">暂无文档，请上传.docx文件</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.word-preview {
  min-height: 0;
}
.word-doc-container :deep(.docx-wrapper) {
  margin: 0 auto;
  transition: transform 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.word-doc-container :deep(.docx-wrapper > section) {
  margin: 20px auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  float: none !important;
}
</style>
