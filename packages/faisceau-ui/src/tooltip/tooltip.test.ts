import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createTooltip, enhanceTooltip } from "./tooltip.ts";

afterEach(() => {
  document.body.replaceChildren();
});

describe("Tooltip", () => {
  it("can mount while its target is still detached, as Storybook render requires", () => {
    const host = document.createElement("div");
    const controller = createTooltip({ content: "Detached content", trigger: "Info" });

    expect(() => controller.mount(host)).not.toThrow();
    expect(controller.started).toBe(true);
    controller.destroy();
  });

  it("creates a trigger and exposes an accessible positioned tooltip", async () => {
    const onOpenChange = vi.fn();
    const controller = createTooltip({
      content: "Create a new document",
      onOpenChange,
      openDelay: 0,
      trigger: "Create",
    }).mount(document.body);
    const trigger = controller.root.querySelector<HTMLButtonElement>('[data-fui-part="trigger"]')!;
    const content = controller.root.querySelector<HTMLElement>('[data-fui-part="content"]')!;

    controller.api.get().setOpen(true);
    await flushMachine();
    expect(content.textContent).toContain("Create a new document");
    expect(content.hidden).toBe(false);
    expect(trigger.getAttribute("aria-describedby")).toBe(content.id);
    expect(onOpenChange).toHaveBeenLastCalledWith({ open: true });

    controller.api.get().setOpen(false);
    await flushMachine();
    expect(content.hidden).toBe(true);
    controller.destroy();
    expect(controller.root.isConnected).toBe(false);
  });

  it("enhances a titled trigger and restores its native title on destroy", async () => {
    const trigger = document.createElement("button");
    trigger.className = "consumer-trigger";
    trigger.title = "Archive this item";
    document.body.append(trigger);

    const controller = enhanceTooltip(trigger, { closeDelay: 0, openDelay: 0 });
    expect(trigger.hasAttribute("title")).toBe(false);
    expect(trigger.classList).toContain("fui-tooltip-trigger");

    controller.api.get().setOpen(true);
    await flushMachine();
    expect(document.querySelector('[data-fui-part="content"]')?.textContent).toContain(
      "Archive this item",
    );

    controller.destroy();
    expect(trigger.className).toBe("consumer-trigger");
    expect(trigger.title).toBe("Archive this item");
    expect(document.querySelector('[data-fui-part="content"]')).toBeNull();
  });
});

async function flushMachine(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
