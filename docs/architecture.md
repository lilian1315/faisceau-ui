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

The adapter uses the package name `faisceau-zag` on npm and `@lilian1315/faisceau-zag` on JSR.

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

The component library uses the package name `faisceau-ui` on npm and `@lilian1315/faisceau-ui` on
JSR.

The UI package owns component markup, enhancement, form behavior, CSS, icons, and accessible labels.
It depends on the adapter and uses a dedicated Zag package for each component when available.

Each public component has a root export and a package subpath in both registries. The npm package
also ships styles separately through `faisceau-ui/styles/index.css`; importing JavaScript does not
implicitly inject CSS. JSR exposes the TypeScript modules only because its package exports do not
support CSS module targets.

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
  specificity and cascade in `@use` order. `src/styles/` holds one public stylesheet per
  component plus the `index.scss` bundle; the directory compiles to `dist/styles/*.css` during
  the package build. `faisceau-ui/styles/index.css` resolves to the compiled bundle while
  `faisceau-ui/styles/<component>.css` (and the matching `.scss` sources) expose the same
  styles per component. `tokens.scss` defines semantic `--fui-*` variables; component sheets
  `@use` it together with the shared `base.scss`. Each component stylesheet is self-contained;
  shared multi-selector blocks live as mixins in the internal `_mixins.scss` partial so
  per-component files stay scoped. Import the `index` bundle when styling several components
  to avoid duplicating the token/base prelude. Every CSS subpath carries a `types` condition
  pointing at a generated sibling `<name>.css.d.ts`, so the imports typecheck without an
  ambient `*.css` declaration.
- Controls favor 44 px touch targets, explicit focus-visible rings, restrained property-specific
  transitions, and `scale: 0.96` press feedback.
- Icons are Lucide SVGs vendored under `src/icons/` and rendered as `currentColor` CSS masks.

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
| Select      | `@zag-js/select`      | Root and native `<select>`; optional label/description | Yes         | Generated control/popup; opt-in selected-item alignment after capped-height positioning            |
| Combobox    | `@zag-js/combobox`    | One native `<select>`                                  | Yes         | Filtering, removable multiple-value tags                                                           |
| Checkbox    | `@zag-js/checkbox`    | One checkbox input                                     | Yes         | Checked and indeterminate states                                                                   |
| Collapsible | `@zag-js/collapsible` | Complete trigger, indicator, and content anatomy       | No          | Native button semantics; optional collapsed dimensions                                             |
| Tooltip     | `@zag-js/tooltip`     | Existing trigger/title                                 | No          | Restores the native `title` on teardown                                                            |
| Dialog      | `@zag-js/dialog`      | Content part, external `triggerSelector`               | No          | Generated backdrop, positioner, close control; triggers bound by selector, never owned             |
| Drawer      | `@zag-js/drawer`      | Content part, external `triggerSelector`               | No          | Logical swipe direction, snap points, grabber, swipe area; triggers bound by selector, never owned |
| Toast       | `@zag-js/toast`       | Existing empty region                                  | No          | Group service, child machines, public toast store                                                  |

Select can align the selected item with its trigger in single-value mode. It applies alignment
after Floating UI has positioned the height-capped popup, so long lists keep the selected item
visible. Multiple mode, an empty selection, or insufficient viewport space uses normal anchored
positioning.

## Testing and publication boundaries

Runtime component tests execute in a real Chromium browser through Vitest Browser and Playwright.
Adapter conformance tests cover controlled props, delayed effects, cleanup, and collection typing.
Type tests live in `*.test-d.ts` and are enabled in package configuration.

Source tests do not prove the package is publishable. Any public entry change must also update and
pass `published-smoke`, which imports the generated ESM/declaration subpaths as a consumer would.
Package builds separately run Publint against the npm manifest and compare its code exports with the
JSR manifest.

## Publication model

Each public library has two manifests. `package.json` describes the built ESM package published to
npm, while `jsr.json` exposes the TypeScript source published to JSR. CSS remains npm-only. The
manifest versions move together.
The root `deno.json` supplies JSR and npm dependency mappings for the Deno workspace and is generated
from the package manifests plus `pnpm-workspace.yaml`.

The GitHub Actions workflow publishes one package at a time. A tag named `faisceau-ui@<version>` or
`faisceau-zag@<version>` selects the package; a manual run requires the same choice explicitly. The
workflow rejects mismatched tag, npm-manifest, and JSR-manifest versions, runs the complete `ready`
gate, then publishes to JSR and npm with OIDC.
