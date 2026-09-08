import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createSelect, enhanceSelect } from "./select.ts";

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
    const nativeInput = vi.fn();
    const nativeChange = vi.fn();
    nativeSelect.addEventListener("input", nativeInput);
    nativeSelect.addEventListener("change", nativeChange);
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
    expect(nativeInput).toHaveBeenCalledOnce();
    expect(nativeChange).toHaveBeenCalledOnce();

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
    const trigger = requirePart<HTMLButtonElement>(controller.root, "trigger");

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
    expect(document.activeElement).toBe(trigger);
    controller.destroy();
  });

  it("selects, deselects, and submits multiple values without closing", async () => {
    const form = document.createElement("form");
    document.body.append(form);
    const controller = createSelect({
      defaultValue: ["fr"],
      items: [
        { value: "fr", label: "France" },
        { value: "be", label: "Belgique" },
        { value: "ch", label: "Suisse" },
      ],
      label: "Pays",
      multiple: true,
      name: "countries",
    }).mount(form);
    const nativeSelect = requirePart<HTMLSelectElement>(controller.root, "native-select");

    expect(nativeSelect.multiple).toBe(true);
    expect(controller.root.hasAttribute("data-fui-multiple")).toBe(true);
    expect(
      controller.root.querySelector('[role="listbox"]')?.getAttribute("aria-multiselectable"),
    ).toBe("true");

    requirePart<HTMLButtonElement>(controller.root, "trigger").click();
    await flushMachine();
    requireItem(controller.root, "be").click();
    await flushMachine();

    expect(controller.api.get().open).toBe(true);
    expect(controller.api.get().value).toEqual(["fr", "be"]);
    expect(requirePart(controller.root, "value").textContent).toBe("France, Belgique");
    expect(new FormData(form).getAll("countries")).toEqual(["fr", "be"]);

    requireItem(controller.root, "fr").click();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["be"]);
    expect(new FormData(form).getAll("countries")).toEqual(["be"]);

    form.reset();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["fr"]);
    expect(new FormData(form).getAll("countries")).toEqual(["fr"]);
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
    const nativeChange = vi.fn();
    nativeSelect.addEventListener("change", nativeChange);
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
    expect(nativeChange).toHaveBeenCalledOnce();

    controller.destroy();
    expect(root.isConnected).toBe(true);
    expect(root.children).toHaveLength(1);
    expect(root.firstElementChild).toBe(nativeSelect);
    expect(root.className).toBe("product-field");
    expect(nativeSelect.name).toBe("mode");
    expect(nativeSelect.value).toBe("expert");
  });

  it("derives multiple mode from enhanced native markup", async () => {
    const form = document.createElement("form");
    const root = document.createElement("div");
    root.innerHTML = `
      <select aria-label="Pays" name="countries" multiple>
        <option value="fr" selected>France</option>
        <option value="be" selected>Belgique</option>
        <option value="ch">Suisse</option>
      </select>
    `;
    form.append(root);
    document.body.append(form);

    const nativeSelect = root.querySelector("select")!;
    const nativeChange = vi.fn();
    nativeSelect.addEventListener("change", nativeChange);
    const controller = enhanceSelect(root);

    expect(controller.api.get().multiple).toBe(true);
    expect(controller.api.get().value).toEqual(["fr", "be"]);
    expect(new FormData(form).getAll("countries")).toEqual(["fr", "be"]);

    for (const option of nativeSelect.options) option.selected = option.value === "ch";
    nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await flushMachine();
    expect(controller.api.get().value).toEqual(["ch"]);
    expect(new FormData(form).getAll("countries")).toEqual(["ch"]);
    expect(nativeChange).toHaveBeenCalledOnce();
    controller.destroy();
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
    }).mount(document.body);
    const aligned = createSelect({
      defaultValue: ["One"],
      items: ["One"],
      label: "Aligned",
    }).mount(document.body);
    const multiple = createSelect({
      alignItemWithTrigger: true,
      items: ["One", "Two"],
      label: "Multiple",
      multiple: true,
    }).mount(document.body);

    regular.api.get().setOpen(true);
    aligned.api.get().setOpen(true);
    multiple.api.get().setOpen(true);
    await flushPositioning();

    expect(aligned.api.get().open).toBe(true);
    expect(requirePart(aligned.root, "content").hasAttribute("data-align-with-trigger")).toBe(true);
    expect(requirePart(regular.root, "content").hasAttribute("data-align-with-trigger")).toBe(
      false,
    );
    expect(requirePart(multiple.root, "content").hasAttribute("data-align-with-trigger")).toBe(
      false,
    );

    regular.destroy();
    aligned.destroy();
    multiple.destroy();
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

  it("reconciles items, native options, order, and invalidated selection", async () => {
    const controller = createSelect({
      defaultValue: ["be"],
      items: ["France", { label: "Belgique", value: "be" }],
      label: "Pays",
      name: "country",
    }).mount(document.body);
    const retained = requireItem(controller.root, "be");
    const nativeSelect = requirePart<HTMLSelectElement>(controller.root, "native-select");
    const nativeChange = vi.fn();
    nativeSelect.addEventListener("change", nativeChange);

    controller.setItems([
      { description: "Updated", label: "Belgium", value: "be" },
      { label: "Switzerland", value: "ch" },
    ]);
    await flushMachine();

    expect(requireItem(controller.root, "be")).toBe(retained);
    expect(retained.textContent).toContain("Belgium");
    expect(Array.from(nativeSelect.options, (o) => o.value)).toEqual(["", "be", "ch"]);
    controller.setItems([{ label: "Switzerland", value: "ch" }]);
    await flushMachine();
    expect(controller.api.get().value).toEqual([]);
    expect(nativeChange).toHaveBeenCalledOnce();
  });

  it("restores enhanced options after dynamic updates", () => {
    const root = document.createElement("div");
    root.innerHTML = '<select aria-label="Country"><option value="fr">France</option></select>';
    document.body.append(root);
    const select = root.querySelector("select")!;
    const controller = enhanceSelect(root);
    controller.setItems([{ label: "Belgium", value: "be" }]);
    controller.destroy();
    expect(Array.from(select.options, (option) => [option.value, option.textContent])).toEqual([
      ["fr", "France"],
    ]);
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
