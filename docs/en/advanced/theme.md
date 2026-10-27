<script setup>
import ThemeDemo from '../../components/ThemeDemo.vue'
</script>

# Theme & Styling

Every visual value in Vue Lite Layer resolves to a `--lite-layer-*` CSS custom property. This lets you:

- switch between light / dark / custom themes with the `theme` option;
- override any `--lite-layer-*` variable from host CSS;
- register named themes (for example `brand`) for different projects or app areas;
- generate a static theme at build time through the exported SCSS entry.

## Live Playground

Switch mode, primary color, size and radius; the open layer updates in place. Choose **Brand** to see a named theme registered with plain CSS.

<ThemeDemo />

## Quick Start

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

Per-layer override:

```ts
openLayer({
  title: 'Branded layer',
  textContent: 'Only this layer is affected',
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

::: tip `theme.size` is not `size`
`size` remains the window size (`{ width, height }`). `theme.size` is the component size preset (`small` / `default` / `large`), which changes font sizes, header height, buttons and the minimized dock geometry.
:::

## The `theme` Option

`theme` accepts either a theme name string or a configuration object:

```ts
type LayerTheme = LayerThemeMode | LayerThemeConfig

interface LayerThemeConfig {
  /** light / dark / auto / a custom theme name */
  mode?: string
  /** Component size preset */
  size?: 'small' | 'default' | 'large'
  /** Semantic color overrides */
  colors?: Partial<Record<'primary' | 'success' | 'warning' | 'danger' | 'error' | 'info', string>>
  /** Any --lite-layer-* variable */
  vars?: Record<`--lite-layer-${string}`, string>
}
```

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `theme` | `LayerTheme` | unset (light, overridable by `html.dark`) | Theme name or theme config object |
| `mode` | `'light' \| 'dark' \| 'auto' \| string` | unset | Theme mode; custom names are written to `data-lite-layer-theme` |
| `size` | `'small' \| 'default' \| 'large'` | `'default'` | Component size preset |
| `colors` | `Partial<Record<SemanticColor, string>>` | — | Override `primary`/`success`/`warning`/`danger`/`error`/`info` |
| `vars` | `Record<string, string>` | — | Override any CSS variable starting with `--lite-layer-` |

The `theme` object is applied as a whole. When calling `instance.update({ theme })`, pass the complete new theme object rather than only the fields you want to change.

### light / dark / auto

```ts
app.use(VueLiteLayer, { theme: 'light' })
app.use(VueLiteLayer, { theme: 'dark' })
app.use(VueLiteLayer, { theme: 'auto' })
```

- `light`: light tokens, `data-lite-layer-theme="light"`.
- `dark`: dark tokens, `data-lite-layer-theme="dark"`.
- `auto`: listens to both `prefers-color-scheme` and the host's dark declaration, resolves to `light` / `dark`, then writes `data-lite-layer-theme`.
- Unset: no `data-lite-layer-theme` attribute, so the pure-CSS rule `html.dark .lite-layer` keeps working.

`auto` recognizes these host declarations:

```html
<html class="dark">
<html data-theme="dark">
<html data-color-mode="dark">
```

Dark mode only inverts the shadow and shade, **keeping the same geometry as light mode**: the shadow is still `0 1px 3px`, changed from 30% black to 30% white; the shade becomes a low-opacity light scrim (`#e5eaf3` / `18%`) instead of stacking black on black. A 1px light outline tightens the window edge. Override either token when needed:

```css
.lite-layer[data-lite-layer-theme='dark'] {
  --lite-layer-window-border: 1px solid rgb(255 255 255 / 24%);
  --lite-layer-shade-opacity: 0.24;
}
```

### Component Size Presets

| Preset | Font | Header | Button | Dock item |
| --- | --- | --- | --- | --- |
| `small` | 14px | 32px | 12px / `5px 12px` | 180 × 32 |
| `default` | 16px | 40px | 14px / `8px 18px` | 220 × 40 |
| `large` | 18px | 48px | 16px / `10px 22px` | 260 × 48 |

Presets switch through `data-lite-layer-size` and also update the minimized dock layout.

### Semantic Colors

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

Each semantic color automatically derives Element Plus-style interaction scales:

```css
--lite-layer-color-primary-light-3
--lite-layer-color-primary-light-5
--lite-layer-color-primary-light-7
--lite-layer-color-primary-light-8
--lite-layer-color-primary-light-9
--lite-layer-color-primary-dark-2
```

Plus handy aliases:

```css
--lite-layer-color-primary-hover
--lite-layer-color-primary-active
--lite-layer-color-primary-light
--lite-layer-color-primary-border
```

### Raw Variables

Use `vars` for details not covered by presets, such as radius, shadow and spacing:

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

Only keys starting with `--lite-layer-` are applied, so other CSS variables cannot be injected accidentally.

## Add Your Own Theme with CSS

All tokens live on the `.lite-layer` root, so host styles can override them directly:

```css
/* Global brand color */
.lite-layer {
  --lite-layer-color-primary: #7c3aed;
  --lite-layer-border-radius: 10px;
}
```

You can also register a named theme and use it on any layer:

```css
/* 1. Define the theme */
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
// 2. Use the theme
openLayer({ title: 'Brand theme', theme: 'brand', textContent: '...' })
```

A named theme does not inherit the `html.dark` tokens, so you keep full control over its palette. To make it dark-mode aware, add:

```css
html.dark .lite-layer[data-lite-layer-theme='brand'] {
  --lite-layer-bg-color-overlay: #082f49;
  --lite-layer-text-color-primary: #e0f2fe;
  --lite-layer-border-color-light: #0c4a6e;
}
```

## Common Tokens

| Group | Variables |
| --- | --- |
| Semantic colors | `--lite-layer-color-primary`, `-success`, `-warning`, `-danger`, `-error`, `-info` |
| Text | `--lite-layer-text-color-primary`, `-regular`, `-secondary`, `-placeholder`, `-disabled` |
| Border | `--lite-layer-border-color`, `-light`, `-lighter` |
| Fill | `--lite-layer-fill-color`, `-light`, `-lighter` |
| Background | `--lite-layer-bg-color`, `-page`, `-overlay` |
| Shade | `--lite-layer-shade-bg-color`, `--lite-layer-shade-opacity` |
| Window | `--lite-layer-border-radius`, `--lite-layer-box-shadow`, `--lite-layer-window-border` |
| Header | `--lite-layer-header-height`, `--lite-layer-header-padding`, `--lite-layer-font-size` |
| Content | `--lite-layer-content-padding`, `--lite-layer-scrollbar-size`, `--lite-layer-scrollbar-thumb-bg` |
| Buttons | `--lite-layer-button-padding`, `--lite-layer-button-font-size`, `--lite-layer-button-radius` |
| Dock | `--lite-layer-dock-item-width`, `--lite-layer-dock-item-height`, `--lite-layer-dock-item-gap`, `--lite-layer-dock-inset` |
| Loading | `--lite-layer-loading-mask-bg`, `--lite-layer-loading-spinner-size`, `--lite-layer-loading-spinner-duration` |

See [`lib/assets/style/theme.scss`](https://github.com/jktantan/vue-lite-layer/blob/main/lib/assets/style/theme.scss) for the complete token list.

## Build-time Themes (SCSS)

The package also exposes its SCSS sources for generating a static theme at build time:

```scss
// Configure SCSS variables, then load the full stylesheet
@use 'vue-lite-layer/scss/common/var.scss' with (
  $lite-layer__color-primary: #7c3aed,
  $lite-layer__color-success: #16a34a,
  $lite-layer__border-radius: 10px
);
@use 'vue-lite-layer/scss';
```

Or emit only theme tokens to pair with the default `style.css`:

```scss
@use 'vue-lite-layer/theme' with (
  $lite-layer__color-primary: #7c3aed
);
```

Make sure this file loads after `style.css`, or rely on your bundler's CSS order. The package also ships an uncustomized token snapshot at `vue-lite-layer/theme.css` that you can use as a starting point or reference for your own theme.

Dark tokens can be replaced wholesale via `$lite-layer__dark-tokens`; size presets live in `$lite-layer__size-metrics`, where adding a key exposes a new value for `theme.size`.

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

The Nuxt module validates the theme and keeps only serializable fields. `colors` accepts known semantic colors only; `vars` accepts `--lite-layer-` keys only.
