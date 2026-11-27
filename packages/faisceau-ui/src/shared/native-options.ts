import { createElement as h } from '@lilian1315/create-element'
import { getItemId, type FuiItem } from './items.ts'
import { groupOptions } from './item-groups.ts'

/** Reconciles native options by identity while preserving submitted values and retained nodes. */
export function reconcileNativeSelectOptions(
  select: HTMLSelectElement,
  items: readonly FuiItem[],
  placeholder: string,
): void {
  const selected = new Set(getNativeSelectValue(select))
  const placeholderOption = findPlaceholderOption(select)
  const existing = new Map<string, HTMLOptionElement>()
  for (const option of select.options) {
    if (option !== placeholderOption && !existing.has(getOptionId(option)))
      existing.set(getOptionId(option), option)
  }
  const empty = select.multiple ? null : (placeholderOption ?? new Option(placeholder, ''))
  const options = items.map((item) => {
    const key = getItemId(item)
    const option = existing.get(key) ?? new Option()
    option.value = item.value
    if (item.id !== undefined) option.dataset.id = item.id
    else delete option.dataset.id
    option.textContent = item.label
    option.disabled = item.disabled ?? false
    option.selected = selected.has(key)
    if (item.description) option.dataset.description = item.description
    else delete option.dataset.description
    return option
  })
  if (empty) {
    empty.textContent = placeholder
    empty.dataset.placeholder = ''
    empty.hidden = true
    empty.selected = selected.size === 0
  }
  const grouped = groupOptions(items, options)
  select.replaceChildren(...(empty ? [empty, ...grouped] : grouped))
}

/** Returns selected values, excluding only the explicitly-marked placeholder option. */
function getNativeSelectValue(select: HTMLSelectElement): string[] {
  const placeholder = findPlaceholderOption(select)
  return Array.from(select.selectedOptions)
    .filter((option) => option !== placeholder)
    .map(getOptionId)
}

/** Option identity is application data, independently of the submitted value or DOM id. */
export function getOptionId(option: HTMLOptionElement): string {
  return option.dataset.id ?? option.value
}

function findPlaceholderOption(select: HTMLSelectElement): HTMLOptionElement | undefined {
  return Array.from(select.options).find((option) => option.hasAttribute('data-placeholder'))
}

/** Builds native options, marking the placeholder and the selected values. */
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
    const option = h('option', {
      disabled: item.disabled,
      value: item.value,
      data: { id: item.id },
      children: item.label,
    })
    if (item.description) option.dataset.description = item.description
    option.selected = selected.has(getItemId(item))
    // `defaultSelected` drives `form.reset()`; keep it aligned with the initial value.
    option.defaultSelected = option.selected
    options.push(option)
  }
  const offset = multiple ? 0 : 1
  return [...options.slice(0, offset), ...groupOptions(items, options.slice(offset))]
}

/** Reads caller-owned options using the same identity and metadata contract in both controls. */
export function readNativeItems(native: HTMLSelectElement): FuiItem[] {
  return Array.from(native.options)
    .filter((option) => !option.hasAttribute('data-placeholder'))
    .map((option) => {
      const parent = option.parentElement
      const group = parent instanceof HTMLOptGroupElement ? parent : undefined
      return {
        id: option.dataset.id,
        value: option.value,
        label: option.label || option.text,
        group: group?.label,
        disabled: option.disabled || group?.disabled || undefined,
        description: option.dataset.description?.trim() || undefined,
      }
    })
}
