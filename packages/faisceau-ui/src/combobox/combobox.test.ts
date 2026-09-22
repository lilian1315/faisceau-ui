import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import "../styles/index.scss";
import { createCombobox, enhanceCombobox } from "./combobox.ts";

afterEach(() => {
  document.body.replaceChildren();
});

describe("Combobox", () => {
  it("can mount while its target is still detached, as Storybook render requires", () => {
    const host = document.createElement("div");
    const controller = createCombobox({ items: ["One", "Two"], label: "Detached combobox" });

    expect(() => controller.mount(host)).not.toThrow();
    expect(controller.started).toBe(true);
    controller.destroy();
  });

  it("builds a self-contained tree with a native select, input, trigger, and items", () => {
    const controller = createCombobox({
      description: "Pick one",
      emptyLabel: "Nothing found",
      items: ["One", "Two"],
      label: "Value",
      placeholder: "Search",
    }).mount(document.body);

    expect(controller.root.tagName).toBe("DIV");
    expect(controller.root.classList.contains("fui-combobox")).toBe(true);
    expect(controller.root.querySelector("select.fui-combobox-native-select")).not.toBeNull();
    expect(controller.root.querySelector("input.fui-combobox-input")).not.toBeNull();
    expect(controller.root.querySelector(".fui-combobox-trigger")).not.toBeNull();
    expect(controller.root.querySelector(".fui-combobox-clear-trigger")).not.toBeNull();
    expect(
      controller.root.querySelector<HTMLInputElement>(".fui-combobox-input")?.placeholder,
    ).toBe("Search");
    expect(controller.root.querySelector("label.fui-field-label")?.textContent).toBe("Value");
    expect(controller.root.querySelector("p.fui-field-description")?.textContent).toBe("Pick one");
    expect(controller.root.querySelector(".fui-combobox-empty")?.textContent).toBe("Nothing found");
    expect(controller.root.querySelectorAll(".fui-combobox-item[data-value]").length).toBe(2);
    controller.destroy();
    expect(controller.root.isConnected).toBe(false);
  });

  it("selects an item and submits its native value", async () => {
    const onValueChange = vi.fn();
    const form = document.createElement("form");
    document.body.append(form);
    const controller = createCombobox({
      items: [
        { value: "fr", label: "France" },
        { value: "be", label: "Belgique" },
      ],
      label: "Pays",
      name: "country",
      onValueChange,
      placeholder: "Rechercher",
    }).mount(form);
    const nativeSelect = controller.root.querySelector<HTMLSelectElement>("select")!;
    const input = controller.root.querySelector<HTMLInputElement>("input")!;

    // The filter input stays nameless; only the native select submits.
    expect(input.name).toBe("");
    expect(input.getAttribute("role")).toBe("combobox");

    controller.root.querySelector<HTMLButtonElement>(".fui-combobox-trigger")!.click();
    await flushMachine();
    controller.root.querySelector<HTMLElement>('.fui-combobox-item[data-value="be"]')!.click();
    await flushMachine();

    expect(controller.api.get().value).toEqual(["be"]);
    expect(nativeSelect.value).toBe("be");
    expect(new FormData(form).get("country")).toBe("be");
    expect(onValueChange).toHaveBeenCalledOnce();
    controller.destroy();
  });

  it("emits one native change per visual interaction", async () => {
    const controller = createCombobox({
      items: ["One", "Two"],
      label: "Value",
      name: "value",
    }).mount(document.body);
    const nativeSelect = controller.root.querySelector<HTMLSelectElement>("select")!;
    const nativeInput = vi.fn();
    const nativeChange = vi.fn();
    nativeSelect.addEventListener("input", nativeInput);
    nativeSelect.addEventListener("change", nativeChange);

    controller.root.querySelector<HTMLButtonElement>(".fui-combobox-trigger")!.click();
    await flushMachine();
    controller.root.querySelector<HTMLElement>('.fui-combobox-item[data-value="Two"]')!.click();
    await flushMachine();

    // Like Zag's hidden select, the machine emits its own bubbling change while
    // native listeners observe no input event.
    expect(nativeInput).not.toHaveBeenCalled();
    expect(nativeChange).toHaveBeenCalledOnce();
    controller.destroy();
  });

  it("follows external native changes without echoing events", async () => {
    const controller = createCombobox({
      items: [
        { value: "paris", label: "Paris" },
        { value: "lyon", label: "Lyon" },
      ],
      label: "Ville",
      name: "city",
    }).mount(document.body);
    const nativeSelect = controller.root.querySelector<HTMLSelectElement>("select")!;
    const nativeInput = vi.fn();
    const nativeChange = vi.fn();
    nativeSelect.addEventListener("input", nativeInput);
    nativeSelect.addEventListener("change", nativeChange);

    nativeSelect.value = "lyon";
    nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await flushMachine();

    expect(controller.api.get().value).toEqual(["lyon"]);
    // Only the dispatched event is observed; the sync back to the machine stays silent.
    expect(nativeInput).not.toHaveBeenCalled();
    expect(nativeChange).toHaveBeenCalledOnce();
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
    const input = controller.root.querySelector<HTMLInputElement>(".fui-combobox-input")!;
    const nativeSelect = controller.root.querySelector<HTMLSelectElement>("select")!;

    expect(nativeSelect.multiple).toBe(true);
    expect(controller.root.hasAttribute("data-fui-multiple")).toBe(true);
    expect(
      controller.root.querySelector('[role="listbox"]')?.getAttribute("aria-multiselectable"),
    ).toBe("true");
    expect(readTags(controller.root)).toEqual(["Paris"]);
    const parisRemove = controller.root.querySelector<HTMLButtonElement>(
      '.fui-combobox-tag-remove[data-value="paris"]',
    )!;
    expect(parisRemove.getAttribute("aria-label")).toBe("Remove Paris");
    expect(parisRemove.querySelector(".fui-icon--x")).not.toBeNull();

    controller.root.querySelector<HTMLButtonElement>(".fui-combobox-trigger")!.click();
    await flushMachine();
    controller.root.querySelector<HTMLElement>('.fui-combobox-item[data-value="lyon"]')!.click();
    await flushMachine();

    expect(controller.api.get().open).toBe(true);
    expect(controller.api.get().inputValue).toBe("");
    expect(controller.api.get().value).toEqual(["paris", "lyon"]);
    expect(readTags(controller.root)).toEqual(["Paris", "Lyon"]);
    expect(new FormData(form).getAll("cities")).toEqual(["paris", "lyon"]);

    parisRemove.click();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["lyon"]);
    expect(document.activeElement).toBe(input);
    expect(new FormData(form).getAll("cities")).toEqual(["lyon"]);

    form.reset();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["paris"]);
    expect(readTags(controller.root)).toEqual(["Paris"]);
    expect(new FormData(form).getAll("cities")).toEqual(["paris"]);
    controller.destroy();
  });

  it("follows form reset back to its initial value", async () => {
    const form = document.createElement("form");
    document.body.append(form);
    const controller = createCombobox({
      defaultValue: ["fr"],
      items: [
        { value: "fr", label: "France" },
        { value: "be", label: "Belgique" },
      ],
      label: "Pays",
      name: "country",
    }).mount(form);

    controller.api.get().setValue(["be"]);
    await flushMachine();
    expect(new FormData(form).get("country")).toBe("be");

    form.reset();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["fr"]);
    expect(new FormData(form).get("country")).toBe("fr");
    controller.destroy();
  });

  it("validates its native select and focuses the input on invalid submission", async () => {
    const form = document.createElement("form");
    document.body.append(form);
    const controller = createCombobox({
      items: [
        { value: "paris", label: "Paris" },
        { value: "lyon", label: "Lyon" },
      ],
      label: "Ville",
      name: "city",
      required: true,
    }).mount(form);
    const nativeSelect = controller.root.querySelector<HTMLSelectElement>("select")!;
    const input = controller.root.querySelector<HTMLInputElement>("input")!;

    controller.api.get().setValue(["lyon"]);
    await flushMachine();
    expect(new FormData(form).get("city")).toBe("lyon");

    controller.api.get().clearValue();
    await flushMachine();
    expect(nativeSelect.validity.valueMissing).toBe(true);
    // Interactive validation focuses the native control, which hands focus to
    // the visible input exactly like Zag's hidden select forwards it.
    expect(form.reportValidity()).toBe(false);
    expect(document.activeElement).toBe(input);
    controller.destroy();
  });

  it("follows its fieldset disabled state like Zag's form control tracking", async () => {
    const form = document.createElement("form");
    const fieldset = document.createElement("fieldset");
    form.append(fieldset);
    document.body.append(form);
    const controller = createCombobox({
      items: ["One", "Two"],
      label: "Value",
      name: "value",
    }).mount(fieldset);

    expect(controller.api.get().disabled).toBe(false);

    fieldset.disabled = true;
    await flushMachine();
    expect(controller.api.get().disabled).toBe(true);

    fieldset.disabled = false;
    await flushMachine();
    expect(controller.api.get().disabled).toBe(false);
    controller.destroy();
  });

  it("filters its collection and exposes an empty state", async () => {
    const controller = createCombobox({
      emptyLabel: "Aucun résultat",
      items: ["Paris", "Lyon", "Lille"],
      label: "Ville",
      placeholder: "Rechercher",
    }).mount(document.body);
    const label = controller.root.querySelector<HTMLLabelElement>("label")!;
    const input = controller.root.querySelector<HTMLInputElement>("input")!;
    expect(label.htmlFor).toBe(input.id);

    controller.api.get().setInputValue("ly");
    await flushMachine();

    expect(controller.api.get().inputValue).toBe("ly");
    expect(requireItem(controller.root, "Lyon").hidden).toBe(false);
    expect(requireItem(controller.root, "Paris").hidden).toBe(true);
    expect(controller.root.querySelector<HTMLElement>(".fui-combobox-empty")!.hidden).toBe(true);

    controller.api.get().setInputValue("xyz");
    await flushMachine();

    expect(controller.root.querySelector<HTMLElement>(".fui-combobox-empty")!.hidden).toBe(false);
    expect(controller.root.querySelectorAll(".fui-combobox-item:not([hidden])")).toHaveLength(0);
    controller.destroy();
  });

  it("filters when a user types into the input", async () => {
    const controller = createCombobox({
      items: ["Paris", "Lyon", "Lille"],
      label: "Ville",
    }).mount(document.body);
    const input = controller.root.querySelector<HTMLInputElement>("input")!;

    input.focus();
    input.value = "ly";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushMachine();

    expect(controller.api.get().inputValue).toBe("ly");
    expect(requireItem(controller.root, "Lyon").hidden).toBe(false);
    expect(requireItem(controller.root, "Paris").hidden).toBe(true);
    controller.destroy();
  });

  it("reconciles its authoritative collection and retained item nodes", async () => {
    const controller = createCombobox({
      defaultValue: ["be"],
      items: [
        { label: "Belgique", value: "be" },
        { label: "France", value: "fr" },
      ],
      label: "Pays",
    }).mount(document.body);
    const retained = requireItem(controller.root, "be");

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
        (option) => option.value,
      ),
    ).toEqual(["", "be", "ch"]);
    controller.destroy();
  });

  it("enhances caller markup, starts immediately, then restores it", async () => {
    const root = document.createElement("div");
    root.className = "fui-combobox consumer-root";
    root.innerHTML = `<label class="fui-field-label">Commande</label><select class="fui-combobox-native-select" name="command"><option value="" data-placeholder="" hidden>Rechercher</option><option value="build" selected>Build</option><option value="test">Test</option></select>`;
    document.body.append(root);
    const nativeSelect = root.querySelector<HTMLSelectElement>("select")!;

    const controller = enhanceCombobox(root, {});
    expect(controller.started).toBe(true);
    expect(controller.api.get().value).toEqual(["build"]);
    expect(root.querySelector(".fui-combobox-trigger")).not.toBeNull();
    expect(root.querySelector<HTMLInputElement>(".fui-combobox-input")?.placeholder).toBe(
      "Rechercher",
    );

    controller.root.querySelector<HTMLButtonElement>(".fui-combobox-trigger")!.click();
    await flushMachine();
    controller.root.querySelector<HTMLElement>('.fui-combobox-item[data-value="test"]')!.click();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["test"]);

    controller.destroy();
    expect(root.querySelector(".fui-combobox-trigger")).toBeNull();
    expect(root.querySelector(".fui-combobox-positioner")).toBeNull();
    expect(root.className).toBe("fui-combobox consumer-root");
    expect(root.querySelector("label.fui-field-label")?.textContent).toBe("Commande");
    expect(nativeSelect.name).toBe("command");
    expect(nativeSelect.value).toBe("test");
  });

  it("supports keyboard navigation through the list", async () => {
    const controller = createCombobox({
      defaultValue: ["one"],
      items: [
        { value: "one", label: "One" },
        { value: "two", label: "Two" },
      ],
      label: "Value",
    }).mount(document.body);
    const input = controller.root.querySelector<HTMLInputElement>("input")!;

    controller.root.querySelector<HTMLButtonElement>(".fui-combobox-trigger")!.click();
    await flushMachine();

    input.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }),
    );
    input.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }),
    );
    await flushMachine();

    expect(controller.api.get().value).toEqual(["two"]);
    expect(controller.api.get().open).toBe(false);
    controller.destroy();
  });

  it("uses mask icons and only authors fui-prefixed classes", () => {
    const controller = createCombobox({ items: ["One", "Two"], label: "Value" });
    expect(controller.root.querySelector(".fui-icon--chevron-down")).not.toBeNull();
    expect(controller.root.querySelector(".fui-icon--check")).not.toBeNull();
    const classes = Array.from(controller.root.querySelectorAll("[class]"), (element) => [
      ...element.classList,
    ]).flat();

    expect(
      [...controller.root.classList, ...classes].every((name) => name.startsWith("fui-")),
    ).toBe(true);
    controller.destroy();
  });
});

function readTags(root: ParentNode): string[] {
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

async function flushMachine(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
