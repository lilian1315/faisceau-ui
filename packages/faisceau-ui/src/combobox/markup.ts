import { h } from "@lilian1315/create-element/faisceau";

import {
  createCheckIcon,
  createChevronDownIcon,
  createClearIcon,
  type FuiItem,
} from "../shared/index.js";
import type { ComboboxOptions, EnhanceComboboxOptions } from "./types.ts";

export interface ComboboxMarkup {
  readonly root: HTMLElement;
  readonly nativeSelect: HTMLSelectElement;
  readonly generated: HTMLElement[];
}

interface ComboboxViewOptions {
  readonly clearLabel?: string;
  readonly description?: string;
  readonly emptyLabel?: string;
  readonly errorMessage?: string;
  readonly label: string;
  readonly multiple?: boolean;
  readonly placeholder?: string;
}

interface ComboboxView {
  readonly label: HTMLLabelElement;
  readonly control: HTMLElement;
  readonly messages: HTMLElement[];
  readonly positioner: HTMLElement;
}

export function createComboboxMarkup(
  options: ComboboxOptions,
  items: readonly FuiItem[],
): ComboboxMarkup {
  const root = h("div", {
    class: "fui-combobox",
    data: { fuiComponent: "combobox", fuiPart: "root" },
  });
  const nativeSelect = createNativeSelect(options, items);
  root.append(nativeSelect);
  const generated = appendView(root, nativeSelect, createView(options, items));

  return { root, nativeSelect, generated };
}

export function enhanceComboboxMarkup(
  root: HTMLElement,
  nativeSelect: HTMLSelectElement,
  options: EnhanceComboboxOptions & { label: string },
  items: readonly FuiItem[],
): HTMLElement[] {
  nativeSelect.classList.add("fui-native-select");
  nativeSelect.dataset.fuiPart = "native-select";
  return appendView(root, nativeSelect, createView(options, items));
}

function createView(options: ComboboxViewOptions, items: readonly FuiItem[]): ComboboxView {
  const label = h(
    "label",
    { class: "fui-combobox-label", data: { fuiPart: "label" } },
    options.label,
  );
  const input = h("input", {
    class: "fui-combobox-input",
    data: { fuiPart: "input" },
    placeholder: options.placeholder,
    type: "text",
  });
  const selection = h("span", {
    class: "fui-combobox-selection",
    data: { fuiPart: "selection" },
    hidden: true,
  });
  const field = h(
    "span",
    { class: "fui-combobox-field", data: { fuiPart: "field" } },
    selection,
    input,
  );
  const clearTrigger = h(
    "button",
    {
      "aria-label": options.clearLabel ?? "Clear selection",
      class: "fui-combobox-clear-trigger",
      data: { fuiPart: "clear-trigger" },
      hidden: true,
      type: "button",
    },
    createClearIcon(),
  );
  const trigger = h(
    "button",
    {
      class: "fui-combobox-trigger",
      data: { fuiPart: "trigger" },
      type: "button",
    },
    createChevronDownIcon(),
  );
  const control = h(
    "div",
    { class: "fui-combobox-control", data: { fuiPart: "control" } },
    field,
    clearTrigger,
    trigger,
  );
  const list = h(
    "ul",
    { class: "fui-combobox-list", data: { fuiPart: "list" } },
    items.map(createComboboxItem),
  );
  const empty = h(
    "p",
    {
      class: "fui-combobox-empty",
      data: { fuiPart: "empty" },
      hidden: true,
    },
    options.emptyLabel ?? "No results",
  );
  const content = h(
    "div",
    { class: "fui-combobox-content", data: { fuiPart: "content" } },
    list,
    empty,
  );
  const positioner = h(
    "div",
    { class: "fui-combobox-positioner", data: { fuiPart: "positioner" } },
    content,
  );

  return { label, control, messages: createFieldMessages(options), positioner };
}

function appendView(
  root: HTMLElement,
  nativeSelect: HTMLSelectElement,
  view: ComboboxView,
): HTMLElement[] {
  const generated = [view.label, view.control, ...view.messages, view.positioner];
  root.prepend(view.label, view.control);
  nativeSelect.after(...view.messages, view.positioner);
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
    const placeholder = h("option", { value: "" }, options.placeholder ?? "Select an option");
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
      data: { fuiPart: "native-select" },
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
  const text = h(
    "span",
    { class: "fui-combobox-item-text", data: { fuiPart: "item-text" } },
    item.label,
  );
  const children: Node[] = [text];

  if (item.description) {
    children.push(
      h(
        "span",
        {
          class: "fui-combobox-item-description",
          data: { fuiPart: "item-description" },
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
        data: { fuiPart: "item-indicator" },
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
        fuiPart: "item",
        value: item.value,
      },
    },
    children,
  );
}

function createFieldMessages(options: ComboboxViewOptions): HTMLElement[] {
  const messages: HTMLElement[] = [];

  if (options.description) {
    messages.push(
      h(
        "p",
        { class: "fui-field-description", data: { fuiPart: "description" } },
        options.description,
      ),
    );
  }

  if (options.errorMessage) {
    messages.push(
      h("p", { class: "fui-field-error", data: { fuiPart: "error" } }, options.errorMessage),
    );
  }

  return messages;
}
