import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { FuiController } from "../types.ts";
import { createField, enhanceField } from "./field.ts";
import type { FieldControlFactory } from "./types.ts";

afterEach(() => document.body.replaceChildren());

describe("Field", () => {
  it("owns field anatomy and mounts its direct control child", () => {
    const factory = createTestFactory();
    const controller = createField({
      control: factory,
      description: "Supporting text",
      errorMessage: "Invalid value",
      label: "Value",
    });

    expect(controller.started).toBe(false);
    expect(controller.root.classList).toContain("fui-field");
    expect(controller.root.querySelector(":scope > .fui-test-control")).toBe(
      controller.control.root,
    );
    expect(controller.root.querySelector("[data-fui-part]")).toBeNull();

    controller.mount(document.body);
    expect(controller.started).toBe(true);
    expect(factory.start).toHaveBeenCalledOnce();
    controller.destroy();
    expect(controller.root.isConnected).toBe(false);
  });

  it("enhances strict class anatomy and restores caller-owned attributes", () => {
    const root = document.createElement("section");
    root.className = "fui-field consumer-field";
    root.innerHTML = `
      <label class="fui-field-label">Original label</label>
      <div class="fui-test-control"></div>
      <p class="fui-field-description">Original description</p>
    `;
    document.body.append(root);
    const factory = createTestFactory(true);
    const controller = enhanceField(root, {
      control: factory,
      description: "Enhanced description",
      label: "Enhanced label",
    });

    expect(controller.started).toBe(true);
    expect(factory.enhance).toHaveBeenCalledOnce();
    expect(root.querySelector(".fui-field-label")?.textContent).toBe("Enhanced label");
    controller.destroy();
    expect(root.className).toBe("fui-field consumer-field");
    expect(root.id).toBe("");
    expect(root.querySelector(".fui-field-label")?.textContent).toBe("Original label");
    expect(root.querySelector(".fui-field-description")?.textContent).toBe("Original description");
  });

  it("rejects missing structural classes before invoking the control factory", () => {
    const root = document.createElement("div");
    root.className = "fui-field";
    root.innerHTML = '<label class="fui-field-label">Value</label><div></div>';
    const factory = createTestFactory(true);

    expect(() => enhanceField(root, { control: factory })).toThrow(/\.fui-test-control/);
    expect(factory.enhance).not.toHaveBeenCalled();
    expect(root.querySelector("label")?.id).toBe("");
  });
});

function createTestFactory(started = false): FieldControlFactory<FuiController<unknown>> & {
  enhance: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
} {
  const start = vi.fn();
  const makeController = (root: HTMLElement, initiallyStarted: boolean): FuiController<unknown> => {
    let isStarted = initiallyStarted;
    return {
      api: { get: () => ({}), peek: () => ({}) },
      root,
      get started() {
        return isStarted;
      },
      destroy: vi.fn(),
      mount(target) {
        target.append(root);
        return this.start();
      },
      start() {
        start();
        isStarted = true;
        return this;
      },
    };
  };
  const enhance = vi.fn((root: HTMLElement) => makeController(root, started));
  return {
    create: () =>
      makeController(
        Object.assign(document.createElement("div"), { className: "fui-test-control" }),
        false,
      ),
    enhance,
    rootClass: "fui-test-control",
    start,
  };
}
