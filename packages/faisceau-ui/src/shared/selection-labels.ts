import { presentItem, type FuiCollection } from './collection.ts'
import type { FuiItem } from './items.ts'

/** Deduplicate selected display labels by the exact submitted-value/label pair. */
export function uniqueSelectionLabels(items: readonly FuiItem[]): FuiItem[] {
  const seen = new Map<string, Set<string>>()
  return items.filter((item) => {
    const labels = seen.get(item.value) ?? new Set<string>()
    if (labels.has(item.label)) return false
    labels.add(item.label)
    seen.set(item.value, labels)
    return true
  })
}

export function selectionText(collection: FuiCollection, keys: string[]): string {
  const items = collection.findMany(keys).map((item) => presentItem(collection, item))
  return uniqueSelectionLabels(items)
    .map((item) => item.label)
    .join(', ')
}
