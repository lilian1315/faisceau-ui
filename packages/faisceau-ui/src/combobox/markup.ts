import { h } from "@lilian1315/create-element/faisceau";

import {
  createCheckIcon,
  createChevronDownIcon,
  createClearIcon,
  type FuiItem,
} from "../shared/index.js";
import type { ComboboxOptions } from "./types.ts";

export interface ComboboxMarkup {
  readonly root: HTMLElement;
  readonly nativeSelect: HTMLSelectElement;
  readonly generated: HTMLElement[];
}

interface ComboboxViewOptions {
  readonly clearLabel?: string;
  readonly emptyLabel?: string;
  readonly multiple?: boolean;
  readonly placeholder?: string;
}

interface ComboboxView {
  readonly control: HTMLElement;
  readonly positioner: HTMLElement;
}

export function createComboboxMarkup(
  options: ComboboxOptions,
  items: readonly FuiItem[],
): ComboboxMarkup {
  const root = h("div", {
    class: "fui-combobox",
  });
  const nativeSelect = createNativeSelect(options, items);
  root.append(nativeSelect);
  const generated = appendView(root, nativeSelect, createView(options, items));

  return { root, nativeSelect, generated };
}

function createView(options: ComboboxViewOptions, items: readonly FuiItem[]): ComboboxView {
  const input = h("input", {
    class: "fui-combobox-input",
    placeholder: options.placeholder,
    type: "text",
  });
  const selection = h("span", {
    class: "fui-combobox-selection",
    hidden: true,
  });
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
  );
  const trigger = h(
    "button",
    {
      class: "fui-combobox-trigger",
      type: "button",
    },
    createChevronDownIcon(),
  );
  const control = h("div", { class: "fui-combobox-control" }, field, clearTrigger, trigger);
  const list = h("ul", { class: "fui-combobox-list" }, items.map(createComboboxItem));
  const empty = h(
    "p",
    {
      class: "fui-combobox-empty",
      hidden: true,
    },
    options.emptyLabel ?? "No results",
  );
  const content = h("div", { class: "fui-combobox-content" }, list, empty);
  const positioner = h("div", { class: "fui-combobox-positioner" }, content);

  return { control, positioner };
}

function appendView(
  root: HTMLElement,
  nativeSelect: HTMLSelectElement,
  view: ComboboxView,
): HTMLElement[] {
  const generated = [view.control, view.positioner];
  root.prepend(view.control);
  nativeSelect.after(view.positioner);
  return generated;
}

function createNativeSelect(
  options: ComboboxOptions,
  items: readonly FuiItem[],
): HTMLSelectElement {
  const initialValue = options.value ?? options.defaultValue ?? [];
  const selectedValues = new Set(initialValue);
  const optionElements: HTMLOptionElement[] = [];

  if (!options.multiple) {
    const placeholder = h(
      "option",
      { data: { placeholder: "" }, value: "" },
      options.placeholder ?? "Select an option",
    );
    placeholder.hidden = true;
    placeholder.selected = selectedValues.size === 0;
    placeholder.defaultSelected = selectedValues.size === 0;
    optionElements.push(placeholder);
  }

  for (const item of items) {
    const option = h("option", { disabled: item.disabled, value: item.value }, item.label);
    option.selected = selectedValues.has(item.value);
    option.defaultSelected = selectedValues.has(item.value);
    if (item.description) option.dataset.description = item.description;
    optionElements.push(option);
  }
  const nativeSelect = h(
    "select",
    {
      class: "fui-native-select",
      disabled: options.disabled,
      multiple: options.multiple,
      name: options.name,
      required: options.required,
      tabindex: -1,
    },
    optionElements,
  );
  if (options.form) nativeSelect.setAttribute("form", options.form);
  return nativeSelect;
}

export function createComboboxItem(item: FuiItem): HTMLLIElement {
  const text = h("span", { class: "fui-combobox-item-text" }, item.label);
  const children: Node[] = [text];

  if (item.description) {
    children.push(
      h(
        "span",
        {
          class: "fui-combobox-item-description",
        },
        item.description,
      ),
    );
  }

  children.push(
    h(
      "span",
      {
        class: "fui-combobox-item-indicator",
      },
      createCheckIcon(),
    ),
  );

  return h(
    "li",
    {
      class: "fui-combobox-item",
      data: {
        disabled: item.disabled,
        value: item.value,
      },
    },
    children,
  );
}
