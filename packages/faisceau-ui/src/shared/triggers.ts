import type { ZagDomProps } from "faisceau-zag";

import { captureAttributes } from "./dom.ts";

interface BindableZag<TApi> {
  bind<TElement extends Element>(
    element: TElement,
    getter: (api: TApi) => ZagDomProps | null | undefined,
  ): () => void;
}

/** Manages external trigger bindings resolved from a selector string. */
export interface TriggerBinding {
  /** Replaces the selector and rebinds every matching element. */
  setSelector(selector: string | undefined): void;
  /** Re-resolves the current selector, picking up triggers added after start. */
  refresh(): void;
  /** Removes Zag props from bound triggers and restores their attributes. */
  destroy(): void;
}

/**
 * Binds every element matching `selector` to a Zag trigger getter.
 * Triggers are never owned: only their Zag props are applied and restored.
 */
export function createTriggerBinding<TApi>(
  zag: BindableZag<TApi>,
  options: {
    component: string;
    getScope: () => Document | ShadowRoot;
    getTriggerProps: (api: TApi) => ZagDomProps | null | undefined;
  },
): TriggerBinding {
  let selector: string | undefined;
  let disposers: Array<() => void> = [];
  let restores: Array<() => void> = [];

  function cleanup(): void {
    for (const dispose of disposers) dispose();
    disposers = [];
    for (const restore of restores) restore();
    restores = [];
  }

  function apply(next: string | undefined): void {
    cleanup();
    selector = next;
    if (!next) return;
    let elements: Element[];
    try {
      elements = Array.from(options.getScope().querySelectorAll(next));
    } catch {
      throw new Error(
        `[Faisceau UI] ${options.component} triggerSelector is not a valid selector: "${next}".`,
      );
    }
    for (const element of elements) {
      restores.push(captureAttributes(element));
      disposers.push(zag.bind(element, (api) => options.getTriggerProps(api)));
    }
  }

  return {
    setSelector(next) {
      apply(next);
    },
    refresh() {
      if (selector) apply(selector);
    },
    destroy() {
      cleanup();
      selector = undefined;
    },
  };
}
