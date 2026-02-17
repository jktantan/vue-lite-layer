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
