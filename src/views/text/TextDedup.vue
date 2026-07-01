<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NIcon, NSwitch, NFormItem, NForm, NSelect } from 'naive-ui'
import { TrashOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'

const notification = useNotification()

const inputText = ref('')
const outputText = ref('')
const keepFirst = ref(true)
const ignoreCase = ref(false)
const ignoreWhitespace = ref(false)

const canDedup = computed(() => inputText.value.trim().length > 0)

const handleDedup = () => {
  if (!canDedup.value) return

  try {
    const lines = inputText.value.split('\n')
    const seen = new Set<string>()
    const result: string[] = []

    if (keepFirst.value) {
      for (const line of lines) {
        const key = normalize(line)
        if (!seen.has(key)) {
          seen.add(key)
          result.push(line)
        }
      }
    } else {
      const lineMap = new Map<string, string>()
      for (const line of lines) {
        const key = normalize(line)
        lineMap.set(key, line)
      }
      const seen2 = new Set<string>()
      for (const line of lines) {
        const key = normalize(line)
        if (!seen2.has(key) && lineMap.get(key) === line) {
          seen2.add(key)
          result.push(line)
        }
      }
    }

    outputText.value = result.join('\n')
    const originalCount = lines.length
    const resultCount = result.length
    const removed = originalCount - resultCount
    notification.success({
      title: '去重完成',
      content: `共 ${originalCount} 行，移除 ${removed} 行重复，剩余 ${resultCount} 行`
    })
  } catch (e) {
    notification.error({ title: '去重失败', content: (e as Error).message })
  }
}

const normalize = (line: string): string => {
  let result = line
  if (ignoreCase.value) {
    result = result.toLowerCase()
  }
  if (ignoreWhitespace.value) {
    result = result.trim().replace(/\s+/g, '')
  }
  return result
}

const handleCopy = async () => {
  if (!outputText.value) return
  try {
    await navigator.clipboard.writeText(outputText.value)
    notification.success({ title: '复制成功', content: '结果已复制到剪贴板' })
  } catch (e) {
    notification.error({ title: '复制失败', content: (e as Error).message })
  }
}

const handleClear = () => {
  inputText.value = ''
  outputText.value = ''
}

const handleDownload = async () => {
  if (!outputText.value) return
  try {
    const blob = new Blob([outputText.value], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'deduped.txt'
    a.click()
    URL.revokeObjectURL(url)
    notification.success({ title: '下载成功', content: '文件已保存' })
  } catch (e) {
    notification.error({ title: '下载失败', content: (e as Error).message })
  }
}
</script>

<template>
  <ToolLayout title="文本去重" description="按行去除重复的文本行">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="保留策略">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="keepFirst" />
                <span class="text-sm">{{ keepFirst ? '保留首行' : '保留末行' }}</span>
              </div>
            </div>
          </NFormItem>
          <NFormItem label="比较规则">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="ignoreCase" />
                <span class="text-sm">忽略大小写</span>
              </div>
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="ignoreWhitespace" />
                <span class="text-sm">忽略空白</span>
              </div>
            </div>
          </NFormItem>
        </NForm>
        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canDedup" @click="handleDedup">
            开始去重
          </NButton>
          <NButton @click="handleClear">
            <template #icon>
              <NIcon><TrashOutline /></NIcon>
            </template>
            清空
          </NButton>
        </div>
        <div class="flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">输入文本</div>
          <NInput
            v-model:value="inputText"
            type="textarea"
            placeholder="在此输入或粘贴多行文本..."
            class="flex-1"
            style="min-height: 200px;"
          />
        </div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <ActionBar
          :showCopy="true"
          :showDownload="true"
          :showClear="true"
          :copyDisabled="!outputText"
          :downloadDisabled="!outputText"
          @copy="handleCopy"
          @download="handleDownload"
          @clear="outputText = ''"
        />
        <div class="mt-4 flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">去重结果</div>
          <NInput
            :value="outputText"
            type="textarea"
            placeholder="去重结果将显示在这里..."
            readonly
            class="flex-1"
            style="min-height: 200px;"
          />
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
