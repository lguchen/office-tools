<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NInput, NGrid, NGi, NCard, NButton, NIcon, NSpace } from 'naive-ui'
import { CreateOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useNotification } from 'naive-ui'

const notification = useNotification()

const inputText = ref('')

const stats = computed(() => {
  const text = inputText.value
  const totalChars = text.length
  const charsNoSpaces = text.replace(/\s/g, '').length
  const bytes = new TextEncoder().encode(text).length

  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length
  const digitChars = (text.match(/[0-9]/g) || []).length
  const whitespaceChars = (text.match(/\s/g) || []).length

  const lines = text.length > 0 ? text.split('\n').length : 0
  const nonEmptyLines = text.length > 0 ? text.split('\n').filter(l => l.trim().length > 0).length : 0

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim()).length : 0

  return {
    totalChars,
    charsNoSpaces,
    bytes,
    chineseChars,
    englishChars,
    digitChars,
    whitespaceChars,
    lines,
    nonEmptyLines,
    words,
    paragraphs
  }
})

const handleClear = () => {
  inputText.value = ''
}

const handleCopy = async () => {
  const s = stats.value
  const text = `字符数: ${s.totalChars}
不含空格字符数: ${s.charsNoSpaces}
字节数: ${s.bytes}
中文字符: ${s.chineseChars}
英文字符: ${s.englishChars}
数字字符: ${s.digitChars}
空白字符: ${s.whitespaceChars}
行数: ${s.lines}
非空行数: ${s.nonEmptyLines}
单词数: ${s.words}
段落数: ${s.paragraphs}`

  try {
    await navigator.clipboard.writeText(text)
    notification.success({ title: '复制成功', content: '统计结果已复制到剪贴板' })
  } catch (e) {
    notification.error({ title: '复制失败', content: (e as Error).message })
  }
}
</script>

<template>
  <ToolLayout title="文本统计" description="统计文本的字符数、行数、单词数等信息" :showOutput="false">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <div class="flex justify-between items-center">
          <div class="text-sm text-gray-400">输入文本</div>
          <NSpace>
            <NButton size="small" @click="handleCopy">
              复制统计
            </NButton>
            <NButton size="small" @click="handleClear">
              清空
            </NButton>
          </NSpace>
        </div>
        <NInput
          v-model:value="inputText"
          type="textarea"
          placeholder="在此输入或粘贴文本进行统计..."
          class="flex-1"
          style="min-height: 200px;"
        />
      </div>
    </template>

    <template #output>
      <div class="space-y-4">
        <div class="text-lg font-semibold text-blue-400">统计结果</div>
        <NGrid :cols="2" :x-gap="12" :y-gap="12">
          <NGi>
            <NCard size="small" class="text-center">
              <div class="text-2xl font-bold text-blue-400">{{ stats.totalChars }}</div>
              <div class="text-sm text-gray-400 mt-1">总字符数</div>
            </NCard>
          </NGi>
          <NGi>
            <NCard size="small" class="text-center">
              <div class="text-2xl font-bold text-green-400">{{ stats.charsNoSpaces }}</div>
              <div class="text-sm text-gray-400 mt-1">不含空格</div>
            </NCard>
          </NGi>
          <NGi>
            <NCard size="small" class="text-center">
              <div class="text-2xl font-bold text-purple-400">{{ stats.bytes }}</div>
              <div class="text-sm text-gray-400 mt-1">字节数 (UTF-8)</div>
            </NCard>
          </NGi>
          <NGi>
            <NCard size="small" class="text-center">
              <div class="text-2xl font-bold text-yellow-400">{{ stats.lines }}</div>
              <div class="text-sm text-gray-400 mt-1">总行数</div>
            </NCard>
          </NGi>
          <NGi>
            <NCard size="small" class="text-center">
              <div class="text-2xl font-bold text-orange-400">{{ stats.nonEmptyLines }}</div>
              <div class="text-sm text-gray-400 mt-1">非空行</div>
            </NCard>
          </NGi>
          <NGi>
            <NCard size="small" class="text-center">
              <div class="text-2xl font-bold text-pink-400">{{ stats.words }}</div>
              <div class="text-sm text-gray-400 mt-1">单词数</div>
            </NCard>
          </NGi>
          <NGi>
            <NCard size="small" class="text-center">
              <div class="text-2xl font-bold text-red-400">{{ stats.chineseChars }}</div>
              <div class="text-sm text-gray-400 mt-1">中文字符</div>
            </NCard>
          </NGi>
          <NGi>
            <NCard size="small" class="text-center">
              <div class="text-2xl font-bold text-cyan-400">{{ stats.englishChars }}</div>
              <div class="text-sm text-gray-400 mt-1">英文字符</div>
            </NCard>
          </NGi>
          <NGi>
            <NCard size="small" class="text-center">
              <div class="text-2xl font-bold text-indigo-400">{{ stats.digitChars }}</div>
              <div class="text-sm text-gray-400 mt-1">数字字符</div>
            </NCard>
          </NGi>
          <NGi>
            <NCard size="small" class="text-center">
              <div class="text-2xl font-bold text-gray-400">{{ stats.whitespaceChars }}</div>
              <div class="text-sm text-gray-400 mt-1">空白字符</div>
            </NCard>
          </NGi>
        </NGrid>
        <NCard size="small">
          <div class="text-center">
            <span class="text-2xl font-bold text-teal-400">{{ stats.paragraphs }}</span>
            <span class="text-sm text-gray-400 ml-2">段落数</span>
          </div>
        </NCard>
      </div>
    </template>
  </ToolLayout>
</template>
