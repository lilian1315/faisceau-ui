import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { signal } from "faisceau";

import {
  captureAttributes,
  createNativeSelectField,
  getNativeSelectValue,
  readNativeSelect,
  setNativeSelectValue,
} from "./native-select.js";

afterEach(() => {
  document.body.replaceChildren();
});

describe("native select field", () => {
  it("distinguishes an explicit placeholder from a selectable empty value", () => {
    const select = document.createElement("select");
    select.innerHTML = `
      <option value="" data-placeholder selected>Choose a value</option>
      <option value="">No value</option>
      <option value="one">One</option>
    `;

    const source = readNativeSelect(select);
    expect(source.placeholder).toBe("Choose a value");
    expect(source.items.map(({ label, value }) => ({ label, value }))).toEqual([
      { label: "No value", value: "" },
      { label: "One", value: "one" },
    ]);
    expect(source.value).toEqual([]);

    setNativeSelectValue(select, [""]);
    expect(getNativeSelectValue(select)).toEqual([""]);
    expect(select.options[0]?.selected).toBe(false);
    expect(select.options[1]?.selected).toBe(true);

    setNativeSelectValue(select, []);
    expect(select.options[0]?.selected).toBe(true);
    expect(getNativeSelectValue(select)).toEqual([]);
  });

  it("rejects an invalid placeholder marker", () => {
    const select = document.createElement("select");
    select.innerHTML = '<option value="one" data-placeholder>One</option>';
    expect(() => readNativeSelect(select)).toThrow(/must have an empty value/);
  });

  it("synchronizes both directions and emits one native event pair for machine changes", () => {
    const { form, select, visualControl } = createFixture();
    const value = signal<string[]>(["one"]);
    const setValue = vi.fn((nextValue: string[]) => value.set(nextValue));
    const input = vi.fn();
    const change = vi.fn();
    select.addEventListener("input", input);
    select.addEventListener("change", change);

    const field = createNativeSelectField({
      focusTarget: visualControl,
      getValue: () => value.get(),
      props: { name: "choice", required: true },
      resetValue: ["one"],
      select,
      setValue,
    });
    field.start();

    field.syncFromMachine(["two"]);
    value.set(["two"]);

    expect(select.value).toBe("two");
    expect(new FormData(form).get("choice")).toBe("two");
    expect(input).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledOnce();
    expect(setValue).not.toHaveBeenCalled();

    const internalChange = new Event("change", { bubbles: true });
    Object.defineProperty(internalChange, Symbol.for("zag.changeEvent"), { value: true });
    select.dispatchEvent(internalChange);
    expect(change).toHaveBeenCalledOnce();

    select.value = "one";
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));

    expect(value.get()).toEqual(["one"]);
    expect(setValue).toHaveBeenCalledOnce();
    field.destroy();
  });

  it("owns reset, validation focus, restoration, and teardown", async () => {
    const { form, select, visualControl } = createFixture();
    select.className = "application-select";
    select.name = "original";
    const restore = captureAttributes(select);
    const value = signal<string[]>(["one"]);
    const setValue = vi.fn((nextValue: string[]) => value.set(nextValue));
    const field = createNativeSelectField({
      focusTarget: visualControl,
      getValue: () => value.get(),
      props: { disabled: false, multiple: false, name: "choice", required: true },
      resetValue: ["one"],
      restore,
      select,
      setValue,
    });
    field.start();

    expect(select.getAttribute("aria-hidden")).toBe("true");
    expect(select.tabIndex).toBe(-1);
    expect(select.name).toBe("choice");
    expect(select.required).toBe(true);

    field.syncFromMachine(["two"]);
    value.set(["two"]);
    form.reset();
    await flushMicrotasks();

    expect(value.get()).toEqual(["one"]);
    expect(select.value).toBe("one");

    select.dispatchEvent(new Event("invalid", { cancelable: true }));
    expect(document.activeElement).toBe(visualControl);

    field.syncFromMachine(["two"]);
    value.set(["two"]);
    expect(field.destroy()).toEqual(["two"]);
    expect(select.className).toBe("application-select");
    expect(select.name).toBe("original");
    expect(select.hasAttribute("aria-hidden")).toBe(false);
    expect(select.value).toBe("two");

    setValue.mockClear();
    select.value = "one";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    form.reset();
    await flushMicrotasks();
    expect(setValue).not.toHaveBeenCalled();
  });
});

function createFixture(): {
  form: HTMLFormElement;
  select: HTMLSelectElement;
  visualControl: HTMLButtonElement;
} {
  const form = document.createElement("form");
  const select = document.createElement("select");
  const one = new Option("One", "one", true, true);
  const two = new Option("Two", "two");
  const visualControl = document.createElement("button");
  visualControl.type = "button";
  select.append(one, two);
  form.append(select, visualControl);
  document.body.append(form);
  return { form, select, visualControl };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
