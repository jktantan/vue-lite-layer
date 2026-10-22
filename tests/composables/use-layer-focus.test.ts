import { describe, expect, test, vi } from 'vitest'
import { useLayerFocus } from '@lib/composables/use-layer-focus'

describe('useLayerFocus', () => {
  const createFocusController = (
    dialog: HTMLElement,
    requestClose = vi.fn(),
    layerRoot?: () => HTMLElement | null
  ) =>
    useLayerFocus({
      getWindow: () => dialog,
      getLayerRoot: layerRoot,
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

  test('wraps Shift+Tab from the dialog itself to the last focusable', () => {
    const dialog = document.createElement('div')
    const first = document.createElement('button')
    const last = document.createElement('button')
    dialog.tabIndex = -1
    dialog.append(first, last)
    document.body.append(dialog)
    const { handleKeydown } = createFocusController(dialog)

    dialog.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true })
    handleKeydown(event)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(last)
  })

  test('pulls focus back into the dialog when Tab starts on the shade', () => {
    const layerRoot = document.createElement('div')
    const dialog = document.createElement('div')
    const shade = document.createElement('div')
    const first = document.createElement('button')
    const last = document.createElement('button')
    shade.tabIndex = -1
    dialog.append(first, last)
    layerRoot.append(dialog, shade)
    document.body.append(layerRoot)
    const { handleKeydown } = createFocusController(dialog)

    shade.focus()
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

  test('restores focus when it is on a sibling of the dialog (shade)', () => {
    const trigger = document.createElement('button')
    const layerRoot = document.createElement('div')
    const dialog = document.createElement('div')
    const shade = document.createElement('div')
    shade.tabIndex = -1
    layerRoot.append(dialog, shade)
    document.body.append(trigger, layerRoot)
    trigger.focus()

    const { capturePreviousFocus, restorePreviousFocus } = createFocusController(
      dialog,
      undefined,
      () => layerRoot
    )
    capturePreviousFocus()

    shade.focus()
    restorePreviousFocus()

    expect(document.activeElement).toBe(trigger)
  })

  test('does not steal focus back when focus moved outside the whole layer', () => {
    const trigger = document.createElement('button')
    const outside = document.createElement('button')
    const dialog = document.createElement('div')
    document.body.append(trigger, outside, dialog)
    trigger.focus()

    const { capturePreviousFocus, restorePreviousFocus } = createFocusController(dialog)
    capturePreviousFocus()

    outside.focus()
    restorePreviousFocus()

    expect(document.activeElement).toBe(outside)
  })
})
