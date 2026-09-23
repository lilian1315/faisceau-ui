import { h } from '@lilian1315/create-element'
import type { FuiItem } from '../shared/items.ts'
import type { SelectProps } from './types.ts'

export function createMarkup(items: FuiItem[], props: SelectProps): HTMLDivElement {
  const selected = props.value ?? props.defaultValue ?? []
  const native = h('select', { class: 'fui-select-native-select', multiple: props.multiple })
  if (!props.multiple)
    native.append(
      h(
        'option',
        { value: '', hidden: true, 'data-placeholder': '' },
        props.placeholder ?? 'Select an option',
      ),
    )
  for (const item of items) {
    native.append(h('option', { value: item.value, disabled: item.disabled }, item.label))
  }
  for (const option of native.options) {
    option.defaultSelected = selected.includes(option.value)
    option.selected = option.defaultSelected
  }
  const control = h(
    'div',
    { class: 'fui-select-control' },
    h(
      'button',
      { class: 'fui-select-trigger', type: 'button' },
      h('span', { class: 'fui-select-value-text' }),
      h(
        'span',
        { class: 'fui-select-indicator' },
        h('span', { class: 'fui-icon fui-icon--chevron-down', 'aria-hidden': true }),
      ),
    ),
  )
  if (props.clearable)
    control.append(
      h(
        'button',
        { class: 'fui-select-clear-trigger', type: 'button' },
        h('span', { class: 'fui-icon fui-icon--x', 'aria-hidden': true }),
      ),
    )
  const root = h(
    'div',
    { class: 'fui-select' },
    h('label', { class: 'fui-label' }, props.label),
    native,
    control,
    h(
      'div',
      { class: 'fui-select-positioner' },
      h(
        'div',
        { class: 'fui-select-content', hidden: true },
        h(
          'ul',
          { class: 'fui-select-list' },
          items.map((item) =>
            h(
              'li',
              { class: 'fui-select-item' },
              h('span', { class: 'fui-select-item-text' }, item.label),
              h(
                'span',
                { class: 'fui-select-item-indicator' },
                h('span', { class: 'fui-icon fui-icon--check', 'aria-hidden': true }),
              ),
              item.description
                ? h('span', { class: 'fui-select-item-description' }, item.description)
                : null,
            ),
          ),
        ),
      ),
    ),
  )
  if (props.description) root.append(h('p', { class: 'fui-select-description' }, props.description))
  return root
}
