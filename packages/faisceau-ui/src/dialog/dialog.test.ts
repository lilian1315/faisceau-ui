import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createDialog, enhanceDialog } from "./dialog.js";

afterEach(() => document.body.replaceChildren());

describe("Dialog", () => {
  it("creates an accessible modal and closes it", async () => {
    const onOpenChange = vi.fn();
    const controller = createDialog({
      content: "Contenu de confirmation",
      description: "Cette action est réversible.",
      onOpenChange,
      title: "Confirmer",
      trigger: "Ouvrir",
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

  it("enhances and restores existing markup", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<button data-fui-part="trigger">Edit</button><section data-fui-part="content"><h2 data-fui-part="title">Profile</h2><p>Body</p></section>';
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
