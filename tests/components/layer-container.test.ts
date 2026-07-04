import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import LayerContainer from '@lib/components/LayerContainer.vue'

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
})
