import type { FuiItem } from "./items.js";
import { normalizeItems } from "./items.js";

export interface NativeSelectSource {
  readonly items: FuiItem[];
  readonly placeholder: string | undefined;
  readonly value: string[];
}

/** Finds the single native select that acts as an enhanced component's source. */
export function requireNativeSelect(root: HTMLElement, component: string): HTMLSelectElement {
  const selects = Array.from(root.querySelectorAll<HTMLSelectElement>("select"));

  if (selects.length !== 1) {
    throw new Error(
      `[Faisceau UI] ${component} enhancement requires exactly one native <select> inside the provided container; found ${selects.length}.`,
    );
  }

  return selects[0];
}

/** Reads items, placeholder text and the initial value from native options. */
export function readNativeSelect(select: HTMLSelectElement): NativeSelectSource {
  const options = Array.from(select.options);
  const placeholder = options.find((option) => option.value === "")?.label.trim() || undefined;
  const items = normalizeItems(
    options
      .filter((option) => option.value !== "")
      .map((option) => {
        const group = option.parentElement;
        const description = option.dataset.description?.trim();
        const disabled =
          option.disabled || (group instanceof HTMLOptGroupElement && group.disabled);

        return {
          value: option.value,
          label: option.label.trim() || option.textContent.trim(),
          ...(disabled ? { disabled: true } : {}),
          ...(description ? { description } : {}),
        };
      }),
  );
  const value = Array.from(select.selectedOptions, (option) => option.value).filter(Boolean);

  return { items, placeholder, value };
}

/** Applies a value to the native select without emitting synthetic DOM events. */
export function setNativeSelectValue(select: HTMLSelectElement, value: readonly string[]): void {
  const selectedValues = new Set(value);

  for (const option of select.options) {
    option.selected = selectedValues.has(option.value);
  }

  if (!select.multiple && value.length === 0) {
    select.value = "";
  }
}

/** Returns every non-empty value currently selected by a native select. */
export function getNativeSelectValue(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions, (option) => option.value).filter(Boolean);
}

/** Takes an attribute snapshot that can be restored after progressive enhancement. */
export function captureAttributes(element: Element): () => void {
  const attributes = Array.from(element.attributes, ({ name, value }) => [name, value] as const);

  return () => {
    for (const attribute of Array.from(element.attributes)) {
      element.removeAttribute(attribute.name);
    }
    for (const [name, value] of attributes) element.setAttribute(name, value);
  };
}
