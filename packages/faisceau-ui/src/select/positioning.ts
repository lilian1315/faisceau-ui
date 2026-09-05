import type { PositioningOptions } from "@zag-js/select";

export interface ItemAlignedPositioningOptions {
  readonly fallbackGutter: number;
  readonly getSelectedItem: () => HTMLElement | null;
  readonly positioner: HTMLElement;
  readonly requested?: PositioningOptions;
  readonly trigger: HTMLElement;
  readonly valueText: HTMLElement;
}

/** Creates a virtual anchor that aligns the selected item's text with the trigger value. */
export function createItemAlignedPositioning({
  fallbackGutter,
  getSelectedItem,
  positioner,
  requested,
  trigger,
  valueText,
}: ItemAlignedPositioningOptions): PositioningOptions {
  // TODO(zag): Replace this shim when @zag-js/select exposes a native
  // `alignItemWithTrigger` / item-aligned positioning mode.
  const anchor = {
    contextElement: trigger,
    getBoundingClientRect(): DOMRect {
      const triggerRect = trigger.getBoundingClientRect();
      const selectedItem = getSelectedItem();
      const positionerRect = positioner.getBoundingClientRect();

      if (selectedItem === null || positionerRect.height === 0) {
        return createFallbackRect(triggerRect, fallbackGutter);
      }

      const itemText = selectedItem.querySelector<HTMLElement>('[data-fui-part="item-text"]');
      const itemRect = itemText?.getBoundingClientRect() ?? selectedItem.getBoundingClientRect();
      const targetRect = valueText.getBoundingClientRect();

      if (itemRect.height === 0 || targetRect.height === 0) {
        return createFallbackRect(triggerRect, fallbackGutter);
      }

      const itemCenterX = itemRect.left - positionerRect.left;
      const itemCenterY = itemRect.top - positionerRect.top + itemRect.height / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;

      return new DOMRect(
        targetRect.left - itemCenterX,
        targetCenterY - itemCenterY,
        triggerRect.width,
        0,
      );
    },
  };

  return {
    ...requested,
    flip: false,
    getAnchorElement: () => anchor,
    getAnchorRect: undefined,
    gutter: 0,
    offset: undefined,
    overlap: true,
    placement: "bottom-start",
    onPositioned(details) {
      positioner.toggleAttribute("data-fui-positioned", details.placed);
      requested?.onPositioned?.(details);
    },
    shift: undefined,
    slide: true,
    updatePosition: async ({ updatePosition }) => {
      await nextAnimationFrame(trigger);
      await updatePosition();
    },
  };
}

function createFallbackRect(triggerRect: DOMRect, gutter: number): DOMRect {
  return new DOMRect(
    triggerRect.left,
    triggerRect.top + gutter,
    triggerRect.width,
    triggerRect.height,
  );
}

function nextAnimationFrame(element: Element): Promise<void> {
  const view = element.ownerDocument.defaultView;
  if (view === null) return Promise.resolve();

  return new Promise((resolve) => {
    view.requestAnimationFrame(() => resolve());
  });
}
