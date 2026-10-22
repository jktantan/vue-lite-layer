import type { LayerCloseContext } from '@lib/types/layer'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface LayerFocusOptions {
  getWindow: () => HTMLElement | null
  /**
   * Returns the layer root (the element that also owns the shade and dock).
   * Used only for focus restoration; defaults to the window itself.
   */
  getLayerRoot?: () => HTMLElement | null
  shouldCloseOnEsc: () => boolean | undefined
  shouldTrapFocus: () => boolean | undefined
  shouldRestoreFocus: () => boolean | undefined
  requestClose: (context: LayerCloseContext) => Promise<void>
}

/**
 * Check whether an element is currently visible to keyboard users.
 *
 * Browsers honor `aria-hidden="true"` on the element itself and CSS hiding via
 * `display: none` / `visibility: hidden`, but they do not all treat every
 * ancestor combination the same way. We mirror the WAI-ARIA Authoring
 * Practices check: skip elements that are hidden by themselves, by an ancestor
 * with `aria-hidden="true"`, or that have zero rendered size from CSS hiding.
 */
const isElementVisible = (element: HTMLElement): boolean => {
  // ARIA/hidden ancestry is cheap to check and not covered by checkVisibility().
  let current: HTMLElement | null = element
  while (current) {
    if (current.getAttribute('aria-hidden') === 'true' || current.hasAttribute('hidden')) {
      return false
    }
    current = current.parentElement
  }

  // Prefer the native API: one call instead of getComputedStyle() on every
  // ancestor for every Tab press.
  if (typeof element.checkVisibility === 'function') {
    return element.checkVisibility({ checkVisibilityCSS: true })
  }

  current = element
  while (current) {
    const style = window.getComputedStyle(current)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    current = current.parentElement
  }
  return true
}

/** Owns keyboard focus capture, trapping and restoration for one dialog. */
export const useLayerFocus = ({
  getWindow,
  getLayerRoot,
  shouldCloseOnEsc,
  shouldTrapFocus,
  shouldRestoreFocus,
  requestClose
}: LayerFocusOptions) => {
  let previouslyFocused: HTMLElement | null = null

  const capturePreviousFocus = (): void => {
    previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
  }

  const focusWindow = (): void => {
    getWindow()?.focus()
  }

  const getFocusableElements = (): HTMLElement[] => {
    const windowEl = getWindow()
    if (!windowEl) return []
    return Array.from(windowEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      isElementVisible
    )
  }

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && shouldCloseOnEsc()) {
      event.preventDefault()
      void requestClose({ reason: 'escape' })
      return
    }
    if (event.key !== 'Tab' || !shouldTrapFocus()) return

    const windowEl = getWindow()
    if (!windowEl) return
    const focusable = getFocusableElements()
    if (focusable.length === 0) {
      event.preventDefault()
      focusWindow()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    // The dialog itself and the shade are both outside the focusable set (the
    // dialog has tabindex="-1", the shade is a sibling). Without these guards
    // Shift+Tab from the dialog or Tab from the shade escapes the trap.
    if (active === windowEl || !windowEl.contains(active)) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
      return
    }

    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const restorePreviousFocus = (): void => {
    const windowEl = getWindow()
    const layerRoot = getLayerRoot?.() ?? windowEl
    const active = document.activeElement
    // Include the layer root, not just the window: clicking the shade focuses
    // it (it is a `tabindex="-1"` sibling of the window), and closing from the
    // dock close button focuses a dock item. Both are still part of the layer.
    const focusWithinLayer = Boolean(windowEl?.contains(active) || layerRoot?.contains(active))
    if (shouldRestoreFocus() && focusWithinLayer && previouslyFocused?.isConnected) {
      previouslyFocused.focus()
    }
  }

  return { capturePreviousFocus, focusWindow, handleKeydown, restorePreviousFocus }
}
