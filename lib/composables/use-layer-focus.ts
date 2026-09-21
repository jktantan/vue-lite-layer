import type { LayerCloseContext } from '@lib/types/layer'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface LayerFocusOptions {
  getWindow: () => HTMLElement | null
  shouldCloseOnEsc: () => boolean | undefined
  shouldTrapFocus: () => boolean | undefined
  shouldRestoreFocus: () => boolean | undefined
  requestClose: (context: LayerCloseContext) => Promise<void>
}

/** Owns keyboard focus capture, trapping and restoration for one dialog. */
export const useLayerFocus = ({
  getWindow,
  shouldCloseOnEsc,
  shouldTrapFocus,
  shouldRestoreFocus,
  requestClose
}: LayerFocusOptions) => {
  let previouslyFocused: HTMLElement | null = null

  const capturePreviousFocus = (): void => {
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }

  const focusWindow = (): void => {
    getWindow()?.focus()
  }

  const getFocusableElements = (): HTMLElement[] => {
    const windowEl = getWindow()
    if (!windowEl) return []
    return Array.from(windowEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => element.getAttribute('aria-hidden') !== 'true'
    )
  }

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && shouldCloseOnEsc()) {
      event.preventDefault()
      void requestClose({ reason: 'escape' })
      return
    }
    if (event.key !== 'Tab' || !shouldTrapFocus()) return

    const focusable = getFocusableElements()
    if (focusable.length === 0) {
      event.preventDefault()
      focusWindow()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const restorePreviousFocus = (): void => {
    const windowEl = getWindow()
    if (
      shouldRestoreFocus() &&
      windowEl?.contains(document.activeElement) &&
      previouslyFocused?.isConnected
    ) {
      previouslyFocused.focus()
    }
  }

  return { capturePreviousFocus, focusWindow, handleKeydown, restorePreviousFocus }
}
