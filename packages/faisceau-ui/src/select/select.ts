import '../styles/base.scss'
import '../styles/select.scss'
import * as select from '@zag-js/select'
import { effect, signal } from 'faisceau'
import { createZagMachine } from 'faisceau-zag'
import { captureAttributes, captureChildNodes, getLookupRoot, insertAfter } from '../shared/dom.ts'
import { createId } from '../shared/id.ts'
import { normalizeItems } from '../shared/items.ts'
import type { FuiItem } from '../shared/items.ts'
import { requireFuiClass } from '../shared/parts.ts'
import { createAlignedPositioning } from './alignment.ts'
import { createMarkup } from './markup.ts'
import { bindNativeEvents, readValue, writeValue } from './native.ts'
import type { EnhanceSelectProps, SelectController, SelectProps } from './types.ts'

export function createSelect(props: SelectProps): SelectController {
  const {
    items: inputs,
    label: _label,
    description: _description,
    clearable: _clearable,
    ...behavior
  } = props
  const items = normalizeItems(inputs)
  validateValues(items)
  return setup(createMarkup(items, props), items, behavior)
}

export function enhanceSelect(root: HTMLElement, props: EnhanceSelectProps = {}): SelectController {
  if (!root.classList.contains('fui-select'))
    throw new Error('[Faisceau UI] Select requires .fui-select.')
  const native = requireFuiClass<HTMLSelectElement>(root, 'fui-select-native-select')
  if (!(native instanceof HTMLSelectElement))
    throw new Error('[Faisceau UI] Select requires a native <select>.')
  const placeholderOption = native.querySelector<HTMLOptionElement>('option[data-placeholder]')
  const items = normalizeItems(
    Array.from(native.options)
      .filter((option) => option !== placeholderOption)
      .map((option) => ({
        value: option.value,
        label: option.label,
        disabled:
          option.disabled ||
          (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled),
      })),
  )
  validateValues(items)
  const restore = [root, ...root.querySelectorAll('*')].map(captureAttributes)
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
    items,
    {
      name: native.name || undefined,
      form: native.getAttribute('form') ?? undefined,
      autoComplete: native.getAttribute('autocomplete') ?? undefined,
      multiple: native.multiple,
      required: native.required,
      disabled: native.disabled,
      defaultValue: readValue(native),
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
  items: FuiItem[],
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
  const rows = Array.from(list.querySelectorAll<HTMLElement>('.fui-select-item'))
  if (rows.length !== items.length)
    throw new Error(
      '[Faisceau UI] Select needs one .fui-select-item per native option, in the same order (excluding the empty placeholder).',
    )
  const itemParts = rows.map((row) => ({
    row,
    text: requireFuiClass(row, 'fui-select-item-text'),
    indicator: requireFuiClass(row, 'fui-select-item-indicator'),
  }))
  const {
    id = createId('select'),
    placeholder = 'Select an option',
    label: _label,
    description: _description,
    clearable: _clearable,
    ...behavior
  } = props
  const hasValue = signal(readValue(native).length > 0)
  const alignmentActive = signal(false)
  const alignItemWithTrigger = behavior.alignItemWithTrigger
  const alignedPositioning = createAlignedPositioning(
    { trigger, valueText, content, list },
    behavior.positioning,
    (aligned) => alignmentActive.set(aligned),
  )
  const shouldAlign = () => !!alignItemWithTrigger && !behavior.multiple && hasValue.get()
  const zag = createZagMachine(
    select.machine as select.Machine<FuiItem>,
    () => ({
      ...behavior,
      alignItemWithTrigger: false,
      positioning: shouldAlign() ? alignedPositioning : behavior.positioning,
      id,
      collection: select.collection({
        items,
        itemToValue: (item) => item.value,
        itemToString: (item) => item.label,
        isItemDisabled: (item) => !!item.disabled,
      }),
      getRootNode: () => getLookupRoot(root),
    }),
    select.connect,
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
  zag.bind(content, (api) => ({
    ...api.getContentProps(),
    'data-align-with-trigger': alignmentActive.get() ? '' : undefined,
  }))
  zag.bind(list, (api) => api.getListProps())
  if (description) description.id = `${id}:description`
  if (clear)
    zag.bind(clear, (api) => ({
      ...api.getClearTriggerProps(),
      disabled: api.disabled || props.readOnly,
    }))
  itemParts.forEach(({ row, text, indicator }, index) => {
    const item = items[index]!
    zag.bind(row, (api) => api.getItemProps({ item }))
    zag.bind(text, (api) => api.getItemTextProps({ item }))
    zag.bind(indicator, (api) => api.getItemIndicatorProps({ item }))
  })
  const stopNativeEvents = bindNativeEvents(
    native,
    () => zag.api.get().value,
    (value) => zag.api.get().setValue(value),
    () => trigger.focus(),
  )
  zag.bind(native, (api) => {
    // Vanilla maps defaultValue to select.value, which cannot represent multiple
    // values. Let Zag's native sync and the effect below own option selection.
    // The native bridge handles both events; Vanilla aliases change to input.
    const { value: _value, oninput: _onInput, ...attrs } = api.getHiddenSelectProps()
    return attrs
  })
  const stopSync = effect(() => {
    const api = zag.api.get()
    if (!api.open || !api.hasSelectedItems) alignmentActive.set(false)
    hasValue.set(api.hasSelectedItems)
    valueText.textContent = api.hasSelectedItems ? api.valueAsString : placeholder
    writeValue(native, api.value)
  })
  let started = false
  let destroyed = false
  return {
    root,
    api: zag.api,
    get started() {
      return started && !destroyed
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
      const value = zag.api.get().value
      stopSync()
      stopNativeEvents()
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
  if (items.some((item) => item.value === ''))
    throw new Error('[Faisceau UI] Select reserves the empty value for its placeholder.')
}
