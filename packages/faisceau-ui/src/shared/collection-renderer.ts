import { effect, untracked } from 'faisceau'
import { getItemId, type FuiItem } from './items.ts'
import { groupRows } from './item-groups.ts'
import { createKeyedReconciler } from './keyed-reconciler.ts'
import { collectionEntries, type FuiCollection } from './collection.ts'
import type { Api } from '@zag-js/combobox'
import type { ZagDomProps } from 'faisceau-zag'

type CollectionApi = Pick<
  Api,
  | 'getItemProps'
  | 'getItemTextProps'
  | 'getItemIndicatorProps'
  | 'getItemGroupProps'
  | 'getItemGroupLabelProps'
>

/** The DOM renderer owns keyed rows and their Zag bindings, independently of the controller API. */
export function renderCollection(options: {
  list: HTMLElement
  prefix: string
  getCollection(): FuiCollection
  createItem(item: FuiItem): HTMLElement
  bind(element: HTMLElement, getter: (api: CollectionApi) => ZagDomProps): () => void
}): () => void {
  const bindItem = (element: HTMLElement, item: FuiItem) => {
    const disposers = [
      options.bind(element, (api) => api.getItemProps({ item })),
      options.bind(element.querySelector<HTMLElement>(`.${options.prefix}-item-text`)!, (api) =>
        api.getItemTextProps({ item }),
      ),
      options.bind(
        element.querySelector<HTMLElement>(`.${options.prefix}-item-indicator`)!,
        (api) => api.getItemIndicatorProps({ item }),
      ),
    ]
    return () => disposers.forEach((dispose) => dispose())
  }
  const bindGroup = (element: HTMLElement, index: number) => {
    const disposers = [
      options.bind(element, (api) => api.getItemGroupProps({ id: String(index) })),
      options.bind(
        element.querySelector<HTMLElement>(`.${options.prefix}-item-group-label`)!,
        (api) => api.getItemGroupLabelProps({ htmlFor: String(index) }),
      ),
    ]
    return () => disposers.forEach((dispose) => dispose())
  }
  const rows = createKeyedReconciler({
    getKey: (entry: { item: FuiItem; view: FuiItem }) => getItemId(entry.view),
    create({ item, view }) {
      const element = options.createItem(view)
      return { element, item, view, dispose: bindItem(element, item) }
    },
    update(row, { item, view }) {
      if (
        row.item === item &&
        row.view.label === view.label &&
        row.view.description === view.description &&
        row.view.disabled === view.disabled
      )
        return
      row.item = item
      row.view = view
      row.dispose()
      const fresh = options.createItem(view)
      row.element.replaceChildren(...fresh.childNodes)
      row.dispose = bindItem(row.element, item)
    },
    destroy(row) {
      row.dispose()
      row.element.remove()
    },
  })
  let groups: (() => void)[] = []
  const stop = effect(() => {
    const collection = options.getCollection()
    const entries = collectionEntries(collection)
    // Bindings created during reconciliation must outlive this effect's next run.
    untracked(() => {
      groups.forEach((dispose) => dispose())
      const ordered = rows.reconcile(entries).map((row) => row.element)
      options.list.replaceChildren(
        ...groupRows(
          entries.map((entry) => entry.view),
          ordered,
          options.prefix,
        ),
      )
      groups = Array.from(
        options.list.querySelectorAll<HTMLElement>(`.${options.prefix}-item-group`),
        bindGroup,
      )
    })
  })
  return () => {
    stop()
    groups.forEach((dispose) => dispose())
    rows.destroy()
  }
}
