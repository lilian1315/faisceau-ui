import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createCombobox, enhanceCombobox } from "./combobox.js";

afterEach(() => {
  document.body.replaceChildren();
});

describe("Combobox", () => {
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
    expect(controller.root.querySelectorAll('[data-fui-part="item"]:not([hidden])')).toHaveLength(
      0,
    );
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

  it("enhances only a container and its native select", async () => {
    const form = document.createElement("form");
    const root = document.createElement("section");
    root.className = "search-command";
    root.innerHTML = `
      <select aria-label="Commande" name="command">
        <option value="">Rechercher une commande</option>
        <option value="build" data-description="Compile le projet" selected>Build</option>
        <option value="test">Test</option>
      </select>
    `;
    form.append(root);
    document.body.append(form);

    const nativeSelect = root.querySelector("select")!;
    const nativeChange = vi.fn();
    nativeSelect.addEventListener("change", nativeChange);
    const controller = enhanceCombobox(root, { emptyLabel: "Aucune commande" });

    expect(controller.started).toBe(true);
    expect(requirePart(root, "native-select")).toBe(nativeSelect);
    expect(root.classList).toContain("search-command");
    expect(root.classList).toContain("fui-combobox");
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
    expect(nativeChange).toHaveBeenCalledOnce();

    nativeSelect.value = "build";
    nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await flushMachine();
    expect(controller.api.get().value).toEqual(["build"]);

    controller.destroy();
    expect(root.isConnected).toBe(true);
    expect(root.children).toHaveLength(1);
    expect(root.firstElementChild).toBe(nativeSelect);
    expect(root.className).toBe("search-command");
    expect(nativeSelect.name).toBe("command");
    expect(nativeSelect.value).toBe("build");
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
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
