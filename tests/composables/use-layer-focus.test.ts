import { describe, expect, test, vi } from 'vitest'
import { useLayerFocus } from '@lib/composables/use-layer-focus'

describe('useLayerFocus', () => {
  const createFocusController = (dialog: HTMLElement, requestClose = vi.fn()) =>
    useLayerFocus({
      getWindow: () => dialog,
      shouldCloseOnEsc: () => true,
      shouldTrapFocus: () => true,
      shouldRestoreFocus: () => true,
      requestClose
    })

  test('wraps Tab from the last focusable element to the first', () => {
    const dialog = document.createElement('div')
    const first = document.createElement('button')
    const last = document.createElement('button')
    dialog.append(first, last)
    document.body.append(dialog)
    const { handleKeydown } = createFocusController(dialog)

    last.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    handleKeydown(event)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)
  })

  test('routes Escape through the shared close request', () => {
    const dialog = document.createElement('div')
    const requestClose = vi.fn()
    const { handleKeydown } = createFocusController(dialog, requestClose)

    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    handleKeydown(event)

    expect(event.defaultPrevented).toBe(true)
    expect(requestClose).toHaveBeenCalledWith({ reason: 'escape' })
  })

  test('restores focus only when focus is still inside the dialog', () => {
    const trigger = document.createElement('button')
    const dialog = document.createElement('div')
    dialog.tabIndex = -1
    document.body.append(trigger, dialog)
    trigger.focus()
    const { capturePreviousFocus, restorePreviousFocus } = createFocusController(dialog)
    capturePreviousFocus()

    dialog.focus()
    restorePreviousFocus()

    expect(document.activeElement).toBe(trigger)
  })
})
