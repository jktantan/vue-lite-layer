let printedVersion: string | null = null

/**
 * Prints a compact version banner once per app install.
 *
 * The previous implementation embedded a full SVG logo plus a base64 encoder,
 * which accounted for roughly a fifth of the gzipped library bundle just to
 * draw a console badge. A text badge costs almost nothing and keeps the
 * package "lite".
 */
const printVersion = (version: string) => {
  if (typeof window === 'undefined') return
  if (printedVersion === version) return
  printedVersion = version

  const suffix = version ? ` v${version}` : ''
  console.info(
    `%cvue-lite-layer${suffix}%c https://jktantan.github.io/vue-lite-layer/`,
    'color:#409eff;font-weight:600;padding:2px 6px;border:1px solid #409eff;border-radius:4px;background:#f4f8ff;',
    'color:#909399;'
  )
}

export default printVersion
