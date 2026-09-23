/** The default item shape shared by Select and Combobox. */
export interface FuiItem {
  readonly value: string
  readonly label: string
  readonly disabled?: boolean
  readonly description?: string
}

/** A shorthand string or a complete item accepted by component factories. */
export type FuiItemInput = string | FuiItem

/**
 * Converts shorthand strings to the default item shape and validates item
 * values. Object inputs are preserved by reference.
 */
export function normalizeItems(items: readonly FuiItemInput[]): FuiItem[] {
  const normalized: FuiItem[] = []
  const valueIndexes = new Map<string, number>()

  items.forEach((input, index) => {
    const item = normalizeItem(input, index)
    const previousIndex = valueIndexes.get(item.value)

    if (previousIndex !== undefined) {
      throw new Error(
        `[Faisceau UI] Duplicate item value "${item.value}" at indexes ${previousIndex} and ${index}. Item values must be unique.`,
      )
    }

    valueIndexes.set(item.value, index)
    normalized.push(item)
  })

  return normalized
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

  return input
}
