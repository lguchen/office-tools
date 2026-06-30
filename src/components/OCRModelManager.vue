<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useOcrModelStore } from '@/stores/ocrModel'
import { isTauri } from '@/utils/tauriUtils'
import {
  NCard,
  NButton,
  NProgress,
  NTag,
  NInput,
  NTooltip,
  NEmpty,
  NSpin,
  NModal,
  NSpace,
  NAlert,
  NIcon
} from 'naive-ui'

// === 双向绑定 visible ===
const visible = defineModel<boolean>('visible', { default: false })

const emit = defineEmits<{
  (e: 'models-ready'): void
}>()

const ocrStore = useOcrModelStore()

// === 自定义下载源相关状态 ===
const showCustomUrlFor = ref<string | null>(null)
const customUrlInput = ref('')

// === 初始化与清理 ===
onMounted(async () => {
  if (isTauri()) {
    await ocrStore.initModels()
    await ocrStore.setupProgressListener()
    await ocrStore.checkAllModels()
  }
})

onUnmounted(() => {
  ocrStore.cleanup()
})

watch(visible, async (val) => {
  if (val && isTauri()) {
    await ocrStore.checkAllModels()
  }
})

// === 辅助函数：获取模型状态 ===
const getModelStatus = (lang: string) => {
  return ocrStore.modelStatuses.find((s) => s.lang === lang)?.status || 'not_downloaded'
}

// === 辅助函数：获取下载进度 ===
const getProgress = (lang: string) => {
  if (ocrStore.currentDownload?.model === lang) {
    return ocrStore.currentDownload
  }
  return null
}

// === 辅助函数：是否正在下载 ===
const isDownloading = (lang: string) => {
  const progress = getProgress(lang)
  return progress !== null && (progress.status === 'downloading' || progress.status === 'paused')
}

// === 辅助函数：获取状态对应的 tag 类型 ===
const getStatusTagType = (status: string): 'default' | 'info' | 'success' | 'error' | 'warning' => {
  const map: Record<string, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
    not_downloaded: 'default',
    downloading: 'info',
    ready: 'success',
    corrupted: 'error'
  }
  return map[status] || 'default'
}

// === 关闭弹窗 ===
const close = () => {
  visible.value = false
}

// === 下载模型 ===
const handleDownload = async (lang: string) => {
  const ok = await ocrStore.downloadModel(lang)
  if (ok) {
    emit('models-ready')
  }
}

// === 取消下载 ===
const handleCancel = async (lang: string) => {
  await ocrStore.cancelDownload(lang)
}

// === 删除模型 ===
const handleDelete = async (lang: string) => {
  if (confirm('确定删除此语言模型吗？')) {
    await ocrStore.deleteModel(lang)
  }
}

// === 重试下载（失败时） ===
const handleRetry = async (lang: string) => {
  const ok = await ocrStore.downloadModel(lang)
  if (ok) {
    emit('models-ready')
  }
}

// === 切换自定义下载源显示 ===
const toggleCustomUrl = (lang: string) => {
  if (showCustomUrlFor.value === lang) {
    showCustomUrlFor.value = null
  } else {
    const model = ocrStore.models.find((m) => m.lang === lang)
    customUrlInput.value = ocrStore.customUrls[lang] || model?.url || ''
    showCustomUrlFor.value = lang
  }
}

// === 保存自定义下载源 ===
const saveCustomUrl = (lang: string) => {
  ocrStore.setCustomUrl(lang, customUrlInput.value)
  showCustomUrlFor.value = null
}

// === 使用自定义地址下载 ===
const downloadWithCustomUrl = async (lang: string) => {
  ocrStore.setCustomUrl(lang, customUrlInput.value)
  showCustomUrlFor.value = null
  await handleDownload(lang)
}

// === 进度条颜色（根据状态） ===
const getProgressColor = (status: string): string => {
  if (status === 'failed') return '#ff4d4f'
  if (status === 'verifying') return '#faad14'
  if (status === 'paused') return '#8c8c8c'
  return '#1677ff'
}

// === 进度条状态文字 ===
const getProgressStatusText = (status: string): string => {
  const map: Record<string, string> = {
    downloading: '下载中',
    paused: '已暂停',
    completed: '已完成',
    failed: '下载失败',
    cancelled: '已取消',
    verifying: '校验中'
  }
  return map[status] || status
}
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="'📦 OCR 语言模型管理'"
    :style="{ width: '560px' }"
    :mask-closable="false"
    @after-enter="() => isTauri() && ocrStore.checkAllModels()"
  >
    <template #header-extra>
      <NButton text @click="close">
        <template #icon>✕</template>
      </NButton>
    </template>

    <!-- 提示信息 -->
    <NAlert
      type="info"
      :show-icon="true"
      style="margin-bottom: 16px;"
    >
      <template #icon>💡</template>
      下载对应语言的模型即可使用识别功能，无需下载全部。单语言包即可独立使用（中文模型单独下载即可识别中文）。
    </NAlert>

    <!-- 加载状态 -->
    <div v-if="!ocrStore.hasChecked && ocrStore.models.length === 0" style="text-align: center; padding: 40px 0;">
      <NSpin size="large" />
      <div style="margin-top: 12px; color: var(--text-tertiary); font-size: 13px;">加载模型列表中...</div>
    </div>

    <!-- 空状态 -->
    <NEmpty
      v-else-if="ocrStore.models.length === 0"
      description="暂无可用模型"
      style="padding: 40px 0;"
    />

    <!-- 模型列表 -->
    <div v-else class="model-list">
      <NCard
        v-for="model in ocrStore.models"
        :key="model.lang"
        :bordered="true"
        size="small"
        class="model-card"
      >
        <!-- 模型头部：名称 + 状态标签 -->
        <div class="model-head">
          <div class="model-name">{{ model.name }}</div>
          <NTag
            :type="getStatusTagType(getModelStatus(model.lang))"
            size="small"
            round
          >
            {{ ocrStore.getStatusText(getModelStatus(model.lang)) }}
          </NTag>
        </div>

        <!-- 模型信息 -->
        <div class="model-info">
          <span>文件大小：约 {{ ocrStore.formatSize(model.size) }}</span>
          <span class="info-divider">|</span>
          <span>语言代码：{{ model.lang }}</span>
        </div>

        <!-- 下载进度条区域 -->
        <div v-if="isDownloading(model.lang) || getProgress(model.lang)?.status === 'verifying' || getProgress(model.lang)?.status === 'failed'" class="progress-section">
          <div class="progress-header">
            <span class="progress-status" :style="{ color: getProgressColor(getProgress(model.lang)?.status || '') }">
              {{ getProgressStatusText(getProgress(model.lang)?.status || '') }}
            </span>
            <span class="progress-speed" v-if="getProgress(model.lang)?.status === 'downloading'">
              {{ getProgress(model.lang)?.speed }}
            </span>
          </div>
          <NProgress
            :percentage="getProgress(model.lang)?.percent || 0"
            :color="getProgressColor(getProgress(model.lang)?.status || '')"
            :show-indicator="false"
            :height="6"
            style="margin: 8px 0;"
          />
          <div class="progress-info">
            <span>{{ ocrStore.formatSize(getProgress(model.lang)?.downloaded || 0) }} / {{ ocrStore.formatSize(getProgress(model.lang)?.total || model.size) }}</span>
            <span>{{ (getProgress(model.lang)?.percent || 0).toFixed(1) }}%</span>
          </div>
        </div>

        <!-- 文件损坏提示 -->
        <div v-if="getModelStatus(model.lang) === 'corrupted'" class="corrupted-tip">
          <NAlert type="error" size="small" :show-icon="true">
            <template #icon>⚠️</template>
            文件完整性校验失败，模型文件可能已损坏，请重新下载。
          </NAlert>
        </div>

        <!-- 下载失败提示 -->
        <div v-if="getProgress(model.lang)?.status === 'failed'" class="error-tip">
          <NAlert type="error" size="small" :show-icon="true">
            <template #icon>❌</template>
            {{ ocrStore.downloadError || '下载失败，请检查网络连接后重试。' }}
          </NAlert>
        </div>

        <!-- 自定义下载源区域 -->
        <div v-if="showCustomUrlFor === model.lang" class="custom-url-section">
          <div class="url-label">下载地址（可替换为国内镜像源）：</div>
          <NSpace vertical size="small">
            <NInput
              v-model:value="customUrlInput"
              placeholder="默认官方下载地址"
              size="small"
              clearable
            />
            <div class="default-url">
              <span class="default-url-label">默认源：</span>
              <NTooltip :content="model.url" placement="top">
                <span class="default-url-text">{{ model.url }}</span>
              </NTooltip>
            </div>
            <NSpace size="small">
              <NButton size="small" @click="saveCustomUrl(model.lang)">
                保存地址
              </NButton>
              <NButton
                size="small"
                type="primary"
                @click="downloadWithCustomUrl(model.lang)"
              >
                用此地址下载
              </NButton>
              <NButton size="small" text @click="showCustomUrlFor = null">
                取消
              </NButton>
            </NSpace>
          </NSpace>
        </div>

        <!-- 操作按钮区 -->
        <div class="model-actions">
          <!-- 已就绪状态 -->
          <template v-if="getModelStatus(model.lang) === 'ready'">
            <NTooltip content="更换下载源地址">
              <NButton size="small" @click="toggleCustomUrl(model.lang)">
                <template #icon>🔗</template>
                更换下载源
              </NButton>
            </NTooltip>
            <NTooltip content="删除此语言模型">
              <NButton size="small" type="error" @click="handleDelete(model.lang)">
                <template #icon>🗑</template>
                删除
              </NButton>
            </NTooltip>
          </template>

          <!-- 下载中 / 校验中 / 暂停状态 -->
          <template v-else-if="isDownloading(model.lang) || getProgress(model.lang)?.status === 'verifying'">
            <NTooltip content="取消当前下载">
              <NButton
                size="small"
                type="error"
                :disabled="getProgress(model.lang)?.status === 'verifying'"
                @click="handleCancel(model.lang)"
              >
                <template #icon>✕</template>
                {{ getProgress(model.lang)?.status === 'verifying' ? '校验中...' : '取消下载' }}
              </NButton>
            </NTooltip>
          </template>

          <!-- 下载失败状态 -->
          <template v-else-if="getProgress(model.lang)?.status === 'failed'">
            <NTooltip content="使用默认地址重新下载">
              <NButton size="small" type="primary" @click="handleRetry(model.lang)">
                <template #icon>🔄</template>
                重试下载
              </NButton>
            </NTooltip>
            <NTooltip content="更换下载源地址">
              <NButton size="small" @click="toggleCustomUrl(model.lang)">
                <template #icon>🔗</template>
                更换下载源
              </NButton>
            </NTooltip>
          </template>

          <!-- 未下载 / 文件损坏状态 -->
          <template v-else>
            <NTooltip :content="getModelStatus(model.lang) === 'corrupted' ? '重新下载模型文件' : '下载此语言模型'">
              <NButton size="small" type="primary" @click="handleDownload(model.lang)">
                <template #icon>⬇</template>
                {{ getModelStatus(model.lang) === 'corrupted' ? '重新下载' : '下载' }}
              </NButton>
            </NTooltip>
            <NTooltip content="自定义下载源地址">
              <NButton size="small" @click="toggleCustomUrl(model.lang)">
                <template #icon>🔗</template>
                自定义下载源
              </NButton>
            </NTooltip>
          </template>
        </div>
      </NCard>
    </div>

    <!-- 底部：模型存储路径 -->
    <template #footer>
      <div class="modal-footer">
        <div v-if="ocrStore.modelsDir" class="models-dir">
          <NTooltip :content="ocrStore.modelsDir" placement="top">
            <span class="dir-label">📁 模型目录：</span>
            <span class="dir-path">{{ ocrStore.modelsDir }}</span>
          </NTooltip>
        </div>
        <NButton type="primary" @click="close">
          关闭
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.model-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-card {
  border-radius: 8px;
  transition: box-shadow 0.2s ease;
}

.model-card:hover {
  box-shadow: 0 2px 12px rgba(22, 119, 255, 0.1);
}

.model-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.model-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.model-info {
  font-size: 12px;
  color: var(--text-tertiary, #8c8c8c);
  margin-bottom: 12px;
}

.info-divider {
  margin: 0 8px;
  color: var(--border-color, #e8e8e8);
}

.progress-section {
  margin: 12px 0;
  padding: 10px 12px;
  background: var(--bg-tertiary, #fafafa);
  border-radius: 6px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.progress-status {
  font-weight: 500;
}

.progress-speed {
  color: var(--text-secondary, #666);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary, #666);
}

.corrupted-tip,
.error-tip {
  margin: 10px 0;
}

.custom-url-section {
  margin: 12px 0;
  padding: 12px;
  background: var(--bg-tertiary, #fafafa);
  border-radius: 6px;
  border: 1px dashed var(--border-color, #d9d9d9);
}

.url-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.default-url {
  font-size: 11px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.default-url-label {
  flex-shrink: 0;
}

.default-url-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 380px;
  cursor: help;
}

.model-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.models-dir {
  font-size: 11px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 380px;
  overflow: hidden;
}

.dir-label {
  flex-shrink: 0;
}

.dir-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
}

:deep(.n-card) {
  border-radius: 8px;
}

:deep(.n-modal) {
  border-radius: 8px;
}

:deep(.n-modal-card) {
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}

:deep(.n-progress-line) {
  border-radius: 3px;
}

:deep(.n-progress-line__fill) {
  border-radius: 3px;
}
</style>
