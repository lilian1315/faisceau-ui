import { userEvent } from "vite-plus/test/browser";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createCollapsible, enhanceCollapsible } from "./collapsible.ts";

afterEach(() => document.body.replaceChildren());

describe("Collapsible", () => {
  it("mounts from a detached tree and toggles with pointer and keyboard", async () => {
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    const controller = createCollapsible({
      content: "Hidden details",
      onOpenChange,
      trigger: "Show details",
    });

    controller.mount(host);
    const trigger = controller.root.querySelector<HTMLButtonElement>(".fui-collapsible-trigger")!;
    const content = controller.root.querySelector<HTMLElement>(".fui-collapsible-content")!;
    expect(controller.started).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(content.hidden).toBe(true);

    document.body.append(host);
    trigger.click();
    await flushMachine();
    expect(controller.api.get().open).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(content.hidden).toBe(false);
    expect(onOpenChange).toHaveBeenLastCalledWith({ open: true });

    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await flushMachine();
    expect(controller.api.get().open).toBe(false);
  });

  it("supports disabled state and public API updates", async () => {
    const disabled = createCollapsible({
      content: "Details",
      disabled: true,
      trigger: "Disabled",
    }).mount(document.body);
    const trigger = disabled.root.querySelector<HTMLButtonElement>(".fui-collapsible-trigger")!;
    trigger.click();
    await flushMachine();
    expect(disabled.api.get().open).toBe(false);
    expect(trigger.disabled).toBe(true);
    disabled.destroy();

    const controller = createCollapsible({ content: "Details", trigger: "Enabled" }).mount(
      document.body,
    );
    controller.api.get().setOpen(true);
    await flushMachine();
    expect(controller.api.get().open).toBe(true);
  });

  it("enhances full anatomy and restores caller markup exactly", async () => {
    const root = document.createElement("section");
    root.className = "fui-collapsible caller-root";
    root.innerHTML =
      '<button class="fui-collapsible-trigger caller-trigger" type="button"><span class="fui-collapsible-trigger-text">Original</span><span class="fui-collapsible-indicator">+</span></button><div class="fui-collapsible-content caller-content"><strong>Original body</strong></div>';
    document.body.append(root);
    const original = root.outerHTML;

    const controller = enhanceCollapsible(root, {
      className: "temporary",
      content: "Replacement body",
      defaultOpen: true,
      trigger: "Replacement",
    });
    await flushMachine();
    expect(controller.started).toBe(true);
    expect(controller.api.get().open).toBe(true);
    expect(root.textContent).toContain("Replacement");

    controller.destroy();
    expect(root.outerHTML).toBe(original);
  });

  it("rejects incomplete enhancement anatomy before mutation", () => {
    const root = document.createElement("div");
    root.className = "fui-collapsible";
    root.innerHTML = '<button class="fui-collapsible-trigger">Toggle</button>';
    const original = root.outerHTML;
    expect(() => enhanceCollapsible(root)).toThrow(/fui-collapsible-indicator/);
    expect(root.outerHTML).toBe(original);
  });

  it("removes owned markup and guards destroyed controllers", () => {
    const controller = createCollapsible({ content: "Details", trigger: "Toggle" }).mount(
      document.body,
    );
    controller.destroy();
    controller.destroy();
    expect(document.body.contains(controller.root)).toBe(false);
    expect(() => controller.start()).toThrow(/destroyed Collapsible/);
  });
});

async function flushMachine(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
