import { createElement as h } from '@lilian1315/create-element'
import type { FuiItem } from './items.ts'

/** Wraps adjacent grouped items without changing collection order or row identity. */
export function groupElements(
  items: readonly FuiItem[],
  elements: readonly HTMLElement[],
  createGroup: (label: string) => { root: HTMLElement; container: HTMLElement },
): HTMLElement[] {
  const result: HTMLElement[] = []
  let previous: string | undefined
  let container: HTMLElement | undefined
  items.forEach((item, index) => {
    if (item.group === undefined) {
      container = undefined
      result.push(elements[index]!)
    } else {
      if (!container || previous !== item.group) {
        const group = createGroup(item.group)
        result.push(group.root)
        container = group.container
      }
      container.append(elements[index]!)
    }
    previous = item.group
  })
  return result
}

export function groupRows(items: readonly FuiItem[], rows: readonly HTMLElement[], prefix: string) {
  return groupElements(items, rows, (label) => {
    const container = h('ul', { class: `${prefix}-item-group-list`, role: 'presentation' })
    const root = h('li', {
      class: `${prefix}-item-group`,
      children: [h('div', { class: `${prefix}-item-group-label`, children: label }), container],
    })
    return { root, container }
  })
}

export function groupOptions(items: readonly FuiItem[], options: readonly HTMLOptionElement[]) {
  return groupElements(items, options, (label) => {
    const root = h('optgroup', { label })
    return { root, container: root }
  })
}
