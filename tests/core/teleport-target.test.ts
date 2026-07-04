import { describe, expect, test } from 'vitest'
import { normalizeTeleportTarget } from '@lib/core/teleport-target'

describe('normalizeTeleportTarget', () => {
  test('returns body key for empty or body teleport', () => {
    expect(normalizeTeleportTarget(undefined).key).toBe('body')
    expect(normalizeTeleportTarget('body').key).toBe('body')
  })

  test('normalizes document body element to the body group', () => {
    const normalized = normalizeTeleportTarget(document.body)

    expect(normalized.target).toBe('body')
    expect(normalized.key).toBe('body')
    expect(normalized.isBody).toBe(true)
  })

  test('keeps selector strings as stable keys', () => {
    expect(normalizeTeleportTarget('#panel').key).toBe('#panel')
  })

  test('generates stable keys for HTMLElement targets', () => {
    const el = document.createElement('section')
    const first = normalizeTeleportTarget(el)
    const second = normalizeTeleportTarget(el)

    expect(first.key).toBe(second.key)
    expect(first.key).toMatch(/^element:/)
    expect(first.target).toBe(el)
  })
})
