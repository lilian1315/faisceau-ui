/** The default item shape shared by Select and Combobox. */
export interface FuiItem {
  /** Stable selection identity. Native options expose this as data-id; defaults to value. */
  readonly id?: string
  readonly value: string
  readonly label: string
  readonly disabled?: boolean
  readonly description?: string
  /** Label of the group containing this option. Adjacent items share a group. */
  readonly group?: string
}

/** A shorthand string or a complete item accepted by component factories. */
export type FuiItemInput = string | FuiItem

/**
 * Converts shorthand strings to the default item shape and validates item
 * identities. Duplicate identities warn and keep the first item. Object inputs are preserved by reference.
 */
export function normalizeItems(
  items: readonly FuiItemInput[],
  getValue: (item: FuiItem) => string = getItemId,
): FuiItem[] {
  const normalized: FuiItem[] = []
  const valueIndexes = new Map<string, number>()

  items.forEach((input, index) => {
    const item = normalizeItem(input, index)
    const value = getValue(item)
    const previousIndex = valueIndexes.get(value)

    if (previousIndex !== undefined) {
      console.warn(
        `[Faisceau UI] Duplicate item value "${value}" at indexes ${previousIndex} and ${index}. Ignoring item at index ${index}; keeping the first occurrence.`,
      )
      return
    }

    valueIndexes.set(value, index)
    normalized.push(item)
  })

  return normalized
}

export function getItemId(item: FuiItem): string {
  return item.id ?? item.value
}

function normalizeItem(input: FuiItemInput, index: number): FuiItem {
  if (typeof input === 'string') {
    return { value: input, label: input }
  }

  if (typeof input !== 'object' || input === null) {
    throw new TypeError(
      `[Faisceau UI] Invalid item at index ${index}. Expected a string or item object.`,
    )
  }

  if (typeof input.value !== 'string') {
    throw new TypeError(`[Faisceau UI] Invalid item value at index ${index}. Expected a string.`)
  }

  if (typeof input.label !== 'string') {
    throw new TypeError(`[Faisceau UI] Invalid item label at index ${index}. Expected a string.`)
  }

  if (input.id !== undefined && (typeof input.id !== 'string' || input.id.length === 0)) {
    throw new TypeError(
      `[Faisceau UI] Invalid item id at index ${index}. Expected a non-empty string.`,
    )
  }

  if (input.disabled !== undefined && typeof input.disabled !== 'boolean') {
    throw new TypeError(
      `[Faisceau UI] Invalid disabled state at index ${index}. Expected a boolean.`,
    )
  }

  if (input.description !== undefined && typeof input.description !== 'string') {
    throw new TypeError(
      `[Faisceau UI] Invalid item description at index ${index}. Expected a string.`,
    )
  }

  if (input.group !== undefined && typeof input.group !== 'string') {
    throw new TypeError(`[Faisceau UI] Invalid item group at index ${index}. Expected a string.`)
  }

  return input
}
