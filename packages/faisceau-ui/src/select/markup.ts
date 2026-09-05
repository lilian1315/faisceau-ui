import { h } from "@lilian1315/create-element/faisceau";

import {
  createCheckIcon,
  createChevronDownIcon,
  createClearIcon,
  type FuiItem,
} from "../shared/index.js";
import type { EnhanceSelectOptions, SelectOptions } from "./types.js";

export interface SelectMarkup {
  readonly root: HTMLElement;
  readonly nativeSelect: HTMLSelectElement;
  readonly generated: HTMLElement[];
}

interface SelectViewOptions {
  readonly clearable?: boolean;
  readonly clearLabel?: string;
  readonly description?: string;
  readonly errorMessage?: string;
  readonly label: string;
}

interface SelectView {
  readonly label: HTMLLabelElement;
  readonly control: HTMLElement;
  readonly messages: HTMLElement[];
  readonly positioner: HTMLElement;
}

export function createSelectMarkup(
  options: SelectOptions,
  items: readonly FuiItem[],
): SelectMarkup {
  const root = h("div", {
    class: "fui-select",
    data: { fuiComponent: "select", fuiPart: "root" },
  });
  const nativeSelect = createNativeSelect(options, items);
  root.append(nativeSelect);
  const view = createView(options, items);
  const generated = appendView(root, nativeSelect, view);

  return { root, nativeSelect, generated };
}

export function enhanceSelectMarkup(
  root: HTMLElement,
  nativeSelect: HTMLSelectElement,
  options: EnhanceSelectOptions & { label: string },
  items: readonly FuiItem[],
): HTMLElement[] {
  nativeSelect.classList.add("fui-native-select");
  nativeSelect.dataset.fuiPart = "native-select";
  return appendView(root, nativeSelect, createView(options, items));
}

function createView(options: SelectViewOptions, items: readonly FuiItem[]): SelectView {
  const label = h(
    "label",
    { class: "fui-select-label", data: { fuiPart: "label" } },
    options.label,
  );
  const value = h("span", {
    class: "fui-select-value",
    data: { fuiPart: "value" },
  });
  const indicator = h(
    "span",
    { class: "fui-select-indicator", data: { fuiPart: "indicator" } },
    createChevronDownIcon(),
  );
  const trigger = h(
    "button",
    {
      class: "fui-select-trigger",
      data: { fuiPart: "trigger" },
      type: "button",
    },
    value,
    indicator,
  );
  const controlChildren: Node[] = [trigger];

  if (options.clearable) {
    controlChildren.push(
      h(
        "button",
        {
          "aria-label": options.clearLabel ?? "Clear selection",
          class: "fui-select-clear-trigger",
          data: { fuiPart: "clear-trigger" },
          type: "button",
        },
        createClearIcon(),
      ),
    );
  }

  const control = h(
    "div",
    { class: "fui-select-control", data: { fuiPart: "control" } },
    controlChildren,
  );
  const list = h(
    "ul",
    { class: "fui-select-list", data: { fuiPart: "list" } },
    items.map(createItem),
  );
  const content = h("div", { class: "fui-select-content", data: { fuiPart: "content" } }, list);
  const positioner = h(
    "div",
    { class: "fui-select-positioner", data: { fuiPart: "positioner" } },
    content,
  );

  return { label, control, messages: createFieldMessages(options), positioner };
}

function appendView(
  root: HTMLElement,
  nativeSelect: HTMLSelectElement,
  view: SelectView,
): HTMLElement[] {
  const generated = [view.label, view.control, ...view.messages, view.positioner];
  root.prepend(view.label, view.control);
  nativeSelect.after(...view.messages, view.positioner);
  return generated;
}

function createNativeSelect(options: SelectOptions, items: readonly FuiItem[]): HTMLSelectElement {
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
  if (options.autoComplete) nativeSelect.setAttribute("autocomplete", options.autoComplete);
  return nativeSelect;
}

function createItem(item: FuiItem): HTMLLIElement {
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
        {
          class: "fui-select-item-description",
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
        class: "fui-select-item-indicator",
        data: { fuiPart: "item-indicator" },
      },
      createCheckIcon(),
    ),
  );

  return h(
    "li",
    {
      class: "fui-select-item",
      data: {
        disabled: item.disabled,
        fuiPart: "item",
        value: item.value,
      },
    },
    children,
  );
}

function createFieldMessages(options: SelectViewOptions): HTMLElement[] {
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
