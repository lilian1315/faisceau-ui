import { computed, signal, type Reactive } from 'faisceau'
import { collectionItems, type FuiCollection } from './collection.ts'
import { getItemId, type FuiItem } from './items.ts'
import type { ZagDomProps } from 'faisceau-zag'
import { selectionText } from './selection-labels.ts'

interface ChangeDetails {
  value: string[]
  items: FuiCollection['items']
  reason?: string
}

/** Group selection by submitted value while keeping each Zag item identity unique. */
export function createValueSelection<TDetails extends ChangeDetails>(options: {
  getCollection(): FuiCollection
  enabled: boolean
  multiple: boolean
  value?: string[]
  defaultValue: string[]
  onValueChange?(details: TDetails): void
}) {
  const index: Reactive<{
    byId: Map<string, FuiItem>
    groups: Map<string, string[]>
    grouped: boolean
  }> = computed(() => {
    const byId = new Map<string, FuiItem>()
    const groups = new Map<string, string[]>()
    for (const item of collectionItems(options.getCollection())) {
      const key = getItemId(item)
      byId.set(key, item)
      const group = groups.get(item.value) ?? []
      group.push(key)
      groups.set(item.value, group)
    }
    return { byId, groups, grouped: [...groups.values()].some((group) => group.length > 1) }
  })
  const expand = (keys: readonly string[]): string[] => {
    if (!options.enabled) return [...keys]
    const { byId, groups } = index.get()
    const result = new Set<string>()
    for (const key of keys) {
      result.add(key)
      const selected = byId.get(key)
      if (!selected) continue
      for (const peer of groups.get(selected.value)!) {
        if (!byId.get(peer)!.disabled) result.add(peer)
      }
    }
    return [...result]
  }
  const initialValue = expand(options.value ?? options.defaultValue)
  const internalValue = signal(initialValue)
  const current = () => expand(options.value ?? internalValue.get())
  const removeGroup = (keys: readonly string[], key: string): string[] => {
    const { byId } = index.get()
    const value = byId.get(key)?.value
    return keys.filter(
      (entry) => entry !== key && (value === undefined || byId.get(entry)?.value !== value),
    )
  }
  const toggle = (keys: readonly string[], previous: readonly string[]): string[] => {
    const next = expand(keys)
    if (!options.enabled || !options.multiple) return next
    const { byId } = index.get()
    const proposed = new Set(keys)
    const removed = new Set(
      previous
        .filter((key) => !proposed.has(key))
        .flatMap((key) => {
          const item = byId.get(key)
          return item ? [item.value] : []
        }),
    )
    return next.filter((key) => {
      const item = byId.get(key)
      return !item || !removed.has(item.value)
    })
  }
  const listProps = (props: ZagDomProps): ZagDomProps =>
    !options.multiple && props.role === 'listbox' && index.get().grouped
      ? { ...props, 'aria-multiselectable': true }
      : props

  return {
    initialValue,
    normalize: expand,
    fromNative: toggle,
    inputText(text: string, keys: string[]): string {
      const source = options.getCollection()
      return text === source.stringifyMany(keys) ? selectionText(source, keys) : text
    },
    isGroupedSelectionText(text: string): boolean {
      if (!options.enabled) return false
      const source = options.getCollection()
      const keys = current()
      const selected = keys.flatMap((key) => {
        const item = index.get().byId.get(key)
        return item ? [item] : []
      })
      return (
        new Set(selected.map((item) => item.value)).size < selected.length &&
        source.stringifyMany(keys) === text
      )
    },
    // Save expanded peers before a source replacement so surviving identities
    // remain selected even when their original group representative is removed.
    capture() {
      if (options.enabled && options.value === undefined) internalValue.set(current())
    },
    props() {
      if (!options.enabled) return {}
      return {
        value: current(),
        defaultValue: initialValue,
        onValueChange(details: TDetails) {
          const next =
            details.reason === 'item-select'
              ? toggle(details.value, current())
              : expand(details.value)
          if (options.value === undefined) internalValue.set(next)
          options.onValueChange?.({
            ...details,
            value: next,
            items: options.getCollection().findMany(next),
          })
        },
      }
    },
    connect<
      T extends {
        value: string[]
        valueAsString: string
        setValue(value: string[]): void
        clearValue(value?: string): void
        selectValue(value: string): void
        getContentProps(): ZagDomProps
        getListProps(): ZagDomProps
      },
    >(api: T): T {
      const display = { ...api, valueAsString: selectionText(options.getCollection(), api.value) }
      if (!options.enabled) return display
      return {
        ...display,
        getContentProps: () => listProps(api.getContentProps()),
        getListProps: () => listProps(api.getListProps()),
        clearValue(key?: string) {
          if (key === undefined) api.clearValue()
          else api.setValue(removeGroup(current(), key))
        },
        selectValue(key: string) {
          if (options.multiple && current().includes(key)) api.setValue(removeGroup(current(), key))
          else api.selectValue(key)
        },
      }
    },
  }
}
