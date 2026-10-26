import { computed, onMounted, onUnmounted, ref, type CSSProperties } from 'vue'
import type {
  LayerComponentSize,
  LayerTheme,
  LayerThemeColorType,
  LayerThemeConfig,
  LayerThemeMode
} from '@lib/types/theme'

const THEME_VAR_PREFIX = '--lite-layer-'
const DEFAULT_SIZE: LayerComponentSize = 'default'
const COLOR_TYPES: readonly LayerThemeColorType[] = [
  'primary',
  'success',
  'warning',
  'danger',
  'error',
  'info'
]

/** 把字符串/对象两种写法归一化成对象 / Normalize string/object shorthands into one config object */
const normalizeTheme = (theme?: LayerTheme): LayerThemeConfig => {
  if (typeof theme === 'string') {
    return theme ? { mode: theme } : {}
  }
  return theme && typeof theme === 'object' ? theme : {}
}

/**
 * 解析并应用弹层主题 / Resolve and apply a layer theme.
 *
 * - `light` / `dark` / 任意自定义名 → 写入 `data-lite-layer-theme`，由 CSS 选择器接管
 *   `light` / `dark` / any custom name → written to `data-lite-layer-theme`, consumed by CSS
 * - `auto` → 跟随 `prefers-color-scheme` 与宿主 `html.dark`，解析成 light/dark
 *   `auto` → follows `prefers-color-scheme` and the host's `html.dark`, resolved to light/dark
 * - 未配置 → 不写 `data-lite-layer-theme`，宿主 `html.dark` 仍可通过纯 CSS 生效
 *   unset → no `data-lite-layer-theme`, so the host's `html.dark` can still theme it via CSS
 *
 * 颜色和原始 CSS 变量会以内联自定义属性的形式写到 `.lite-layer` 根节点，
 * 因此单层覆盖不会影响其它弹层。
 * Colors and raw CSS variables are written as inline custom properties on the
 * `.lite-layer` root, so per-layer overrides don't leak into other layers.
 */
export default function useLayerTheme(getTheme: () => LayerTheme | undefined) {
  const systemDark = ref(false)
  const hostDark = ref(false)
  let mediaQuery: MediaQueryList | null = null
  let mutationObserver: MutationObserver | null = null

  /** 读取宿主是否声明了深色模式 / Read whether the host declares dark mode */
  const syncHostTheme = (): void => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    hostDark.value =
      root.classList.contains('dark') ||
      root.getAttribute('data-theme') === 'dark' ||
      root.getAttribute('data-color-mode') === 'dark'
  }

  const handleMediaChange = (event: MediaQueryListEvent): void => {
    systemDark.value = event.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined') return

    mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null
    if (mediaQuery) {
      systemDark.value = mediaQuery.matches
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleMediaChange)
      } else {
        // 兼容旧版 Safari / Older Safari fallback
        mediaQuery.addListener(handleMediaChange)
      }
    }

    syncHostTheme()
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(syncHostTheme)
      mutationObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'data-color-mode']
      })
    }
  })

  onUnmounted(() => {
    if (mediaQuery) {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleMediaChange)
      } else {
        mediaQuery.removeListener(handleMediaChange)
      }
      mediaQuery = null
    }
    mutationObserver?.disconnect()
    mutationObserver = null
  })

  const themeConfig = computed<LayerThemeConfig>(() => normalizeTheme(getTheme()))

  /**
   * 实际生效的主题名 / Resolved theme name
   *
   * 没有显式配置时返回 `undefined`，让 `html.dark` 的纯 CSS 兜底继续生效。
   * Returns `undefined` when the host didn't configure a theme, leaving the
   * pure-CSS `html.dark` fallback in control.
   */
  const themeMode = computed<string | undefined>(() => {
    const mode: LayerThemeMode | undefined = themeConfig.value.mode
    if (!mode) return undefined
    if (mode !== 'auto') return mode
    return systemDark.value || hostDark.value ? 'dark' : 'light'
  })

  const themeSize = computed<LayerComponentSize>(() => themeConfig.value.size ?? DEFAULT_SIZE)

  const themeStyle = computed<CSSProperties>(() => {
    const style: Record<string, string> = {}
    const colors = themeConfig.value.colors

    if (colors) {
      for (const type of COLOR_TYPES) {
        const value = colors[type]
        if (typeof value === 'string' && value.trim()) {
          style[`${THEME_VAR_PREFIX}color-${type}`] = value
        }
      }
    }

    const vars = themeConfig.value.vars
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        if (!name.startsWith(THEME_VAR_PREFIX)) continue
        if (typeof value !== 'string' || !value.trim()) continue
        style[name] = value
      }
    }

    return style as CSSProperties
  })

  return { themeMode, themeSize, themeStyle }
}
