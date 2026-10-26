import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import VueLiteLayer from '@lib/index'
import ThemeDemo from '../../docs/components/ThemeDemo.vue'

// The docs helper imports VitePress, which pulls Node-only esbuild into jsdom.
vi.mock('vitepress', () => ({
  useData: () => ({ localeIndex: { value: 'root' } })
}))

const actionButtons = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll<HTMLButtonElement>('.theme-demo__actions button')

describe('ThemeDemo', () => {
  test('reopens the layer after it has been closed', async () => {
    const wrapper = mount(ThemeDemo, {
      attachTo: document.body,
      global: { plugins: [VueLiteLayer] }
    })
    await wrapper.vm.$nextTick()

    await actionButtons(wrapper)[0].trigger('click')
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.lite-layer')).toHaveLength(1)
    expect(actionButtons(wrapper)[0].text()).toContain('聚焦演示弹层')

    await actionButtons(wrapper)[1].trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 350))
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.lite-layer')).toHaveLength(0)
    expect(actionButtons(wrapper)[0].text()).toContain('打开演示弹层')

    await actionButtons(wrapper)[0].trigger('click')
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.lite-layer')).toHaveLength(1)
    expect(actionButtons(wrapper)[0].text()).toContain('聚焦演示弹层')

    wrapper.unmount()
  })
})
