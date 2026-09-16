import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import "../styles/index.scss";
import { createSelect, enhanceSelect } from "./select.ts";

afterEach(() => {
  document.body.replaceChildren();
});

describe("Select3", () => {
  it("can mount while its target is still detached, as Storybook render requires", () => {
    const host = document.createElement("div");
    const controller = createSelect({ items: ["One", "Two"], label: "Detached select" });

    expect(() => controller.mount(host)).not.toThrow();
    expect(controller.started).toBe(true);
    controller.destroy();
  });

  it("builds a self-contained tree with a native select, trigger, and items", () => {
    const controller = createSelect({
      description: "Pick one",
      items: ["One", "Two"],
      label: "Value",
      placeholder: "Choose",
    }).mount(document.body);

    expect(controller.root.tagName).toBe("DIV");
    expect(controller.root.classList.contains("fui-select")).toBe(true);
    expect(controller.root.querySelector("select.fui-select-native-select")).not.toBeNull();
    expect(controller.root.querySelector(".fui-select-trigger")).not.toBeNull();
    expect(controller.root.querySelector(".fui-select-value")?.textContent).toBe("Choose");
    expect(controller.root.querySelector("label.fui-field-label")?.textContent).toBe("Value");
    expect(controller.root.querySelector("p.fui-field-description")?.textContent).toBe("Pick one");
    controller.destroy();
    expect(controller.root.isConnected).toBe(false);
  });

  it("selects an item and submits its native value", async () => {
    const onValueChange = vi.fn();
    const form = document.createElement("form");
    document.body.append(form);
    const controller = createSelect({
      items: [
        { value: "fr", label: "France" },
        { value: "be", label: "Belgique" },
      ],
      label: "Pays",
      name: "country",
      onValueChange,
      placeholder: "Choisir",
    }).mount(form);
    const nativeSelect = controller.root.querySelector<HTMLSelectElement>("select")!;
    const trigger = controller.root.querySelector<HTMLButtonElement>(".fui-select-trigger")!;

    trigger.click();
    await flushMachine();
    controller.root.querySelector<HTMLElement>('.fui-select-item[data-value="be"]')!.click();
    await flushMachine();

    expect(controller.api.get().value).toEqual(["be"]);
    expect(controller.root.querySelector(".fui-select-value")?.textContent).toBe("Belgique");
    expect(nativeSelect.value).toBe("be");
    expect(new FormData(form).get("country")).toBe("be");
    expect(onValueChange).toHaveBeenCalledOnce();
    controller.destroy();
  });

  it("emits one native change per visual interaction", async () => {
    const controller = createSelect({
      items: ["One", "Two"],
      label: "Value",
      name: "value",
    }).mount(document.body);
    const nativeSelect = controller.root.querySelector<HTMLSelectElement>("select")!;
    const nativeChange = vi.fn();
    nativeSelect.addEventListener("change", nativeChange);

    controller.root.querySelector<HTMLButtonElement>(".fui-select-trigger")!.click();
    await flushMachine();
    controller.root.querySelector<HTMLElement>('.fui-select-item[data-value="Two"]')!.click();
    await flushMachine();

    // The machine syncs the hidden select and emits its own bubbling change.
    expect(nativeChange).toHaveBeenCalledOnce();
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

    expect(controller.root.querySelector("select")!.multiple).toBe(true);

    controller.root.querySelector<HTMLButtonElement>(".fui-select-trigger")!.click();
    await flushMachine();
    controller.root.querySelector<HTMLElement>('.fui-select-item[data-value="be"]')!.click();
    await flushMachine();

    expect(controller.api.get().open).toBe(true);
    expect(controller.api.get().value).toEqual(["fr", "be"]);
    expect(new FormData(form).getAll("countries")).toEqual(["fr", "be"]);

    controller.root.querySelector<HTMLElement>('.fui-select-item[data-value="fr"]')!.click();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["be"]);
    expect(new FormData(form).getAll("countries")).toEqual(["be"]);
    controller.destroy();
  });

  it("follows form reset back to its initial value", async () => {
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
    }).mount(form);

    controller.api.get().setValue(["be"]);
    await flushMachine();
    expect(new FormData(form).get("country")).toBe("be");

    form.reset();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["fr"]);
    expect(controller.root.querySelector(".fui-select-value")?.textContent).toBe("France");
    expect(new FormData(form).get("country")).toBe("fr");
    controller.destroy();
  });

  it("enhances caller markup, starts immediately, then restores it", async () => {
    const root = document.createElement("div");
    root.className = "fui-select consumer-root";
    root.innerHTML = `<label class="fui-field-label">Pays</label><select class="fui-select-native-select" name="country"><option value="" data-placeholder="" hidden>Choisir</option><option value="fr" selected>France</option><option value="be">Belgique</option></select>`;
    document.body.append(root);
    const nativeSelect = root.querySelector<HTMLSelectElement>("select")!;

    const controller = enhanceSelect(root, {});
    expect(controller.started).toBe(true);
    expect(controller.api.get().value).toEqual(["fr"]);
    expect(root.querySelector(".fui-select-trigger")).not.toBeNull();
    expect(root.querySelector(".fui-select-value")?.textContent).toBe("France");

    controller.root.querySelector<HTMLButtonElement>(".fui-select-trigger")!.click();
    await flushMachine();
    controller.root.querySelector<HTMLElement>('.fui-select-item[data-value="be"]')!.click();
    await flushMachine();
    expect(controller.api.get().value).toEqual(["be"]);

    controller.destroy();
    expect(root.querySelector(".fui-select-trigger")).toBeNull();
    expect(root.querySelector(".fui-select-positioner")).toBeNull();
    expect(root.className).toBe("fui-select consumer-root");
    expect(root.querySelector("label.fui-field-label")?.textContent).toBe("Pays");
    expect(nativeSelect.name).toBe("country");
    expect(nativeSelect.value).toBe("be");
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

    controller.root.querySelector<HTMLButtonElement>(".fui-select-trigger")!.click();
    await flushMachine();

    const list = controller.root.querySelector<HTMLElement>(".fui-select-list")!;
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

  it("uses Lucide icons and only authors fui-prefixed classes", () => {
    const controller = createSelect({ items: ["One", "Two"], label: "Value" });
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

async function flushMachine(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
