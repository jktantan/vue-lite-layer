<script setup lang="ts">
import { ref } from 'vue'
import useLayerEvent from '../../lib/composables/use-layer-event'

const props = defineProps<{ locale: 'zh' | 'en' }>()
const { startLoading, stopLoading } = useLayerEvent()

const loading = ref(false)
const colorTypes = ['primary', 'success', 'warning', 'danger', 'error', 'info'] as const

const simulateLoading = async () => {
  if (loading.value) return
  loading.value = true
  startLoading()
  await new Promise((resolve) => setTimeout(resolve, 1200))
  stopLoading()
  loading.value = false
}
</script>

<template>
  <div class="theme-preview">
    <p class="theme-preview__eyebrow">
      {{ props.locale === 'en' ? 'LIVE THEME PREVIEW' : '实时主题预览' }}
    </p>
    <h3 class="theme-preview__title">
      {{ props.locale === 'en' ? 'Every token follows the theme' : '所有令牌都跟随主题变化' }}
    </h3>
    <p class="theme-preview__text">
      {{
        props.locale === 'en'
          ? 'Colors, borders, fills and buttons below are rendered with --lite-layer-* variables.'
          : '下方的颜色、边框、填充和按钮全部由 --lite-layer-* 变量驱动。'
      }}
    </p>

    <div class="theme-preview__swatches">
      <span
        v-for="type in colorTypes"
        :key="type"
        class="theme-preview__swatch"
        :style="{ background: `var(--lite-layer-color-${type})` }"
        :title="type"
      />
      <span class="theme-preview__swatch-label">
        {{ props.locale === 'en' ? 'semantic colors' : '语义色' }}
      </span>
    </div>

    <div class="theme-preview__card">
      <div class="theme-preview__card-head">
        <span class="theme-preview__dot" />
        <strong>{{ props.locale === 'en' ? 'Content surface' : '内容与交互区域' }}</strong>
        <code>--lite-layer-bg-color-overlay</code>
      </div>
      <p>
        {{
          props.locale === 'en'
            ? 'Switch the controls on the page while this layer stays open — the theme updates in place.'
            : '保持弹层打开，切换页面上的模式 / 颜色 / 尺寸，主题会实时更新。'
        }}
      </p>
      <div class="theme-preview__actions">
        <button class="theme-preview__action" :disabled="loading" @click="simulateLoading">
          {{
            loading
              ? props.locale === 'en'
                ? 'Loading…'
                : '加载中…'
              : props.locale === 'en'
                ? 'Test loading (1.2s)'
                : '测试 Loading（1.2s）'
          }}
        </button>
        <span class="theme-preview__meta">color-primary / button / loading</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-preview {
  padding: 16px;
  color: var(--lite-layer-text-color-primary);
  font-size: 14px;
  line-height: 1.7;
}

.theme-preview__eyebrow {
  margin: 0 0 4px;
  color: var(--lite-layer-color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.theme-preview__title {
  margin: 0 0 6px;
  font-size: 20px;
  line-height: 1.35;
  color: var(--lite-layer-text-color-primary);
}

.theme-preview__text {
  margin: 0;
  color: var(--lite-layer-text-color-secondary);
  font-size: 13px;
}

.theme-preview__swatches {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 18px 0;
}

.theme-preview__swatch {
  width: 26px;
  height: 26px;
  border: 1px solid var(--lite-layer-border-color-light);
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 25%);
}

.theme-preview__swatch-label {
  margin-left: 4px;
  color: var(--lite-layer-text-color-placeholder);
  font-size: 12px;
}

.theme-preview__card {
  padding: 14px;
  border: 1px solid var(--lite-layer-border-color-light);
  border-radius: var(--lite-layer-border-radius);
  background: var(--lite-layer-fill-color-light);
}

.theme-preview__card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}

.theme-preview__card-head code {
  margin-left: auto;
  color: var(--lite-layer-text-color-placeholder);
  font-size: 10px;
}

.theme-preview__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--lite-layer-color-success);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lite-layer-color-success) 20%, transparent);
}

.theme-preview__card p {
  margin: 0;
  color: var(--lite-layer-text-color-regular);
  font-size: 13px;
}

.theme-preview__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.theme-preview__action {
  padding: 7px 14px;
  border: 0;
  border-radius: var(--lite-layer-button-radius);
  background: var(--lite-layer-color-primary);
  color: var(--lite-layer-color-white, #fff);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.theme-preview__action:hover:not(:disabled) {
  background: var(--lite-layer-color-primary-hover);
}

.theme-preview__action:disabled {
  cursor: wait;
  opacity: 0.7;
}

.theme-preview__meta {
  color: var(--lite-layer-text-color-placeholder);
  font-size: 11px;
}
</style>
