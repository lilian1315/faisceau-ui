import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createToaster, enhanceToaster } from "./toast.ts";

afterEach(() => document.body.replaceChildren());

describe("Toast", () => {
  it("creates and dismisses notifications through the Zag store", async () => {
    const toaster = createToaster({ duration: Infinity }).mount(document.body);
    const id = toaster.create({ description: "Le document est enregistré.", title: "Enregistré" });
    await flushMachine();
    const notification = toaster.root.querySelector<HTMLElement>('[data-fui-part="root"]')!;
    expect(notification.textContent).toContain("Enregistré");
    expect(notification.getAttribute("role")).toBeTruthy();
    toaster.dismiss(id);
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(toaster.root.querySelector('[data-fui-part="root"]')).toBeNull();
  });

  it("runs an action and enhances an existing region", async () => {
    const root = document.createElement("div");
    root.className = "consumer-region";
    document.body.append(root);
    const action = vi.fn();
    const toaster = enhanceToaster(root, { duration: Infinity });
    toaster.create({ action: { label: "Annuler", onClick: action }, title: "Supprimé" });
    await flushMachine();
    root.querySelector<HTMLButtonElement>('[data-fui-part="action-trigger"]')!.click();
    expect(action).toHaveBeenCalledOnce();
    toaster.destroy();
    expect(root.className).toBe("consumer-region");
  });
});

async function flushMachine(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
