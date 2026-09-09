import { h } from "@lilian1315/create-element";

import {
  createCheckIcon,
  createChevronDownIcon,
  createClearIcon,
  type FuiItem,
} from "../shared/index.js";
import type { SelectOptions } from "./types.ts";

export interface SelectMarkup {
  readonly root: HTMLElement;
  readonly nativeSelect: HTMLSelectElement;
  readonly generated: HTMLElement[];
}

interface SelectViewOptions {
  readonly clearable?: boolean;
  readonly clearLabel?: string;
}

interface SelectView {
  readonly control: HTMLElement;
  readonly positioner: HTMLElement;
}

export function createSelectMarkup(
  options: SelectOptions,
  items: readonly FuiItem[],
): SelectMarkup {
  const root = h("div", {
    class: "fui-select",
  });
  const nativeSelect = createNativeSelect(options, items);
  root.append(nativeSelect);
  const view = createView(options, items);
  const generated = appendView(root, nativeSelect, view);

  return { root, nativeSelect, generated };
}

function createView(options: SelectViewOptions, items: readonly FuiItem[]): SelectView {
  const value = h("span", { class: "fui-select-value" });
  const indicator = h("span", { class: "fui-select-indicator" }, createChevronDownIcon());
  const trigger = h(
    "button",
    {
      class: "fui-select-trigger",
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
          type: "button",
        },
        createClearIcon(),
      ),
    );
  }

  const control = h("div", { class: "fui-select-control" }, controlChildren);
  const list = h("ul", { class: "fui-select-list" }, items.map(createSelectItem));
  const content = h("div", { class: "fui-select-content" }, list);
  const positioner = h("div", { class: "fui-select-positioner" }, content);

  return { control, positioner };
}

function appendView(
  root: HTMLElement,
  nativeSelect: HTMLSelectElement,
  view: SelectView,
): HTMLElement[] {
  const generated = [view.control, view.positioner];
  root.prepend(view.control);
  nativeSelect.after(view.positioner);
  return generated;
}

function createNativeSelect(options: SelectOptions, items: readonly FuiItem[]): HTMLSelectElement {
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
  if (options.autoComplete) nativeSelect.setAttribute("autocomplete", options.autoComplete);
  return nativeSelect;
}

export function createSelectItem(item: FuiItem): HTMLLIElement {
  const text = h("span", { class: "fui-select-item-text" }, item.label);
  const children: Node[] = [text];

  if (item.description) {
    children.push(
      h(
        "span",
        {
          class: "fui-select-item-description",
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
        value: item.value,
      },
    },
    children,
  );
}
