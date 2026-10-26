/**
 * 组件尺寸预设 / Component size presets
 *
 * 与 Element Plus 的 `small | default | large` 对齐，通过
 * `data-lite-layer-size` 属性切换间距、字号、标题栏高度等尺寸令牌。
 * Aligns with Element Plus's `small | default | large`; the
 * `data-lite-layer-size` attribute switches spacing, font sizes, header
 * height and other size tokens.
 */
export type LayerComponentSize = 'small' | 'default' | 'large'

/**
 * 内置主题模式，也允许自定义主题名 / Built-in theme modes, custom names allowed
 *
 * - `light`：浅色主题 / light theme
 * - `dark`：深色主题 / dark theme
 * - `auto`：跟随 `prefers-color-scheme` 与宿主 `html.dark`
 *   Follows `prefers-color-scheme` and the host's `html.dark` class
 * - 其他字符串：自定义主题名，需自行通过 CSS 定义
 *   Any other string: a custom theme name, defined by your own CSS
 */
export type LayerThemeMode = 'light' | 'dark' | 'auto' | (string & {})

/**
 * 可覆盖的语义色类型 / Semantic color types that can be overridden
 *
 * 每种颜色都会自动生成 `light-3/5/7/8/9` 与 `dark-2` 派生色，
 * 因此只需提供一个主色即可得到完整的交互色阶。
 * Each color automatically gets `light-3/5/7/8/9` and `dark-2`
 * derivations, so one base color is enough for a full interaction scale.
 */
export type LayerThemeColorType = 'primary' | 'success' | 'warning' | 'danger' | 'error' | 'info'

/** 语义色覆盖表 / Semantic color overrides */
export type LayerThemeColors = Partial<Record<LayerThemeColorType, string>>

/**
 * 原始 CSS 自定义属性覆盖表 / Raw CSS custom property overrides
 *
 * 键必须形如 `--lite-layer-*`，值会被内联到 `.lite-layer` 根节点。
 * Keys must look like `--lite-layer-*`; values are inlined on the
 * `.lite-layer` root element.
 */
export type LayerThemeVars = Record<`--lite-layer-${string}`, string>

/**
 * 主题配置对象 / Theme configuration object
 *
 * ```ts
 * openLayer({
 *   theme: {
 *     mode: 'dark',
 *     size: 'small',
 *     colors: { primary: '#7c3aed' },
 *     vars: { '--lite-layer-header-height': '52px' }
 *   }
 * })
 * ```
 */
export interface LayerThemeConfig {
  /** 浅色、深色、跟随系统或自定义主题名 / Light, dark, auto, or a custom theme name */
  mode?: LayerThemeMode
  /** 组件尺寸预设 / Component size preset */
  size?: LayerComponentSize
  /** 语义色覆盖 / Semantic color overrides */
  colors?: LayerThemeColors
  /** 任意 CSS 变量覆盖 / Arbitrary CSS variable overrides */
  vars?: LayerThemeVars
}

/**
 * 主题配置快捷写法 / Theme configuration shorthand
 *
 * 传字符串等价于 `{ mode }` / A string is shorthand for `{ mode }`.
 */
export type LayerTheme = LayerThemeMode | LayerThemeConfig
