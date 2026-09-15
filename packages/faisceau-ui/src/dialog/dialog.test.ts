import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createDialog, enhanceDialog } from "./dialog.ts";

afterEach(() => document.body.replaceChildren());

describe("Dialog", () => {
  it("creates an accessible modal and closes it", async () => {
    const onOpenChange = vi.fn();
    const controller = createDialog({
      content: "Contenu de confirmation",
      description: "Cette action est réversible.",
      onOpenChange,
      title: "Confirmer",
    }).mount(document.body);

    controller.api.get().setOpen(true);
    await flushMachine();
    const content = controller.root.querySelector<HTMLElement>('[data-fui-part="content"]')!;
    expect(content.hidden).toBe(false);
    expect(content.getAttribute("role")).toBe("dialog");
    expect(content.getAttribute("aria-labelledby")).toBeTruthy();
    controller.root.querySelector<HTMLButtonElement>('[data-fui-part="close-trigger"]')!.click();
    await flushMachine();
    expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
  });

  it("binds every trigger matching the selector without owning them", async () => {
    document.body.innerHTML =
      '<button id="open-a" type="button">A</button><button id="open-b" type="button">B</button>';
    const first = document.querySelector<HTMLButtonElement>("#open-a")!;
    const second = document.querySelector<HTMLButtonElement>("#open-b")!;
    const controller = createDialog({
      content: "Contenu",
      title: "Titre",
      triggerSelector: "#open-a, #open-b",
    }).mount(document.body);

    await flushMachine();
    expect(first.hasAttribute("aria-haspopup")).toBe(true);
    expect(second.hasAttribute("aria-haspopup")).toBe(true);
    expect(controller.root.querySelector('[data-fui-part="trigger"]')).toBeNull();

    second.click();
    await flushMachine();
    expect(controller.api.get().open).toBe(true);

    controller.destroy();
    expect(first.hasAttribute("aria-haspopup")).toBe(false);
    expect(second.hasAttribute("aria-haspopup")).toBe(false);
    expect(document.querySelector("#open-a")).not.toBeNull();
    expect(document.querySelector("#open-b")).not.toBeNull();
  });

  it("picks up triggers attached after start", async () => {
    const canvas = document.createElement("div");
    const trigger = document.createElement("button");
    trigger.id = "late-trigger";
    trigger.type = "button";
    trigger.textContent = "Late";
    canvas.append(trigger);
    const host = document.createElement("div");
    canvas.append(host);
    const controller = createDialog({
      content: "Contenu",
      title: "Titre",
      triggerSelector: "#late-trigger",
    });
    controller.mount(host);
    expect(trigger.hasAttribute("aria-haspopup")).toBe(false);
    document.body.append(canvas);
    await flushMachine();
    expect(trigger.hasAttribute("aria-haspopup")).toBe(true);
    trigger.click();
    await flushMachine();
    expect(controller.api.get().open).toBe(true);
    controller.destroy();
  });

  it("rebinds triggers through setTriggerSelector", async () => {
    document.body.innerHTML =
      '<button id="before" type="button">Before</button><button id="after" type="button">After</button>';
    const before = document.querySelector<HTMLButtonElement>("#before")!;
    const after = document.querySelector<HTMLButtonElement>("#after")!;
    const controller = createDialog({
      content: "Contenu",
      title: "Titre",
      triggerSelector: "#before",
    }).mount(document.body);
    await flushMachine();
    expect(before.hasAttribute("aria-haspopup")).toBe(true);

    controller.setTriggerSelector("#after");
    await flushMachine();
    expect(before.hasAttribute("aria-haspopup")).toBe(false);
    expect(after.hasAttribute("aria-haspopup")).toBe(true);
    controller.destroy();
  });

  it("enhances content-only markup and restores it", () => {
    const root = document.createElement("div");
    root.className = "fui-dialog";
    root.innerHTML =
      '<section data-fui-part="content"><h2 data-fui-part="title">Profile</h2><p>Body</p></section>';
    document.body.append(root);
    const original = root.innerHTML;
    const controller = enhanceDialog(root);
    expect(root.querySelector('[data-fui-part="backdrop"]')).not.toBeNull();
    controller.destroy();
    expect(root.innerHTML).toBe(original);
  });
});

async function flushMachine(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
