<script setup lang="ts">
import { ref } from 'vue'
import { NInputNumber, NButton, NIcon, NFormItem, NForm, NSwitch, NSpace, NCard, NGrid, NGi } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { notifySuccess, notifyError } from '../../composables/useNotification'

const count = ref(5)
const uppercase = ref(false)
const noHyphen = ref(false)
const uuids = ref<string[]>([])

const generateUuid = (): string => {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const generate = () => {
  const n = Math.min(Math.max(count.value, 1), 100)
  const result: string[] = []
  for (let i = 0; i < n; i++) {
    let uuid = generateUuid()
    if (uppercase.value) uuid = uuid.toUpperCase()
    if (noHyphen.value) uuid = uuid.replace(/-/g, '')
    result.push(uuid)
  }
  uuids.value = result
  notifySuccess('生成成功', `已生成 ${n} 个UUID`)
}

const handleCopy = async () => {
  if (uuids.value.length === 0) return
  try {
    await navigator.clipboard.writeText(uuids.value.join('\n'))
    notifySuccess('复制成功', '所有UUID已复制')
  } catch (e) {
    notifyError('复制失败', (e as Error).message)
  }
}

const copySingle = async (uuid: string) => {
  try {
    await navigator.clipboard.writeText(uuid)
    notifySuccess('复制成功', 'UUID已复制')
  } catch (e) {
    notifyError('复制失败', (e as Error).message)
  }
}

const handleDownload = async () => {
  if (uuids.value.length === 0) return
  try {
    const blob = new Blob([uuids.value.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'uuids.txt'
    a.click()
    URL.revokeObjectURL(url)
    notifySuccess('下载成功', '文件已保存')
  } catch (e) {
    notifyError('下载失败', (e as Error).message)
  }
}

const handleClear = () => {
  uuids.value = []
}
</script>

<template>
  <ToolLayout title="UUID生成" description="批量生成UUID v4">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="生成数量">
            <NInputNumber
              v-model:value="count"
              :min="1"
              :max="100"
              style="width: 150px;"
            />
          </NFormItem>
          <NFormItem label="大写字母">
            <NSwitch v-model:value="uppercase" />
          </NFormItem>
          <NFormItem label="去除连字符">
            <NSwitch v-model:value="noHyphen" />
          </NFormItem>
        </NForm>

        <div class="flex gap-2">
          <NButton type="primary" @click="generate">
            <template #icon>
              <NIcon><RefreshOutline /></NIcon>
            </template>
            生成UUID
          </NButton>
        </div>

        <div class="text-xs text-gray-500">
          版本: UUID v4 (随机)，数量范围 1-100
        </div>

        <div class="flex-1"></div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <ActionBar
          :showCopy="true"
          :showDownload="true"
          :showClear="true"
          :copyDisabled="uuids.length === 0"
          :downloadDisabled="uuids.length === 0"
          @copy="handleCopy"
          @download="handleDownload"
          @clear="handleClear"
        />
        <div class="mt-4 flex-1 overflow-auto">
          <div v-if="uuids.length === 0" class="text-center py-12 text-gray-500">
            点击生成按钮生成UUID
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(uuid, index) in uuids"
              :key="index"
              class="flex items-center gap-3 p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <span class="text-xs text-gray-500 w-8 text-right">{{ index + 1 }}.</span>
              <span class="flex-1 font-mono text-sm break-all">{{ uuid }}</span>
              <NButton
                size="tiny"
                quaternary
                type="primary"
                @click="copySingle(uuid)"
              >
                复制
              </NButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
