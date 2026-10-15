# v1.1.0

## Highlights

- **Minimize support**: the new `min` option adds a title-bar minimize button, `instance.minimize()`, and a dock at the bottom of the Teleport container. Clicking a dock item restores the window, brings it to front, and returns to its pre-minimize (normal or maximized) state.
- **Animated minimize / restore**: minimize and restore transitions now match maximize / restore.
- **i18n**: Element Plus locale configured on an ancestor `ElConfigProvider` is inherited through component-scoped `provide`.
- **i18n fix**: removed a module-level user-message cache that leaked overrides across layers and test runs.
- **Fixes**: Nuxt type errors, position clamping, `titleId`, and close semantics.
- **Performance**: internal lib optimizations; high-frequency scroll-shadow updates are coalesced into a single animation frame.

## Docs Updated

- `README.md`
- `RELEASE_NOTES.md`
- `CHANGELOG_DRAFT.md`
- `docs/` (VitePress site, zh + en)

# v1.0.0

## Highlights

- Finalized `appContext` propagation behavior for Layer instances:
  - inject host context before mount
  - inherit host `provides` via prototype chain
  - default to current component `appContext` in `useLiteLayer().openLayer()`
- Stabilized multi-layer behavior:
  - fixed dragged-position reset after re-render
  - improved bring-to-top and z-index consistency
- Improved content rendering compatibility:
  - string/HTML content and component content are handled safely
- Added and validated packaged usage in both Vue and Nuxt test projects.
- Added Element Plus integration verification (on-demand imports, locale switching, DatePicker comparison).

## Important Note (Element Plus DatePicker)

Regular Element Plus components generally follow host config through appContext propagation.
For complex components such as `ElDatePicker` inside a Layer (separate app instance), full inheritance of host `ElConfigProvider` behavior is not guaranteed.

Recommended practice:

- wrap `ElConfigProvider` explicitly inside Layer content
- synchronize date locale when needed (e.g. `dayjs.locale(...)`)

## Validation Summary

- `lib` build: passed
- Vue packaged test project: passed
- Nuxt packaged test project: passed

## Docs Updated

- `README.md`
- `CHANGELOG_DRAFT.md`
- `docs/advanced/i18n.md`
- `docs/en/advanced/i18n.md`
