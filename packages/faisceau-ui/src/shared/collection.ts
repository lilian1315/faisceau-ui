import { collection as zagCollection } from '@zag-js/combobox'
import type { FuiItem, FuiItemInput } from './items.ts'
import { getItemId, normalizeItems } from './items.ts'

export type FuiCollection = ReturnType<typeof zagCollection<FuiItem>>
export type FuiItems = readonly FuiItemInput[] | FuiCollection

/** Zag collection factory specialized for the shared FUI item shape. */
export function collection(options: Parameters<typeof zagCollection<FuiItem>>[0]): FuiCollection {
  const result = zagCollection<FuiItem>({
    itemToValue: getItemId,
    itemToString: (item) => item.label,
    isItemDisabled: (item) => item.disabled ?? false,
    ...options,
  })
  return normalizeCollection(result)
}

/** Builds a Zag collection using the shared FUI item shape. */
export function toCollection(items: FuiItems): FuiCollection {
  if ('items' in items) {
    return normalizeCollection(items)
  }
  return collection({
    items: normalizeItems(items),
  })
}

/** Presentation and native options use the same mappings as the Zag machine. */
export function presentItem(collection: FuiCollection, item: FuiItem): FuiItem {
  return {
    ...item,
    // Explicit identities separate submitted values from Zag selection keys.
    id: item.id === undefined ? undefined : (collection.getItemValue(item) ?? item.id),
    value: item.id === undefined ? (collection.getItemValue(item) ?? '') : item.value,
    label: collection.stringifyItem(item) ?? '',
    disabled: collection.getItemDisabled(item),
  }
}

export function collectionItems(collection: FuiCollection): FuiItem[] {
  return collectionEntries(collection).map((entry) => entry.view)
}

/** Render the same group order used by Zag's keyboard navigation. */
export function collectionEntries(collection: FuiCollection) {
  return collection.group().flatMap(([group, items]) =>
    items.map((item) => ({
      item,
      view: { ...presentItem(collection, item), group: group || item.group },
    })),
  )
}

/** Sanitize before publishing, preserving mappings and the caller's immutable collection. */
function normalizeCollection(collection: FuiCollection): FuiCollection {
  const items = normalizeItems(collection.items, (item) => collection.getItemValue(item) ?? '')
  const normalized =
    items.length === collection.items.length ? collection : collection.setItems(items)
  normalizeItems(collectionItems(normalized))
  return normalized
}
