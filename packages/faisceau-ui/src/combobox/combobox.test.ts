import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createCombobox, enhanceCombobox } from "./combobox.ts";

afterEach(() => {
  document.body.replaceChildren();
});

describe("Combobox", () => {
  it("reconciles its authoritative collection and retained item nodes", async () => {
    const controller = createCombobox({
      defaultValue: ["be"],
      items: [
        { label: "Belgique", value: "be" },
        { label: "France", value: "fr" },
      ],
      label: "Pays",
    }).mount(document.body);
    const retained = controller.root.querySelector<HTMLElement>(
      '.fui-combobox-item[data-value="be"]',
    )!;

    controller.setItems([
      { label: "Belgium", value: "be" },
      { label: "Switzerland", value: "ch" },
    ]);
    controller.api.get().setInputValue("");
    await flushMachine();

    expect(controller.root.querySelector('.fui-combobox-item[data-value="be"]')).toBe(retained);
    expect(retained.textContent).toContain("Belgium");
    expect(controller.api.get().collection.items.map((item) => item.value)).toEqual(["be", "ch"]);
    expect(
      Array.from(
        controller.root.querySelector<HTMLSelectElement>("select")!.options,
        (o) => o.value,
      ),
    ).toEqual(["", "be", "ch"]);
    controller.destroy();
  });
  it("filters its collection and exposes an empty state", async () => {
    const controller = createCombobox({
      description: "Choisissez une ville française",
      emptyLabel: "Aucun résultat",
      items: ["Paris", "Lyon", "Lille"],
      label: "Ville",
      placeholder: "Rechercher",
    }).mount(document.body);
    const label = requirePart<HTMLLabelElement>(controller.root, "label");
    const input = requirePart<HTMLInputElement>(controller.root, "input");
    const description = requirePart<HTMLElement>(controller.root, "description");
    expect(input.getAttribute("role")).toBe("combobox");
    expect(label.htmlFor).toBe(input.id);
    expect(input.getAttribute("aria-describedby")?.split(/\s+/)).toContain(description.id);

    controller.api.get().setInputValue("ly");
    await flushMachine();

    expect(controller.api.get().inputValue).toBe("ly");
    expect(requireItem(controller.root, "Lyon").hidden).toBe(false);
    expect(requireItem(controller.root, "Paris").hidden).toBe(true);
    expect(requirePart<HTMLElement>(controller.root, "empty").hidden).toBe(true);

    controller.api.get().setInputValue("xyz");
    await flushMachine();

    expect(requirePart<HTMLElement>(controller.root, "empty").hidden).toBe(false);
    expect(controller.root.querySelectorAll(".fui-combobox-item:not([hidden])")).toHaveLength(0);
    controller.destroy();
  });

  it("filters when a user types into the input", async () => {
    const controller = createCombobox({
      items: ["Paris", "Lyon", "Lille"],
      label: "Ville",
    }).mount(document.body);
    const input = requirePart<HTMLInputElement>(controller.root, "input");

    input.focus();
    input.value = "ly";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushMachine();

    expect(controller.api.get().inputValue).toBe("ly");
    expect(requireItem(controller.root, "Lyon").hidden).toBe(false);
    expect(requireItem(controller.root, "Paris").hidden).toBe(true);
    controller.destroy();
  });

  it("submits option values, validates, and follows form reset", async () => {
    const form = document.createElement("form");
    document.body.append(form);
    const controller = createCombobox({
      defaultValue: ["paris"],
      items: [
        { value: "paris", label: "Paris" },
        { value: "lyon", label: "Lyon" },
      ],
      label: "Ville",
      name: "city",
      required: true,
    }).mount(form);
    const nativeSelect = requirePart<HTMLSelectElement>(controller.root, "native-select");
    const input = requirePart<HTMLInputElement>(controller.root, "input");

    expect(input.name).toBe("");
    expect(new FormData(form).get("city")).toBe("paris");

    controller.api.get().setValue(["lyon"]);
    await flushMachine();
    expect(nativeSelect.value).toBe("lyon");
    expect(new FormData(form).get("city")).toBe("lyon");

    form.reset();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["paris"]);
    expect(new FormData(form).get("city")).toBe("paris");

    controller.api.get().clearValue();
    await flushMachine();
    expect(nativeSelect.validity.valueMissing).toBe(true);
    expect(form.checkValidity()).toBe(false);
    expect(document.activeElement).toBe(input);
    controller.destroy();
  });

  it("renders removable values and submits multiple selections", async () => {
    const form = document.createElement("form");
    document.body.append(form);
    const controller = createCombobox({
      defaultValue: ["paris"],
      items: [
        { value: "paris", label: "Paris" },
        { value: "lyon", label: "Lyon" },
        { value: "lille", label: "Lille" },
      ],
      label: "Villes",
      multiple: true,
      name: "cities",
    }).mount(form);
    const input = requirePart<HTMLInputElement>(controller.root, "input");
    const nativeSelect = requirePart<HTMLSelectElement>(controller.root, "native-select");

    expect(nativeSelect.multiple).toBe(true);
    expect(controller.root.querySelector(".fui-combobox")?.hasAttribute("data-fui-multiple")).toBe(
      true,
    );
    expect(
      controller.root.querySelector('[role="listbox"]')?.getAttribute("aria-multiselectable"),
    ).toBe("true");
    expect(requireTags(controller.root)).toEqual(["Paris"]);
    const parisRemove = requirePart<HTMLButtonElement>(controller.root, "tag-remove", "paris");
    expect(parisRemove.getAttribute("aria-label")).toBe("Remove Paris");
    expect(parisRemove.querySelector('svg[data-fui-icon="x"]')).not.toBeNull();

    controller.api.get().setOpen(true);
    await flushMachine();
    requireItem(controller.root, "lyon").click();
    await flushMachine();

    expect(controller.api.get().open).toBe(true);
    expect(controller.api.get().inputValue).toBe("");
    expect(controller.api.get().value).toEqual(["paris", "lyon"]);
    expect(requireTags(controller.root)).toEqual(["Paris", "Lyon"]);
    expect(new FormData(form).getAll("cities")).toEqual(["paris", "lyon"]);

    parisRemove.click();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["lyon"]);
    expect(document.activeElement).toBe(input);
    expect(new FormData(form).getAll("cities")).toEqual(["lyon"]);

    form.reset();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["paris"]);
    expect(requireTags(controller.root)).toEqual(["Paris"]);
    expect(new FormData(form).getAll("cities")).toEqual(["paris"]);
    controller.destroy();
  });

  it("enhances a fully-authored Field and restores caller-owned markup", async () => {
    const form = document.createElement("form");
    const root = createComboboxFieldMarkup({
      defaultValue: ["build"],
      emptyLabel: "Aucune commande",
      items: [
        { description: "Compile le projet", label: "Build", value: "build" },
        { label: "Test", value: "test" },
      ],
      label: "Commande",
      name: "command",
      placeholder: "Rechercher une commande",
    });
    root.classList.add("search-command");
    form.append(root);
    document.body.append(form);

    const nativeSelect = root.querySelector("select")!;
    const nativeInput = vi.fn();
    const nativeChange = vi.fn();
    nativeSelect.addEventListener("input", nativeInput);
    nativeSelect.addEventListener("change", nativeChange);
    const controller = enhanceCombobox(root);

    expect(controller.started).toBe(true);
    expect(requirePart(root, "native-select")).toBe(nativeSelect);
    expect(root.classList).toContain("search-command");
    expect(root.classList).toContain("fui-field");
    expect(root.querySelector(":scope > .fui-combobox")).not.toBeNull();
    expect(requirePart(root, "item-description").classList).toContain(
      "fui-combobox-item-description",
    );
    expect(requirePart(root, "label").textContent).toBe("Commande");
    const input = requirePart<HTMLInputElement>(root, "input");
    expect(requirePart<HTMLLabelElement>(root, "label").htmlFor).toBe(input.id);
    expect(nativeSelect.getAttribute("aria-hidden")).toBe("true");
    expect(nativeSelect.tabIndex).toBe(-1);
    expect(input.placeholder).toBe("Rechercher une commande");
    expect(controller.api.get().value).toEqual(["build"]);
    expect(new FormData(form).get("command")).toBe("build");

    controller.api.get().setValue(["test"]);
    await flushMachine();
    expect(nativeSelect.value).toBe("test");
    expect(new FormData(form).get("command")).toBe("test");
    expect(nativeInput).toHaveBeenCalledOnce();
    expect(nativeChange).toHaveBeenCalledOnce();

    nativeSelect.value = "build";
    nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await flushMachine();
    expect(controller.api.get().value).toEqual(["build"]);
    expect(nativeInput).toHaveBeenCalledOnce();
    expect(nativeChange).toHaveBeenCalledTimes(2);

    controller.destroy();
    expect(root.isConnected).toBe(true);
    expect(root.className).toBe("fui-field search-command");
    expect(nativeSelect.name).toBe("command");
    expect(nativeSelect.value).toBe("build");
  });

  it("derives multiple mode and selected tags from enhanced native markup", async () => {
    const form = document.createElement("form");
    const root = createComboboxFieldMarkup({
      defaultValue: ["build", "test"],
      items: [
        { label: "Build", value: "build" },
        { label: "Check", value: "check" },
        { label: "Test", value: "test" },
      ],
      label: "Commandes",
      multiple: true,
      name: "commands",
    });
    form.append(root);
    document.body.append(form);

    const nativeSelect = root.querySelector("select")!;
    const controller = enhanceCombobox(root);

    expect(controller.api.get().multiple).toBe(true);
    expect(controller.api.get().value).toEqual(["build", "test"]);
    expect(requireTags(root)).toEqual(["Build", "Test"]);
    expect(new FormData(form).getAll("commands")).toEqual(["build", "test"]);

    for (const option of nativeSelect.options) {
      option.selected = option.value === "check" || option.value === "test";
    }
    nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await flushMachine();
    expect(controller.api.get().value).toEqual(["check", "test"]);
    expect(requireTags(root)).toEqual(["Check", "Test"]);
    controller.destroy();
  });
});

function requirePart<T extends Element = HTMLElement>(
  root: ParentNode,
  part: string,
  value?: string,
): T {
  const valueSelector = value === undefined ? "" : `[data-value="${value}"]`;
  const className =
    part === "label" || part === "description" || part === "error"
      ? `fui-field-${part}`
      : part === "native-select"
        ? "fui-native-select"
        : `fui-combobox-${part}`;
  const element = root.querySelector<T>(`.${className}${valueSelector}`);
  if (!element) throw new Error(`Missing test part: ${part}`);
  return element;
}

function requireTags(root: ParentNode): string[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(".fui-combobox-tag-label"),
    (element) => element.textContent ?? "",
  );
}

function requireItem(root: ParentNode, value: string): HTMLElement {
  const item = root.querySelector<HTMLElement>(`.fui-combobox-item[data-value="${value}"]`);
  if (!item) throw new Error(`Missing test item: ${value}`);
  return item;
}

function createComboboxFieldMarkup(options: Parameters<typeof createCombobox>[0]): HTMLElement {
  const template = createCombobox(options);
  const root = template.root.cloneNode(true) as HTMLElement;
  template.destroy();
  const selectedValues = new Set(options.defaultValue ?? options.value ?? []);
  for (const option of root.querySelector<HTMLSelectElement>("select")?.options ?? []) {
    option.selected = selectedValues.has(option.value);
  }
  return root;
}

async function flushMachine(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
