import type { EventType } from 'mitt'

export interface LayerCommandPayload {
  command?: unknown
  message?: unknown
}

export type LayerEvents = Record<EventType, unknown> & {
  ok: unknown
  cancel: unknown
  command: LayerCommandPayload
  afterOk: unknown
  afterCancel: unknown
  afterCommand: LayerCommandPayload
  close: void
  top: void
  maximum: void
  restore: void
  startLoading: void
  stopLoading: void
  unmount: void
}

export type LayerEventDisposer = () => void
