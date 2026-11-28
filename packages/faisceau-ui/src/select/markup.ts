import { createElement as h } from '@lilian1315/create-element'
import type { FuiItem } from '../shared/items.ts'
import { groupOptions } from '../shared/item-groups.ts'
import type { SelectProps } from './types.ts'

export function createMarkup(items: FuiItem[], props: SelectProps): HTMLDivElement {
  const selected = props.value ?? props.defaultValue ?? []
  const native = h('select', { class: 'fui-select-native-select', multiple: props.multiple })
  native.append(...buildNativeOptions(items, props.placeholder, props.multiple, selected))
  const control = h('div', {
    class: 'fui-select-control',
    children: [
      h('button', {
        class: 'fui-select-trigger',
        type: 'button',
        children: [
          h('span', { class: 'fui-select-value-text' }),
          h('span', {
            class: 'fui-select-indicator',
            children: h('span', { class: 'fui-icon fui-icon--chevron-down', ariaHidden: 'true' }),
          }),
        ],
      }),
    ],
  })
  if (props.clearable)
    control.append(
      h('button', {
        class: 'fui-select-clear-trigger',
        type: 'button',
        children: h('span', { class: 'fui-icon fui-icon--x', ariaHidden: 'true' }),
      }),
    )
  const root = h('div', {
    class: 'fui-select',
    children: [
      h('label', { class: 'fui-label', children: props.label }),
      native,
      control,
      h('div', {
        class: 'fui-select-positioner',
        children: h('div', {
          class: 'fui-select-content',
          hidden: true,
          children: h('ul', {
            class: 'fui-select-list',
          }),
        }),
      }),
    ],
  })
  if (props.description)
    root.append(h('p', { class: 'fui-select-description', children: props.description }))
  return root
}

export function buildItem(item: FuiItem): HTMLLIElement {
  return h('li', {
    class: 'fui-select-item',
    children: [
      h('span', { class: 'fui-select-item-text', children: item.label }),
      h('span', {
        class: 'fui-select-item-indicator',
        children: h('span', {
          class: 'fui-icon fui-icon--check',
          ariaHidden: 'true',
        }),
      }),
      item.description
        ? h('span', {
            class: 'fui-select-item-description',
            children: item.description,
          })
        : null,
    ],
  })
}

/**
 * Native options carry only the submitted value: Zag's hidden-select sync and the
 * machine collection both key selection by `option.value`.
 */
export function buildNativeOptions(
  items: readonly FuiItem[],
  placeholder: string | undefined,
  multiple: boolean | undefined,
  value: readonly string[],
): HTMLElement[] {
  const selected = new Set(value)
  const options: HTMLOptionElement[] = []

  if (!multiple) {
    const placeholderOption = h('option', {
      data: { placeholder: '' },
      value: '',
      children: placeholder ?? 'Select an option',
    })
    placeholderOption.hidden = true
    placeholderOption.selected = selected.size === 0
    // `defaultSelected` drives `form.reset()`; keep it aligned with the initial value.
    placeholderOption.defaultSelected = placeholderOption.selected
    options.push(placeholderOption)
  }

  for (const item of items) {
    const isSelected = selected.has(item.value)
    const option = h('option', {
      disabled: item.disabled,
      value: item.value,
      children: item.label,
    })
    option.selected = isSelected
    // `defaultSelected` drives `form.reset()`; keep it aligned with the initial value.
    option.defaultSelected = isSelected
    options.push(option)
  }
  const offset = multiple ? 0 : 1
  return [...options.slice(0, offset), ...groupOptions(items, options.slice(offset))]
}

/** Reads caller-owned options by submitted value; the marked placeholder option is skipped. */
export function readNativeItems(native: HTMLSelectElement): FuiItem[] {
  return Array.from(native.options)
    .filter((option) => !option.hasAttribute('data-placeholder'))
    .map((option) => {
      const parent = option.parentElement
      const group = parent instanceof HTMLOptGroupElement ? parent : undefined
      return {
        value: option.value,
        label: option.label || option.text,
        group: group?.label,
        disabled: option.disabled || group?.disabled || undefined,
      }
    })
}

/** Returns the selected submitted values, excluding the marked placeholder option. */
export function readNativeValue(native: HTMLSelectElement): string[] {
  return Array.from(native.selectedOptions)
    .filter((option) => !option.hasAttribute('data-placeholder'))
    .map((option) => option.value)
}

function findPlaceholderOption(select: HTMLSelectElement): HTMLOptionElement | undefined {
  return Array.from(select.options).find((option) => option.hasAttribute('data-placeholder'))
}

/** Rebuilds native options from the authoritative items, preserving the current selection. */
export function reconcileNativeOptions(
  select: HTMLSelectElement,
  items: readonly FuiItem[],
  placeholder: string,
): void {
  const selected = new Set(readNativeValue(select))
  const placeholderOption = findPlaceholderOption(select)
  const empty = select.multiple ? null : (placeholderOption ?? new Option(placeholder, ''))
  const options = items.map((item) => {
    const isSelected = selected.has(item.value)
    const option = new Option(item.label, item.value, isSelected, isSelected)
    option.disabled = item.disabled ?? false
    return option
  })
  if (empty) {
    empty.textContent = placeholder
    empty.dataset.placeholder = ''
    empty.hidden = true
    empty.selected = selected.size === 0
    empty.defaultSelected = empty.selected
  }
  const grouped = groupOptions(items, options)
  select.replaceChildren(...(empty ? [empty, ...grouped] : grouped))
}
