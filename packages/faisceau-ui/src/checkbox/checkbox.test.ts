import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createCheckbox, enhanceCheckbox } from "./checkbox.js";

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

  it("uses a native checkbox for interaction, validation, submission, and reset", async () => {
    const onCheckedChange = vi.fn();
    const form = document.createElement("form");
    document.body.append(form);
    const controller = createCheckbox({
      defaultChecked: true,
      description: "Required agreement",
      label: "Accept terms",
      name: "terms",
      onCheckedChange,
      required: true,
      value: "accepted",
    }).mount(form);
    const input = controller.root.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    const control = controller.root.querySelector<HTMLElement>('[data-fui-part="control"]')!;

    expect(input.checked).toBe(true);
    expect(new FormData(form).get("terms")).toBe("accepted");
    expect(input.validity.valueMissing).toBe(false);

    control.click();
    await flushMachine();
    expect(input.checked).toBe(false);
    expect(input.validity.valueMissing).toBe(true);
    expect(onCheckedChange).toHaveBeenLastCalledWith({ checked: false });

    form.reset();
    await flushMachine();
    expect(input.checked).toBe(true);
    expect(controller.api.get().checked).toBe(true);
    controller.destroy();
  });

  it("enhances only a container and native checkbox, then restores them", async () => {
    const root = document.createElement("div");
    root.className = "consumer-root";
    root.innerHTML = '<input type="checkbox" name="newsletter" aria-label="Newsletter" checked>';
    document.body.append(root);
    const input = root.querySelector<HTMLInputElement>("input")!;

    const controller = enhanceCheckbox(root, { description: "Monthly updates" });
    expect(root.dataset.fuiComponent).toBe("checkbox");
    expect(input.dataset.fuiPart).toBe("native-input");
    expect(controller.api.get().checked).toBe(true);

    input.click();
    await flushMachine();
    expect(controller.api.get().checked).toBe(false);

    controller.destroy();
    expect(root.className).toBe("consumer-root");
    expect(root.firstElementChild).toBe(input);
    expect(input.getAttribute("aria-label")).toBe("Newsletter");
    expect(input.checked).toBe(true);
  });
});

async function flushMachine(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
