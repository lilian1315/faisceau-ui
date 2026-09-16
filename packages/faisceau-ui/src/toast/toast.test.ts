import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createToaster, enhanceToaster } from "./toast.ts";

afterEach(() => document.body.replaceChildren());

describe("Toast", () => {
  it("creates and dismisses notifications through the Zag store", async () => {
    const toaster = createToaster({ duration: Infinity }).mount(document.body);
    const id = toaster.create({ description: "Le document est enregistré.", title: "Enregistré" });
    await flushMachine();
    const notification = toaster.root.querySelector<HTMLElement>(".fui-toast")!;
    expect(notification.textContent).toContain("Enregistré");
    expect(notification.getAttribute("role")).toBeTruthy();
    toaster.dismiss(id);
    // Removal follows Zag's `removeDelay` (200 ms by default); poll instead of
    // relying on a fixed sleep so the assertion survives parallel-run load.
    await vi.waitFor(() => {
      expect(toaster.root.querySelector(".fui-toast")).toBeNull();
    });
  });

  it("runs an action and enhances an existing region", async () => {
    const root = document.createElement("div");
    root.className = "consumer-region";
    document.body.append(root);
    const action = vi.fn();
    const toaster = enhanceToaster(root, { duration: Infinity });
    toaster.create({ action: { label: "Annuler", onClick: action }, title: "Supprimé" });
    await flushMachine();
    root.querySelector<HTMLButtonElement>(".fui-toast-action")!.click();
    expect(action).toHaveBeenCalledOnce();
    toaster.destroy();
    expect(root.className).toBe("consumer-region");
  });

  it("reconciles visible content when a toast is updated", async () => {
    const toaster = createToaster({ duration: Infinity }).mount(document.body);
    const firstAction = vi.fn();
    const nextAction = vi.fn();
    const id = toaster.create({
      action: { label: "Retry", onClick: firstAction },
      title: "First title",
    });
    await flushMachine();

    toaster.store.update(id, {
      action: { label: "Undo", onClick: nextAction },
      description: "Updated description",
      title: "Updated title",
    });
    await flushMachine();

    const notification = toaster.root.querySelector<HTMLElement>(".fui-toast")!;
    expect(notification.querySelector(".fui-toast-title")?.textContent).toBe("Updated title");
    expect(notification.querySelector(".fui-toast-description")?.textContent).toBe(
      "Updated description",
    );
    const action = notification.querySelector<HTMLButtonElement>(".fui-toast-action")!;
    expect(action.textContent).toBe("Undo");
    action.click();
    expect(firstAction).not.toHaveBeenCalled();
    expect(nextAction).toHaveBeenCalledOnce();
  });
});

async function flushMachine(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
