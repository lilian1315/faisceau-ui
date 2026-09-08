# Architecture

This document records decisions that are not obvious from a single manifest or source file. The
repository configuration remains the source of truth for versions, scripts, and export paths.

## Scope

Faisceau UI targets modern browsers. Server rendering and framework-specific renderers are outside
the current contract. The visual language is inspired by shadcn/ui, but implementation and public
behavior use vanilla CSS, native DOM, Faisceau, and Zag.

The library is not published yet. Component options intentionally expose much of the corresponding
Zag props and controllers expose the connected Zag API. Compatibility is not a design constraint
until real application usage provides evidence for a smaller stable FUI API.

## Package boundaries

### `@lilian1315/faisceau-zag`

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

### `@lilian1315/faisceau-ui`

The UI package owns component markup, enhancement, form behavior, CSS, icons, and accessible labels.
It depends on the adapter and uses a dedicated Zag package for each component when available.

Each public component has a root export and a package subpath. Styles ship separately through
`@lilian1315/faisceau-ui/styles.css`; importing JavaScript does not implicitly inject CSS.

### Private packages

- `storybook` documents constructed and enhanced variants in TSX and runs the accessibility addon.
- `published-smoke` validates files, subpath resolution, generated declarations, CSS inclusion, and
  one real Chrome interaction through the public package surface.

## Component lifecycle and DOM ownership

`create*` builds a complete DOM tree with `@lilian1315/create-element/faisceau`. Its controller is
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

- `data-fui-part` names stable semantic parts used by setup code and consumer styling.
- Library-owned classes are single `fui-*` tokens; `addFuiClasses()` enforces this invariant.
- Consumer classes are additive and are restored by enhanced controllers.
- CSS is vanilla and layered. `tokens.css` defines semantic `--fui-*` variables; component sheets
  consume those variables.
- Controls favor 44 px touch targets, explicit focus-visible rings, restrained property-specific
  transitions, and `scale: 0.96` press feedback.
- Icons come from Lucide and are created through shared helpers with `currentColor`.

## Native form protocol

Select and Combobox retain one real `<select>` as the submitted control. Checkbox retains one real
`input[type="checkbox"]`. The native element owns `name`, `form`, `required`, `disabled`, submitted
values, and browser validation.

`createNativeSelectField()` centralizes the collection-field protocol:

- machine changes update native selected options and emit bubbling `input`, then `change`;
- native changes update the Zag machine without event echo;
- `form.reset()` restores the initial selection;
- invalid or native focus is redirected to the visible control;
- teardown restores enhanced attributes while preserving the current value.

Future form controls should use a native element whenever the platform supplies an appropriate
submission primitive. Form behavior belongs in a shared deep module once two components share the
same invariant; component files retain only their Zag-specific mapping.

## Implemented components

| Component | Zag primitive      | Existing markup           | Native form | Notable behavior                                          |
| --------- | ------------------ | ------------------------- | ----------- | --------------------------------------------------------- |
| Select    | `@zag-js/select`   | One native `<select>`     | Yes         | Multiple mode; selected-item alignment by default         |
| Combobox  | `@zag-js/combobox` | One native `<select>`     | Yes         | Filtering, removable multiple-value tags                  |
| Checkbox  | `@zag-js/checkbox` | One checkbox input        | Yes         | Checked and indeterminate states                          |
| Tooltip   | `@zag-js/tooltip`  | Existing trigger/title    | No          | Restores the native `title` on teardown                   |
| Dialog    | `@zag-js/dialog`   | Trigger and content parts | No          | Generated backdrop, positioner, close control             |
| Drawer    | `@zag-js/drawer`   | Trigger and content parts | No          | Logical swipe direction, snap points, grabber, swipe area |
| Toast     | `@zag-js/toast`    | Existing empty region     | No          | Group service, child machines, public toast store         |

## Select positioning exception

Select aligns the selected item's text with the trigger by default. The behavior uses a local
virtual-anchor and visibility guard because Zag does not currently own this coordination. Multiple
mode always disables it. `TODO.md` tracks moving the feature upstream; remove the local positioning
module only after the Zag replacement covers reopening, fallback placement, RTL, viewports, and
coarse pointers.

## Testing and publication boundaries

Runtime component tests execute in a real Chromium browser through Vitest Browser and Playwright.
Adapter conformance tests cover controlled props, delayed effects, cleanup, and collection typing.
Type tests live in `*.test-d.ts` and are enabled in package configuration.

Source tests do not prove the package is publishable. Any public entry change must also update and
pass `published-smoke`, which checks the packed files and imports the generated ESM/declaration
subpaths as a consumer would.

The HTML architecture report at the repository root is a historical review. Its native-form,
published-smoke, and typed-adapter recommendations have been implemented; its old counts and API
recommendations are not current policy.
