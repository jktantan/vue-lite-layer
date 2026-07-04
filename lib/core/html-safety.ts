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
