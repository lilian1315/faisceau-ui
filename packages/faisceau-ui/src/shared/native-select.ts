import type { FuiItem } from "./items.ts";
import { normalizeItems } from "./items.ts";
import { effect } from "faisceau";

export interface NativeSelectSource {
  readonly items: FuiItem[];
  readonly placeholder: string | undefined;
  readonly value: string[];
}

export interface NativeSelectFieldProps {
  readonly autoComplete?: string;
  readonly disabled?: boolean;
  readonly form?: string;
  readonly multiple?: boolean;
  readonly name?: string;
  readonly required?: boolean;
}

export interface NativeSelectFieldController {
  /** Attaches behavior that requires the select to be associated with its form. */
  start(): void;
  /** Mirrors a machine-originated value and emits the native input/change contract once. */
  syncFromMachine(value: readonly string[]): void;
  /** Removes all synchronization and restores enhanced native markup. */
  destroy(): string[];
}

interface NativeSelectFieldOptions {
  readonly focusTarget: HTMLElement;
  readonly getValue: () => readonly string[];
  readonly props: NativeSelectFieldProps;
  readonly resetValue: readonly string[];
  readonly restore?: () => void;
  readonly select: HTMLSelectElement;
  readonly setValue: (value: string[]) => void;
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

/**
 * Owns the native form protocol shared by collection fields.
 *
 * Machine changes update the native select and emit bubbling `input` and `change`
 * events. Native changes update the machine without echoing synthetic events.
 */
export function createNativeSelectField(
  options: NativeSelectFieldOptions,
): NativeSelectFieldController {
  const { focusTarget, getValue, props, resetValue, restore, select, setValue } = options;
  configureNativeSelect(select, props);

  let destroyed = false;
  let form: HTMLFormElement | null = null;
  let started = false;
  let syncingFromNative = false;

  const handleNativeChange = (event: Event): void => {
    if (isZagInternalChangeEvent(event)) {
      event.stopImmediatePropagation();
      return;
    }
    if (syncingFromNative) return;
    const value = getNativeSelectValue(select);
    if (valuesEqual(value, getValue())) return;

    syncingFromNative = true;
    try {
      setValue(value);
    } finally {
      syncingFromNative = false;
    }
  };
  const focusVisualControl = (event?: Event): void => {
    event?.preventDefault();
    focusTarget.focus({ preventScroll: true });
  };
  const handleFormReset = (): void => {
    queueMicrotask(() => {
      if (destroyed) return;
      const value = [...resetValue];
      setNativeSelectValue(select, value);
      if (valuesEqual(value, getValue())) return;

      syncingFromNative = true;
      try {
        setValue(value);
      } finally {
        syncingFromNative = false;
      }
    });
  };

  select.addEventListener("input", handleNativeChange, true);
  select.addEventListener("change", handleNativeChange, true);
  select.addEventListener("focus", focusVisualControl);
  select.addEventListener("invalid", focusVisualControl);

  const stopValueSync = effect(() => {
    setNativeSelectValue(select, getValue());
  });

  return {
    start() {
      if (destroyed || started) return;
      form = select.form;
      form?.addEventListener("reset", handleFormReset);
      started = true;
    },
    syncFromMachine(value) {
      const changed = !valuesEqual(value, getNativeSelectValue(select));
      setNativeSelectValue(select, value);
      if (!changed || syncingFromNative || destroyed) return;

      syncingFromNative = true;
      try {
        select.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      } finally {
        syncingFromNative = false;
      }
    },
    destroy() {
      if (destroyed) return getNativeSelectValue(select);
      destroyed = true;
      const value = getNativeSelectValue(select);

      stopValueSync();
      select.removeEventListener("input", handleNativeChange, true);
      select.removeEventListener("change", handleNativeChange, true);
      select.removeEventListener("focus", focusVisualControl);
      select.removeEventListener("invalid", focusVisualControl);
      form?.removeEventListener("reset", handleFormReset);
      restore?.();
      setNativeSelectValue(select, value);
      return value;
    },
  };
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

function configureNativeSelect(select: HTMLSelectElement, props: NativeSelectFieldProps): void {
  select.setAttribute("aria-hidden", "true");
  select.tabIndex = -1;
  if (props.name !== undefined) select.name = props.name;
  if (props.form !== undefined) select.setAttribute("form", props.form);
  if (props.disabled !== undefined) select.disabled = props.disabled;
  if (props.multiple !== undefined) select.multiple = props.multiple;
  if (props.required !== undefined) select.required = props.required;
  if (props.autoComplete !== undefined) select.setAttribute("autocomplete", props.autoComplete);
}

function valuesEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightValues = new Set(right);
  return left.every((value) => rightValues.has(value));
}

function isZagInternalChangeEvent(event: Event): boolean {
  return Object.prototype.hasOwnProperty.call(event, Symbol.for("zag.changeEvent"));
}
