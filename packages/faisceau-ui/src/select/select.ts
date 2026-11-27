import '../styles/base.scss'
import '../styles/select.scss'
import * as select from '@zag-js/select'
import { batch, effect, signal } from 'faisceau'
import { createZagMachine } from 'faisceau-zag'
import { captureAttributes, captureChildNodes, getLookupRoot, insertAfter } from '../shared/dom.ts'
import { createId } from '../shared/id.ts'
import { getItemId, type FuiItem } from '../shared/items.ts'
import { requireFuiClass } from '../shared/parts.ts'
import { buildItem, createMarkup } from './markup.ts'
import { collectionItems, toCollection, type FuiCollection } from '../shared/collection.ts'
import { createValueSelection } from '../shared/value-selection.ts'
import { renderCollection } from '../shared/collection-renderer.ts'
import { readNativeItems, reconcileNativeSelectOptions } from '../shared/native-options.ts'
import {
  bindNativeEvents,
  readValue,
  writeValue,
  syncNativeCollection,
  trackCollectionReset,
} from '../shared/native-select.ts'
import type { EnhanceSelectProps, SelectController, SelectProps } from './types.ts'

export function createSelect(props: SelectProps): SelectController {
  const {
    items: inputs,
    label: _label,
    description: _description,
    clearable: _clearable,
    ...behavior
  } = props
  if (inputs === undefined) throw new Error('[Faisceau UI] Select creation requires options.items.')
  const source = toCollection(inputs)
  const items = collectionItems(source)
  validateValues(items)
  return setup(createMarkup(items, props), source, behavior)
}

export function enhanceSelect(root: HTMLElement, props: EnhanceSelectProps = {}): SelectController {
  if (!root.classList.contains('fui-select'))
    throw new Error('[Faisceau UI] Select requires .fui-select.')
  const native = requireFuiClass<HTMLSelectElement>(root, 'fui-select-native-select')
  if (!(native instanceof HTMLSelectElement))
    throw new Error('[Faisceau UI] Select requires a native <select>.')
  const placeholderOption = native.querySelector<HTMLOptionElement>('option[data-placeholder]')
  const nativeItems = readNativeItems(native)
  const source = toCollection(props.items ?? nativeItems)
  const items = collectionItems(source)
  validateValues(items)
  const restore = [root, ...root.querySelectorAll('*')].map(captureAttributes)
  restore.push(
    captureChildNodes(native),
    ...Array.from(native.querySelectorAll('optgroup, option'), captureChildNodes),
  )
  const initialValue = readValue(native)
  if (props.items !== undefined || nativeItems.length !== items.length)
    reconcileNativeSelectOptions(native, items, props.placeholder ?? placeholderOption?.label ?? '')
  const parent = root.parentNode
  const next = root.nextSibling
  const markup = createMarkup(items, { ...props, items, label: props.label ?? '' })
  const generated: Element[] = []
  for (const child of Array.from(markup.children)) {
    if (child.classList.contains('fui-select-native-select')) continue
    const isLabel = child.classList.contains('fui-label')
    const isDescription = child.classList.contains('fui-select-description')
    const existing = isLabel || isDescription ? root.querySelector(`.${child.className}`) : null
    if (existing) {
      const text = isLabel ? props.label : props.description
      if (text !== undefined) {
        restore.push(captureChildNodes(existing))
        existing.textContent = text
      }
    } else {
      if (isLabel) root.prepend(child)
      else if (child.classList.contains('fui-select-control'))
        insertAfter(native.parentNode!, child, native)
      else if (child.classList.contains('fui-select-positioner')) {
        const control = root.querySelector('.fui-select-control')!
        insertAfter(control.parentNode!, child, control)
      } else root.append(child)
      generated.push(child)
    }
  }
  return setup(
    root,
    source,
    {
      name: native.name || undefined,
      form: native.getAttribute('form') ?? undefined,
      autoComplete: native.getAttribute('autocomplete') ?? undefined,
      multiple: native.multiple,
      required: native.required,
      disabled: native.disabled,
      defaultValue: initialValue,
      placeholder: placeholderOption?.label,
      ...props,
    },
    () => {
      generated.forEach((node) => node.remove())
      restore.forEach((fn) => fn())
      if (parent && root.parentNode !== parent)
        parent.insertBefore(root, next?.parentNode === parent ? next : null)
    },
  ).start()
}

function setup(
  root: HTMLElement,
  initialCollection: FuiCollection,
  props: EnhanceSelectProps,
  restore?: () => void,
): SelectController {
  if (!root.classList.contains('fui-select'))
    throw new Error('[Faisceau UI] Select requires .fui-select.')
  const part = <T extends HTMLElement = HTMLElement>(name: string) =>
    requireFuiClass<T>(root, `fui-select-${name}`)
  // Both ownership paths use the same generated control and popup.
  const native = part<HTMLSelectElement>('native-select')
  const label = requireFuiClass(root, 'fui-label')
  const control = part('control')
  const trigger = part<HTMLButtonElement>('trigger')
  const valueText = part('value-text')
  const indicator = part('indicator')
  const positioner = part('positioner')
  const content = part('content')
  const list = part('list')
  const description = root.querySelector<HTMLElement>('.fui-select-description')
  const clear = root.querySelector<HTMLButtonElement>('.fui-select-clear-trigger')
  const {
    id = createId('select'),
    placeholder = 'Select an option',
    label: _label,
    description: _description,
    clearable: _clearable,
    items: _items,
    selectSameValue = true,
    ...behavior
  } = props
  const collection = signal(initialCollection)
  const selection = createValueSelection({
    getCollection: () => collection.get(),
    enabled: selectSameValue,
    multiple: behavior.multiple ?? false,
    value: behavior.value,
    defaultValue: behavior.defaultValue ?? readValue(native),
    onValueChange: behavior.onValueChange,
  })
  writeValue(native, selection.initialValue)

  const hasValue = signal(readValue(native).length > 0)
  const shouldAlign = () => !!behavior.alignItemWithTrigger && !behavior.multiple && hasValue.get()
  const zag = createZagMachine(
    select.machine as select.Machine<FuiItem>,
    () => ({
      ...behavior,
      ...selection.props(),
      alignItemWithTrigger: shouldAlign(),
      id,
      collection: collection.get(),
      getRootNode: () => getLookupRoot(root),
    }),
    (service, normalize) => selection.connect(select.connect(service, normalize)),
  )

  zag.bind(root, (api) => api.getRootProps())
  zag.bind(label, (api) => api.getLabelProps())
  zag.bind(control, (api) => api.getControlProps())
  zag.bind(trigger, (api) => ({
    ...api.getTriggerProps(),
    'aria-describedby': description ? `${id}:description` : undefined,
  }))
  zag.bind(valueText, (api) => api.getValueTextProps())
  zag.bind(indicator, (api) => api.getIndicatorProps())
  zag.bind(positioner, (api) => api.getPositionerProps())
  zag.bind(content, (api) => api.getContentProps())
  zag.bind(list, (api) => api.getListProps())
  if (description) description.id = `${id}:description`
  if (clear)
    zag.bind(clear, (api) => ({
      ...api.getClearTriggerProps(),
      disabled: api.disabled || props.readOnly,
    }))
  const stopRows = renderCollection({
    list,
    prefix: 'fui-select',
    getCollection: () => collection.get(),
    createItem: buildItem,
    bind: (element, getter) => zag.bind(element, getter),
  })
  const nativeState = {
    native,
    getCollection: () => collection.get(),
    getValue: () => zag.api.peek().value,
    setValue: (value: string[]) => zag.api.peek().setValue(value),
    writeValue: (value: string[]) => writeValue(native, selection.normalize(value)),
  }
  const stopCollection = syncNativeCollection({
    ...nativeState,
    placeholder,
  })
  const stopNativeEvents = bindNativeEvents({
    ...nativeState,
    focus: () => trigger.focus(),
    normalize: selection.fromNative,
  })
  zag.bind(native, (api) => {
    // Vanilla maps defaultValue to select.value, which cannot represent multiple
    // values. Let Zag's native sync and the effect below own option selection.
    // The native bridge handles both events; Vanilla aliases change to input.
    const {
      value: _value,
      oninput: _onInput,
      onfocus: _onFocus,
      ...attrs
    } = api.getHiddenSelectProps()
    return attrs
  })
  const stopSync = effect(() => {
    const api = zag.api.get()
    hasValue.set(api.hasSelectedItems)
    valueText.textContent = api.hasSelectedItems ? api.valueAsString : placeholder
    writeValue(native, api.value)
    if (!api.open) {
      // Popper writes --x/--y straight onto the element, so spreadProps never
      // cleans them up. Clear them on close: on reopen the positioner then stays
      // hidden off-screen (transform fallback) until placement/alignment applies,
      // instead of flashing at the previous open's coordinates for a frame.
      positioner.style.removeProperty('--x')
      positioner.style.removeProperty('--y')
    }
  })
  let started = false
  let destroyed = false
  let stopReset = () => {}
  return {
    root,
    api: zag.api,
    get started() {
      return started && !destroyed
    },
    setItems(next) {
      assertAlive()
      const source = toCollection(next)
      validateValues(collectionItems(source))
      batch(() => {
        selection.capture()
        collection.set(source)
      })
    },
    mount(target) {
      assertAlive()
      target.append(root)
      return this.start()
    },
    start() {
      assertAlive()
      if (!started) {
        zag.start()
        stopReset = trackCollectionReset(nativeState)
        started = true
      }
      return this
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      const value = zag.api.get().value
      stopSync()
      stopCollection()
      stopRows()
      stopNativeEvents()
      stopReset()
      zag.destroy()
      if (restore) {
        restore()
        writeValue(native, value)
      } else root.remove()
    },
  }
  function assertAlive() {
    if (destroyed) throw new Error('[Faisceau UI] Cannot start or mount a destroyed Select.')
  }
}

function validateValues(items: FuiItem[]): void {
  if (items.some((item) => getItemId(item) === ''))
    throw new Error('[Faisceau UI] Select reserves the empty value for its placeholder.')
}
