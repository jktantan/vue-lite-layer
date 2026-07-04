import mitt from 'mitt'
import { createApp, inject } from 'vue'
import { describe, expect, test, vi } from 'vitest'
import { effectScope } from 'vue'
import useLayerEvent from '@lib/composables/use-layer-event'
import useLiteLayer from '@lib/composables/use-lite-layer'
import { createLayerEmitterPlugin, LayerEmitterKey, useLayerEmitter } from '@lib/core/layer-emitter'
import type { LayerEvents } from '@lib/core/layer-events'
import type { LayerService } from '@lib/core/layer-service'

describe('useLayerEvent', () => {
  test('onOk returns a disposer that removes the listener', () => {
    const callback = vi.fn()
    const emitter = mitt<LayerEvents>()
    const api = useLayerEvent(emitter)

    const dispose = api.onOk(callback)
    api.emitOk('first')
    dispose()
    api.emitOk('second')

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('first')
  })

  test('onCommand receives typed command payload', () => {
    const callback = vi.fn()
    const emitter = mitt<LayerEvents>()
    const api = useLayerEvent(emitter)

    api.onCommand(callback)
    api.emitCommand('save', { id: 1 })

    expect(callback).toHaveBeenCalledWith('save', { id: 1 })
  })

  test('emitCommand remains compatible with omitted legacy command payload', () => {
    const callback = vi.fn()
    const emitter = mitt<LayerEvents>()
    const api = useLayerEvent(emitter)

    api.onCommand(callback)
    api.emitCommand()

    expect(callback).toHaveBeenCalledWith(undefined, undefined)
  })

  test('layer emitter plugin keeps legacy string injection compatible', () => {
    const emitter = mitt<LayerEvents>()
    let symbolInjected: unknown
    let stringInjected: unknown

    const app = createApp({
      setup() {
        symbolInjected = inject(LayerEmitterKey)
        stringInjected = inject('layerEmitter')
        return () => null
      }
    })

    const host = document.createElement('div')
    app.use(createLayerEmitterPlugin(emitter))
    app.mount(host)
    app.unmount()

    expect(symbolInjected).toBe(emitter)
    expect(stringInjected).toBe(emitter)
  })

  test('layer emitter plugin does not mutate shared app globalProperties', () => {
    const firstEmitter = mitt<LayerEvents>()
    const secondEmitter = mitt<LayerEvents>()
    const sharedGlobalProperties: Record<string, unknown> = {}

    const firstApp = createApp({ render: () => null })
    firstApp.config.globalProperties = sharedGlobalProperties
    firstApp.use(createLayerEmitterPlugin(firstEmitter))

    const secondApp = createApp({ render: () => null })
    secondApp.config.globalProperties = sharedGlobalProperties
    secondApp.use(createLayerEmitterPlugin(secondEmitter))

    expect(sharedGlobalProperties.$layerEmitter).toBeUndefined()
  })

  test('registered listeners are disposed with the active Vue effect scope', () => {
    const callback = vi.fn()
    const emitter = mitt<LayerEvents>()
    const scope = effectScope()

    scope.run(() => {
      const api = useLayerEvent(emitter)
      api.onCancel(callback)
    })

    emitter.emit('cancel', 'first')
    scope.stop()
    emitter.emit('cancel', 'second')

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('first')
  })

  test('useLayerEmitter falls back to the legacy string injection key', () => {
    const emitter = mitt<LayerEvents>()
    let injectedEmitter: unknown

    const app = createApp({
      setup() {
        injectedEmitter = useLayerEmitter()
        return () => null
      }
    })
    app.provide('layerEmitter', emitter)

    const host = document.createElement('div')
    app.mount(host)
    app.unmount()

    expect(injectedEmitter).toBe(emitter)
  })

  test('useLiteLayer falls back to the legacy string layer provider', () => {
    const service: LayerService = {
      open: vi.fn(() => null),
      close: vi.fn(),
      closeAll: vi.fn()
    }
    let api: ReturnType<typeof useLiteLayer> | undefined

    const app = createApp({
      setup() {
        api = useLiteLayer()
        return () => null
      }
    })
    app.provide('layer', service)

    const host = document.createElement('div')
    app.mount(host)

    api?.openLayer({ title: 'legacy' })
    api?.closeAllLayer()
    app.unmount()

    expect(service.open).toHaveBeenCalledWith({ title: 'legacy' }, expect.any(Object))
    expect(service.closeAll).toHaveBeenCalledTimes(1)
  })
})
