# Component authoring

Follow this sequence when adding a component or changing its public anatomy. The work is complete
only when every applicable item is accounted for and the final validation passes.

## 1. Choose the primitive and contract

- Check whether Zag provides a dedicated primitive and use it when available.
- Add the package at the exact Zag Next version in `pnpm-workspace.yaml`, then reference it with
  `catalog:` from `packages/faisceau-ui/package.json`.
- Keep Zag's vocabulary in public options unless real usage has established a better FUI concept.
- Decide the minimum existing markup that `enhance*` requires. Prefer semantic native markup over a
  complete preassembled component tree.
- Decide whether the component is a native form control before writing markup.

## 2. Add the component module

Use `packages/faisceau-ui/src/<component>/` with:

- `types.ts` for Zag-derived public options, connected API, and controller types;
- `<component>.ts` for setup and lifecycle;
- `markup.ts` when construction is large enough to benefit from separation;
- `index.ts` for the public subpath;
- `<component>.test.ts` for browser behavior.

Build DOM with `h` from `@lilian1315/create-element`. Give structural nodes one stable
`fui-*` class; these classes are both the public anatomy and the enhancement lookup contract. Reserve
`data-*` attributes for Zag behavior/state or actual application data. Render icons as
`fui-icon` mask spans referencing the vendored Lucide SVGs in `src/icons/` instead of
embedding custom SVG.

Bind every Zag prop getter before starting the machine. Supply the shared `getLookupRoot(root)`
callback as `getRootNode` so detached Storybook trees work. Keep generated ids under the shared
`createId` convention.

## 3. Implement both ownership paths

For `create*`:

- construct the whole tree;
- return an idle controller;
- append and start in `mount()`;
- remove the owned root in idempotent `destroy()`.

For `enhance*`:

- validate required native elements and structural `fui-*` classes with an actionable `[Faisceau UI]`
  error;
- snapshot caller-owned attributes before adding Zag props;
- for native form controls, require only the root and native control, adopt optional label and
  description parts, and generate the visible control and popup (as Select does);
- for other components, validate their documented minimum anatomy before mutation and generate
  missing parts only when their enhancement contract calls for it;
- start after the enhanced tree is assembled;
- restore attributes, original node position, and caller-owned content in `destroy()`.

If the two paths share an invariant, put it behind one setup function rather than maintaining two
behaviors.

## 4. Preserve native forms when applicable

- Keep the native input, select, or other submission element in the document.
- Mirror `name`, `form`, `required`, `disabled`, `autocomplete`, and initial/default values.
- Verify `FormData`, browser validity, `form.reset()`, external native changes, and visible focus on
  invalid submission.
- Emit bubbling `input` followed by `change` exactly once for a visual interaction.
- Cover single and multiple values when the Zag primitive supports both.
- Extend a shared native-form module when the same protocol appears in a second component.

## 5. Add appearance and stories

- Add a stylesheet fragment under `src/styles/` (for example `dialog.scss`) with only the
  component rules, keeping `@use "./mixins" as *` for shared blocks. Import `base.scss` and
  the fragment from the component `<component>.ts` entry so the build compiles and injects
  the CSS alongside the JS. `listbox.scss` is Combobox-only; Select owns its own list anatomy
  and must not import it. Shared multi-component blocks belong in `_mixins.scss` and tokens
  in the `_tokens.scss` partial so per-component files stay scoped and no selector has two
  owners.
- Use semantic `--fui-*` tokens, structural borders, visible focus states, and minimum 40–44 px hit
  areas.
- Specify transitioned properties explicitly; routine interactions stay at or below 150 ms.
- Add TSX Storybook stories for creation and enhancement plus important modes, invalid/disabled
  states, multiple selection, gestures, or asynchronous behavior where relevant.
- Update Storybook ordering when introducing a new top-level component.

## 6. Publish the entry

Update all of these surfaces together:

1. `packages/faisceau-ui/src/index.ts`
2. `packages/faisceau-ui/package.json` exports and dependencies (JS subpaths; no per-component CSS exports)
3. `packages/faisceau-ui/vite.config.ts` pack entries
4. `packages/published-smoke/published-smoke.test.ts` runtime imports
5. `packages/published-smoke/published-smoke.test-d.ts` declaration imports
6. the user-facing README

When a new declaration subpath is referenced before it has been built, refresh package artifacts
with `vp run -r build` before running the complete validation.

## 7. Test observable behavior

Use imports from `vite-plus/test`. Browser tests should cover:

- creation while the target tree is detached;
- primary pointer and keyboard interaction;
- accessible roles, labels, state, and focus;
- controlled callbacks or public Zag API updates;
- enhancement and exact teardown restoration;
- native form behavior when applicable;
- regressions unique to the primitive, such as popup positioning, timers, gestures, or child
  machines.

Put compile-time assertions in `*.test-d.ts`. Add them to the package's Vitest `typecheck`
configuration rather than passing typecheck flags on the command line.

## Completion criteria

1. Run `vp check` while iterating.
2. Run the focused browser test in the component package.
3. Run `vp run ready` from the repository root.
4. Confirm generated failure screenshots and build output are not accidentally staged.
5. Inspect `git diff` for unrelated changes and stale exports.

The component is ready for handoff only when the full command succeeds, the built public entry is
verified by `published-smoke`, the npm manifest passes Publint, and
create/enhance teardown ownership is covered by tests.
