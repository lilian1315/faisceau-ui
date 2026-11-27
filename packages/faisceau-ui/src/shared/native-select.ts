import { isInternalChangeEvent, markAsInternalChangeEvent } from '@zag-js/dom-query'
import { effect, untracked } from 'faisceau'
import { collectionItems, type FuiCollection } from './collection.ts'
import { getOptionId, reconcileNativeSelectOptions } from './native-options.ts'

export function readValue(native: HTMLSelectElement): string[] {
  return [
    ...new Set(
      Array.from(native.selectedOptions)
        .filter(
          (option) =>
            !option.hasAttribute('data-placeholder') &&
            (native.multiple || getOptionId(option) !== ''),
        )
        .map(getOptionId),
    ),
  ]
}

export function writeValue(
  native: HTMLSelectElement,
  value: readonly string[],
  empty: 'placeholder' | 'none' = 'placeholder',
): void {
  if (empty === 'none' && !native.multiple && value.length === 0) {
    native.selectedIndex = -1
    return
  }
  for (const option of native.options)
    option.selected =
      (!option.hasAttribute('data-placeholder') && value.includes(getOptionId(option))) ||
      (empty === 'placeholder' && !value.length && getOptionId(option) === '')
  if (!value.length && !native.querySelector('option[value=""]')) native.selectedIndex = -1
}

/** Complete Zag's change-only notification with input, without echoing autofill. */
export function bindNativeEvents(options: {
  native: HTMLSelectElement
  getValue: () => string[]
  setValue: (value: string[]) => void
  focus: () => void
  writeValue: (value: string[]) => void
  normalize: (value: string[], previous: string[]) => string[]
}): () => void {
  const { native, getValue, setValue, focus, writeValue: write, normalize } = options
  let externalValue: string[] | undefined
  const onEvent = (event: Event) => {
    if (!isInternalChangeEvent(event)) {
      const value = normalize(readValue(native), getValue())
      if (!sameValues(value, getValue())) {
        externalValue = value
        setValue(value)
      }
      write(value)
      return
    }
    if (event.type !== 'change') return
    // Zag's Select writes using option.value. Restore selection by data-id
    // before native listeners read the control or construct FormData.
    write(getValue())
    if (externalValue && sameValues(externalValue, getValue())) {
      externalValue = undefined
      event.stopImmediatePropagation()
      return
    }
    externalValue = undefined
    native.dispatchEvent(
      markAsInternalChangeEvent(new Event('input', { bubbles: true, composed: true })),
    )
  }
  const onInvalid = (event: Event) => {
    event.preventDefault()
    focus()
  }
  native.addEventListener('input', onEvent, true)
  native.addEventListener('change', onEvent, true)
  native.addEventListener('invalid', onInvalid)
  native.addEventListener('focus', onInvalid)
  return () => {
    native.removeEventListener('input', onEvent, true)
    native.removeEventListener('change', onEvent, true)
    native.removeEventListener('invalid', onInvalid)
    native.removeEventListener('focus', onInvalid)
  }
}

/** Compare machine values independently of native option order. */
export function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value))
}

interface NativeCollectionState {
  native: HTMLSelectElement
  getCollection(): FuiCollection
  getValue(): string[]
  setValue(value: string[]): void
}

/** Reconcile the authoritative collection, then prune only removed selections. */
export function syncNativeCollection(
  options: NativeCollectionState & {
    placeholder: string
    writeValue(value: string[]): void
    onValueRemoved?(): void
  },
): () => void {
  let initial = true
  return effect(() => {
    const source = options.getCollection()
    if (initial) {
      initial = false
      return
    }
    untracked(() => {
      const previous = options.getValue()
      const next = previous.filter((value) => source.has(value))
      reconcileNativeSelectOptions(options.native, collectionItems(source), options.placeholder)
      options.writeValue(next)
      if (next.length !== previous.length) {
        options.setValue(next)
        options.onValueRemoved?.()
      }
    })
  })
}

/** After reset, keep only defaults that still exist in the full collection. */
export function trackCollectionReset(
  options: NativeCollectionState & {
    initialValue?: readonly string[]
    writeValue?(value: string[]): void
  },
): () => void {
  const form = options.native.form
  let active = true
  const onReset = (event: Event) => {
    queueMicrotask(() => {
      if (!active || event.defaultPrevented) return
      const previous = options.getValue()
      const next = (options.initialValue ?? previous).filter((value) =>
        options.getCollection().has(value),
      )
      if (!sameValues(previous, next)) options.setValue(next)
      options.writeValue?.(next)
    })
  }
  form?.addEventListener('reset', onReset)
  return () => {
    active = false
    form?.removeEventListener('reset', onReset)
  }
}
