import { flushPromises, mount } from '@vue/test-utils'
import { defineAsyncComponent } from 'vue'
import { describe, expect, test, vi } from 'vitest'
import LayerContainer from '@lib/components/LayerContainer.vue'
import i18n from '@lib/i18n'

const englishI18n = () => i18n().getI18n({ locale: 'en' })

describe('LayerContainer', () => {
  test('keeps legacy content string behavior as trusted HTML', () => {
    const wrapper = mount(LayerContainer, {
      props: { content: '<strong>Hello</strong>' }
    })

    expect(wrapper.html()).toContain('<strong>Hello</strong>')
  })

  test('renders textContent as plain text, not HTML', () => {
    const wrapper = mount(LayerContainer, {
      props: { textContent: '<strong>Hello</strong>' }
    })

    expect(wrapper.text()).toContain('<strong>Hello</strong>')
    expect(wrapper.find('strong').exists()).toBe(false)
  })

  test('textContent takes precedence over legacy content', () => {
    const wrapper = mount(LayerContainer, {
      props: {
        content: '<em>HTML</em>',
        textContent: 'Plain text'
      }
    })

    expect(wrapper.text()).toContain('Plain text')
    expect(wrapper.find('em').exists()).toBe(false)
  })

  test('renders invalid explicit contentType as plain text', () => {
    const wrapper = mount(LayerContainer, {
      props: {
        content: '<strong>Hello</strong>',
        contentType: 'plain' as never
      }
    })

    expect(wrapper.text()).toContain('<strong>Hello</strong>')
    expect(wrapper.find('strong').exists()).toBe(false)
  })

  test('renders HTMLElement content into the container host', async () => {
    const element = document.createElement('div')
    element.className = 'external-node'
    element.textContent = 'External DOM'

    const wrapper = mount(LayerContainer, {
      props: { content: element }
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.external-node').exists()).toBe(true)
    expect(wrapper.text()).toContain('External DOM')
  })

  test('restores HTMLElement content to its original position on content switch and unmount', async () => {
    const parent = document.createElement('section')
    const before = document.createElement('span')
    const element = document.createElement('div')
    const after = document.createElement('span')
    parent.append(before, element, after)
    document.body.append(parent)

    const wrapper = mount(LayerContainer, {
      props: { content: element }
    })
    await wrapper.vm.$nextTick()

    expect(parent.contains(element)).toBe(false)

    await wrapper.setProps({ content: 'replacement', contentType: 'text' })
    expect(parent.children[1]).toBe(element)
    expect(element.nextSibling).toBe(after)

    await wrapper.setProps({ content: element })
    await wrapper.vm.$nextTick()
    expect(parent.contains(element)).toBe(false)

    wrapper.unmount()
    expect(parent.children[1]).toBe(element)
    expect(element.nextSibling).toBe(after)
  })

  test('shows the configured error state when async content times out', async () => {
    vi.useFakeTimers()
    const onTimeout = vi.fn()
    const onError = vi.fn()
    const PendingContent = defineAsyncComponent(() => new Promise(() => {}))
    const wrapper = mount(LayerContainer, {
      props: {
        content: PendingContent,
        asyncContent: {
          timeout: 20,
          errorText: 'Timed out',
          onTimeout,
          onError
        }
      }
    })

    await flushPromises()
    vi.advanceTimersByTime(20)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Timed out')
    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    vi.useRealTimers()
  })

  test('falls back to i18n error and retry text', async () => {
    vi.useFakeTimers()
    const PendingContent = defineAsyncComponent(() => new Promise(() => {}))
    const wrapper = mount(LayerContainer, {
      props: {
        content: PendingContent,
        asyncContent: { timeout: 20 }
      },
      global: {
        plugins: [englishI18n()]
      }
    })

    await flushPromises()
    vi.advanceTimersByTime(20)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Failed to load content.')
    expect(wrapper.text()).toContain('Retry')
    wrapper.unmount()
    vi.useRealTimers()
  })

  test('marks the suspense fallback as a live status region', async () => {
    const PendingContent = defineAsyncComponent(() => new Promise(() => {}))
    const wrapper = mount(LayerContainer, {
      props: { content: PendingContent },
      global: {
        plugins: [englishI18n()]
      }
    })

    await flushPromises()
    const status = wrapper.find('[role="status"]')

    expect(status.exists()).toBe(true)
    expect(status.attributes('aria-label')).toBe('Loading…')
    wrapper.unmount()
  })

  test('refreshes the scroll shadow after content changes without a wrapper resize', async () => {
    const wrapper = mount(LayerContainer, {
      props: { content: 'first', contentType: 'text' }
    })
    await wrapper.vm.$nextTick()

    const wrapperEl = wrapper.find('.lite-layer__window-wrapper').element as HTMLElement
    Object.defineProperty(wrapperEl, 'scrollHeight', { configurable: true, value: 200 })
    Object.defineProperty(wrapperEl, 'clientHeight', { configurable: true, value: 100 })
    Object.defineProperty(wrapperEl, 'scrollTop', { configurable: true, value: 0 })

    await wrapper.setProps({ content: 'second', contentType: 'text' })
    await wrapper.vm.$nextTick()
    await new Promise(requestAnimationFrame)

    expect(wrapperEl.classList.contains('lite-layer__shadow-bottom-inset')).toBe(true)
    wrapper.unmount()
  })
})
