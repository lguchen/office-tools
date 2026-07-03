<script setup lang="ts">
import { NSpace, NButton, NIcon } from 'naive-ui'
import { CopyOutline, CloudDownloadOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
interface Props {
  showCopy?: boolean
  showDownload?: boolean
  showRefresh?: boolean
  showClear?: boolean
  copyDisabled?: boolean
  downloadDisabled?: boolean
}

withDefaults(defineProps<Props>(), {
  showCopy: true,
  showDownload: true,
  showRefresh: false,
  showClear: false,
  copyDisabled: false,
  downloadDisabled: false
})

const emit = defineEmits<{
  (e: 'copy'): void
  (e: 'download'): void
  (e: 'refresh'): void
  (e: 'clear'): void
}>()
</script>

<template>
  <div
    class="action-bar flex items-center gap-2 p-4 rounded-lg bg-white border border-gray-200"
  >
    <NSpace>
      <NButton
        v-if="showCopy"
        type="primary"
        :disabled="copyDisabled"
        @click="emit('copy')"
      >
        <template #icon>
          <NIcon><CopyOutline /></NIcon>
        </template>
        复制
      </NButton>
      <NButton
        v-if="showDownload"
        type="success"
        :disabled="downloadDisabled"
        @click="emit('download')"
      >
        <template #icon>
          <NIcon><CloudDownloadOutline /></NIcon>
        </template>
        下载
      </NButton>
      <NButton
        v-if="showRefresh"
        @click="emit('refresh')"
      >
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
      <NButton
        v-if="showClear"
        @click="emit('clear')"
      >
        <template #icon>
          <NIcon><TrashOutline /></NIcon>
        </template>
        清空
      </NButton>
    </NSpace>
    <slot />
  </div>
</template>
