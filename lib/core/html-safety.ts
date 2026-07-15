/**
 * HTML 安全检测工具
 * HTML Safety Detection Utility
 *
 * 在开发环境下检测字符串内容中的潜在 XSS 风险（如 `<script>`、内联事件、`javascript:` 协议），
 * 并输出控制台警告，提示开发者使用 `textContent` 代替 `content` 渲染不可信文本。
 * In development mode, detects potential XSS risks in string content (e.g. `<script>`, inline events,
 * `javascript:` protocol) and outputs console warnings, advising developers to use `textContent`
 * instead of `content` for untrusted text.
 */
const UNSAFE_HTML_PATTERN = /<script\b|\son\w+\s*=|javascript:/i

interface ProcessLike {
  env?: Record<string, string | undefined>
}

const isDevelopmentWarningEnabled = (): boolean => {
  const processLike = (globalThis as { process?: ProcessLike }).process
  return processLike?.env?.NODE_ENV !== 'production'
}

export const warnIfUnsafeHtml = (html: string): void => {
  if (typeof window === 'undefined') return
  if (!isDevelopmentWarningEnabled()) return
  if (!UNSAFE_HTML_PATTERN.test(html)) return

  console.warn(
    '[vue-lite-layer] content string is rendered as trusted HTML. Use textContent for untrusted text.'
  )
}
