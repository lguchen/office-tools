<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NIcon, NSwitch, NFormItem, NForm, NSelect } from 'naive-ui'
import { SwapHorizontalOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'

const notification = useNotification()

const inputText = ref('')
const outputText = ref('')
const sortOrder = ref<'asc' | 'desc'>('asc')
const sortType = ref<'dictionary' | 'numeric'>('dictionary')
const ignoreCase = ref(true)

const canSort = computed(() => inputText.value.trim().length > 0)

const handleSort = () => {
  if (!canSort.value) return

  try {
    const lines = inputText.value.split('\n')
    const sorted = [...lines]

    sorted.sort((a, b) => {
      let compareA: string | number = a
      let compareB: string | number = b

      if (sortType.value === 'numeric') {
        const numA = parseFloat(a)
        const numB = parseFloat(b)
        if (!isNaN(numA) && !isNaN(numB)) {
          compareA = numA
          compareB = numB
        }
      }

      if (typeof compareA === 'string' && typeof compareB === 'string') {
        if (ignoreCase.value) {
          compareA = compareA.toLowerCase()
          compareB = compareB.toLowerCase()
        }
        return sortOrder.value === 'asc'
          ? compareA.localeCompare(compareB)
          : compareB.localeCompare(compareA)
      }

      return sortOrder.value === 'asc'
        ? (compareA as number) - (compareB as number)
        : (compareB as number) - (compareA as number)
    })

    outputText.value = sorted.join('\n')
    notification.success({ title: '排序完成', content: `共 ${lines.length} 行已排序` })
  } catch (e) {
    notification.error({ title: '排序失败', content: (e as Error).message })
  }
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
    a.download = 'sorted.txt'
    a.click()
    URL.revokeObjectURL(url)
    notification.success({ title: '下载成功', content: '文件已保存' })
  } catch (e) {
    notification.error({ title: '下载失败', content: (e as Error).message })
  }
}
</script>

<template>
  <ToolLayout title="文本排序" description="按行对文本进行排序">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="排序方式">
            <NSelect
              v-model:value="sortType"
              :options="[
                { label: '字典序', value: 'dictionary' },
                { label: '数值序', value: 'numeric' }
              ]"
              style="width: 200px;"
            />
          </NFormItem>
          <NFormItem label="排序方向">
            <NSelect
              v-model:value="sortOrder"
              :options="[
                { label: '升序 (A-Z / 0-9)', value: 'asc' },
                { label: '降序 (Z-A / 9-0)', value: 'desc' }
              ]"
              style="width: 200px;"
            />
          </NFormItem>
          <NFormItem label="选项">
            <div class="flex items-center gap-2">
              <NSwitch v-model:value="ignoreCase" />
              <span class="text-sm">忽略大小写</span>
            </div>
          </NFormItem>
        </NForm>
        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canSort" @click="handleSort">
            <template #icon>
              <NIcon><SwapVerticalOutline /></NIcon>
            </template>
            开始排序
          </NButton>
          <NButton @click="handleClear">
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
          <div class="text-sm text-gray-400 mb-2">排序结果</div>
          <NInput
            :value="outputText"
            type="textarea"
            placeholder="排序结果将显示在这里..."
            readonly
            class="flex-1"
            style="min-height: 200px;"
          />
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
