import { isInternalChangeEvent, markAsInternalChangeEvent } from "@zag-js/dom-query";

export function readValue(native: HTMLSelectElement): string[] {
  return Array.from(native.selectedOptions, (option) => option.value).filter(Boolean);
}

export function writeValue(native: HTMLSelectElement, value: string[]): void {
  for (const option of native.options)
    option.selected = value.includes(option.value) || (!value.length && option.value === "");
  if (!value.length && !native.querySelector('option[value=""]')) native.selectedIndex = -1;
}

/** Complete Zag's change-only notification with input, without echoing autofill. */
export function bindNativeEvents(
  native: HTMLSelectElement,
  getValue: () => string[],
  setValue: (value: string[]) => void,
  focus: () => void,
): () => void {
  let externalValue: string[] | undefined;
  const same = (a: string[], b: string[]) =>
    a.length === b.length && a.every((value) => b.includes(value));
  const onEvent = (event: Event) => {
    if (!isInternalChangeEvent(event)) {
      const value = readValue(native);
      if (!same(value, getValue())) {
        externalValue = value;
        setValue(value);
      }
      return;
    }
    if (event.type !== "change") return;
    if (externalValue && same(externalValue, getValue())) {
      externalValue = undefined;
      event.stopImmediatePropagation();
      return;
    }
    externalValue = undefined;
    native.dispatchEvent(
      markAsInternalChangeEvent(new Event("input", { bubbles: true, composed: true })),
    );
  };
  const onInvalid = (event: Event) => {
    event.preventDefault();
    focus();
  };
  native.addEventListener("input", onEvent, true);
  native.addEventListener("change", onEvent, true);
  native.addEventListener("invalid", onInvalid);
  return () => {
    native.removeEventListener("input", onEvent, true);
    native.removeEventListener("change", onEvent, true);
    native.removeEventListener("invalid", onInvalid);
  };
}
