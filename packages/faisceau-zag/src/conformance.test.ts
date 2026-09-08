import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import * as checkbox from "@zag-js/checkbox";
import * as combobox from "@zag-js/combobox";
import * as tooltip from "@zag-js/tooltip";
import { signal } from "faisceau";

import { createZagMachine } from "./index.ts";

afterEach(() => {
  document.body.replaceChildren();
});

describe("Zag framework adapter conformance", () => {
  it("keeps a controlled Checkbox synchronized with a Faisceau signal", async () => {
    const checked = signal<checkbox.CheckedState>(false);
    const root = document.createElement("label");
    const control = document.createElement("span");
    const input = document.createElement("input");
    root.append(control, input);
    document.body.append(root);

    const controller = createZagMachine(
      checkbox.machine as checkbox.Machine,
      () => ({
        checked: checked.get(),
        id: "terms",
        onCheckedChange: ({ checked: nextChecked }: checkbox.CheckedChangeDetails) => {
          checked.set(nextChecked);
        },
      }),
      checkbox.connect,
    );
    controller.bind(root, (api) => api.getRootProps());
    controller.bind(control, (api) => api.getControlProps());
    controller.bind(input, (api) => api.getHiddenInputProps());
    controller.start();

    control.click();
    await tick();

    expect(checked.get()).toBe(true);
    expect(controller.api.get().checked).toBe(true);
    expect(input.checked).toBe(true);

    checked.set(false);
    expect(controller.api.get().checked).toBe(false);
    expect(input.checked).toBe(false);
    controller.destroy();
  });

  it("preserves Tooltip timer effects through start and destroy", async () => {
    const trigger = document.createElement("button");
    const positioner = document.createElement("div");
    const content = document.createElement("div");
    const onOpenChange = vi.fn();
    positioner.append(content);
    document.body.append(trigger, positioner);

    const controller = createZagMachine(
      tooltip.machine as tooltip.Machine,
      { closeDelay: 10, id: "help", onOpenChange, openDelay: 10 },
      tooltip.connect,
    );
    controller.bind(trigger, (api) => api.getTriggerProps());
    controller.bind(positioner, (api) => api.getPositionerProps());
    controller.bind(content, (api) => api.getContentProps());
    controller.start();

    trigger.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
    expect(controller.api.get().open).toBe(false);
    await wait(20);
    expect(controller.api.get().open).toBe(true);
    expect(content.dataset.state).toBe("open");
    expect(onOpenChange).toHaveBeenCalledOnce();

    trigger.dispatchEvent(
      new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse" }),
    );
    controller.destroy();
    await wait(20);
    expect(content.hasAttribute("data-state")).toBe(false);
    expect(onOpenChange).toHaveBeenCalledOnce();
  });

  it("keeps controlled Combobox values reactive while binding a collection", async () => {
    const items = [
      { label: "Paris", value: "paris" },
      { label: "Lyon", value: "lyon" },
    ];
    const collection = combobox.collection({
      items,
      itemToString: (item) => item.label,
      itemToValue: (item) => item.value,
    });
    const value = signal<string[]>([]);
    const input = document.createElement("input");
    document.body.append(input);

    const controller = createZagMachine(
      combobox.machine as combobox.Machine<(typeof items)[number]>,
      () => ({
        collection,
        id: "city",
        onValueChange: (details: combobox.ValueChangeDetails<(typeof items)[number]>) => {
          value.set(details.value);
        },
        value: value.get(),
      }),
      combobox.connect,
    );
    controller.bind(input, (api) => api.getInputProps());
    controller.start();

    controller.api.get().setValue(["lyon"]);
    await tick();

    expect(value.get()).toEqual(["lyon"]);
    expect(controller.api.get().value).toEqual(["lyon"]);
    expect(controller.api.get().collection.items).toEqual(items);
    expect(input.getAttribute("role")).toBe("combobox");
    controller.destroy();
  });
});

function wait(delay: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
