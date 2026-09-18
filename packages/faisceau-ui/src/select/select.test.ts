import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import "../styles/index.scss";
import { createSelect, enhanceSelect } from "./select.ts";

afterEach(() => {
  document.body.replaceChildren();
});

describe("Select3", () => {
  it("applies the field layout without an extra root class", () => {
    const host = document.createElement("div");
    host.style.width = "600px";
    document.body.append(host);
    const controller = createSelect({ items: ["One"], label: "Value" }).mount(host);
    try {
      const root = controller.root;
      const trigger = root.querySelector<HTMLElement>(".fui-select-trigger")!;
      expect(root.getBoundingClientRect().width).toBeLessThanOrEqual(240);
      expect(parseFloat(getComputedStyle(root).rowGap)).toBeGreaterThan(0);
      expect(trigger.getBoundingClientRect().width).toBeCloseTo(
        root.getBoundingClientRect().width,
        0,
      );
    } finally {
      controller.destroy();
    }
  });

  it("binds the chevron state and gives the popup an explicit width and layer", async () => {
    const controller = createSelect({ items: ["One", "Two"], label: "Value" }).mount(document.body);
    try {
      const indicator = controller.root.querySelector<HTMLElement>(".fui-select-indicator")!;
      expect(indicator.getAttribute("data-state")).toBe("closed");
      controller.api.get().setOpen(true);
      await vi.waitFor(() => expect(indicator.getAttribute("data-state")).toBe("open"));
      const content = controller.root.querySelector<HTMLElement>(".fui-select-content")!;
      const positioner = controller.root.querySelector<HTMLElement>(".fui-select-positioner")!;
      await vi.waitFor(() => {
        expect(content.getBoundingClientRect().width).toBeCloseTo(240, 0);
        expect(Number(getComputedStyle(positioner).zIndex)).toBeGreaterThanOrEqual(50);
      });
      controller.api.get().setOpen(false);
      await vi.waitFor(() => expect(indicator.getAttribute("data-state")).toBe("closed"));
    } finally {
      controller.destroy();
    }
  });

  it("keeps the selected text aligned after the opening animation", async () => {
    const controller = createSelect({
      defaultValue: ["two"],
      items: [
        { value: "one", label: "One", description: "First option" },
        { value: "two", label: "Two", description: "Second option" },
        { value: "three", label: "Three", description: "Third option" },
      ],
      label: "Value",
    }).mount(document.body);
    controller.root.style.position = "fixed";
    controller.root.style.top = "150px";
    controller.root.style.left = "100px";
    try {
      controller.api.get().setOpen(true);
      const content = controller.root.querySelector<HTMLElement>(".fui-select-content")!;
      await vi.waitFor(() => expect(content.hasAttribute("data-align-with-trigger")).toBe(true));
      await Promise.all(content.getAnimations().map((animation) => animation.finished));
      const selected = controller.root
        .querySelector('.fui-select-item[data-value="two"] .fui-select-item-text')!
        .getBoundingClientRect();
      const value = controller.root.querySelector(".fui-select-value")!.getBoundingClientRect();
      expect(Math.abs(selected.left - value.left)).toBeLessThanOrEqual(1);
      expect(getComputedStyle(content).transform).toBe("none");
      // Zag subtracts the scroller's border offset from the aligned height.
      // Allow that border plus one browser layout unit of rounding.
      const alignmentTolerance = parseFloat(getComputedStyle(content).borderTopWidth) + 1 / 64;
      expect(
        Math.abs(selected.top + selected.height / 2 - value.top - value.height / 2),
      ).toBeLessThanOrEqual(alignmentTolerance);
    } finally {
      controller.destroy();
    }
  });

  it("does not reserve a scrollbar for a short list", async () => {
    const controller = createSelect({ items: ["One", "Two"], label: "Value" }).mount(document.body);
    try {
      controller.api.get().setOpen(true);
      const list = controller.root.querySelector<HTMLElement>(".fui-select-list")!;
      await vi.waitFor(() => expect(list.clientHeight).toBeGreaterThan(0));
      expect(list.scrollHeight - list.clientHeight).toBeLessThanOrEqual(1);
    } finally {
      controller.destroy();
    }
  });

  it.each([true, false])(
    "keeps a constrained long list scrollable (alignment: %s)",
    async (alignItemWithTrigger) => {
      const controller = createSelect({
        alignItemWithTrigger,
        defaultValue: ["Item 20"],
        items: Array.from({ length: 60 }, (_, index) => `Item ${index + 1}`),
        label: "Value",
      }).mount(document.body);
      controller.root.style.position = "fixed";
      controller.root.style.top = "100px";
      const content = controller.root.querySelector<HTMLElement>(".fui-select-content")!;
      // Reproduce a popup whose visible height is constrained independently of its list.
      content.style.maxBlockSize = "120px";
      try {
        controller.api.get().setOpen(true);
        const list = controller.root.querySelector<HTMLElement>(".fui-select-list")!;
        await vi.waitFor(() => {
          expect(document.activeElement).toBe(list);
          expect(list.clientHeight).toBeGreaterThan(0);
          expect(list.getBoundingClientRect().bottom).toBeLessThanOrEqual(
            content.getBoundingClientRect().bottom,
          );
          expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
          expect(getComputedStyle(list).outlineStyle).toBe("solid");
        });
        list.dispatchEvent(
          new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "End" }),
        );
        await vi.waitFor(() => {
          expect(controller.api.get().highlightedValue).toBe("Item 60");
          const last = list.lastElementChild!.getBoundingClientRect();
          expect(last.bottom).toBeLessThanOrEqual(list.getBoundingClientRect().bottom + 1);
        });
        list.dispatchEvent(
          new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }),
        );
        await vi.waitFor(() => expect(controller.api.get().value).toEqual(["Item 60"]));
      } finally {
        controller.destroy();
      }
    },
  );

  it("repositions and reveals the selected item after reopening", async () => {
    const controller = createSelect({
      defaultValue: ["Item 1"],
      items: Array.from({ length: 40 }, (_, index) => `Item ${index + 1}`),
      label: "Value",
    }).mount(document.body);
    controller.root.style.position = "fixed";
    controller.root.style.top = "100px";
    try {
      const list = controller.root.querySelector<HTMLElement>(".fui-select-list")!;
      controller.api.get().setOpen(true);
      await vi.waitFor(() => expect(document.activeElement).toBe(list));
      controller.api.get().setValue(["Item 40"]);
      controller.api.get().setOpen(false);
      await vi.waitFor(() =>
        expect(controller.root.querySelector(".fui-select-content")).toHaveAttribute("hidden"),
      );
      controller.api.get().setOpen(true);
      await vi.waitFor(() => {
        const selected = controller.root.querySelector<HTMLElement>('[data-value="Item 40"]')!;
        const listRect = list.getBoundingClientRect();
        const selectedRect = selected.getBoundingClientRect();
        expect(selectedRect.top).toBeGreaterThanOrEqual(listRect.top - 1);
        expect(selectedRect.bottom).toBeLessThanOrEqual(listRect.bottom + 1);
      });
    } finally {
      controller.destroy();
    }
  });

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
