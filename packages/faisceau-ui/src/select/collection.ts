import {
  collection as fuiCollection,
  collectionItems,
  type FuiCollection,
  type FuiItems,
} from '../shared/collection.ts'
import { normalizeItems, type FuiItem } from '../shared/items.ts'

export { collectionItems }
export type { FuiCollection, FuiItems }

/**
 * Select keys machine selection by the submitted value, exactly like Zag's stock
 * collection: two items sharing a value are one logical selection.
 */
export function collection(options: Parameters<typeof fuiCollection>[0]): FuiCollection {
  return fuiCollection({ itemToValue: (item: FuiItem) => item.value, ...options })
}

/** Builds a value-keyed Zag collection from an item array or an existing collection. */
export function toCollection(items: FuiItems): FuiCollection {
  if ('items' in items) return collection({ items: items.items })
  return collection({ items: normalizeItems(items) })
}
