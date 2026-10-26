import mitt from 'mitt'
import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import LiteLayer from '@lib/LiteLayer.vue'
import { createLayerEmitterPlugin } from '@lib/core/layer-emitter'
import type { LayerEvents } from '@lib/core/layer-events'

const mountLayer = (props: Record<string, unknown> = {}) => {
  const emitter = mitt<LayerEvents>()
  const wrapper = mount(LiteLayer, {
    attachTo: document.body,
    props: {
      id: 'theme-layer',
      title: 'Theme layer',
      teleport: 'body',
      content: 'content',
      ...props
    },
    global: {
      plugins: [createLayerEmitterPlugin(emitter)]
    }
  })

  return { wrapper, emitter }
}

const layerRoot = (): HTMLElement => {
  const element = document.body.querySelector<HTMLElement>('.lite-layer')
  if (!element) throw new Error('layer root not found')
  return element
}

describe('LiteLayer theme', () => {
  test('leaves the theme attribute unset by default so host html.dark can apply', async () => {
    const { wrapper } = mountLayer()
    await wrapper.vm.$nextTick()

    expect(layerRoot().hasAttribute('data-lite-layer-theme')).toBe(false)
    expect(layerRoot().getAttribute('data-lite-layer-size')).toBe('default')
  })

  test('applies mode, size, semantic colors and raw variables', async () => {
    const { wrapper } = mountLayer({
      theme: {
        mode: 'dark',
        size: 'small',
        colors: { primary: '#7c3aed', danger: '#dc2626' },
        vars: {
          '--lite-layer-border-radius': '10px',
          '--lite-layer-dock-item-width': '200px'
        }
      }
    })
    await wrapper.vm.$nextTick()

    const root = layerRoot()
    expect(root.getAttribute('data-lite-layer-theme')).toBe('dark')
    expect(root.getAttribute('data-lite-layer-size')).toBe('small')
    expect(root.style.getPropertyValue('--lite-layer-color-primary')).toBe('#7c3aed')
    expect(root.style.getPropertyValue('--lite-layer-color-danger')).toBe('#dc2626')
    expect(root.style.getPropertyValue('--lite-layer-border-radius')).toBe('10px')
    expect(root.style.getPropertyValue('--lite-layer-dock-item-width')).toBe('200px')
  })

  test('accepts a bare theme name and ignores unsafe raw variables', async () => {
    const { wrapper } = mountLayer({
      theme: {
        mode: 'brand',
        vars: {
          color: 'red',
          '--lite-layer-color-primary': '#0ea5e9'
        }
      }
    })
    await wrapper.vm.$nextTick()

    const root = layerRoot()
    expect(root.getAttribute('data-lite-layer-theme')).toBe('brand')
    expect(root.style.getPropertyValue('--lite-layer-color-primary')).toBe('#0ea5e9')
    expect(root.style.getPropertyValue('color')).toBe('')
  })

  test('resolves auto from the host dark class', async () => {
    document.documentElement.classList.add('dark')

    try {
      const { wrapper } = mountLayer({ theme: 'auto' })
      await wrapper.vm.$nextTick()

      expect(layerRoot().getAttribute('data-lite-layer-theme')).toBe('dark')
    } finally {
      document.documentElement.classList.remove('dark')
    }
  })

  test('reacts to theme updates made through instance.update()', async () => {
    const { wrapper } = mountLayer({ theme: 'light' })
    await wrapper.vm.$nextTick()

    expect(layerRoot().getAttribute('data-lite-layer-theme')).toBe('light')

    await wrapper.setProps({
      theme: {
        mode: 'dark',
        size: 'large',
        colors: { primary: '#0ea5e9' }
      }
    })
    await wrapper.vm.$nextTick()

    const root = layerRoot()
    expect(root.getAttribute('data-lite-layer-theme')).toBe('dark')
    expect(root.getAttribute('data-lite-layer-size')).toBe('large')
    expect(root.style.getPropertyValue('--lite-layer-color-primary')).toBe('#0ea5e9')
  })
})
