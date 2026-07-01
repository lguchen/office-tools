<script setup lang="ts">
import { ref, computed } from 'vue'
import { NUpload, NUploadDragger, NIcon, NText } from 'naive-ui'
import type { UploadProps } from 'naive-ui'
import { CloudUploadOutline } from '@vicons/ionicons5'
import { useSettingsStore } from '../../stores/settings'

interface Props {
  accept?: string
  multiple?: boolean
  tips?: string
}

const props = withDefaults(defineProps<Props>(), {
  accept: '*',
  multiple: false,
  tips: '点击或拖拽文件到此处上传'
})

const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

const emit = defineEmits<{
  (e: 'update:files', files: File[]): void
}>()

const files = ref<File[]>([])

const handleChange: UploadProps['onChange'] = (uploadFile: any) => {
  if (Array.isArray(uploadFile)) {
    files.value = uploadFile.map((f: any) => f.file as File)
  } else if (uploadFile.file) {
    if (props.multiple) {
      files.value.push(uploadFile.file as File)
    } else {
      files.value = [uploadFile.file as File]
    }
  }
  emit('update:files', files.value)
}
</script>

<template>
  <div class="file-drop-zone">
    <NUpload
      :accept="accept"
      :multiple="multiple"
      :show-file-list="true"
      @change="handleChange"
    >
      <NUploadDragger>
        <div class="p-8 flex flex-col items-center justify-center">
          <NIcon size="48" class="text-blue-400 mb-4">
            <CloudUploadOutline />
          </NIcon>
          <NText>{{ tips }}</NText>
          <NText depth="3" class="text-sm mt-2" v-if="accept !== '*'">
            支持格式: {{ accept }}
          </NText>
        </div>
      </NUploadDragger>
    </NUpload>
    <div v-if="files.length > 0" class="mt-4">
      <div
        v-for="(file, index) in files"
        :key="index"
        class="text-sm py-1"
        :class="isDark ? 'text-gray-300' : 'text-gray-600'"
      >
        {{ file.name }} ({{ (file.size / 1024).toFixed(2) }} KB)
      </div>
    </div>
  </div>
</template>
