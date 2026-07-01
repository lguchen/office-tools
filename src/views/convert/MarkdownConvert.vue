<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NIcon, NFormItem, NForm, NRadioGroup, NRadio } from 'naive-ui'
import { DocumentTextOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'

const notification = useNotification()

const inputText = ref('')
const outputText = ref('')
const outputHtml = ref('')
const convertDirection = ref<'md_to_html' | 'html_to_md'>('md_to_html')

const canConvert = computed(() => inputText.value.trim().length > 0)

const simpleMarkdownToHtml = (md: string): string => {
  let html = md
    .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
    .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
  return '<p>' + html + '</p>'
}

const simpleHtmlToMarkdown = (html: string): string => {
  let md = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, '')
  return md.trim()
}

const handleConvert = () => {
  if (!canConvert.value) return
  try {
    if (convertDirection.value === 'md_to_html') {
      outputHtml.value = simpleMarkdownToHtml(inputText.value)
      outputText.value = outputHtml.value
      notification.success({ title: '转换成功', content: 'Markdown已转换为HTML' })
    } else {
      outputText.value = simpleHtmlToMarkdown(inputText.value)
      notification.success({ title: '转换成功', content: 'HTML已转换为Markdown' })
    }
  } catch (e) {
    notification.error({ title: '转换失败', content: (e as Error).message })
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

const handleDownload = async () => {
  if (!outputText.value) return
  try {
    const ext = convertDirection.value === 'md_to_html' ? 'html' : 'md'
    const mime = convertDirection.value === 'md_to_html' ? 'text/html' : 'text/markdown'
    const blob = new Blob([outputText.value], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `converted.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    notification.success({ title: '下载成功', content: '文件已保存' })
  } catch (e) {
    notification.error({ title: '下载失败', content: (e as Error).message })
  }
}

const handleClear = () => {
  inputText.value = ''
  outputText.value = ''
  outputHtml.value = ''
}
</script>

<template>
  <ToolLayout title="Markdown转换" description="Markdown与HTML互相转换">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="转换方向">
            <NRadioGroup v-model:value="convertDirection">
              <NRadio value="md_to_html">Markdown → HTML</NRadio>
              <NRadio value="html_to_md">HTML → Markdown</NRadio>
            </NRadioGroup>
          </NFormItem>
        </NForm>

        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canConvert" @click="handleConvert">
            <template #icon>
              <NIcon><DocumentTextOutline /></NIcon>
            </template>
            开始转换
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>

        <div class="flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">
            输入 {{ convertDirection === 'md_to_html' ? 'Markdown' : 'HTML' }}
          </div>
          <NInput
            v-model:value="inputText"
            type="textarea"
            :placeholder="convertDirection === 'md_to_html' ? '在此输入Markdown...' : '在此输入HTML...'"
            class="flex-1 font-mono text-sm"
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
          @clear="outputText = ''; outputHtml = ''"
        />
        <div class="mt-4 flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">
            {{ convertDirection === 'md_to_html' ? 'HTML源码' : 'Markdown源码' }}
          </div>
          <NInput
            :value="outputText"
            type="textarea"
            placeholder="转换结果将显示在这里..."
            readonly
            class="flex-1 font-mono text-sm"
            style="min-height: 100px;"
          />
          <div v-if="convertDirection === 'md_to_html' && outputHtml" class="mt-4">
            <div class="text-sm text-gray-400 mb-2">预览</div>
            <div
              class="bg-gray-800 rounded-lg p-4 prose prose-invert max-w-none overflow-auto"
              style="min-height: 100px; max-height: 200px;"
              v-html="outputHtml"
            />
          </div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
