import '../styles/base.scss'
import '../styles/select.scss'
import * as select from '@zag-js/select'
import { effect, signal } from 'faisceau'
import { createZagMachine } from 'faisceau-zag'
import { captureAttributes, captureChildNodes, getLookupRoot, insertAfter } from '../shared/dom.ts'
import { createId } from '../shared/id.ts'
import type { FuiItem } from '../shared/items.ts'
import { requireFuiClass } from '../shared/parts.ts'
import {
  buildItem,
  buildNativeOptions,
  createMarkup,
  readNativeItems,
  readNativeValue,
  reconcileNativeOptions,
} from './markup.ts'
import { collectionItems, toCollection, type FuiCollection } from './collection.ts'
import { renderCollection } from '../shared/collection-renderer.ts'
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
  const initialValue = readNativeValue(native)
  if (props.items !== undefined || nativeItems.length !== items.length)
    reconcileNativeOptions(native, items, props.placeholder ?? placeholderOption?.label ?? '')
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
    ...behavior
  } = props
  const collection = signal(initialCollection)
  // Pure Zag: behavior props pass straight to the machine. The machine itself owns
  // the hidden <select> (option sync, internal change event, form reset, fieldset
  // disabled, autofill) through getHiddenSelectProps() and its trackFormControlState effect.
  const zag = createZagMachine(
    select.machine as select.Machine<FuiItem>,
    () => ({
      ...behavior,
      id,
      collection: collection.get(),
      getRootNode: () => getLookupRoot(root),
    }),
    (service, normalize) => select.connect(service, normalize),
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
  zag.bind(native, (api) => api.getHiddenSelectProps())
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
  const stopSync = effect(() => {
    const api = zag.api.get()
    valueText.textContent = api.hasSelectedItems ? api.valueAsString : placeholder
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
  return {
    root,
    api: zag.api,
    get started() {
      return started && !destroyed
    },
    setItems(next) {
      assertAlive()
      const source = toCollection(next)
      const items = collectionItems(source)
      validateValues(items)
      const value = zag.api.peek().value
      const kept = value.filter((key) => source.has(key))
      reconcileNativeOptions(native, items, placeholder)
      collection.set(source)
      // Zag's collection watch does not prune removed values; do it once started.
      if (started && kept.length !== value.length) zag.api.peek().setValue(kept)
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
        started = true
      }
      return this
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      stopSync()
      stopRows()
      zag.destroy()
      if (restore) restore()
      else root.remove()
    },
  }
  function assertAlive() {
    if (destroyed) throw new Error('[Faisceau UI] Cannot start or mount a destroyed Select.')
  }
}

function validateValues(items: FuiItem[]): void {
  if (items.some((item) => item.value === ''))
    throw new Error('[Faisceau UI] Select reserves the empty value for its placeholder.')
}
