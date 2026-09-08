import { describe, expect, it, vi } from "vite-plus/test";

import { createItemAlignedPositioning } from "./positioning.ts";

describe("Select item-aligned positioning", () => {
  it("aligns the selected item text with the trigger value", () => {
    const trigger = document.createElement("button");
    const valueText = document.createElement("span");
    const positioner = document.createElement("div");
    const item = document.createElement("div");
    const itemText = document.createElement("span");
    itemText.dataset.fuiPart = "item-text";
    item.append(itemText);

    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 200, 240, 40));
    vi.spyOn(valueText, "getBoundingClientRect").mockReturnValue(new DOMRect(112, 211, 100, 18));
    vi.spyOn(positioner, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 240, 160));
    vi.spyOn(itemText, "getBoundingClientRect").mockReturnValue(new DOMRect(32, 69, 80, 18));

    const options = createItemAlignedPositioning({
      fallbackGutter: 6,
      getSelectedItem: () => item,
      positioner,
      trigger,
      valueText,
    });
    const anchor = options.getAnchorElement?.();
    const rect = anchor?.getBoundingClientRect();

    expect(options).toMatchObject({
      flip: false,
      gutter: 0,
      overlap: true,
      placement: "bottom-start",
      slide: true,
    });
    expect(rect).toMatchObject({ height: 0, width: 240, x: 80, y: 142 });
  });

  it("falls back below the trigger when nothing is selected", () => {
    const trigger = document.createElement("button");
    const valueText = document.createElement("span");
    const positioner = document.createElement("div");
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 200, 240, 40));

    const options = createItemAlignedPositioning({
      fallbackGutter: 6,
      getSelectedItem: () => null,
      positioner,
      trigger,
      valueText,
    });
    const rect = options.getAnchorElement?.()?.getBoundingClientRect();

    expect(rect).toMatchObject({ height: 40, width: 240, x: 100, y: 206 });
    expect(rect?.bottom).toBe(246);
  });
});
