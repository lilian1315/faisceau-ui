# Architecture

This document records decisions that are not obvious from a single manifest or source file. The
repository configuration remains the source of truth for versions, scripts, and export paths.

## Scope

Faisceau UI targets modern browsers. Server rendering and framework-specific renderers are outside
the current contract. The visual language is inspired by shadcn/ui, but implementation and public
behavior use Sass compiled to vanilla CSS, native DOM, Faisceau, and Zag.

The library is not published yet. Component options intentionally expose much of the corresponding
Zag props and controllers expose the connected Zag API. Compatibility is not a design constraint
until real application usage provides evidence for a smaller stable FUI API.

## Package boundaries

### `faisceau-zag`

The adapter uses the package name `faisceau-zag` on npm.

The framework adapter owns the seam between Zag, Faisceau, and DOM props:

1. `VanillaMachine` runs a Zag machine.
2. `connect(service, normalizeProps)` produces the public connected API.
3. A Faisceau signal publishes each connected snapshot.
4. `bind(element, getter)` reactively reconciles Zag props through `spreadProps`.
5. `updateProps()` synchronizes static or Faisceau-tracked machine props.
6. `destroy()` releases bindings, effects, subscriptions, and the service.

Machine, props, service, and connector share one schema type so incompatible Zag machines and
connectors fail during type checking. `api` is read-only. The underlying typed `service` is exposed
for Zag parent/child compositions such as Toast, not as an alternative DOM-binding path.

### `faisceau-ui`

The component library uses the package name `faisceau-ui` on npm.

The UI package owns component markup, enhancement, form behavior, CSS, icons, and accessible labels.
It depends on the adapter and uses a dedicated Zag package for each component when available.

Each public component has a root export and a package subpath. The npm package
ships the styles alongside the JavaScript: each component entry imports its SCSS, which the build
compiles to `dist/styles/*.css` and re-imports from the emitted JS, so importing a component
implicitly loads its CSS.

### Private packages

- `storybook` documents constructed and enhanced variants in TSX and runs the accessibility addon.
- `published-smoke` imports the built ESM and declaration surfaces, checks CSS inclusion, and runs
  one real Chrome interaction through the public package exports.

## Component lifecycle and DOM ownership

`create*` builds a complete DOM tree with `@lilian1315/create-element`. Its controller is
idle until the tree is inserted and `mount(target)` or `start()` is called. Destroying it stops Zag
and removes the owned root.

`enhance*` adopts caller-owned markup, generates only missing structural parts, and starts
immediately. It snapshots caller-owned attributes before binding Zag. Destroying it removes
generated nodes, releases listeners, and restores the original attributes and placement.

Controllers expose `root`, `started`, lifecycle methods, and a reactive connected `api`. Toast is
the deliberate exception: one group manages several child machines, so its controller exposes the
Zag toast `store` instead of one component API.

Bindings must work while a component is inside a detached document tree. `getLookupRoot()` falls
back to `ownerDocument` for this Storybook and test case.

## Markup and styling contract

- Structural `fui-*` classes are the stable anatomy used by setup code, enhancement, and consumer
  styling. Zag-owned `data-*` attributes describe behavior and state rather than duplicating anatomy.
- Library-owned classes are single `fui-*` tokens; enhancement validates them before mutation.
- Consumer classes are additive and are restored by enhanced controllers.
- CSS is authored in Sass without `@layer` or `:where`, so selectors carry their natural
  specificity and cascade in import order. `src/styles/` holds one fragment stylesheet per
  component plus the shared `base.scss`; `listbox.scss` carries the popup-list anatomy shared
  with Combobox, while Select owns its own list anatomy in `select.scss` and must not import
  `listbox.scss` (the two definitions conflict). Each component entry imports `base.scss` and
  its fragment directly from TypeScript; the package build compiles them to `dist/styles/*.css`
  and preserves the imports in the emitted JS (tsdown unbundle + `css.inject`), so no selector
  has two owners. `_tokens.scss` defines semantic `--fui-*` variables; shared multi-selector
  blocks live as mixins in the internal `_mixins.scss` partial so per-component files stay
  scoped. Icons are copied to `dist/icons/` and referenced from CSS through relative
  `../icons/*.svg` URLs.
- Controls favor 44 px touch targets, explicit focus-visible rings, restrained property-specific
  transitions, and `scale: 0.96` press feedback.
- Icons are Lucide SVGs vendored under `src/icons/` and rendered as `currentColor` CSS masks.

## Reactive item collections

Select and Combobox keep their authoritative Zag collection in a Faisceau signal. Their
controllers expose `setItems()`; the component subpaths and root namespaces expose
`collection()` for the shared `FuiItem` shape. Both the `items` prop and `setItems()` accept
an item array or a Zag collection (`FuiItems`). A shared `toCollection()` boundary converts
arrays and preserves supplied collections and mappings. There is no separate `collection`
prop or `setCollection()` controller method. Collection operations are immutable: callers publish the returned
collection through `setItems()` rather than mutating `items` in place.

Normalization keeps the first item for each effective collection value and warns for each
ignored duplicate, including collisions from `itemToValue`. Sanitizing an external collection
returns a copy only when duplicates are removed, preserving mappings and the caller's source.
Adopted native options follow the same rule and are restored on teardown. Malformed item
shapes still fail validation before publication.

Items may supply an explicit `id`, read from native option `data-id` in enhancement mode.
The default Zag collection key is `item.id ?? item.value`; native submission keeps `item.value`.
Without an explicit identity, existing `value` and custom `itemToValue` behavior is preserved.
Selection props, callbacks, tags, reconciliation, native event reads, and reset use selection
keys, so distinct identities can submit the same native value. DOM option `id` is not a key.
The shared native bridge reapplies selection by identity before internal change events reach
caller listeners, because Zag Select's own native sync compares against submitted option values.

`selectSameValue` defaults to true (Combobox only on the `vibe/zag-pure-select-f571e2` experiment
branch: Select there follows stock Zag semantics, selection keys = submitted values, and its CSS
keys off Zag `data-select-*` attributes under the single `.fui-select` root class).
`shared/value-selection.ts` controls the Zag value prop
internally to expand selected identities into enabled peers with the same submitted value.
An index of identities and submitted-value groups is derived once per collection snapshot,
so expansion, removal and accessibility queries share the same lookup data.
It normalizes callbacks once, preserves ignored controlled proposals, and removes whole groups
on item toggles and `clearValue(id)`. It uses the authoritative collection, not filtered results.
The public option can disable this FUI-specific policy and retain independent Zag selections.
Single mode selects one logical submitted-value group: its distinct keys are selected in Zag,
while the native single select submits one representative. Multiple mode submits all selected
native options, including repeated values. When grouping permits several selected identities,
the popup listbox advertises `aria-multiselectable` even for one logical submitted-value group.
Reset reapplies native group selection even when
the machine value has not changed. Collection replacement captures expanded keys before
publishing the new source so newly added peers and surviving identities stay consistent.

`shared/selection-labels.ts` deduplicates selected display items by the exact submitted-value
and mapped-label pair, preserving their first occurrence and selection order. Connected
`valueAsString`, the Select trigger, the Combobox single input, and multiple-selection tags
use that presentation. Selection keys, `selectedItems`, callbacks and native options remain
complete. Independent selections also share a tag for identical pairs; removing that tag
removes every identity it represents. With value grouping enabled, removal retains the
existing whole-value-group policy. Typed input text is preserved.

A shared reactive renderer owns keyed rows, groups, and Zag binding cleanup. Retained rows
keep their child nodes and bindings when the item and its presentation are unchanged.
The shared collection projection follows `collection.group()` so custom group ordering
matches Zag navigation and the native options. Select renders
its full collection. Combobox derives a filtered collection for both Zag and the result
rows; its native options and selected tags always derive from the full collection.
Replacing a full collection reconciles native options and removes missing selected values.
Filtering never prunes selections. Reset restores only initial values that still exist.
Enhanced controls restore original option nodes, groups, text, and attributes on teardown.

`shared/native-select.ts` owns collection-to-option reconciliation, pruning removed values,
native value reads/writes, event echo suppression, focus forwarding, and reset pruning.
Both components use that bridge. Select retains Zag's hidden-select notifications and reset;
Combobox supplies the missing change notification and initial reset values. Both emit one
native `input` followed by `change` for a visual selection. The native empty-selection
representation is preserved per component (Select's placeholder, Combobox's unselected option set).
`shared/native-options.ts` owns native option construction, metadata reading and reconciliation
for both components. Combobox keeps its filter text and display mode in one input-state signal.

## Native form protocol

Select and Combobox retain one real `<select>` as the submitted control. Checkbox retains one real
`input[type="checkbox"]`. The native element owns `name`, `form`, `required`, `disabled`, submitted
values, and browser validation.

Each form control renders its own visible label and description directly inside its root.
Select delegates its native `<select>` to Zag through `getHiddenSelectProps()`:

- machine changes rewrite the selected options and emit one internal bubbling `change`;
- native `input`/`change` update the machine unless tagged internal, so there is no event echo;
- `form.reset()` restores the machine's initial value, which is then written back to the options;
- the closest fieldset drives the observable disabled state;
- native focus is forwarded to the visible trigger;
- teardown restores enhanced attributes while preserving the current value.

Combobox mirrors that exact protocol around its own native `<select>` because Zag's combobox machine
owns no hidden select; the filter input stays nameless and submits nothing.

Future form controls should use a native element whenever the platform supplies an appropriate
submission primitive. Form behavior belongs in a shared deep module once two components share the
same invariant; component files retain only their Zag-specific mapping.

## Implemented components

| Component   | Zag primitive         | Existing markup                                        | Native form | Notable behavior                                                                                   |
| ----------- | --------------------- | ------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------- |
| Select      | `@zag-js/select`      | Root and native `<select>`; optional label/description | Yes         | Generated control/popup                                                                            |
| Combobox    | `@zag-js/combobox`    | One native `<select>`                                  | Yes         | Filtering, removable multiple-value tags                                                           |
| Checkbox    | `@zag-js/checkbox`    | One checkbox input                                     | Yes         | Checked and indeterminate states                                                                   |
| Collapsible | `@zag-js/collapsible` | Complete trigger, indicator, and content anatomy       | No          | Native button semantics; optional collapsed dimensions                                             |
| Tooltip     | `@zag-js/tooltip`     | Existing trigger/title                                 | No          | Restores the native `title` on teardown                                                            |
| Dialog      | `@zag-js/dialog`      | Content part, external `triggerSelector`               | No          | Generated backdrop, positioner, close control; triggers bound by selector, never owned             |
| Drawer      | `@zag-js/drawer`      | Content part, external `triggerSelector`               | No          | Logical swipe direction, snap points, grabber, swipe area; triggers bound by selector, never owned |
| Toast       | `@zag-js/toast`       | Existing empty region                                  | No          | Group service, child machines, public toast store                                                  |

## Testing and publication boundaries

Runtime component tests execute in a real Chromium browser through Vitest Browser and Playwright.
Adapter conformance tests cover controlled props, delayed effects, cleanup, and collection typing.
Type tests live in `*.test-d.ts` and are enabled in package configuration.

Source tests do not prove the package is publishable. Any public entry change must also update and
pass `published-smoke`, which imports the generated ESM/declaration subpaths as a consumer would.
Package builds separately run Publint against the npm manifest.

## Publication model

Each public library has a single manifest. `package.json` describes the built ESM package published
to npm; the compiled CSS ships inside the npm `dist/` and is auto-imported from the built JS.

The GitHub Actions workflow publishes one package at a time. A tag named `faisceau-ui@<version>` or
`faisceau-zag@<version>` selects the package; a manual run requires the same choice explicitly. The
workflow rejects mismatched tag and npm-manifest versions, runs the complete `ready`
gate, then publishes to npm with OIDC.
