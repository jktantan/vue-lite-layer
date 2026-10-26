<script setup>
import ThemeDemo from '../components/ThemeDemo.vue'
</script>

# 主题与样式定制

Vue Lite Layer 的视觉样式全部收敛到 `--lite-layer-*` CSS 自定义属性。你可以：

- 用 `theme` 配置切换浅色 / 深色 / 自定义主题，调整语义色和组件尺寸；
- 在宿主 CSS 中覆盖任意 `--lite-layer-*` 变量；
- 通过命名主题（如 `brand`）为不同项目、不同业务区域提供独立皮肤；
- 通过暴露的 SCSS 入口在构建期生成自己的主题。

## 在线体验

直接切换模式、主色、尺寸和圆角，已打开的弹层会实时更新。选择「品牌」可以查看如何用纯 CSS 注册命名主题。

<ThemeDemo />

## 快速开始

```ts
import { createApp } from 'vue'
import VueLiteLayer from 'vue-lite-layer'
import 'vue-lite-layer/style.css'

createApp(App)
  .use(VueLiteLayer, {
    theme: {
      mode: 'dark',
      size: 'default',
      colors: { primary: '#7c3aed' }
    }
  })
  .mount('#app')
```

单层覆盖：

```ts
openLayer({
  title: '品牌弹层',
  textContent: '只影响当前弹层',
  theme: {
    mode: 'light',
    size: 'small',
    colors: { primary: '#0ea5e9' },
    vars: {
      '--lite-layer-border-radius': '10px'
    }
  }
})
```

::: tip `theme.size` ≠ `size`
`size` 仍然是弹层窗口尺寸（`{ width, height }`）；`theme.size` 是组件尺寸预设（`small` / `default` / `large`），影响字号、标题栏高度、按钮和最小化停靠栏尺寸。
:::

## theme 配置

`theme` 可以是一个主题名字符串，也可以是一个配置对象：

```ts
type LayerTheme = LayerThemeMode | LayerThemeConfig

interface LayerThemeConfig {
  /** 主题模式：light / dark / auto / 自定义名称 */
  mode?: string
  /** 组件尺寸预设 */
  size?: 'small' | 'default' | 'large'
  /** 语义色覆盖 */
  colors?: Partial<Record<'primary' | 'success' | 'warning' | 'danger' | 'error' | 'info', string>>
  /** 任意 --lite-layer-* 变量 */
  vars?: Record<`--lite-layer-${string}`, string>
}
```

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `theme` | `LayerTheme` | 未设置（浅色，`html.dark` 可覆盖） | 主题名或主题配置对象 |
| `mode` | `'light' \| 'dark' \| 'auto' \| string` | 未设置 | 主题模式；自定义名称会写入 `data-lite-layer-theme` |
| `size` | `'small' \| 'default' \| 'large'` | `'default'` | 组件尺寸预设 |
| `colors` | `Partial<Record<SemanticColor, string>>` | — | 覆盖 `primary`/`success`/`warning`/`danger`/`error`/`info` |
| `vars` | `Record<string, string>` | — | 覆盖任意以 `--lite-layer-` 开头的 CSS 变量 |

`theme` 会作为整体生效：通过 `instance.update({ theme })` 更新时，请传入完整的新主题对象，而不是只传要改的字段。

### light / dark / auto

```ts
app.use(VueLiteLayer, { theme: 'light' })
app.use(VueLiteLayer, { theme: 'dark' })
app.use(VueLiteLayer, { theme: 'auto' })
```

- `light`：浅色令牌，写入 `data-lite-layer-theme="light"`。
- `dark`：深色令牌，写入 `data-lite-layer-theme="dark"`。
- `auto`：同时监听系统 `prefers-color-scheme` 和宿主的深色声明，解析成 `light` / `dark` 后写入 `data-lite-layer-theme`。
- 未配置：不写 `data-lite-layer-theme`，此时纯 CSS 规则 `html.dark .lite-layer` 仍然生效，方便只通过宿主 class 控制深色。

`auto` 识别的宿主深色声明包括：

```html
<html class="dark">
<html data-theme="dark">
<html data-color-mode="dark">
```

深色模式只反转阴影和遮罩的明暗，**尺寸与浅色模式保持一致**：阴影仍是 `0 1px 3px`，只是从 30% 黑色换成 30% 白色；遮罩改为低透明度的浅色 scrim（`#e5eaf3` / `18%`），避免“黑上加黑”。窗体额外用 1px 浅色描边收紧轮廓。需要调整时可以直接覆盖：

```css
.lite-layer[data-lite-layer-theme='dark'] {
  --lite-layer-window-border: 1px solid rgb(255 255 255 / 24%);
  --lite-layer-shade-opacity: 0.24;
}
```

### 组件尺寸

| 预设 | 字号 | 标题栏 | 按钮 | 停靠项 |
| --- | --- | --- | --- | --- |
| `small` | 14px | 32px | 12px / `5px 12px` | 180 × 32 |
| `default` | 16px | 40px | 14px / `8px 18px` | 220 × 40 |
| `large` | 18px | 48px | 16px / `10px 22px` | 260 × 48 |

尺寸预设通过 `data-lite-layer-size` 切换，同时会改变最小化停靠栏的布局几何。

### 语义色

```ts
theme: {
  mode: 'light',
  colors: {
    primary: '#7c3aed',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#dc2626',
    error: '#ef4444',
    info: '#64748b'
  }
}
```

每个语义色都会自动派生 Element Plus 风格的交互色阶：

```css
--lite-layer-color-primary-light-3
--lite-layer-color-primary-light-5
--lite-layer-color-primary-light-7
--lite-layer-color-primary-light-8
--lite-layer-color-primary-light-9
--lite-layer-color-primary-dark-2
```

以及业务侧常用的快捷别名：

```css
--lite-layer-color-primary-hover
--lite-layer-color-primary-active
--lite-layer-color-primary-light
--lite-layer-color-primary-border
```

### 原始变量

`vars` 适合覆盖预设之外的细节，例如圆角、阴影、间距：

```ts
theme: {
  vars: {
    '--lite-layer-border-radius': '12px',
    '--lite-layer-header-height': '44px',
    '--lite-layer-content-padding': '16px',
    '--lite-layer-box-shadow': '0 12px 40px rgb(15 23 42 / 18%)'
  }
}
```

只有以 `--lite-layer-` 开头的键会被采用，避免意外注入其它 CSS 变量。

## 用 CSS 增加自己的主题

所有令牌都定义在 `.lite-layer` 根节点上，因此可以直接在宿主样式表中覆盖：

```css
/* 全局品牌色 */
.lite-layer {
  --lite-layer-color-primary: #7c3aed;
  --lite-layer-border-radius: 10px;
}
```

也可以注册一个命名主题，并在任意弹层上使用：

```css
/* 1. 定义主题 */
.lite-layer[data-lite-layer-theme='brand'] {
  --lite-layer-color-primary: #0ea5e9;
  --lite-layer-bg-color-overlay: #f8fafc;
  --lite-layer-border-color: #bae6fd;
  --lite-layer-border-color-light: #e0f2fe;
  --lite-layer-text-color-primary: #0f172a;
  --lite-layer-box-shadow: 0 16px 48px rgb(14 165 233 / 20%);
}
```

```ts
// 2. 使用主题
openLayer({ title: '品牌主题', theme: 'brand', textContent: '...' })
```

命名主题不会继承 `html.dark` 的深色令牌，因此可以完全控制自己的配色。若希望主题跟随深色模式，可以同时提供：

```css
html.dark .lite-layer[data-lite-layer-theme='brand'] {
  --lite-layer-bg-color-overlay: #082f49;
  --lite-layer-text-color-primary: #e0f2fe;
  --lite-layer-border-color-light: #0c4a6e;
}
```

## 常用令牌

| 分类 | 变量 |
| --- | --- |
| 语义色 | `--lite-layer-color-primary`、`-success`、`-warning`、`-danger`、`-error`、`-info` |
| 文本 | `--lite-layer-text-color-primary`、`-regular`、`-secondary`、`-placeholder`、`-disabled` |
| 边框 | `--lite-layer-border-color`、`-light`、`-lighter` |
| 填充 | `--lite-layer-fill-color`、`-light`、`-lighter` |
| 背景 | `--lite-layer-bg-color`、`-page`、`-overlay` |
| 遮罩 | `--lite-layer-shade-bg-color`、`--lite-layer-shade-opacity` |
| 窗口 | `--lite-layer-border-radius`、`--lite-layer-box-shadow`、`--lite-layer-window-border` |
| 标题栏 | `--lite-layer-header-height`、`--lite-layer-header-padding`、`--lite-layer-font-size` |
| 内容区 | `--lite-layer-content-padding`、`--lite-layer-scrollbar-size`、`--lite-layer-scrollbar-thumb-bg` |
| 按钮 | `--lite-layer-button-padding`、`--lite-layer-button-font-size`、`--lite-layer-button-radius` |
| 停靠栏 | `--lite-layer-dock-item-width`、`--lite-layer-dock-item-height`、`--lite-layer-dock-item-gap`、`--lite-layer-dock-inset` |
| 加载态 | `--lite-layer-loading-mask-bg`、`--lite-layer-loading-spinner-size`、`--lite-layer-loading-track-color` |

完整令牌列表见 [`lib/assets/style/theme.scss`](https://github.com/jktantan/vue-lite-layer/blob/main/lib/assets/style/theme.scss)。

## 构建期生成主题（SCSS）

包同时暴露 SCSS 源码，适合在构建期生成一套静态主题：

```scss
// 覆盖 SCSS 变量后再加载完整样式
@use 'vue-lite-layer/scss/common/var.scss' with (
  $lite-layer__color-primary: #7c3aed,
  $lite-layer__color-success: #16a34a,
  $lite-layer__border-radius: 10px
);
@use 'vue-lite-layer/scss';
```

也可以只生成主题令牌，配合默认 `style.css` 使用：

```scss
@use 'vue-lite-layer/theme' with (
  $lite-layer__color-primary: #7c3aed
);
```

此时请确保该文件在 `style.css` 之后加载，或使用构建工具控制 CSS 顺序。包内还提供了未经定制的令牌快照 `vue-lite-layer/theme.css`，可直接作为自定义主题的起点或参考。

深色令牌可以通过 `$lite-layer__dark-tokens` 整体替换；尺寸预设位于 `$lite-layer__size-metrics`，新增尺寸只需增加一个键，并在 `theme.size` 中使用同名值。

## Nuxt

```ts
export default defineNuxtConfig({
  modules: ['vue-lite-layer/nuxt'],
  vueLiteLayer: {
    theme: {
      mode: 'auto',
      size: 'default',
      colors: { primary: '#7c3aed' }
    }
  }
})
```

Nuxt 模块会校验主题配置并只保留可序列化的字段；`colors` 只接受已知语义色，`vars` 只接受 `--lite-layer-` 前缀。
