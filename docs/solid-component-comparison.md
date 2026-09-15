# Faisceau UI compared with Ark UI Solid

Research date: 2026-09-08.

## Scope and baselines

This report compares every currently exported Faisceau UI component—Select, Combobox, Checkbox,
Tooltip, Dialog, Drawer, and Toast—with its official Ark UI **Solid** implementation. It reviews
machine integration, public API and anatomy, lifecycle and DOM ownership, reactivity and controlled
state, presence and portals, forms, accessibility, distinctive features, and concrete gaps.

The local baseline is worktree commit `353b9fe4bcd9a094d31d71c8c30fe1f33c2b224e`. The package pins
all seven Zag machines plus `@zag-js/core` and `@zag-js/vanilla` to `2.0.0-next.2`
([workspace catalog](../pnpm-workspace.yaml)). Local behavior and ownership policy come from the
[architecture document](architecture.md), with implementation evidence linked throughout.

For established Ark components, source links are pinned to Ark commit
[`e988b667`](https://github.com/chakra-ui/ark/tree/e988b66714df66ae4c43aea4bc8b1c0c839854ad),
whose Solid package uses Zag `1.43.3`
([package manifest](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/package.json)).
Drawer needs a separate baseline: Ark replaced Bottom Sheet with a distinct Drawer in Solid 5.32.0,
after that earlier snapshot. Drawer references are therefore pinned to the signed Solid 5.37.1
release commit [`a0d58e7`](https://github.com/chakra-ui/ark/tree/a0d58e7), while its naming history is
confirmed in the official
[Solid changelog](https://github.com/chakra-ui/ark/blob/a0d58e7/packages/solid/CHANGELOG.md).
The [current official Drawer documentation](https://ark-ui.com/docs/components/drawer) may describe
newer additions and currently labels Drawer as preview. Ark is an architectural comparison, not an
API compatibility oracle for this workspace's newer Zag Next packages.

## Executive summary

| Concern          | Faisceau UI                                                                                 | Ark UI Solid                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Integration      | One vanilla Zag service per controller; Toast has group plus item services                  | `useMachine` and a memoized connected API behind Solid context                         |
| Public shape     | Opinionated `create*` / `enhance*` controller with complete markup                          | Headless compound parts, `Root`, `RootProvider`, context, and `use*` hook              |
| Ownership        | Explicit create/adopt/restore semantics                                                     | Solid renderer owns the declared nodes and cleanup                                     |
| Reactivity       | Reactive DOM bindings and connected API, but component options are fixed after construction | Props, collections, presence, and rendered items naturally follow Solid accessors      |
| Composition      | Stable `data-part` hooks and enhancement of authored markup                                 | Per-part props, arbitrary nesting where valid, and `asChild` polymorphism              |
| Presence         | Popup/overlay trees stay mounted and Zag/CSS hide them                                      | Dedicated presence/render-strategy integration supports lazy mount and unmount-on-exit |
| Portal           | No built-in portal; overlay parts remain beside the root/trigger                            | Separate `Portal` utility is used in overlay examples, so portalling is opt-in         |
| Forms            | Native controls are mandatory and have explicit reset/event/validation bridges              | Hidden control is a declarative part; Field composes descriptions/errors               |
| Controlled state | Zag-shaped initial props and callback APIs, but no public prop-update method                | Controlled props react to normal Solid state changes                                   |

Faisceau's main strengths are progressive enhancement, deterministic teardown, native form fidelity,
and a ready-to-use visual tree. Ark Solid's main strengths are reactive collections, fully controlled
state, granular composition, group/provider APIs, and presence/portal flexibility.

## Shared architecture

Faisceau's adapter creates a Zag `VanillaMachine`, republishes `connect(...)` through a Faisceau
signal, and reactively applies each `get*Props()` result with scoped `spreadProps`. It supports
tracked machine props internally and explicitly removes final listeners/attributes on disposal
([adapter](../packages/faisceau-zag/src/index.ts)). Components resolve their concrete elements once,
bind each part, and expose a read-only connected accessor on an imperative controller.

Ark Solid follows the same state-machine seam in a declarative form. A `useX` hook builds machine
props in `createMemo`, runs the dedicated machine through `@zag-js/solid`, and memoizes the connected
API. `Root` or `RootProvider` supplies that accessor through context; leaf parts merge their own DOM
props with the matching connected `get*Props()` result. The pattern is visible in the pinned
[Select hook](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select/use-select.ts),
[Select root](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select/select-root.tsx),
and [Select item](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select/select-item.tsx).

This makes Ark Solid the closest framework analogue to Faisceau: both preserve getter-based
fine-grained reactivity. The important difference is structural ownership. Solid reconciles JSX
nodes, while Faisceau reconciles attributes on controller-owned or adopted stable nodes.

## Select

### Parity and differences

Both use `@zag-js/select`, a list collection, the same selection/open/highlight state model, and
parts for label, control, trigger, value text, positioner, content, list, items, item text, and item
indicator. Faisceau also offers an optional clear trigger and enables Zag's selected-item alignment
by default for single selection
([implementation](../packages/faisceau-ui/src/select/select.ts),
[types](../packages/faisceau-ui/src/select/types.ts)). Ark exposes these as independently composable
Solid parts, including groups, `HiddenSelect`, context, and provider APIs
([Solid source directory](https://github.com/chakra-ui/ark/tree/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select)).

Faisceau creates its collection and item DOM once. Enhancement derives the collection from exactly
one existing `<select>` and validates a one-to-one item-node mapping. Ark receives the collection as
a root prop and leaves JSX iteration to the consumer, so a reactive collection naturally drives
both machine props and rendered items. Ark's item generic also preserves application item types;
Faisceau normalizes public inputs to its fixed `{ label, value, description?, disabled? }` model.

Faisceau always retains a real select and its shared native-field bridge synchronizes selections,
emits native `input` then `change`, handles `form.reset()`, redirects invalid/focus behavior to the
visible trigger, and restores enhanced attributes while retaining the current value
([native-select bridge](../packages/faisceau-ui/src/shared/native-select.ts)). Ark's
[`HiddenSelect`](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select/select-hidden-select.tsx)
is optional composition and renders options from the current collection. Faisceau is therefore
stronger by default for native form and enhancement behavior; Ark is stronger for dynamic data and
custom item rendering.

### Recommended work

1. Add keyed dynamic item reconciliation that updates the Zag collection, item nodes and bindings,
   native options, order, labels, disabled state, stable IDs, and invalidated selection as one
   transaction.
2. Preserve the current native event/reset/validation contract; merely calling `updateProps` is not
   sufficient.
3. Consider constrained per-part attribute/render hooks after dynamic collections, rather than
   reproducing an entire compound-component API.

## Combobox

### Parity and differences

Both use the dedicated combobox machine and expose label, control, input, trigger, clear trigger,
positioner, content/listbox, item, item text, and item indicator behavior. Faisceau adds a built-in
case-insensitive filter, empty state, removable tags for multiple selection, native-select form
bridge, and an optional custom filter/get-remove-label API
([implementation](../packages/faisceau-ui/src/combobox/combobox.ts),
[types](../packages/faisceau-ui/src/combobox/types.ts)). Its default `openOnClick` is `true`, while
Ark's documented machine default is `false`.

Ark's anatomy also includes `Empty`, `ItemGroup`, and `ItemGroupLabel`. Its official examples cover
dynamic suggestions, async search, rehydration before the collection loads, custom object mapping,
grouping, result limits, multiple selection, and virtualization. It accepts a generic
`ListCollection<T>` and keeps type inference through `RootComponent<T>`
([official Combobox documentation](https://ark-ui.com/docs/components/combobox),
[pinned Solid source](https://github.com/chakra-ui/ark/tree/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/combobox)).

Faisceau's filtering updates the machine collection, but the full original item DOM, item bindings,
native options, and value lookup remain fixed. Filtering is implemented by hiding existing item
nodes. It is effective for a small local list, but is not dynamic collection support and cannot
match Ark's async, grouped, custom-object, or virtualized scenarios. As with Select, component props
cannot be reactively replaced after construction, even though the underlying adapter can update
machine props.

Form semantics are intentionally deeper in Faisceau: a real `<select>` remains the submitted
control, including multiple values, browser validation, reset, and native events. Ark exposes
machine `name`, `form`, and `required` semantics through its declarative structure, while Field is
the documented way to compose helper/error text and ARIA relationships. Faisceau builds those
messages directly.

### Recommended work

1. Build Combobox on the same keyed collection reconciler as Select, with a separate filtered view
   derived from the authoritative collection.
2. Ensure async replacement removes stale selections/tags and synchronizes the native select with
   normal `input`/`change` semantics.
3. Add grouping only after the flat dynamic collection lifecycle is proven. Add virtualization only
   with an explicit renderer/scroll contract; hidden static nodes do not deliver its benefits.
4. Consider creatable/custom values separately because the current native-select contract and
   explicit omission of `allowCustomValue` make that a product-policy decision.

## Checkbox

### Parity and differences

Both use the Zag Checkbox machine and include root/field, control, indicator, label, and a real
hidden native checkbox. Both support boolean and indeterminate states, controlled/uncontrolled Zag
props, disabled/required/name/form/value semantics, and accessible labeling. Ark's exact Solid
anatomy is available in its
[pinned Checkbox source](https://github.com/chakra-ui/ark/tree/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/checkbox),
and current capabilities are documented in the
[official Checkbox guide](https://ark-ui.com/docs/components/checkbox).

Faisceau creates a complete labeled field or enhances a container holding exactly one checkbox.
Enhancement can derive its label from `aria-label`, adopts the original checked/indeterminate state,
starts immediately, then restores caller markup, attributes, and original state on destroy
([implementation](../packages/faisceau-ui/src/checkbox/checkbox.ts)). It directly includes optional
description and error messages. Its browser test verifies submission, required validation,
indeterminate-capable machine state, reset, detached mounting, and reversible enhancement
([tests](../packages/faisceau-ui/src/checkbox/checkbox.test.ts)). Ark instead lets consumers compose
Field and part markup and relies on Solid ownership for cleanup.

Ark has a substantial capability absent from Faisceau: Checkbox Group, GroupProvider, and the group
hook provide controlled arrays, group validity, select-all/group state, selection limits, and
multi-value form submission. Ark also permits part-by-part polymorphism. Faisceau has one fixed
checkbox view and no group abstraction.

### Recommended work

1. Do not change the single-checkbox native/enhancement path; it is already the stronger imperative
   contract.
2. Add Checkbox Group only in response to a concrete requirement, using native same-name checkbox
   submission rather than synthesizing a non-native store.
3. Before advertising controlled use, expose a controller-level prop update mechanism or a focused
   `setChecked` integration contract. Initial `checked` plus a callback alone cannot follow changing
   external state as naturally as Solid props.

## Tooltip

### Parity and differences

Both use the dedicated Tooltip machine and bind Trigger, Positioner, Content, Arrow, and ArrowTip.
Both inherit Zag's open/close delays, positioning, interactive behavior, controlled open state, and
ARIA-described-by behavior. Ark additionally exposes context, `useTooltip`, `RootProvider`,
multiple-trigger patterns, per-part `asChild`, and presence controls such as `lazyMount` and
`unmountOnExit`
([official Tooltip documentation](https://ark-ui.com/docs/components/tooltip),
[pinned Solid source](https://github.com/chakra-ui/ark/tree/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/tooltip)).

Faisceau's created form always generates a button trigger and popup. Enhancement is distinctive: it
can consume an existing trigger's native `title`, removes the title to avoid a duplicate browser
tooltip, inserts the popup as a sibling, and restores the original attributes/title on destroy
([implementation](../packages/faisceau-ui/src/tooltip/tooltip.ts)). This is a valuable progressive
enhancement behavior Ark does not need to provide in a renderer-owned tree.

Faisceau always creates and keeps the positioner/content mounted; closed state is expressed by Zag
props and CSS/`hidden`. It has no portal option and content is string-only. Ark gives consumers node
content, optional portal composition, lazy mounting, exit-unmount, render-strategy control, and
multiple trigger values. Faisceau's generated trigger is also necessarily a button; enhancement is
the escape hatch for richer trigger markup.

### Recommended work

1. Preserve title adoption/restoration.
2. Add an optional portal target before adding a general portal subsystem; detached-root lookup and
   teardown must remain correct.
3. Add lazy/unmount presence only if expensive content or exit animations justify the structural
   lifecycle complexity.
4. Permit node/factory content if rich tooltip content is desired, while keeping ordinary tooltips
   non-interactive and concise by default.

## Dialog

### Parity and differences

Both use Zag Dialog and the standard WAI-ARIA dialog anatomy: Trigger, Backdrop, Positioner,
Content, Title, optional Description, and CloseTrigger. They inherit modal/non-modal behavior,
escape and outside-interaction handling, focus trap/restore, roles including `alertdialog`, and
controlled open state. Ark exposes each part, `useDialog`, `RootProvider`, context, initial/final
focus configuration, nested-layer state, multiple triggers, presence options, and confirmation
interception
([official Dialog documentation](https://ark-ui.com/docs/components/dialog),
[pinned Solid hook](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/dialog/use-dialog.ts),
[pinned Solid parts](https://github.com/chakra-ui/ark/tree/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/dialog)).

Faisceau centralizes Dialog's create/enhance lifecycle in a shared overlay module
([overlay implementation](../packages/faisceau-ui/src/dialog/overlay.ts)). Creation builds a complete
string-content dialog. Enhancement requires authored trigger and content parts, generates missing
title/description/close plus backdrop and positioner, temporarily reparents content, and reverses
all of that on destroy. This is stronger than Ark for adopting server-rendered or otherwise
caller-owned DOM.

Unlike common Ark examples, Faisceau does not portal the backdrop/positioner. Ark's portal is a
separate utility rather than an intrinsic Dialog behavior, so this is a composition difference, not
a machine-semantic mismatch. Faisceau also keeps closed overlay nodes mounted and lacks Ark's
lazy-mount/unmount-on-exit path. Its string-only body and prescribed close button offer much less
content/action composition than Ark parts.

### Recommended work

1. Accept an element or content factory for the body; dialogs commonly contain forms and structured
   actions, making string-only content the most important API limitation.
2. Offer an explicit portal target and test focus restoration, outside interaction, detached roots,
   and enhancement teardown through that boundary.
3. Add presence/unmount options only together with exit-completion tests; do not remove the DOM
   before Zag finishes focus and layer cleanup.
4. Keep Dialog and Drawer lifecycles separate even if view helpers remain shared: their machine
   feature sets now diverge materially.

## Drawer

### Naming and version status

Ark's current Drawer is the correct comparison target, but only for recent versions. Ark Solid
5.32.0 **replaced Bottom Sheet with Drawer**, adding multi-directional swiping, Positioner, and
sequential snap behavior
([pinned Solid changelog](https://github.com/chakra-ui/ark/blob/a0d58e7/packages/solid/CHANGELOG.md)).
The current official documentation calls Drawer a preview component and describes a dedicated
drawer primitive—not a styled Dialog
([Drawer documentation](https://ark-ui.com/docs/components/drawer)). Therefore:

- compare current Faisceau Drawer with Ark Drawer for machine, swipe, drag, and snap semantics;
- compare it with Dialog only for shared overlay/focus anatomy;
- do not use old Ark Bottom Sheet source or assume Drawer existed in the older `e988b667` baseline.

### Parity and differences

Both implementations use a dedicated `@zag-js/drawer` machine. Both provide Trigger, Backdrop,
Positioner, Content, Title, Description, CloseTrigger, Grabber, GrabberIndicator, and optional
SwipeArea; support logical/physical swipe direction, snap points, drag-to-dismiss, modal behavior,
and the dialog accessibility model. Faisceau binds all these parts and exposes the resolved swipe
direction as `data-side`
([implementation](../packages/faisceau-ui/src/drawer/drawer.ts)). Ark exposes the corresponding
compound parts plus `IndentBackground`, multiple trigger values, `RootProvider`/`useDrawer`,
external stack coordination, controlled snap point, and richer runtime CSS variables/state
([pinned Solid Drawer source](https://github.com/chakra-ui/ark/tree/a0d58e7/packages/solid/src/components/drawer),
[official API](https://ark-ui.com/docs/components/drawer)).

Faisceau's create/enhance ownership mirrors Dialog but correctly uses Drawer-specific markup and
machine bindings. Enhancement restores reparented caller content and generated overlay/gesture
parts. It keeps the drawer mounted, does not portal, exposes only a boolean convenience for
generating SwipeArea, and lacks IndentBackground, multi-trigger identity, and a public declarative
stack surface. Its fixed string body is again restrictive for the forms/navigation content drawers
usually contain.

### Recommended work

1. First support structured body content and optional portal placement, shared in concept—but not
   necessarily in public type—with Dialog.
2. Mirror Ark's `data-swipe-direction` name in addition to or instead of custom `data-side` if
   direct Zag/Ark styling vocabulary is desirable before publication.
3. Add IndentBackground, multiple triggers, and external stack coordination only when product needs
   demand nested/app-shell drawers; they add meaningful state and ownership complexity.
4. Expand browser tests beyond open/side state to drag threshold, snap points, logical RTL
   direction, no-drag regions, escape/focus restoration, and enhancement teardown.

## Toast

### Parity and differences

Both are store-first compositions around Zag Toast. Ark's `createToaster` creates an external store,
and `<Toaster toaster={toaster}>` renders each visible toast through a Solid render function with
Root, Title, Description, ActionTrigger, and CloseTrigger parts. The store covers placement,
grouping, variants, promise transitions, update, finite/infinite duration, and maximum-visible
queuing
([official Toast documentation](https://ark-ui.com/docs/components/toast),
[pinned Solid Toast source](https://github.com/chakra-ui/ark/tree/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/toast)).

Faisceau similarly creates a Zag store, runs one group machine, subscribes to visible toasts, and
key-reconciles child machines by toast ID. Each item has explicit create/update/destroy behavior and
binding disposal
([implementation](../packages/faisceau-ui/src/toast/toast.ts)). This is the repository's best
existing model for dynamic structural reconciliation. The controller exposes the full store plus
convenience `create` and `dismiss`, and can create or enhance an existing empty region. The group has
an accessible default label and enhancement restores caller attributes.

Ark's render function allows arbitrary per-toast content and conditional parts. Faisceau owns a
fixed title/optional-description/action/close tree. More importantly, its existing item `update`
only forwards new machine props: it does not update title/description text, add or remove optional
description/action nodes, replace action handlers at the DOM-view layer, or reconcile those
bindings. Consequently the exposed store's update/promise transitions can outgrow the rendered
view even though the Zag service is current. Tests currently cover create/dismiss and one action,
not updates, promise states, queue limits, pause/resume, swipe, or placement
([tests](../packages/faisceau-ui/src/toast/toast.test.ts)).

### Recommended work

1. Fix keyed item `update` so view content and optional parts reconcile together with machine props;
   add explicit per-part disposers. This should precede reusing Toast's pattern for Select.
2. Test and document which full-store operations are supported, especially `update`, promise
   transitions, max-visible queuing, pause/resume, and placement.
3. Consider a toast render callback/factory for custom bodies while retaining the simple options
   shorthand.
4. Keep region enhancement; it is a useful capability beyond Ark's normal renderer-owned mount.

## Cross-component priorities

### 1. Make externally controlled state truly reactive

Faisceau exposes Zag-shaped controlled props, but every component constructs its machine from one
plain options object and no component controller exposes `updateProps`. Consumers can call connected
API methods and receive callbacks, but cannot feed changing controlled values/configuration back in
with Solid-like reactivity. Choose and document one public direction before publication:

- accept tracked option getters; or
- expose a typed controller `update(...)`; or
- expose focused state setters and describe the components as primarily uncontrolled.

The underlying adapter already supports tracked getters and updates, so this is principally a
component API and ownership decision.

### 2. Implement collection reconciliation as a deep module

Select and Combobox need one authoritative keyed lifecycle that coordinates visual nodes, native
options, bindings, IDs, selection validity, and machine collection updates. Toast proves keyed
reconciliation is viable but also demonstrates why updating only the machine is insufficient.

### 3. Add structured content before broad part polymorphism

Ark's strongest composition advantage is per-part JSX/`asChild`, but Faisceau need not imitate a
framework component tree. The highest-value gaps are narrower: structured Dialog/Drawer bodies,
rich Toast content, and perhaps Tooltip content factories. Enhancement should remain the advanced
escape hatch for fully authored markup.

### 4. Treat portal and presence as explicit policies

Tooltip, Dialog, and Drawer keep complete trees mounted beside their triggers. This is simple and
works with scoped teardown, but differs from Ark's optional Portal plus presence strategy. Add portal
targets and lazy/unmount behavior only with lifecycle tests covering focus restoration, exit timing,
detached mounting, and enhanced-node restoration.

### 5. Expand tests where machines expose more than the current happy path

Highest-value missing browser coverage is dynamic collection replacement; controlled prop updates;
Toast update/promise/queue behavior; Drawer gesture/snap/RTL behavior; Dialog/Drawer portal and focus
restoration; and Checkbox group semantics if a group is added. The existing real-Chromium tests and
native-form assertions are the right verification layer.

## Bottom line

None of the seven components is a mistaken Zag integration. Their connected props, IDs, native
controls, and accessibility behavior align with the same machines Ark Solid wraps. The difference
is product shape: Faisceau supplies opinionated, reversible DOM controllers; Ark supplies reactive,
composable headless parts.

The most actionable order is:

1. make Toast updates structurally correct;
2. extract keyed collection reconciliation and add dynamic Select, then Combobox;
3. decide the public controlled-prop update contract;
4. allow structured Dialog/Drawer content;
5. add opt-in portal/presence features;
6. add Checkbox Group and advanced Ark-only features only when required by real usage.
