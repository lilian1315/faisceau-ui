# Select implementation comparison: Faisceau UI and Ark UI

Research date: 2026-09-08.

The Faisceau implementation described here is the pre-dynamic-collection baseline at commit
`353b9fe4bcd9a094d31d71c8c30fe1f33c2b224e`. Dynamic Select and Combobox reconciliation was
implemented afterward; this note remains a record of the comparison that motivated that work.

## Scope and source baseline

This note compares Faisceau UI's local Select implementation with the official Ark UI Select adapters for React, Vue, Solid, and Svelte. Ark UI describes itself as a headless library built on Zag and maintaining API parity across these four frameworks ([official repository](https://github.com/chakra-ui/ark)). The inspected Ark source is pinned to commit [`e988b66`](https://github.com/chakra-ui/ark/tree/e988b66714df66ae4c43aea4bc8b1c0c839854ad).

There is an important version caveat. This workspace pins Zag Select and Vanilla to `2.0.0-next.2`, while that Ark commit pins its framework adapters and Select machine to `1.43.3` ([React package](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/react/package.json), [Vue package](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/vue/package.json), [Solid package](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/package.json), [Svelte package](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/svelte/package.json)). Ark is therefore a useful architectural and framework-integration reference, not an exact API compatibility oracle for this repository's Zag Next version.

Local files reviewed:

- `packages/faisceau-ui/src/select/select.ts`
- `packages/faisceau-ui/src/select/markup.ts`
- `packages/faisceau-ui/src/select/types.ts`
- `packages/faisceau-ui/src/shared/native-select.ts`
- `packages/faisceau-zag/src/index.ts`

## Executive comparison

| Concern             | Faisceau UI                                                               | Ark React                                                         | Ark Vue                                               | Ark Solid                          | Ark Svelte                                |
| ------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------- | ----------------------------------------- |
| Public shape        | One controller plus `createSelect` and `enhanceSelect`                    | Compound components and context                                   | Compound components and provide/inject                | Compound components and context    | Compound components and context           |
| DOM ownership       | Builds a complete tree or enhances caller-owned native markup             | Framework render tree owns parts                                  | Framework render tree owns parts                      | Framework render tree owns parts   | Framework render tree owns parts          |
| Machine integration | One vanilla `createZagMachine`; binds props directly to existing elements | `useMachine`, connect on render                                   | computed machine props/API                            | memos and accessors                | runes/derived accessors                   |
| Prop separation     | Destructures view-only options, spreads remaining behavior to machine     | Explicit split of machine, presence, and DOM props                | Vue prop typing/defaults; `cleanProps` before machine | Explicit reactive split            | Explicit `$derived` split                 |
| Items               | Normalized once; exact item-to-node matching by `data-value`              | Collection supplied to root; item components render declaratively | Same                                                  | Same                               | Same                                      |
| Native form control | Always present and centrally synchronized                                 | Optional `HiddenSelect` part                                      | Optional `HiddenSelect` part                          | Optional `HiddenSelect` part       | Optional `HiddenSelect` part              |
| Lifecycle           | Explicit idle/started/destroyed controller                                | React mount/unmount hooks inside adapter                          | Vue scope lifecycle inside adapter                    | Solid owner cleanup inside adapter | Svelte component lifecycle inside adapter |
| Controlled state    | Zag-shaped `value`/`open` callbacks; no component-specific two-way sugar  | `value` + `onValueChange`, `open` + `onOpenChange`                | Adds `v-model` events                                 | Zag-shaped reactive props          | Bindable `value` bridge plus callbacks    |

## Shared Ark architecture

All four Ark implementations have the same high-level pipeline:

1. `Select.Root` separates Select machine props from presence props and host-element props.
2. `useSelect` augments the caller's props with generated IDs, locale direction, environment root lookup, and inherited Field state.
3. The framework's Zag `useMachine` owns service startup, reactive updates, and disposal.
4. `select.connect(service, normalizeProps)` exposes the part prop getters.
5. Root provides the connected API through context; leaf components call `getTriggerProps`, `getItemProps`, `getHiddenSelectProps`, and so on.
6. Presence is a separate concern driven by `select.open`.

The pattern is visible directly in the four root/hook pairs: [React root](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/react/src/components/select/select-root.tsx) and [hook](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/react/src/components/select/use-select.ts); [Vue root](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/vue/src/components/select/select-root.vue) and [hook](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/vue/src/components/select/use-select.ts); [Solid root](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select/select-root.tsx) and [hook](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select/use-select.ts); [Svelte root](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/svelte/src/lib/components/select/select-root.svelte) and [hook](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/svelte/src/lib/components/select/use-select.svelte.ts).

Faisceau has the same machine/connect/part-props core, but collapses the framework component tree into an imperative controller. `setupSelect` creates one machine, resolves concrete elements up front, then installs a reactive binding for every part. Context is unnecessary because all part elements are already available to the controller.

## Framework-specific details

### React

React rebuilds `machineProps` on render, passes them to `useMachine`, and immediately reconnects to get a plain API object. `Select.Root` explicitly splits machine props from local DOM props, lets the framework-aware `mergeProps` combine Zag's root props with caller props, and provides both Select and Presence contexts. `forwardRef` exposes the root DOM node ([root source](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/react/src/components/select/select-root.tsx), [hook source](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/react/src/components/select/use-select.ts)).

Each item splits `item`/`persistFocus` from ordinary element props, merges `getItemProps` with the latter, and provides both the item props and computed item state to nested primitives ([item source](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/react/src/components/select/select-item.tsx)). This makes item subparts declaratively nestable without the root knowing their DOM nodes.

### Vue

Vue builds a computed machine context. It unwraps a ref or value, removes adapter-only props with `cleanProps`, and wraps Zag callbacks so a single state transition can emit Ark events, Vue `update:*` events, and the caller's original callback. It specifically maps `modelValue` to Zag's `value`, and emits updates for value, highlighted value, and open state ([hook source](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/vue/src/components/select/use-select.ts)).

The root uses Vue boolean defaults carefully so omitted booleans remain `undefined`, provides Select, Presence, and render-strategy contexts, and forwards exposure through the polymorphic factory ([root source](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/vue/src/components/select/select-root.vue)). Unlike the other three inspected roots, Vue relies on declared component props and `cleanProps` rather than an explicit root-level machine/local prop list.

### Solid

Solid accepts either props or an accessor. It constructs machine props in `createMemo`, and returns the connected API as another memo/accessor. Root and item prop merging use getter functions, preserving fine-grained reactivity instead of snapshotting part props ([hook source](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select/use-select.ts), [root source](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select/select-root.tsx), [item source](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select/select-item.tsx)).

This is the closest Ark analogue to Faisceau's reactive adapter: both expose a connected API through a getter and reactively reconcile returned DOM props. The key difference is ownership: Solid's renderer creates and disposes elements; Faisceau's `bind` spreads changing props onto a stable, already-known element and explicitly reconciles an empty prop bag on disposal.

### Svelte

Svelte uses Svelte 5 runes throughout: `$derived.by` for machine props, `$derived` for the connected API and merged DOM props, `$props` for component input, and `$bindable` for the root ref and value ([hook source](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/svelte/src/lib/components/select/use-select.svelte.ts), [root source](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/svelte/src/lib/components/select/select-root.svelte)).

Its controlled-value bridge is distinctive. The root passes the bindable `value` into the machine and, after invoking the caller's `onValueChange`, assigns the new value back only when `value` is not `undefined`. This gives Svelte consumers idiomatic `bind:value` behavior while retaining Zag callbacks. Items follow the shared split/merge/context pattern with derived values ([item source](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/svelte/src/lib/components/select/select-item.svelte)).

## Detailed comparison with Faisceau UI

### Lifecycle and ownership

Ark delegates lifecycle to its framework adapters. Consumers declare a tree of parts; mounting a root starts the hook-owned service, and unmounting it releases the service and effects. Ark also offers `RootProvider` for consumers that create the machine hook separately.

Faisceau makes lifecycle part of its public contract. A created controller stays stopped until `mount()` or `start()`; an enhanced controller starts immediately. `destroy()` stops value effects, form synchronization, all Zag bindings, and the service. Created markup is removed, while enhanced markup removes only generated nodes and restores captured caller attributes. This is a materially different capability, not a missing React/Vue/Solid/Svelte idiom: Ark assumes framework ownership, while Faisceau explicitly supports progressive enhancement and reversible adoption of caller-owned DOM.

### Prop merging and DOM mutation

Ark leaf components generally combine Zag props with consumer element props through the relevant adapter's `mergeProps`. Root and item components split machine-only keys before forwarding local props, preventing behavioral options from leaking onto DOM nodes. The split is explicit in [React](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/react/src/components/select/select-root.tsx), [Solid](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select/select-root.tsx), and [Svelte](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/svelte/src/lib/components/select/select-root.svelte).

Faisceau performs that separation once in `setupSelect`: view concerns such as label, placeholder, messages, classes, alignment defaults, and callbacks are removed before `behavior` is spread into machine props. Its shared adapter's `bind` then calls Zag Vanilla `spreadProps` inside a Faisceau effect. Each binding gets a unique scope so changing or removed attributes/listeners can be reconciled without clobbering unrelated ownership. That scoped, reversible mutation is the imperative equivalent of Ark's render-time merge.

One gap relative to Ark is public element-level customization: Ark permits props and polymorphic/as-child behavior on every part, whereas Faisceau's created form exposes options rather than per-part prop bags. Faisceau's enhancement path partly compensates by accepting authored markup and preserving caller attributes, but it does not expose Ark's granular component composition API.

### Reactivity and prop updates

Ark uses the native reactive primitive of each framework: React rerenders, Vue computed refs, Solid memos/accessors, and Svelte derived runes. All eventually update the same Zag service and reconnect the same machine API.

Faisceau's general adapter supports a plain prop object or a tracked getter and exposes `updateProps`. Its connected API is stored in a signal, republished on every service update, and read through `api.get()`. Select currently constructs `machineProps` as a plain object, however, so the Select controller itself does not expose a component-level `update()` method for option changes. External controlled Zag state can still be represented through its current Zag-shaped props/callbacks, and the returned API can change state, but changing arbitrary Select configuration after construction is less idiomatic than rerendering an Ark root.

### Collections and item rendering

All implementations use Zag's list collection abstraction with item-to-value, item-to-string, and disabled-item accessors.

Ark treats the collection as required root state but leaves visual item rendering to the consumer. Each declarative `Select.Item` receives the actual item object, obtains `getItemProps`, and provides item state to nested `ItemText` and `ItemIndicator` parts. This supports filtering, grouping, virtualization strategies, and arbitrary item markup, while the collection independently supplies the hidden native options.

Faisceau normalizes its public item inputs, creates a collection internally, and renders one `<li>` per normalized item in `createSelect`. Enhancement reads items from the caller's native `<select>`, then generates the visual list. During setup, it maps item nodes back to collection items using `data-value` and deliberately rejects missing, duplicate, extra, or unmatched nodes. This is stricter and easier to validate, but less compositional than Ark: collections and item elements are effectively fixed at setup time.

### Native form integration

Ark exposes a declarative `Select.HiddenSelect` part. In every adapter it applies `getHiddenSelectProps`, inserts an empty option while no value is selected, and renders an option for every collection item with its computed value, disabled state, and string label: [React](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/react/src/components/select/select-hidden-select.tsx), [Vue](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/vue/src/components/select/select-hidden-select.vue), [Solid](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select/select-hidden-select.tsx), [Svelte](https://github.com/chakra-ui/ark/blob/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/svelte/src/lib/components/select/select-hidden-select.svelte). Field context supplies `aria-describedby` in React, Vue, and Solid; the inspected Svelte component does not explicitly add Field context's description ID.

Faisceau always retains a native `<select>` in the document. Its shared `createNativeSelectField` adds behavior beyond simply rendering Zag's hidden-select props:

- machine changes update selected native options and emit bubbling, composed `input` and `change` exactly once;
- native `input`/`change` update the machine without echo loops;
- form reset restores the captured initial/default value and updates the machine after the browser's reset step;
- native focus or validation failure redirects focus to the visual trigger;
- name, form owner, autocomplete, disabled, multiple, and required are synchronized;
- enhancement destruction restores original attributes while retaining the current selected value.

This is the strongest deliberate divergence from Ark. It fulfills Faisceau UI's progressive-enhancement and native-form contract even when the DOM began as ordinary HTML. Ark relies on the Zag hidden-select protocol and framework rerendering, and requires the consumer to include `HiddenSelect` in the composition.

### Controlled and uncontrolled state

At the machine level, all implementations retain Zag's controlled/uncontrolled vocabulary: `value`/`defaultValue`, `open`/`defaultOpen`, highlighted-value equivalents, and change callbacks. React and Solid expose those directly. Vue translates `modelValue` and emits `update:modelValue`, `update:open`, and `update:highlightedValue` in addition to Ark events and callbacks. Svelte provides bindable `value` semantics. Faisceau intentionally remains Zag-shaped and does not add framework-specific two-way-binding aliases.

Faisceau computes the form-reset baseline from `value`, then `defaultValue`, then the native select's current value. This makes reset semantics explicit in its controller. Ark delegates initial/default state to the machine and native reset behavior to the hidden-select props/framework lifecycle.

### Parts and rendering

Ark is a headless compound-component API. Consumers decide which parts exist and how they nest, and can use polymorphism/as-child composition. Presence is separately provided to content-related components. The official source directories expose Root, Control, Trigger, ValueText, Indicator, ClearTrigger, Positioner, Content, List, Item, ItemText, ItemIndicator, item groups, HiddenSelect, and context/provider components ([React directory](https://github.com/chakra-ui/ark/tree/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/react/src/components/select), [Vue directory](https://github.com/chakra-ui/ark/tree/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/vue/src/components/select), [Solid directory](https://github.com/chakra-ui/ark/tree/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/solid/src/components/select), [Svelte directory](https://github.com/chakra-ui/ark/tree/e988b66714df66ae4c43aea4bc8b1c0c839854ad/packages/svelte/src/lib/components/select)).

Faisceau has a prescribed semantic tree created with `h`: visible label, control, button trigger, value, optional indicator and clear trigger, positioner, content, list, item text/description/indicator, plus the native select. Parts are discoverable through `data-part`, styled through root-scoped `[data-part="…"]` selectors, and IDs are made explicit to the machine so authored enhancement markup can retain its existing IDs. Optional descriptions and errors are Faisceau field affordances layered around the Zag anatomy.

## Conclusions and actionable lessons

1. **The core adapter design is sound.** Faisceau's signal-backed connected API and scoped `spreadProps` binding are a faithful imperative analogue of Ark's hook plus `mergeProps` design. Solid is the closest direct comparison.
2. **Faisceau is intentionally deeper on progressive enhancement and native forms.** Its reversible ownership, native event bridge, reset handling, and validation focus behavior should be preserved; adopting Ark's optional-hidden-select model would weaken the repository's documented form contract.
3. **Ark is more compositional at the part boundary.** If Faisceau needs more flexibility, the best borrowing target is controlled customization of part markup/attributes, not a wholesale compound-component port. Enhancement already provides a strong foundation.
4. **Dynamic collections are the largest capability difference.** Ark naturally rerenders items from a reactive collection. Faisceau validates a static item/node mapping at setup. A future mutable-collection API would need coordinated native-option updates, visual DOM reconciliation, item binding disposal/recreation, and stable ID policy; simply calling `zag.updateProps` would not be sufficient.
5. **Prop-forwarding discipline should remain explicit.** Ark's current roots enumerate machine keys before merging local DOM props. Faisceau's destructuring achieves a similar boundary, but every new view-only Select option must continue to be removed before spreading `behavior` into the machine.
6. **Presence is deliberately less abstract in Faisceau.** Ark composes a separate Presence controller and render strategy; Faisceau keeps the positioner/content mounted and delegates state attributes/visibility to Zag plus CSS. Add a Presence layer only if lazy mount, unmount-on-exit, or exit animation coordination becomes a concrete requirement.
7. **Do not copy version-specific adapter details blindly.** The workspace is already on Zag `2.0.0-next.2`, ahead of the inspected Ark adapters' `1.43.3`. Validate any borrowed prop name or hidden-select behavior against the pinned Zag Next source and existing browser tests.
