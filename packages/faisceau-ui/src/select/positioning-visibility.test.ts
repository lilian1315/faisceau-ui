import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import "../styles/index.css";
import { createSelect } from "./select.js";

afterEach(() => {
  document.body.replaceChildren();
});

describe("Select item-aligned positioning visibility", () => {
  it("hides the popup after Zag clears its coordinates until it is positioned", async () => {
    const onPositioned = vi.fn();
    const controller = createSelect({
      defaultValue: ["two"],
      items: ["One", "Two", "Three"],
      label: "Value",
      positioning: { onPositioned },
    }).mount(document.body);
    const trigger = requirePart<HTMLButtonElement>(controller.root, "trigger");
    const content = requirePart<HTMLElement>(controller.root, "content");
    const positioner = requirePart<HTMLElement>(controller.root, "positioner");

    controller.api.get().setOpen(true);
    await flushPositioning();
    const previousY = positioner.style.getPropertyValue("--y");
    expect(previousY).not.toBe("");
    expect(positioner.hasAttribute("data-fui-positioned")).toBe(true);
    expect(getComputedStyle(positioner).visibility).toBe("visible");
    expect(onPositioned).toHaveBeenLastCalledWith({ placed: true });

    controller.api.get().setOpen(false);
    await flushPositioning();
    expect(controller.api.get().open).toBe(false);
    trigger.style.marginBlockStart = "8rem";
    controller.api.get().setOpen(true);
    await flushMachine();

    expect(controller.api.get().open).toBe(true);
    expect(content.hidden).toBe(false);
    expect(positioner.style.getPropertyValue("--y")).toBe("");
    expect(positioner.hasAttribute("data-fui-positioned")).toBe(false);
    expect(getComputedStyle(positioner).visibility).toBe("hidden");

    await flushPositioning();
    expect(onPositioned).toHaveBeenLastCalledWith({ placed: true });
    expect(positioner.hasAttribute("data-fui-positioned")).toBe(true);
    expect(getComputedStyle(positioner).visibility).toBe("visible");
    controller.destroy();
  });
});

function requirePart<T extends Element = HTMLElement>(root: ParentNode, part: string): T {
  const element = root.querySelector<T>(`[data-fui-part="${part}"]`);
  if (!element) throw new Error(`Missing test part: ${part}`);
  return element;
}

async function flushMachine(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function flushPositioning(): Promise<void> {
  await flushMachine();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}
