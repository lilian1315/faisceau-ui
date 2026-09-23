export interface KeyedEntry<TKey, TValue> {
  readonly key: TKey
  readonly value: TValue
}

export interface KeyedReconciler<TInput, TKey, TValue> {
  readonly values: ReadonlyMap<TKey, TValue>
  reconcile(inputs: readonly TInput[]): TValue[]
  destroy(): void
}

/** Reconciles an ordered keyed collection while preserving retained entry identity. */
export function createKeyedReconciler<TInput, TKey, TValue>(options: {
  create(input: TInput, index: number): TValue
  destroy(value: TValue): void
  getKey(input: TInput): TKey
  update(value: TValue, input: TInput, index: number): void
}): KeyedReconciler<TInput, TKey, TValue> {
  const values = new Map<TKey, TValue>()

  return {
    values,
    reconcile(inputs) {
      const visible = new Set<TKey>()
      const ordered = inputs.map((input, index) => {
        const key = options.getKey(input)
        if (visible.has(key)) throw new Error(`Duplicate reconciliation key: ${String(key)}`)
        visible.add(key)
        let value = values.get(key)
        if (value === undefined) {
          value = options.create(input, index)
          values.set(key, value)
        } else {
          options.update(value, input, index)
        }
        return value
      })

      for (const [key, value] of values) {
        if (visible.has(key)) continue
        options.destroy(value)
        values.delete(key)
      }
      return ordered
    },
    destroy() {
      for (const value of values.values()) options.destroy(value)
      values.clear()
    },
  }
}

/** Reconciles against caller-owned keyed values without retaining an internal map. */
export function reconcileKeyedValues<TInput, TKey, TValue>(options: {
  create(input: TInput, index: number): TValue
  current: ReadonlyMap<TKey, TValue>
  destroy(value: TValue, key: TKey): void
  getKey(input: TInput): TKey
  inputs: readonly TInput[]
  update(value: TValue, input: TInput, index: number): void
}): TValue[] {
  const visible = new Set<TKey>()
  const ordered = options.inputs.map((input, index) => {
    const key = options.getKey(input)
    if (visible.has(key)) throw new Error(`Duplicate reconciliation key: ${String(key)}`)
    visible.add(key)
    const value = options.current.get(key) ?? options.create(input, index)
    options.update(value, input, index)
    return value
  })
  for (const [key, value] of options.current) {
    if (!visible.has(key)) options.destroy(value, key)
  }
  return ordered
}
