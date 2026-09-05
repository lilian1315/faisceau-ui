import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createSelect, enhanceSelect } from "./select.js";

afterEach(() => {
  document.body.replaceChildren();
});

describe("Select", () => {
  it("creates, mounts, selects an item, and submits its native value", async () => {
    const onValueChange = vi.fn();
    const form = document.createElement("form");
    document.body.append(form);
    const controller = createSelect({
      items: [
        { value: "fr", label: "France" },
        { value: "be", label: "Belgique" },
      ],
      errorMessage: "Sélection requise",
      label: "Pays",
      name: "country",
      onValueChange,
      placeholder: "Choisir",
    });

    expect(controller.started).toBe(false);
    expect(controller.root.isConnected).toBe(false);

    controller.mount(form);
    const label = requirePart<HTMLLabelElement>(controller.root, "label");
    const nativeSelect = requirePart<HTMLSelectElement>(controller.root, "native-select");
    const trigger = requirePart<HTMLButtonElement>(controller.root, "trigger");
    const error = requirePart<HTMLElement>(controller.root, "error");
    expect(label.htmlFor).toBe(nativeSelect.id);
    expect(trigger.getAttribute("aria-labelledby")?.split(/\s+/)).toContain(label.id);
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    expect(trigger.getAttribute("aria-describedby")?.split(/\s+/)).toContain(error.id);
    trigger.click();
    await flushMachine();

    requireItem(controller.root, "be").click();
    await flushMachine();

    expect(controller.api.get().value).toEqual(["be"]);
    expect(requirePart(controller.root, "value").textContent).toBe("Belgique");
    expect(new FormData(form).get("country")).toBe("be");
    expect(onValueChange).toHaveBeenCalledOnce();

    controller.destroy();
    expect(controller.root.isConnected).toBe(false);
  });

  it("uses native required validation and follows form reset", async () => {
    const form = document.createElement("form");
    document.body.append(form);
    const controller = createSelect({
      defaultValue: ["fr"],
      items: [
        { value: "fr", label: "France" },
        { value: "be", label: "Belgique" },
      ],
      label: "Pays",
      name: "country",
      required: true,
    }).mount(form);
    const nativeSelect = requirePart<HTMLSelectElement>(controller.root, "native-select");

    controller.api.get().setValue(["be"]);
    await flushMachine();
    expect(new FormData(form).get("country")).toBe("be");

    form.reset();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["fr"]);
    expect(new FormData(form).get("country")).toBe("fr");

    controller.api.get().clearValue();
    await flushMachine();
    expect(nativeSelect.validity.valueMissing).toBe(true);
    expect(form.checkValidity()).toBe(false);
    controller.destroy();
  });

  it("enhances only a container and its native select", async () => {
    const form = document.createElement("form");
    const root = document.createElement("div");
    root.className = "product-field";
    root.setAttribute("data-owner", "application");
    root.innerHTML = `
      <select aria-label="Mode" name="mode" required>
        <option value="">Choisir un mode</option>
        <option value="simple" data-description="Réglages essentiels" selected>Simple</option>
        <option value="expert">Expert</option>
      </select>
    `;
    form.append(root);
    document.body.append(form);

    const nativeSelect = root.querySelector("select")!;
    const controller = enhanceSelect(root);
    const trigger = requirePart<HTMLButtonElement>(root, "trigger");

    expect(controller.started).toBe(true);
    expect(controller.root).toBe(root);
    expect(requirePart(root, "native-select")).toBe(nativeSelect);
    expect(root.classList).toContain("product-field");
    expect(root.classList).toContain("fui-select");
    expect(root.getAttribute("data-owner")).toBe("application");
    expect(requirePart(root, "item-description").classList).toContain(
      "fui-select-item-description",
    );
    expect(requirePart(root, "label").textContent).toBe("Mode");
    const label = requirePart<HTMLLabelElement>(root, "label");
    expect(label.htmlFor).toBe(nativeSelect.id);
    expect(trigger.getAttribute("aria-labelledby")?.split(/\s+/)).toContain(label.id);
    expect(nativeSelect.getAttribute("aria-hidden")).toBe("true");
    expect(nativeSelect.tabIndex).toBe(-1);
    expect(requirePart(root, "value").textContent).toBe("Simple");
    expect(controller.api.get().value).toEqual(["simple"]);
    expect(new FormData(form).get("mode")).toBe("simple");

    trigger.click();
    await flushMachine();
    requireItem(root, "expert").click();
    await flushMachine();
    expect(nativeSelect.value).toBe("expert");
    expect(new FormData(form).get("mode")).toBe("expert");

    controller.destroy();
    expect(root.isConnected).toBe(true);
    expect(root.children).toHaveLength(1);
    expect(root.firstElementChild).toBe(nativeSelect);
    expect(root.className).toBe("product-field");
    expect(nativeSelect.name).toBe("mode");
    expect(nativeSelect.value).toBe("expert");
  });

  it("supports keyboard navigation through the list", async () => {
    const controller = createSelect({
      defaultValue: ["one"],
      items: [
        { value: "one", label: "One" },
        { value: "two", label: "Two" },
      ],
      label: "Value",
    }).mount(document.body);

    requirePart<HTMLButtonElement>(controller.root, "trigger").click();
    await flushMachine();

    const list = requirePart<HTMLElement>(controller.root, "list");
    list.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }),
    );
    list.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }),
    );
    await flushMachine();

    expect(controller.api.get().value).toEqual(["two"]);
    expect(controller.api.get().open).toBe(false);
    controller.destroy();
  });

  it("aligns the selected item by default and allows opting out", async () => {
    const regular = createSelect({
      alignItemWithTrigger: false,
      items: ["One"],
      label: "Regular",
    });
    const aligned = createSelect({
      defaultValue: ["One"],
      items: ["One"],
      label: "Aligned",
    }).mount(document.body);
    const alignedPositioner = requirePart<HTMLElement>(aligned.root, "positioner");

    expect(requirePart(regular.root, "positioner").hasAttribute("data-fui-item-aligned")).toBe(
      false,
    );
    expect(alignedPositioner.hasAttribute("data-fui-item-aligned")).toBe(true);

    requirePart<HTMLButtonElement>(aligned.root, "trigger").click();
    await flushPositioning();

    expect(aligned.api.get().open).toBe(true);
    expect(alignedPositioner.style.getPropertyValue("--x")).not.toBe("");
    expect(alignedPositioner.style.getPropertyValue("--y")).not.toBe("");

    regular.destroy();
    aligned.destroy();
  });

  it("uses Lucide icons and only authors fui-prefixed classes", () => {
    const controller = createSelect({ items: ["One", "Two"], label: "Value" });
    expect(requirePart(controller.root, "value").hasAttribute("data-placeholder-shown")).toBe(true);
    expect(controller.root.querySelector('svg[data-fui-icon="chevron-down"]')).not.toBeNull();
    expect(controller.root.querySelector('svg[data-fui-icon="check"]')).not.toBeNull();
    const classes = Array.from(controller.root.querySelectorAll("[class]"), (element) => [
      ...element.classList,
    ]).flat();

    expect(
      [...controller.root.classList, ...classes].every((name) => name.startsWith("fui-")),
    ).toBe(true);
    controller.destroy();
  });
});

function requirePart<T extends Element = HTMLElement>(root: ParentNode, part: string): T {
  const element = root.querySelector<T>(`[data-fui-part="${part}"]`);
  if (!element) throw new Error(`Missing test part: ${part}`);
  return element;
}

function requireItem(root: ParentNode, value: string): HTMLElement {
  const item = root.querySelector<HTMLElement>(`[data-fui-part="item"][data-value="${value}"]`);
  if (!item) throw new Error(`Missing test item: ${value}`);
  return item;
}

async function flushMachine(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function flushPositioning(): Promise<void> {
  await flushMachine();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}
