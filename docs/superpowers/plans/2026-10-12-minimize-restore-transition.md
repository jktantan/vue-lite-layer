# Minimize / Restore Transition Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a transition animation when a window is minimized to the dock and when it is restored, matching the existing `maximize`/`restore` (200 ms ease) experience.

**Architecture:** Reuse `use-layer-size`'s existing `transitionValue` (top/left/width/height, 200 ms ease). On minimize, capture the window's current rect, write the dock rect into its `style`, listen for `transitionend` (with a `setTimeout` fallback), then flip `isMinimized = true` and notify `layerManager`. On restore, take the dock rect, temporarily disable `--minimized`, write the previous `currentPosition`/`defaultSize` into the window's `style`, then run the same transition the other way. Dock-item fade is handled by a tiny new keyframes pair (`isMinimize-enter/leave`) using the same 200 ms duration so the experience is identical to maximize/restore.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, SCSS modules, Vitest, `@vue/test-utils`, jsdom, `mitt`, `vue-i18n-lite`, `nanoid`, `ResizeObserver`.

**Spec:** This document (in-repo plan). Behavioural anchors: `lib/composables/use-layer-size.ts:106-130` (`withTransition`), `lib/LiteLayer.vue:328-376` (current minimize/restore handlers), `lib/assets/style/style.scss:57-59` (`--minimized { display:none }`), `lib/assets/style/transition.scss` (enter/leave keyframes), `tests/components/lite-layer.test.ts:131-165` (existing minimize/restore assertions that must still pass).

## Global Constraints

- Keep the existing public API stable: `instance.minimize()` / `instance.restore()` and the `minimize` / `restore` emitter events must keep the same call signature and timing relative to `layerManager` registration.
- Keep `isMinimized`, `maximizedBeforeMinimize`, `syncScrollLock()` ordering identical to today, so the existing tests in `tests/components/lite-layer.test.ts:131-165` and `:194-247` continue to pass.
- The transition duration is `200 ms ease` — same value the `use-layer-size` module already exposes via `transitionValue` / `transitionDuration`. Do **not** introduce a new magic number.
- Use the SCSS `:export` metrics for dock geometry (already imported as `dockMetrics`). Do not hard-code 220 / 40 / 12.
- Minimize must work when `max` was true just before: do not regress `tests/components/lite-layer.test.ts:167-192`.
- Tests use jsdom and have no real animation timeline. They currently rely on `await wrapper.vm.$nextTick()` to settle. New tests that exercise the in-flight transition must use `vi.useFakeTimers()` to advance the 200 ms + 50 ms fallback timer; never depend on real timers.
- `pnpm test` must remain green. `pnpm test:types` (vue-tsc --noEmit --project tsconfig.test.json) must remain green. ESLint/Prettier must remain happy for files we touch.

## Review Focus

These are the spec-silent input classes most likely to bite; each is pinned by the task that owns its code.

1. **Re-minimize during an in-flight minimize/restore transition.** Behaviour: the new transition is cancelled and restarted from the current rect (no snap, no queued second animation).
2. **Unmount during an in-flight minimize/restore transition.** Behaviour: the dangling `transitionend` listener and `setTimeout` fallback are cleared in `onUnmounted`, matching the existing `dispose()` contract in `use-layer-size`.
3. **`transitionend` not firing because the property is removed (or never set) before the listener can register.** Behaviour: `setTimeout(..., duration + 50)` always finalises the transition; the same fallback already exists in `withTransition`.
4. **Window with `shade: false` and `max: false` minimized on a teleported-but-not-`<body>` container.** Behaviour: `dockPosition.left/top` continues to be measured against the correct container, same as today.
5. **Restoring while the previous `defaultSize`/`currentPosition` was set by drag.** Behaviour: restore uses the same `currentPosition` / `defaultSize` already captured by `use-layer-size`, so dragging before minimize then minimizing then restoring goes back to the dragged location.

---

### Task 1: Extract transition utility from `use-layer-size`

**Files:**
- Modify: `lib/composables/use-layer-size.ts`
- Test: `tests/composables/use-layer-size-transition.test.ts` (new)

**Interfaces:**
- Consumes: nothing new.
- Produces: exports `transitionDuration: number`, `transitionValue: string`, `withTransition(el, cb, onComplete)`. Existing default export keeps its current shape.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test, vi } from 'vitest'
import {
  transitionDuration,
  transitionValue,
  withTransition
} from '@lib/composables/use-layer-size'

describe('use-layer-size transition utility', () => {
  test('exports the documented duration and value', () => {
    expect(transitionDuration).toBe(200)
    expect(transitionValue).toContain('top 200ms ease')
    expect(transitionValue).toContain('width 200ms ease')
  })

  test('runs the callback with a transition style and clears it on transitionend', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const cb = vi.fn()
    const onComplete = vi.fn()
    withTransition(el, cb, onComplete)

    expect(el.style.transition).toBe(transitionValue)
    expect(cb).toHaveBeenCalledTimes(1)

    el.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true }))
    expect(el.style.transition).toBe('')
    expect(onComplete).toHaveBeenCalledTimes(1)

    el.remove()
  })

  test('falls back to clearing the transition via setTimeout when transitionend is absent', () => {
    vi.useFakeTimers()
    try {
      const el = document.createElement('div')
      document.body.appendChild(el)
      const onComplete = vi.fn()
      withTransition(el, () => {}, onComplete)
      vi.advanceTimersByTime(transitionDuration + 50)
      expect(el.style.transition).toBe('')
      expect(onComplete).toHaveBeenCalledTimes(1)
      el.remove()
    } finally {
      vi.useRealTimers()
    }
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test:unit tests/composables/use-layer-size-transition.test.ts`
Expected: FAIL — named exports do not exist yet.

- [ ] **Step 3: Refactor `lib/composables/use-layer-size.ts`**

Inside the existing module, lift the three module-level declarations to the top of the module so they are also exported (the `transitionCleanups` set stays module-private, since `dispose()` already drains it on unmount). Move `withTransition` up so it sits immediately below them, keeping its implementation identical. Do **not** change the default export's shape. The existing `maximize`/`restore` callers continue to work unchanged.

- [ ] **Step 4: Run the test, confirm PASS**

Run: `pnpm test:unit tests/composables/use-layer-size-transition.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full unit suite, confirm green**

Run: `pnpm test:unit`
Expected: PASS — no other tests regress.

- [ ] **Step 6: Commit**

```bash
git add lib/composables/use-layer-size.ts tests/composables/use-layer-size-transition.test.ts
git commit -m "refactor(use-layer-size): export transition utility for reuse"
```

---

### Task 2: Add dock-item fade keyframes in SCSS

**Files:**
- Modify: `lib/assets/style/transition.scss`

**Interfaces:**
- Consumes: nothing.
- Produces: new keyframes `lite-layer-minimize-enter`, `lite-layer-minimize-leave` and the matching classes `is-minimize-enter` / `is-minimize-leave` with `forwards` fill mode. Duration is `transitionDuration: 200 ms` (same value as the window transition). The dock-item visibility remains controlled by the existing `v-if`; this task only adds the opacity fade.

- [ ] **Step 1: Append keyframes and classes**

Add to `lib/assets/style/transition.scss` after the existing `lite-layer-leave` block:

```scss
// 最小化过渡 — 与 maximize/restore 同 200ms 节奏
@keyframes lite-layer-minimize-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes lite-layer-minimize-leave {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(8px); }
}

.lite-layer__dock-item.is-minimize-enter {
  animation: lite-layer-minimize-enter 200ms ease forwards;
}

.lite-layer__dock-item.is-minimize-leave {
  animation: lite-layer-minimize-leave 200ms ease forwards;
}
```

- [ ] **Step 2: Manual smoke check**

Run: `pnpm --filter . build` (or `pnpm build` from repo root if no filter). Confirm the build still succeeds; this is a CSS-only change so unit tests are unaffected.

- [ ] **Step 3: Commit**

```bash
git add lib/assets/style/transition.scss
git commit -m "style(transition): add dock-item fade keyframes for minimize/restore"
```

---

### Task 3: Animate the minimize/restore rect in `LiteLayer.vue`

**Files:**
- Modify: `lib/LiteLayer.vue`
- Test: `tests/components/lite-layer.test.ts`

**Interfaces:**
- Consumes: `transitionDuration`, `transitionValue`, `withTransition` from `@lib/composables/use-layer-size`. Existing `use-layer-size` default export.
- Produces: `minimizing: Ref<boolean>` and `restoringFromMin: Ref<boolean>` exposed on the component instance via `defineExpose` (for tests). No new props. No new public method.

Behaviour contract this task implements:

- `handleMinimize` now records the live window rect, writes the dock rect (`dockLayout.left`, `dockLayout.bottom` → `top`, `DOCK_ITEM_WIDTH`, `DOCK_ITEM_HEIGHT`) into the window's `style`, applies `withTransition`, then on completion (or fallback timer) flips `isMinimized = true` and runs `layerManager.minimize(...)` + `syncScrollLock()`. The dock item's `v-if` already renders it once `isMinimized` is true; this task also adds the `is-minimize-enter` class on the dock item.
- `handleRestore` (the `isMinimized` branch only) sets `restoringFromMin = true`, flips `isMinimized = false` in a `nextTick` so the window is back in the DOM, then runs `withTransition` from the current dock rect back to the previous `currentPosition` / `defaultSize`, calls `layerSize.restore(...)` via the composable (or a parallel transition helper) to keep behaviour consistent, and on completion clears `restoringFromMin`. The dock item's leave class is added for the first frame and removed on completion.
- The `isMinimized` branch in `handleRestore` is the only branch touched in this task; the `isMaximized` branch keeps its existing `layerSize.restore(...)` call (Task 4 confirms).

- [ ] **Step 1: Add failing tests for in-flight transition**

Add inside `describe('LiteLayer', ...)` in `tests/components/lite-layer.test.ts`:

```ts
test('animates minimize: window style updates to dock rect, then isMinimized flips', async () => {
  vi.useFakeTimers()
  try {
    const { wrapper, emitter } = await mountMinimizableLayer('anim-min-layer', 'Anim Min')

    const windowEl = document.body.querySelector<HTMLElement>('.lite-layer__window')
    expect(windowEl).not.toBeNull()

    emitter.emit('minimize')
    // 立即断言：style 已开始向 dock 几何收敛（不是瞬时 display:none）
    expect(windowEl!.classList.contains('lite-layer__window--minimized')).toBe(false)
    expect(windowEl!.style.transition).toContain('top 200ms ease')

    // 推进兜底定时器
    vi.advanceTimersByTime(250)
    expect(windowEl!.classList.contains('lite-layer__window--minimized')).toBe(true)
    expect(document.body.querySelector('.lite-layer__dock-item')).not.toBeNull()

    wrapper.unmount()
  } finally {
    vi.useRealTimers()
    layerManager.resetForTest()
  }
})

test('animates restore: window style returns to original size/position', async () => {
  vi.useFakeTimers()
  try {
    const { wrapper, emitter } = await mountMinimizableLayer('anim-restore-layer', 'Anim Restore')

    emitter.emit('minimize')
    vi.advanceTimersByTime(250)
    const windowEl = document.body.querySelector<HTMLElement>('.lite-layer__window')!

    document.body.querySelector<HTMLButtonElement>('.lite-layer__dock-item .lite-layer__icon-restore')?.click()
    // 立即断言：--minimized 已移除、style.transition 已写回 200ms
    expect(windowEl.classList.contains('lite-layer__window--minimized')).toBe(false)
    expect(windowEl.style.transition).toContain('top 200ms ease')

    vi.advanceTimersByTime(250)
    expect(document.body.querySelector('.lite-layer__dock-item')).toBeNull()

    wrapper.unmount()
  } finally {
    vi.useRealTimers()
    layerManager.resetForTest()
  }
})
```

- [ ] **Step 2: Run the new tests, confirm FAIL**

Run: `pnpm test:unit tests/components/lite-layer.test.ts`
Expected: FAIL — `transition` style is not currently set on minimize/restore.

- [ ] **Step 3: Implement the animated handlers in `LiteLayer.vue`**

Inside `<script setup>`:

1. Import the new utilities:
   ```ts
   import {
     transitionDuration,
     transitionValue,
     withTransition
   } from './composables/use-layer-size'
   ```
2. Add two refs next to the existing `isMinimized` / `isResizing` declarations:
   ```ts
   const minimizing = ref(false)
   const restoringFromMin = ref(false)
   let minimizeFallbackTimer: ReturnType<typeof setTimeout> | null = null
   ```
3. Replace the body of `handleMinimize` (currently `lib/LiteLayer.vue:370-376`) with:
   - bail out if `!props.min || isMinimized.value` (same guard as today)
   - record `maximizedBeforeMinimize = isMaximized.value`, set `isMaximized = false` (so the maximized layout does not flash into the dock animation), compute the dock rect: `left = dockLayout.left + 'px'`, `top = viewportHeight - dockLayout.bottom - DOCK_ITEM_HEIGHT` (since `dockLayout.bottom` is measured from the bottom edge for a fixed-position dock item — verify against existing `dockPosition` inline style `bottom: DOCK_INSET + row * stepY` already on the dock item template at `lib/LiteLayer.vue:76`)
   - read live window rect: `windowRef.value` `getBoundingClientRect()` → `windowTop = rect.top`, `windowLeft = rect.left`, `windowW = rect.width`, `windowH = rect.height`. Pin those four values into local consts before writing.
   - write to `windowEl.style`: `top = windowTop + 'px'`, `left = windowLeft + 'px'`, `width = windowW + 'px'`, `height = windowH + 'px'`. These must equal what the window currently renders, so the transition has no jump.
   - call `withTransition(windowEl, () => { windowEl.style.top = dockTop; windowEl.style.left = dockLeft; windowEl.style.width = DOCK_ITEM_WIDTH + 'px'; windowEl.style.height = DOCK_ITEM_HEIGHT + 'px' }, () => { ... })`. Inside `onComplete`, set `minimizing.value = false`, `isMinimized.value = true`, `layerManager.minimize(...)`, `syncScrollLock()`. Also schedule a fallback `setTimeout` of `transitionDuration + 50` ms that does the same thing (covers the `transitionend` not firing case).
   - set `minimizing.value = true` synchronously before `withTransition` so the dock item (which is `v-if`'d only after `isMinimized` flips) still picks up the `is-minimize-enter` class. Implementation detail: since the dock item is rendered behind `v-if="visible && isMinimized"`, this task should flip `isMinimized = true` *only* after the transition; until then, the dock item is still hidden, so the enter class is applied via a parallel flag on the dock item template (see step 4).
4. Replace the body of the `isMinimized` branch of `handleRestore` (currently `lib/LiteLayer.vue:328-339`) with:
   - bail out if `!isMinimized.value`
   - set `restoringFromMin.value = true` synchronously (so the leave fade runs on the dock item before it disappears)
   - flip `isMinimized = false` in a `nextTick` so the window is back in the DOM
   - capture live dock rect (same as minimize but in reverse) and the previous `currentPosition` / `defaultSize` from the `use-layer-size` composable
   - call `withTransition(windowEl, () => { /* restore top/left/width/height */ }, () => { ... })`. Inside `onComplete`, set `restoringFromMin.value = false`, `layerManager.restoreMinimized(...)`, `syncScrollLock()`, and the existing `nextTick(() => { handleBringToTop(); focusWindow() })`.
   - do **not** call the existing `layerSize.restore(...)` in this branch (the transition already animates top/left/width/height, and `layerSize.restore` would race with it). The non-minimized restore branch keeps its `layerSize.restore` call unchanged.
5. Add `onUnmounted` cleanup: clear `minimizeFallbackTimer` if non-null (mirror the existing `enterFallbackTimer` cleanup at `lib/LiteLayer.vue:553-557`). The `transitionCleanups` set inside `use-layer-size` is already drained by the existing `layerSize.dispose()` call at `lib/LiteLayer.vue:561`, so no extra work is needed there.
6. Expose `minimizing` and `restoringFromMin` via `defineExpose` (alongside `id`, `close`, `bringTo`, `maximize`, `minimize`, `restore`).

Inside `<template>`:
- Add the two new classes on the dock item at `lib/LiteLayer.vue:71`: `:class="{ 'is-minimize-enter': restoringFromMin === false && (minimizing || isMinimized), 'is-minimize-leave': restoringFromMin && !isMinimized }"`. (Use the parallel flags because the dock item is `v-if`'d after `isMinimized` flips.)
- Adjust the window `--minimized` class usage: it should now mean "actually moved to rest after the transition", not "in the middle of minimizing". The existing `isMinimized` ref continues to drive `v-if` of the dock item and the `--minimized` class on the window — same as today, but its flip is now post-transition. This means existing tests that check `classList.contains('--minimized')` immediately after `emitter.emit('minimize')` + `await nextTick` must advance timers too. The test update in step 1 already does that.

- [ ] **Step 4: Run the new tests, confirm PASS**

Run: `pnpm test:unit tests/components/lite-layer.test.ts`
Expected: PASS for the new tests, and the existing `minimizes to a dock item and restores the window` test still passes (because it does not assert intermediate state).

- [ ] **Step 5: Run the full unit + type test, confirm green**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/LiteLayer.vue tests/components/lite-layer.test.ts
git commit -m "feat(layer): animate minimize/restore to match maximize/restore"
```

---

### Task 4: Update existing `tests/components/lite-layer.test.ts` to advance timers

**Files:**
- Modify: `tests/components/lite-layer.test.ts`

**Interfaces:**
- Consumes: existing test bodies.
- Produces: same tests, but with `vi.useFakeTimers()` + `vi.advanceTimersByTime(250)` around the existing minimize/restore calls so the post-transition state is observable in jsdom.

This task is the smallest "make the existing assertions still true" patch. The bodies of the existing tests do not change otherwise.

- [ ] **Step 1: Wrap `minimizes to a dock item and restores the window` and `restores a maximized layer from the dock as maximized` with fake timers**

For each test:
- Add `vi.useFakeTimers()` at the top of the test body, inside a `try { ... } finally { vi.useRealTimers(); layerManager.resetForTest() }` block.
- After every `emitter.emit('minimize')` (and after the dock-item restore-button click), call `vi.advanceTimersByTime(250)` so the post-transition state is reached.
- Do **not** change the assertions.

- [ ] **Step 2: Run `tests/components/lite-layer.test.ts`, confirm PASS**

Run: `pnpm test:unit tests/components/lite-layer.test.ts`
Expected: PASS.

- [ ] **Step 3: Run full test, confirm green**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/components/lite-layer.test.ts
git commit -m "test(lite-layer): advance fake timers across minimize/restore"
```

---

### Task 5: Final review and verification

**Files:**
- No code changes; this task is verification only.

- [ ] **Step 1: Full test suite green**

Run: `pnpm test`
Expected: PASS. Includes `test:unit`, `test:types`.

- [ ] **Step 2: Build succeeds**

Run: `pnpm lib:build`
Expected: PASS — `lib:type-check`, `lib:build:main`, `lib:build:nuxt`, `test:dist` all green.

- [ ] **Step 3: Lint clean for touched files**

Run: `pnpm lint`
Expected: PASS — no new warnings on `lib/LiteLayer.vue`, `lib/composables/use-layer-size.ts`, `lib/assets/style/transition.scss`, or the two test files.

- [ ] **Step 4: Manual smoke in docs demo (optional, recommended)**

Run: `pnpm docs:dev`, open the min/max demo, click minimize, observe the window slides to the dock and fades. Click the dock item, observe reverse. Confirm no jank.

- [ ] **Step 5: Final commit if any doc tweak was needed**

```bash
git add docs
git commit -m "docs: note minimize/restore transition in changelog"
```

(Skip if nothing changed.)