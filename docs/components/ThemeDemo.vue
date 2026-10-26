<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import useLiteLayer from '../../lib/composables/use-lite-layer'
import type { LayerInstance } from '../../lib/types/instance'
import type { LayerComponentSize, LayerTheme } from '../../lib/types/theme'
import { useDemoLocale } from '../composables/use-demo-locale'
import ThemeDemoContent from './ThemeDemoContent.vue'

const { appContext } = getCurrentInstance()!
const { openLayer } = useLiteLayer()
const { isEn, withLocale } = useDemoLocale()

type ThemeMode = 'light' | 'dark' | 'auto' | 'brand'

const modes: ThemeMode[] = ['light', 'dark', 'auto', 'brand']
const sizes: LayerComponentSize[] = ['small', 'default', 'large']
const presets = [
  { color: '#409eff', name: 'Blue' },
  { color: '#7c3aed', name: 'Violet' },
  { color: '#16a34a', name: 'Green' },
  { color: '#f59e0b', name: 'Amber' }
]

const mode = ref<ThemeMode>('light')
const size = ref<LayerComponentSize>('default')
const primary = ref('#409eff')
const radius = ref(8)
// Keep the LayerInstance raw: a deep ref would proxy it, so the identity
// check in the closed handler (`instance.value === current`) would never pass
// and the button would stay stuck on "Focus demo layer" after closing.
const instance = shallowRef<LayerInstance | null>(null)

const labels = computed(() =>
  isEn.value
    ? {
        title: 'Live theme playground',
        desc: 'Switch mode, primary color and radius. The open layer updates in place.',
        mode: 'Mode',
        size: 'Size',
        primary: 'Primary',
        radius: 'Radius',
        open: 'Open demo layer',
        refocus: 'Focus demo layer',
        close: 'Close',
        modes: { light: 'Light', dark: 'Dark', auto: 'Auto', brand: 'Brand' },
        sizes: { small: 'Small', default: 'Default', large: 'Large' },
        hint: 'Tip: choose Auto, then toggle the docs dark switch in the top-right corner to see it follow the host theme. Minimize from the title bar to check dock sizing. Brand tokens are defined in the global CSS below this demo.'
      }
    : {
        title: '主题实时体验',
        desc: '切换模式、主色和圆角，已打开的弹层会立即更新。',
        mode: '模式',
        size: '尺寸',
        primary: '主色',
        radius: '圆角',
        open: '打开演示弹层',
        refocus: '聚焦演示弹层',
        close: '关闭',
        modes: { light: '浅色', dark: '深色', auto: '跟随', brand: '品牌' },
        sizes: { small: '小', default: '默认', large: '大' },
        hint: '提示：选择「跟随」后，切换本站右上角的深色模式即可看到联动；点击标题栏最小化可检查停靠栏尺寸。品牌主题的令牌定义在下方全局 CSS 中。'
      }
)

const theme = computed<LayerTheme>(() => {
  const config = {
    mode: mode.value,
    size: size.value,
    vars: {
      '--lite-layer-border-radius': `${radius.value}px`
    }
  }

  return primary.value.toLowerCase() === '#409eff'
    ? config
    : { ...config, colors: { primary: primary.value } }
})

const code = computed(() => {
  const json = JSON.stringify(theme.value, null, 2).replace(/\n/g, '\n  ')
  return `openLayer({\n  theme: ${json}\n})`
})

watch(theme, (next) => {
  instance.value?.update({ theme: next })
})

const open = () => {
  if (instance.value) {
    instance.value.update({ theme: theme.value })
    instance.value.bringToTop()
    return
  }

  const current = openLayer(
    withLocale({
      title: isEn.value ? 'Theme preview' : '主题预览',
      content: ThemeDemoContent,
      props: { locale: isEn.value ? 'en' : 'zh' },
      theme: theme.value,
      size: { width: '520px', height: '430px' },
      min: true
    }),
    appContext
  )

  instance.value = current
  current?.closed.then(() => {
    if (instance.value === current) instance.value = null
  })
}

const close = () => instance.value?.close()

onBeforeUnmount(() => instance.value?.close())
</script>

<template>
  <div class="theme-demo">
    <div class="theme-demo__panel">
      <div class="theme-demo__head">
        <div>
          <div class="theme-demo__title">{{ labels.title }}</div>
          <p class="theme-demo__desc">{{ labels.desc }}</p>
        </div>
        <span class="theme-demo__badge">LIVE</span>
      </div>

      <div class="theme-demo__row">
        <span class="theme-demo__label">{{ labels.mode }}</span>
        <div class="theme-demo__segment">
          <button
            v-for="item in modes"
            :key="item"
            :class="{ active: mode === item }"
            @click="mode = item"
          >
            {{ labels.modes[item] }}
          </button>
        </div>
      </div>

      <div class="theme-demo__row">
        <span class="theme-demo__label">{{ labels.size }}</span>
        <div class="theme-demo__segment">
          <button
            v-for="item in sizes"
            :key="item"
            :class="{ active: size === item }"
            @click="size = item"
          >
            {{ labels.sizes[item] }}
          </button>
        </div>
      </div>

      <div class="theme-demo__row">
        <span class="theme-demo__label">{{ labels.primary }}</span>
        <div class="theme-demo__colors">
          <button
            v-for="preset in presets"
            :key="preset.color"
            class="theme-demo__swatch"
            :class="{ active: primary.toLowerCase() === preset.color }"
            :style="{ background: preset.color }"
            :title="preset.name"
            :aria-label="preset.name"
            @click="primary = preset.color"
          />
          <label class="theme-demo__color-input">
            <input v-model="primary" type="color" />
            <span>{{ primary }}</span>
          </label>
        </div>
      </div>

      <div class="theme-demo__row">
        <span class="theme-demo__label">{{ labels.radius }}</span>
        <input v-model.number="radius" class="theme-demo__range" type="range" min="0" max="16" />
        <span class="theme-demo__value">{{ radius }}px</span>
      </div>

      <div class="theme-demo__actions">
        <button class="theme-demo__open" @click="open">
          {{ instance ? labels.refocus : labels.open }}
        </button>
        <button class="theme-demo__close" :disabled="!instance" @click="close">
          {{ labels.close }}
        </button>
      </div>

      <pre class="theme-demo__code">{{ code }}</pre>
      <p class="theme-demo__hint">{{ labels.hint }}</p>
    </div>
  </div>
</template>

<style scoped>
.theme-demo {
  margin: 20px 0;
}

.theme-demo__panel {
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background:
    radial-gradient(circle at 100% 0, var(--vp-c-brand-soft), transparent 42%), var(--vp-c-bg-soft);
}

.theme-demo__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.theme-demo__title {
  color: var(--vp-c-text-1);
  font-size: 16px;
  font-weight: 700;
}

.theme-demo__desc {
  margin: 4px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.theme-demo__badge {
  flex-shrink: 0;
  padding: 3px 8px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 999px;
  color: var(--vp-c-brand-1);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.theme-demo__row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 42px;
}

.theme-demo__label {
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
}

.theme-demo__segment {
  display: inline-flex;
  justify-self: start;
  gap: 2px;
  padding: 3px;
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
}

.theme-demo__segment button {
  padding: 5px 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.theme-demo__segment button:hover {
  color: var(--vp-c-text-1);
}

.theme-demo__segment button.active {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  box-shadow: 0 1px 2px rgb(0 0 0 / 10%);
}

.theme-demo__colors {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-demo__swatch {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}

.theme-demo__swatch:hover {
  transform: scale(1.1);
}

.theme-demo__swatch.active {
  border-color: var(--vp-c-text-1);
  box-shadow: 0 0 0 2px var(--vp-c-bg-soft);
}

.theme-demo__color-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
  color: var(--vp-c-text-2);
  font-size: 11px;
}

.theme-demo__color-input input {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.theme-demo__range {
  width: 100%;
  max-width: 190px;
  accent-color: var(--vp-c-brand-1);
}

.theme-demo__value {
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.theme-demo__actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.theme-demo__open,
.theme-demo__close {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    opacity 0.2s ease;
}

.theme-demo__open {
  border: 1px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.theme-demo__open:hover {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-2);
}

.theme-demo__close {
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-1);
}

.theme-demo__close:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.theme-demo__close:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.theme-demo__code {
  max-height: 168px;
  margin: 14px 0 0;
  padding: 12px 14px;
  overflow: auto;
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.6;
}

.theme-demo__hint {
  margin: 10px 0 0;
  color: var(--vp-c-text-3);
  font-size: 12px;
  line-height: 1.6;
}
</style>

<!-- Named theme used by the Brand mode. This is exactly the public extension
     mechanism: target .lite-layer[data-lite-layer-theme='brand'] with tokens. -->
<style>
.lite-layer[data-lite-layer-theme='brand'] {
  color-scheme: light;
  --lite-layer-color-primary: #0ea5e9;
  --lite-layer-bg-color: #f0f9ff;
  --lite-layer-bg-color-overlay: #f8fafc;
  --lite-layer-border-color: #bae6fd;
  --lite-layer-border-color-light: #e0f2fe;
  --lite-layer-text-color-primary: #0f172a;
  --lite-layer-text-color-regular: #334155;
  --lite-layer-box-shadow: 0 16px 48px rgb(14 165 233 / 20%);
}

html.dark .lite-layer[data-lite-layer-theme='brand'] {
  color-scheme: dark;
  --lite-layer-bg-color: #082f49;
  --lite-layer-bg-color-overlay: #0c4a6e;
  --lite-layer-border-color: #075985;
  --lite-layer-border-color-light: #0c4a6e;
  --lite-layer-text-color-primary: #e0f2fe;
  --lite-layer-text-color-regular: #bae6fd;
  --lite-layer-box-shadow: 0 16px 48px rgb(0 0 0 / 45%);
}
</style>
