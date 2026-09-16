import { h } from "@lilian1315/create-element";

import { createCheckIcon, createChevronDownIcon, createClearIcon } from "../shared/index.js";
import type { FuiItem } from "../shared/index.js";

export interface ComboboxControl {
  readonly control: HTMLElement;
  readonly field: HTMLElement;
  readonly selection: HTMLElement;
  readonly input: HTMLInputElement;
  readonly clearTrigger: HTMLButtonElement;
  readonly trigger: HTMLButtonElement;
}

export interface ComboboxPopup {
  readonly positioner: HTMLElement;
  readonly content: HTMLElement;
  readonly list: HTMLElement;
  readonly empty: HTMLElement;
}

/** Builds the visible control row: selected tags, filter input, clear, and trigger. */
export function buildControl(options: {
  clearLabel?: string;
  placeholder?: string;
}): ComboboxControl {
  const selection = h("span", {
    class: "fui-combobox-selection",
    hidden: true,
  });
  const input = h("input", {
    class: "fui-combobox-input",
    placeholder: options.placeholder,
    type: "text",
  }) as HTMLInputElement;
  const field = h("span", { class: "fui-combobox-field" }, selection, input);
  const clearTrigger = h(
    "button",
    {
      "aria-label": options.clearLabel ?? "Clear selection",
      class: "fui-combobox-clear-trigger",
      hidden: true,
      type: "button",
    },
    createClearIcon(),
  ) as HTMLButtonElement;
  const trigger = h(
    "button",
    { class: "fui-combobox-trigger", type: "button" },
    createChevronDownIcon(),
  ) as HTMLButtonElement;
  const control = h("div", { class: "fui-combobox-control" }, field, clearTrigger, trigger);
  return { control, field, selection, input, clearTrigger, trigger };
}

/** Builds the popup shell; items are rendered separately with {@link buildItem}. */
export function buildPopup(items: readonly FuiItem[], emptyLabel?: string): ComboboxPopup {
  const list = h("ul", { class: "fui-combobox-list" }, items.map(buildItem));
  const empty = h("p", { class: "fui-combobox-empty", hidden: true }, emptyLabel ?? "No results");
  const content = h("div", { class: "fui-combobox-content" }, list, empty);
  const positioner = h("div", { class: "fui-combobox-positioner" }, content);
  return { positioner, content, list, empty };
}

/** Builds one popup row for an item. */
export function buildItem(item: FuiItem): HTMLLIElement {
  const text = h("span", { class: "fui-combobox-item-text" }, item.label);
  const children: Node[] = [text];

  if (item.description) {
    children.push(h("span", { class: "fui-combobox-item-description" }, item.description));
  }

  children.push(h("span", { class: "fui-combobox-item-indicator" }, createCheckIcon()));

  return h(
    "li",
    {
      class: "fui-combobox-item",
      data: { disabled: item.disabled, value: item.value },
    },
    children,
  );
}

/** Builds the native select kept in the document as the submitted control. */
export function buildNativeSelect(
  items: readonly FuiItem[],
  options: {
    disabled?: boolean;
    form?: string;
    multiple?: boolean;
    name?: string;
    placeholder?: string;
    required?: boolean;
    value?: readonly string[];
  },
): HTMLSelectElement {
  const native = h("select", {
    "aria-hidden": true,
    class: "fui-combobox-native-select",
    disabled: options.disabled,
    multiple: options.multiple,
    name: options.name,
    required: options.required,
    tabindex: -1,
  }) as HTMLSelectElement;
  if (options.form !== undefined) native.setAttribute("form", options.form);
  hideNativeSelect(native);
  native.replaceChildren(
    ...buildOptions(items, options.placeholder, options.multiple, options.value ?? []),
  );
  return native;
}

/** Reconciles native options by value while preserving retained option nodes and selection. */
export function reconcileNativeSelectOptions(
  select: HTMLSelectElement,
  items: readonly FuiItem[],
  placeholder: string,
): void {
  const selected = new Set(getNativeSelectValue(select));
  const placeholderOption = findPlaceholderOption(select);
  const existing = new Map(
    Array.from(select.options)
      .filter((option) => option !== placeholderOption)
      .map((option) => [option.value, option]),
  );
  const empty = select.multiple ? null : (placeholderOption ?? new Option(placeholder, ""));
  const options = items.map((item) => {
    const option = existing.get(item.value) ?? new Option();
    option.value = item.value;
    option.textContent = item.label;
    option.disabled = item.disabled ?? false;
    option.selected = selected.has(item.value);
    if (item.description) option.dataset.description = item.description;
    else delete option.dataset.description;
    return option;
  });
  if (empty) {
    empty.textContent = placeholder;
    empty.dataset.placeholder = "";
    empty.hidden = true;
    empty.selected = selected.size === 0;
  }
  select.replaceChildren(...(empty ? [empty, ...options] : options));
}

/** Returns selected values, excluding only the explicitly-marked placeholder option. */
function getNativeSelectValue(select: HTMLSelectElement): string[] {
  const placeholder = findPlaceholderOption(select);
  return Array.from(select.selectedOptions)
    .filter((option) => option !== placeholder)
    .map((option) => option.value);
}

function findPlaceholderOption(select: HTMLSelectElement): HTMLOptionElement | undefined {
  return Array.from(select.options).find((option) => option.hasAttribute("data-placeholder"));
}

/** Visually hides the native select without removing it from the tab order or forms. */
export function hideNativeSelect(native: HTMLSelectElement): void {
  // Mirrors `visuallyHiddenStyle` from `@zag-js/dom-query`, which Zag spreads onto
  // its hidden select. The FUI stylesheet carries the same declarations as a fallback.
  Object.assign(native.style, {
    border: "0",
    clip: "rect(0 0 0 0)",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: "0",
    position: "absolute",
    width: "1px",
    whiteSpace: "nowrap",
    wordWrap: "normal",
  });
}

/** Builds native options, marking the placeholder and the selected values. */
export function buildOptions(
  items: readonly FuiItem[],
  placeholder: string | undefined,
  multiple: boolean | undefined,
  value: readonly string[],
): HTMLOptionElement[] {
  const selected = new Set(value);
  const options: HTMLOptionElement[] = [];

  if (!multiple) {
    const placeholderOption = h(
      "option",
      { data: { placeholder: "" }, value: "" },
      placeholder ?? "Select an option",
    ) as HTMLOptionElement;
    placeholderOption.hidden = true;
    placeholderOption.selected = selected.size === 0;
    // `defaultSelected` drives `form.reset()`; keep it aligned with the initial value.
    placeholderOption.defaultSelected = placeholderOption.selected;
    options.push(placeholderOption);
  }

  for (const item of items) {
    const option = h(
      "option",
      { disabled: item.disabled, value: item.value },
      item.label,
    ) as HTMLOptionElement;
    if (item.description) option.dataset.description = item.description;
    option.selected = selected.has(item.value);
    // `defaultSelected` drives `form.reset()`; keep it aligned with the initial value.
    option.defaultSelected = option.selected;
    options.push(option);
  }
  return options;
}
