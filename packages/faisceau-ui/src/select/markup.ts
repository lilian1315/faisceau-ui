import { h } from "@lilian1315/create-element";

import { createCheckIcon, createChevronDownIcon, createClearIcon } from "../shared/index.js";
import type { FuiItem } from "../shared/index.js";

export interface SelectControl {
  readonly control: HTMLElement;
  readonly trigger: HTMLButtonElement;
  readonly value: HTMLElement;
  readonly indicator: HTMLElement;
  readonly clearTrigger: HTMLButtonElement | null;
}

export interface SelectPopup {
  readonly positioner: HTMLElement;
  readonly content: HTMLElement;
  readonly list: HTMLElement;
}

/** Builds the visible trigger row: value text, chevron, and an optional clear button. */
export function buildControl(options: { clearable?: boolean; clearLabel?: string }): SelectControl {
  const value = h("span", { class: "fui-select-value", data: { fuiPart: "value" } });
  const indicator = h(
    "span",
    { class: "fui-select-indicator", data: { fuiPart: "indicator" } },
    createChevronDownIcon(),
  );
  const trigger = h(
    "button",
    { class: "fui-select-trigger", data: { fuiPart: "trigger" }, type: "button" },
    value,
    indicator,
  ) as HTMLButtonElement;

  const clearTrigger = options.clearable ? buildClearTrigger(options.clearLabel) : null;

  const control = h(
    "div",
    { class: "fui-select-control", data: { fuiPart: "control" } },
    clearTrigger ? [trigger, clearTrigger] : [trigger],
  );
  return { control, trigger, value, indicator, clearTrigger };
}

/** Builds the standalone clear button appended next to the trigger. */
function buildClearTrigger(clearLabel?: string): HTMLButtonElement {
  return h(
    "button",
    {
      "aria-label": clearLabel ?? "Clear selection",
      class: "fui-select-clear-trigger",
      data: { fuiPart: "clear-trigger" },
      type: "button",
    },
    createClearIcon(),
  ) as HTMLButtonElement;
}

/** Builds the popup shell; items are rendered separately with {@link buildItem}. */
export function buildPopup(items: readonly FuiItem[]): SelectPopup {
  const list = h(
    "ul",
    { class: "fui-select-list", data: { fuiPart: "list" } },
    items.map(buildItem),
  );
  const content = h("div", { class: "fui-select-content", data: { fuiPart: "content" } }, list);
  const positioner = h(
    "div",
    { class: "fui-select-positioner", data: { fuiPart: "positioner" } },
    content,
  );
  return { positioner, content, list };
}

/** Builds one popup row for an item. */
function buildItem(item: FuiItem): HTMLLIElement {
  const text = h(
    "span",
    { class: "fui-select-item-text", data: { fuiPart: "item-text" } },
    item.label,
  );
  const children: Node[] = [text];

  if (item.description) {
    children.push(
      h(
        "span",
        { class: "fui-select-item-description", data: { fuiPart: "item-description" } },
        item.description,
      ),
    );
  }

  children.push(
    h(
      "span",
      { class: "fui-select-item-indicator", data: { fuiPart: "item-indicator" } },
      createCheckIcon(),
    ),
  );

  return h(
    "li",
    {
      class: "fui-select-item",
      data: { disabled: item.disabled, fuiPart: "item", value: item.value },
    },
    children,
  );
}

/** Builds the native select Zag keeps in sync as the submitted control. */
export function buildNativeSelect(
  items: readonly FuiItem[],
  options: { multiple?: boolean; name?: string; placeholder?: string; value?: readonly string[] },
): HTMLSelectElement {
  const native = h("select", {
    class: "fui-native-select",
    data: { fuiPart: "native-select" },
    multiple: options.multiple,
    name: options.name,
  }) as HTMLSelectElement;
  native.replaceChildren(
    ...buildOptions(items, options.placeholder, options.multiple, options.value ?? []),
  );
  return native;
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
    option.selected = selected.has(item.value);
    // `defaultSelected` drives `form.reset()`; keep it aligned with the initial value.
    option.defaultSelected = option.selected;
    options.push(option);
  }
  return options;
}
