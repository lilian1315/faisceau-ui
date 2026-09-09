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
    const control = controller.root.querySelector<HTMLElement>(".fui-checkbox-control")!;

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

  it("enhances a fully-authored Field, then restores it", async () => {
    const template = createCheckbox({
      defaultChecked: true,
      description: "Monthly updates",
      label: "Newsletter",
      name: "newsletter",
    });
    const root = template.root.cloneNode(true) as HTMLElement;
    template.destroy();
    root.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked = true;
    root.classList.add("consumer-root");
    document.body.append(root);
    const input = root.querySelector<HTMLInputElement>("input")!;

    const controller = enhanceCheckbox(root, { description: "Monthly updates" });
    expect(root.querySelector<HTMLElement>(".fui-checkbox")?.dataset.fuiComponent).toBe("checkbox");
    expect(input.classList).toContain("fui-native-checkbox");
    expect(controller.api.get().checked).toBe(true);

    input.click();
    await flushMachine();
    expect(controller.api.get().checked).toBe(false);

    controller.destroy();
    expect(root.className).toBe("fui-field consumer-root");
    expect(root.querySelector(":scope > .fui-checkbox")).not.toBeNull();
    expect(input.checked).toBe(true);
  });
});

async function flushMachine(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
