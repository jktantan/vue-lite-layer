# v1.3.1

## Highlights

- **`location` literals**: new `PositionPresetValue` export. `location` accepts both the `PositionPreset` enum and string literals such as `'CC'`.
- **Nuxt typing**: `nuxt` is now an optional peer dependency, so `nuxt/schema` and `nuxt/app` resolve in strict layouts (for example Yarn PnP).
- **Publishing**: `prepublishOnly` rebuilds `dist` before publishing so stale declarations cannot be shipped.

## Validation Summary

- `pnpm lib:type-check`, `pnpm test:types`, and `pnpm test:unit` (94 tests) passed
- `pnpm lib:build` and `pnpm test:dist-types` passed
- Packaged tarball verified in a Nuxt 4.5.2 + pnpm project via `nuxi prepare` + `vue-tsc`

## Docs Updated

- `README.md`
- `CHANGELOG_DRAFT.md`
- `docs/guide/nuxt.md` / `docs/en/guide/nuxt.md`
- `docs/guide/install.md` / `docs/en/guide/install.md`
- `docs/api/config.md` / `docs/en/api/config.md`

# v1.3.0

## Highlights

- **Theme system**: the new `theme` option supports `light`, `dark`, `auto`, or a custom theme name at both global and per-layer level, with `size`, semantic `colors`, and raw `--lite-layer-*` overrides.
- **Theme entry points**: prebuilt `vue-lite-layer/theme.css`, plus `vue-lite-layer/theme` and `vue-lite-layer/scss` Sass entries.
- **Nuxt module**: `vueLiteLayer.theme` support; module configuration and auto-import types are generated from the package declarations.

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
