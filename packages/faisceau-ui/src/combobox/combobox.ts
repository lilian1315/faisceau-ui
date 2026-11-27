import '../styles/base.scss'
import '../styles/listbox.scss'
import '../styles/combobox.scss'
import { createElement as h } from '@lilian1315/create-element'
import * as combobox from '@zag-js/combobox'
import { markAsInternalChangeEvent, trackFieldsetDisabled } from '@zag-js/dom-query'
import { computed, batch, effect, signal, type Reactive } from 'faisceau'
import { createZagMachine } from 'faisceau-zag'

import type { ComboboxController, ComboboxProps, EnhanceComboboxProps } from './types.ts'
import { createId, getLookupRoot, normalizeItems, type FuiItem } from '../shared/index.ts'
import {
  collectionItems,
  toCollection,
  presentItem,
  type FuiCollection,
} from '../shared/collection.ts'
import { getItemId } from '../shared/items.ts'
import { createValueSelection } from '../shared/value-selection.ts'
import { uniqueSelectionLabels } from '../shared/selection-labels.ts'
import { renderCollection } from '../shared/collection-renderer.ts'
import {
  buildNativeOptions,
  readNativeItems,
  reconcileNativeSelectOptions,
} from '../shared/native-options.ts'
import {
  bindNativeEvents,
  readValue,
  writeValue,
  sameValues,
  syncNativeCollection,
  trackCollectionReset,
} from '../shared/native-select.ts'
import { captureAttributes, captureChildNodes, ensureText, insertAfter } from '../shared/dom.ts'
import {
  buildControl,
  buildItem,
  buildNativeSelect,
  buildPopup,
  hideNativeSelect,
} from './markup.ts'

export function createCombobox(options: ComboboxProps): ComboboxController {
  return factory(undefined, options)
}

export function enhanceCombobox(
  root: HTMLDivElement,
  options?: EnhanceComboboxProps,
): ComboboxController {
  return factory(root, options)
}

function factory(
  root?: HTMLDivElement,
  options?: ComboboxProps | EnhanceComboboxProps,
): ComboboxController {
  if (root && !root.classList.contains('fui-combobox')) {
    throw new Error('[Faisceau UI] Combobox enhance mode need a root with the `fui-combobox` class')
  }

  const enhanceMode = !!root
  const restores: (() => void)[] = []
  options ??= {}

  let multiple: boolean = options.multiple ?? false
  let placeholder: string | undefined = options.placeholder

  let nativeSelect: HTMLSelectElement
  let items: FuiItem[]
  let initialValue: string[]

  const requestedCollection = options.items === undefined ? undefined : toCollection(options.items)

  if (root) {
    const found = root.querySelector<HTMLSelectElement>('select.fui-combobox-native-select')
    if (!found)
      throw new Error('[Faisceau UI] missing Combobox `select.fui-combobox-native-select`')
    nativeSelect = found
    restores.push(
      captureAttributes(root),
      captureAttributes(nativeSelect),
      captureChildNodes(nativeSelect),
      ...Array.from(nativeSelect.querySelectorAll('optgroup, option')).flatMap((element) => [
        captureAttributes(element),
        captureChildNodes(element),
      ]),
    )
    if (typeof options.multiple === 'undefined') multiple = nativeSelect.multiple

    initialValue = [...(options.value ?? options.defaultValue ?? readValue(nativeSelect))]
    if (requestedCollection) {
      items = collectionItems(requestedCollection)
      const known = new Set(items.map(getItemId))
      initialValue = initialValue.filter((value) => known.has(value))
      nativeSelect.replaceChildren(
        ...buildNativeOptions(items, options.placeholder, multiple, initialValue),
      )
    } else {
      const inputs = readNativeItems(nativeSelect)
      items = normalizeItems(inputs)
      if (items.length !== inputs.length)
        reconcileNativeSelectOptions(
          nativeSelect,
          items,
          placeholder ?? readPlaceholder(nativeSelect) ?? '',
        )
    }
    // Like Checkbox, unspecified form props are read from the adopted element.
    options = {
      ...options,
      name: options.name ?? (nativeSelect.name || undefined),
      disabled: options.disabled ?? nativeSelect.disabled,
      required: options.required ?? nativeSelect.required,
      form: options.form ?? nativeSelect.getAttribute('form') ?? undefined,
    }
    placeholder ??= readPlaceholder(nativeSelect)
    // The adopted select becomes the submitted control; Zag must not see it.
    nativeSelect.setAttribute('aria-hidden', 'true')
    nativeSelect.tabIndex = -1
    hideNativeSelect(nativeSelect)
    if (options.name !== undefined) nativeSelect.name = options.name
    if (options.form !== undefined) nativeSelect.setAttribute('form', options.form)
    if (options.multiple !== undefined) nativeSelect.multiple = multiple
    if (options.disabled !== undefined) nativeSelect.disabled = options.disabled
    if (options.required !== undefined) nativeSelect.required = options.required
  } else {
    if (requestedCollection === undefined)
      throw new Error('[Faisceau UI] Combobox creation requires options.items.')
    items = collectionItems(requestedCollection)
    initialValue = [...(options.value ?? options.defaultValue ?? [])]
    root = h('div', { class: 'fui-combobox' }) as HTMLDivElement
    nativeSelect = buildNativeSelect(items, { ...options, multiple, value: initialValue })
    root.append(nativeSelect)
  }

  root.toggleAttribute('data-fui-multiple', multiple)

  const label = ensureText(
    root,
    { tag: 'label', class: 'fui-field-label' },
    (parent, node) => parent.prepend(node),
    options.label,
    enhanceMode,
    restores,
  )
  ensureText(
    root,
    { tag: 'p', class: 'fui-field-description' },
    (parent, node) => parent.append(node),
    options.description,
    enhanceMode,
    restores,
  )

  // Every other part is always generated fresh, in both modes.
  const { control, selection, input, clearTrigger, trigger } = buildControl({
    clearLabel: options.clearLabel,
    placeholder,
  })
  insertAfter(root, control, nativeSelect)
  restores.push(() => control.remove())
  const { positioner, content, list, empty } = buildPopup(options.emptyLabel)
  insertAfter(root, positioner, control)
  restores.push(() => positioner.remove())

  const {
    items: _items,
    selectSameValue = true,
    label: _label,
    description: _description,
    placeholder: _placeholder,
    clearLabel: _clearLabel,
    emptyLabel: _emptyLabel,
    filter = defaultFilter,
    getRemoveLabel = defaultRemoveLabel,
    id: requestedId,
    value,
    defaultValue: _defaultValue,
    onInputValueChange,
    ...behavior
  } = options

  const collection = signal(requestedCollection ?? toCollection(items))
  const valueSelection = createValueSelection({
    getCollection: () => collection.get(),
    enabled: selectSameValue,
    multiple,
    value,
    defaultValue: initialValue,
    onValueChange: behavior.onValueChange,
  })
  writeValue(nativeSelect, valueSelection.initialValue, 'none')

  const inputState = signal({
    filter: behavior.inputValue ?? behavior.defaultInputValue ?? '',
    userInput: behavior.inputValue !== undefined || behavior.defaultInputValue !== undefined,
  })
  const filteredCollection: Reactive<FuiCollection> = computed(() => {
    const source = collection.get()
    const query = inputState.get().filter
    return query.length === 0
      ? source
      : source.setItems(source.items.filter((item) => filter(presentItem(source, item), query)))
  })
  const id = requestedId ?? createId('combobox')
  const fieldsetDisabled = signal(false)
  let started = false
  let destroyed = false
  const zag = createZagMachine(
    combobox.machine as combobox.Machine<FuiItem>,
    (): combobox.Props<FuiItem> => ({
      ...behavior,
      disabled: (behavior.disabled ?? false) || fieldsetDisabled.get(),
      multiple,
      collection: filteredCollection.get(),
      getRootNode: () => getLookupRoot(root),
      id,
      inputBehavior: behavior.inputBehavior ?? 'autohighlight',
      // The native select owns submission; the filter input must stay nameless.
      name: undefined,
      onInputValueChange(details) {
        const selectionText =
          details.reason !== 'input-change' &&
          valueSelection.isGroupedSelectionText(details.inputValue)
        inputState.set({
          filter: selectionText ? '' : details.inputValue,
          userInput: details.reason === 'input-change',
        })
        onInputValueChange?.(details)
      },
      openOnClick: behavior.openOnClick ?? true,
      positioning: {
        gutter: 6,
        placement: 'bottom-start',
        sameWidth: true,
        ...behavior.positioning,
      },
      ...(value !== undefined ? { value } : { defaultValue: initialValue }),
      ...valueSelection.props(),
    }),
    (service, normalize) => {
      const api = valueSelection.connect(combobox.connect(service, normalize))
      const inputValue = inputState.get().userInput
        ? api.inputValue
        : valueSelection.inputText(api.inputValue, api.value)
      return {
        ...api,
        inputValue,
        getInputProps: () => ({ ...api.getInputProps(), value: inputValue }),
      }
    },
  )

  zag.bind(root, (api) => api.getRootProps())
  if (label) zag.bind(label, (api) => api.getLabelProps())
  zag.bind(control, (api) => api.getControlProps())
  zag.bind(input, (api) => api.getInputProps())
  zag.bind(trigger, (api) => api.getTriggerProps())
  zag.bind(clearTrigger, (api) => api.getClearTriggerProps())
  zag.bind(positioner, (api) => api.getPositionerProps())
  zag.bind(content, (api) => api.getContentProps())
  zag.bind(list, (api) => api.getListProps())

  const stopRows = renderCollection({
    list,
    prefix: 'fui-combobox',
    getCollection: () => filteredCollection.get(),
    createItem: buildItem,
    bind: (element, getter) => zag.bind(element, getter),
  })
  const stopEmpty = effect(() => {
    empty.hidden = filteredCollection.get().size > 0
  })

  // Select's machine emits native change events itself. Combobox supplies the
  // same notification; the shared native bridge handles input and external events.
  const writeNativeValue = (value: readonly string[]) => writeValue(nativeSelect, value, 'none')
  const notifyNativeChange = (): void => {
    queueMicrotask(() => {
      if (destroyed) return
      nativeSelect.dispatchEvent(
        markAsInternalChangeEvent(new Event('change', { bubbles: true, composed: true })),
      )
    })
  }
  const syncNativeValue = (next: readonly string[]): void => {
    writeNativeValue(next)
    notifyNativeChange()
  }
  const nativeState = {
    native: nativeSelect,
    getCollection: () => collection.get(),
    getValue: () => zag.api.peek().value,
    setValue: (value: string[]) => zag.api.peek().setValue(value),
    writeValue: (value: string[]) => writeNativeValue(valueSelection.normalize(value)),
  }
  const stopNativeEvents = bindNativeEvents({
    ...nativeState,
    focus: () => input.focus({ preventScroll: true }),
    normalize: valueSelection.fromNative,
  })
  const stopSync = effect(() => {
    const api = zag.api.get()
    if (!sameValues(valueSelection.normalize(readValue(nativeSelect)), api.value))
      syncNativeValue(api.value)
  })
  const stopClearVisibility = effect(() => {
    const api = zag.api.get()
    clearTrigger.hidden = api.inputValue.length === 0 && !api.hasSelectedItems
  })
  const stopSelectedTags = effect(() => {
    const api = zag.api.get()
    const source = collection.get()
    const selectedItems = source.findMany(api.value).map((item) => presentItem(source, item))
    renderSelectedTags(
      selection,
      multiple ? uniqueSelectionLabels(selectedItems) : [],
      api.disabled || behavior.readOnly === true,
      getRemoveLabel,
      (entry) => {
        const current = zag.api.peek()
        if (selectSameValue) current.clearValue(entry)
        else {
          const item = selectedItems.find((item) => getItemId(item) === entry)!
          const source = collection.peek()
          current.setValue(
            current.value.filter((key) => {
              const raw = source.find(key)
              if (!raw) return true
              const candidate = presentItem(source, raw)
              return candidate.value !== item.value || candidate.label !== item.label
            }),
          )
        }
        current.focus()
      },
    )
  })

  const stopCollection = syncNativeCollection({
    ...nativeState,
    placeholder: placeholder ?? '',
    onValueRemoved: notifyNativeChange,
  })
  let stopReset = () => {}
  let stopFieldset = () => {}

  const controller: ComboboxController = {
    api: zag.api,
    root,
    get started() {
      return started && !destroyed
    },
    setItems(next) {
      if (destroyed) return throwDestroyed()
      const source = toCollection(next)
      batch(() => {
        valueSelection.capture()
        collection.set(source)
      })
    },
    mount(target: ParentNode) {
      if (destroyed) return throwDestroyed()
      target.append(root)
      return this.start()
    },
    start() {
      if (destroyed) return throwDestroyed()
      if (!started) {
        zag.start()
        // Mirrors the select machine entry: the native selection is rewritten from
        // the machine value, and the label takes ownership of the native control.
        writeNativeValue(zag.api.get().value)
        if (label?.id) nativeSelect.setAttribute('aria-labelledby', label.id)
        stopReset = trackCollectionReset({ ...nativeState, initialValue })
        stopFieldset =
          trackFieldsetDisabled(nativeSelect, (disabled) => fieldsetDisabled.set(disabled)) ??
          (() => {})
        started = true
      }
      return this
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      const value = zag.api.get().value
      stopCollection()
      stopRows()
      stopEmpty()
      stopSync()
      stopClearVisibility()
      stopSelectedTags()
      stopNativeEvents()
      stopReset()
      stopFieldset()
      zag.destroy()

      if (enhanceMode) {
        restores.forEach((restore) => restore())
        writeNativeValue(value)
        return
      }

      root?.remove()
    },
  }

  if (enhanceMode) controller.start()

  return controller
}

/** Reads the placeholder text from the explicitly-marked option, if any. */
function readPlaceholder(native: HTMLSelectElement): string | undefined {
  return (
    native.querySelector<HTMLOptionElement>('option[data-placeholder]')?.label.trim() || undefined
  )
}

function defaultFilter(item: Readonly<FuiItem>, inputValue: string): boolean {
  return item.label.toLocaleLowerCase().includes(inputValue.trim().toLocaleLowerCase())
}

function defaultRemoveLabel(item: Readonly<FuiItem>): string {
  return `Remove ${item.label}`
}

function renderSelectedTags(
  selection: HTMLElement,
  items: readonly FuiItem[],
  disabled: boolean,
  getRemoveLabel: (item: Readonly<FuiItem>) => string,
  remove: (value: string) => void,
): void {
  const tags = items.map((item) => {
    const label = h('span', { class: 'fui-combobox-tag-label', children: item.label })
    const removeTrigger = h('button', {
      ariaLabel: getRemoveLabel(item),
      class: 'fui-combobox-tag-remove',
      data: { value: getItemId(item) },
      disabled,
      type: 'button',
      children: h('span', { class: 'fui-icon fui-icon--x', ariaHidden: 'true' }),
    })
    removeTrigger.addEventListener('click', () => remove(getItemId(item)))

    return h('span', {
      class: 'fui-combobox-tag',
      data: { value: getItemId(item) },
      children: [label, removeTrigger],
    })
  })

  selection.replaceChildren(...tags)
  selection.hidden = tags.length === 0
}

function throwDestroyed(): never {
  throw new Error('[Faisceau UI] Cannot start or mount a destroyed Combobox.')
}
