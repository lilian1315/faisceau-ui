import type { ZagDomProps } from 'faisceau-zag'

import { captureAttributes } from './dom.ts'
import { createId } from './id.ts'

interface BindableZag<TApi> {
  bind<TElement extends Element>(
    element: TElement,
    getter: (api: TApi) => ZagDomProps | null | undefined,
  ): () => void
}

/** Manages external trigger bindings resolved from a selector string. */
export interface TriggerBinding {
  /** Replaces the selector and rebinds every matching element. */
  setSelector(selector: string | undefined): void
  /** Re-resolves the current selector, picking up triggers added after start. */
  refresh(): void
  /** Removes Zag props from bound triggers and restores their attributes. */
  destroy(): void
}

/**
 * Binds every element matching `selector` to a Zag trigger getter.
 * Triggers are never owned: only their Zag props are applied and restored.
 * A mutation observer keeps the binding in sync when matching elements are
 * added after start, such as Storybook trees attached after `mount()`.
 * Following Zag's multiple-trigger pattern, every bound element carries a
 * unique id (generated when missing or duplicated) which is passed as the
 * trigger `value`, so Zag tracks each trigger separately.
 */
export function createTriggerBinding<TApi>(
  zag: BindableZag<TApi>,
  options: {
    component: string
    getScope: () => Document | ShadowRoot
    getTriggerProps: (api: TApi, triggerValue: string) => ZagDomProps | null | undefined
  },
): TriggerBinding {
  let selector: string | undefined
  const bound = new Map<Element, { dispose: () => void; restore: () => void }>()
  let observer: MutationObserver | null = null
  let observedScope: Document | ShadowRoot | null = null

  function query(): Element[] {
    if (!selector) return []
    try {
      return Array.from(options.getScope().querySelectorAll(selector))
    } catch {
      throw new Error(
        `[Faisceau UI] ${options.component} triggerSelector is not a valid selector: "${selector}".`,
      )
    }
  }

  function reconcile(): void {
    // Bound elements stay bound while connected: Zag rewrites trigger attributes
    // (notably `id`) after binding, so a bound element may no longer match the
    // selector. Unbinding on mismatch would oscillate between bind and unbind
    // and leave triggers dead whenever the last query runs empty. Only
    // newcomers are bound and only detached elements are released.
    for (const [element, entry] of bound) {
      if (!element.isConnected) {
        entry.dispose()
        entry.restore()
        bound.delete(element)
      }
    }
    for (const element of query()) {
      if (!bound.has(element)) {
        const restore = captureAttributes(element)
        const value = ensureTriggerId(element)
        const dispose = zag.bind(element, (api) => options.getTriggerProps(api, value))
        bound.set(element, { dispose, restore })
      }
    }
  }

  function ensureTriggerId(element: Element): string {
    const taken = new Set<string>()
    for (const boundElement of bound.keys()) {
      if (boundElement !== element && boundElement.id) taken.add(boundElement.id)
    }
    if (element.id && !taken.has(element.id)) return element.id
    let next = ''
    do {
      next = createId('trigger')
    } while (taken.has(next))
    element.id = next
    return next
  }

  function ensureObserved(): void {
    if (!selector) return
    const scope = options.getScope()
    if (observer && observedScope === scope) return
    observer?.disconnect()
    observedScope = scope
    const node: Node | null = scope instanceof Document ? scope.documentElement : scope
    if (!node) {
      observer = null
      return
    }
    observer = new MutationObserver(() => {
      // The lookup root can move (detached tree mounted into a document),
      // so re-target the observer before reconciling.
      ensureObserved()
      reconcile()
    })
    observer.observe(node, { childList: true, subtree: true })
  }

  function cleanup(): void {
    observer?.disconnect()
    observer = null
    observedScope = null
    for (const entry of bound.values()) {
      entry.dispose()
      entry.restore()
    }
    bound.clear()
  }

  return {
    setSelector(next) {
      cleanup()
      selector = next
      if (!next) return
      // Validate eagerly so typos throw synchronously instead of in the observer.
      reconcile()
      ensureObserved()
    },
    refresh() {
      if (!selector) return
      ensureObserved()
      reconcile()
    },
    destroy() {
      cleanup()
      selector = undefined
    },
  }
}
