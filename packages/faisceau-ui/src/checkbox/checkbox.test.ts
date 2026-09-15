import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createCheckbox, enhanceCheckbox } from "./checkbox.ts";

afterEach(() => {
  document.body.replaceChildren();
});

describe("Checkbox", () => {
  it("can mount while its target is still detached, as Storybook render requires", () => {
    const host = document.createElement("div");
    const controller = createCheckbox({ label: "Detached checkbox" });

    expect(() => controller.mount(host)).not.toThrow();
    expect(controller.started).toBe(true);
    controller.destroy();
  });

  it("builds a label root with a native input, control, and indicator", () => {
    const controller = createCheckbox({
      description: "Monthly updates",
      label: "Newsletter",
    }).mount(document.body);

    expect(controller.root.tagName).toBe("LABEL");
    expect(controller.root.classList.contains("fui-checkbox")).toBe(true);
    expect(controller.root.querySelector('input[data-part="input"]')).not.toBeNull();
    expect(controller.root.querySelector('[data-part="control"]')).not.toBeNull();
    expect(controller.root.querySelector('[data-part="indicator"]')).not.toBeNull();
    expect(controller.root.querySelector('span[data-part="label"]')?.textContent).toBe(
      "Newsletter",
    );
    expect(controller.root.querySelector('p[data-part="description"]')?.textContent).toBe(
      "Monthly updates",
    );
    controller.destroy();
    expect(controller.root.isConnected).toBe(false);
  });

  it("submits its value through FormData and notifies on change", async () => {
    const onCheckedChange = vi.fn();
    const form = document.createElement("form");
    document.body.append(form);
    const controller = createCheckbox({
      defaultChecked: true,
      label: "Accept terms",
      name: "terms",
      onCheckedChange,
      value: "accepted",
    }).mount(form);
    const input = controller.root.querySelector<HTMLInputElement>('input[data-part="input"]')!;

    expect(input.checked).toBe(true);
    expect(new FormData(form).get("terms")).toBe("accepted");

    input.click();
    await flushMachine();
    expect(input.checked).toBe(false);
    expect(onCheckedChange).toHaveBeenLastCalledWith({ checked: false });
    controller.destroy();
  });

  it("enhances caller markup, starts immediately, then restores it", async () => {
    const root = document.createElement("label");
    root.className = "fui-checkbox consumer-root";
    root.innerHTML = `<input type="checkbox" data-part="input" name="newsletter" checked><span data-part="label">Newsletter</span>`;
    document.body.append(root);
    const input = root.querySelector<HTMLInputElement>("input")!;

    const controller = enhanceCheckbox(root, {});
    expect(controller.started).toBe(true);
    expect(controller.api.get().checked).toBe(true);
    expect(root.querySelector('[data-part="control"]')).not.toBeNull();

    input.click();
    await flushMachine();
    expect(controller.api.get().checked).toBe(false);

    controller.destroy();
    expect(root.querySelector('[data-part="control"]')).toBeNull();
    expect(root.className).toBe("fui-checkbox consumer-root");
    expect(input.getAttribute("type")).toBe("checkbox");
    expect(input.checked).toBe(false);
  });
});

async function flushMachine(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
