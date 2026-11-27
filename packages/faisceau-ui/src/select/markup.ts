import { createElement as h } from '@lilian1315/create-element'
import type { FuiItem } from '../shared/items.ts'
import { buildNativeOptions } from '../shared/native-options.ts'
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
