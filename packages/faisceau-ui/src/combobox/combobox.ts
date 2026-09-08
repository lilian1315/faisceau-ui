import { h } from "@lilian1315/create-element/faisceau";
import { createZagMachine } from "@lilian1315/faisceau-zag";
import * as combobox from "@zag-js/combobox";
import { effect } from "faisceau";

import {
  addFuiClasses,
  captureAttributes,
  createClearIcon,
  createId,
  createNativeSelectField,
  getNativeSelectValue,
  getLookupRoot,
  normalizeItems,
  queryPart,
  queryParts,
  readNativeSelect,
  requirePart,
  requireNativeSelect,
  type FuiItem,
  type FuiItemInput,
  type NativeSelectFieldController,
  type NativeSelectSource,
} from "../shared/index.js";
import { createComboboxMarkup, enhanceComboboxMarkup } from "./markup.ts";
import type { ComboboxController, ComboboxOptions, EnhanceComboboxOptions } from "./types.ts";

interface ComboboxParts {
  label: HTMLLabelElement;
  control: HTMLElement;
  input: HTMLInputElement;
  selection: HTMLElement;
  trigger: HTMLButtonElement;
  clearTrigger: HTMLButtonElement | null;
  positioner: HTMLElement;
  content: HTMLElement;
  list: HTMLElement;
  empty: HTMLElement;
  nativeSelect: HTMLSelectElement;
  itemElements: HTMLElement[];
}

type ComboboxSetupOptions = EnhanceComboboxOptions & { items?: readonly FuiItemInput[] };

/** Builds a Combobox tree. Call `.mount(target)` to insert it and start Zag. */
export function createCombobox(options: ComboboxOptions): ComboboxController {
  const items = normalizeItems(options.items);
  const markup = createComboboxMarkup(options, items);
  return setupCombobox(markup.root, options, {
    items,
    nativeSelect: markup.nativeSelect,
    ownsRoot: true,
    start: false,
  });
}

/** Enhances a container holding one native select and generates the visual UI. */
export function enhanceCombobox(
  root: HTMLElement,
  options: EnhanceComboboxOptions = {},
): ComboboxController {
  const nativeSelect = requireNativeSelect(root, "Combobox");
  const source = readNativeSelect(nativeSelect);
  const resolvedOptions = resolveEnhancedOptions(options, nativeSelect, source);
  const restoreRoot = captureAttributes(root);
  const restoreSelect = captureAttributes(nativeSelect);
  const generated = enhanceComboboxMarkup(root, nativeSelect, resolvedOptions, source.items);

  return setupCombobox(root, resolvedOptions, {
    cleanup() {
      for (const element of generated) element.remove();
      restoreRoot();
    },
    items: source.items,
    nativeSelect,
    ownsRoot: false,
    restoreNativeSelect: restoreSelect,
    start: true,
  });
}

function setupCombobox(
  root: HTMLElement,
  options: ComboboxSetupOptions,
  setup: {
    cleanup?: () => void;
    items: FuiItem[];
    nativeSelect: HTMLSelectElement;
    ownsRoot: boolean;
    restoreNativeSelect?: () => void;
    start: boolean;
  },
): ComboboxController {
  const {
    className,
    clearLabel,
    description,
    emptyLabel,
    errorMessage,
    filter = defaultFilter,
    getRemoveLabel = defaultRemoveLabel,
    id: requestedId,
    items: _items,
    label: nextLabel,
    onInputValueChange,
    onValueChange,
    ...behavior
  } = options;
  const parts = resolveParts(root, setup.nativeSelect, setup.items, emptyLabel);
  const machineId = requestedId ?? createId("combobox");

  root.dataset.fuiComponent = "combobox";
  root.dataset.fuiPart ||= "root";
  root.toggleAttribute("data-fui-multiple", behavior.multiple === true);
  addFuiClasses(root, "fui-combobox");
  addCallerClasses(root, className);

  if (nextLabel !== undefined) parts.label.textContent = nextLabel;
  if (!parts.label.textContent?.trim()) {
    throw new Error("[Faisceau UI] Combobox requires a visible, non-empty label.");
  }

  if (emptyLabel !== undefined) parts.empty.textContent = emptyLabel;
  const descriptionElement = ensureMessage(
    root,
    "description",
    description,
    "fui-field-description",
  );
  const errorElement = ensureMessage(root, "error", errorMessage, "fui-field-error");
  if (errorElement) errorElement.setAttribute("role", "alert");

  const itemRecords = mapItems(parts.itemElements, setup.items, machineId);
  const itemByValue = new Map(setup.items.map((item) => [item.value, item]));
  const ids = createPartIds(machineId, root, parts, itemRecords);
  const resetValue = [
    ...(behavior.value ?? behavior.defaultValue ?? getNativeSelectValue(parts.nativeSelect)),
  ];
  const initialInput = behavior.inputValue ?? behavior.defaultInputValue ?? "";
  const initialItems = getFilteredItems(setup.items, initialInput, filter);
  updateFilteredMarkup(itemRecords, initialItems, parts.empty);

  let updateCollection = (_inputValue: string): void => {};
  let nativeField: NativeSelectFieldController | undefined;
  const machineProps: combobox.Props<FuiItem> = {
    ...behavior,
    collection: createCollection(initialItems),
    getRootNode: () => getLookupRoot(root),
    id: machineId,
    ids,
    inputBehavior: behavior.inputBehavior ?? "autohighlight",
    invalid: behavior.invalid ?? errorElement !== null,
    name: undefined,
    onInputValueChange(details) {
      updateCollection(details.inputValue);
      onInputValueChange?.(details);
    },
    onValueChange(details) {
      nativeField?.syncFromMachine(details.value);
      onValueChange?.(details);
    },
    openOnClick: behavior.openOnClick ?? true,
    positioning: {
      gutter: 6,
      placement: "bottom-start",
      sameWidth: true,
      ...behavior.positioning,
    },
    translations: {
      ...behavior.translations,
      clearTriggerLabel:
        clearLabel ?? behavior.translations?.clearTriggerLabel ?? "Clear selection",
    },
  };
  const zag = createZagMachine(
    combobox.machine as combobox.Machine<FuiItem>,
    machineProps,
    combobox.connect,
  );
  nativeField = createNativeSelectField({
    focusTarget: parts.input,
    getValue: () => zag.api.get().value,
    props: {
      disabled: behavior.disabled,
      form: behavior.form,
      multiple: behavior.multiple,
      name: behavior.name,
      required: behavior.required,
    },
    resetValue,
    restore: setup.restoreNativeSelect,
    select: parts.nativeSelect,
    setValue: (value) => zag.api.get().setValue(value),
  });

  let filterRevision = 0;
  let destroyed = false;
  updateCollection = (inputValue): void => {
    const filteredItems = getFilteredItems(setup.items, inputValue, filter);
    updateFilteredMarkup(itemRecords, filteredItems, parts.empty);
    const revision = ++filterRevision;

    queueMicrotask(() => {
      if (destroyed || revision !== filterRevision) return;
      zag.updateProps({ collection: createCollection(filteredItems) });
    });
  };

  zag.bind(root, (api) => api.getRootProps());
  zag.bind(parts.label, (api) => api.getLabelProps());
  zag.bind(parts.control, (api) => api.getControlProps());
  zag.bind(parts.input, (api) => api.getInputProps());
  zag.bind(parts.trigger, (api) => api.getTriggerProps());
  zag.bind(parts.positioner, (api) => api.getPositionerProps());
  zag.bind(parts.content, (api) => api.getContentProps());
  zag.bind(parts.list, (api) => api.getListProps());

  if (parts.clearTrigger) {
    zag.bind(parts.clearTrigger, (api) => api.getClearTriggerProps());
  }

  for (const { element, item } of itemRecords) {
    zag.bind(element, (api) => api.getItemProps({ item }));

    const text = queryPart<HTMLElement>(element, "item-text");
    if (text) {
      addFuiClasses(text, "fui-combobox-item-text");
      zag.bind(text, (api) => api.getItemTextProps({ item }));
    }

    const indicator = queryPart<HTMLElement>(element, "item-indicator");
    if (indicator) {
      addFuiClasses(indicator, "fui-combobox-item-indicator");
      zag.bind(indicator, (api) => api.getItemIndicatorProps({ item }));
    }

    const itemDescription = queryPart<HTMLElement>(element, "item-description");
    if (itemDescription) addFuiClasses(itemDescription, "fui-combobox-item-description");
  }

  const stopClearVisibility = effect(() => {
    if (!parts.clearTrigger) return;
    const api = zag.api.get();
    parts.clearTrigger.hidden = api.inputValue.length === 0 && !api.hasSelectedItems;
  });
  const stopSelectedTags = effect(() => {
    const api = zag.api.get();
    const selectedItems = api.value.flatMap((value) => {
      const item = itemByValue.get(value);
      return item === undefined ? [] : [item];
    });
    renderSelectedTags(
      parts.selection,
      behavior.multiple === true ? selectedItems : [],
      api.disabled || behavior.readOnly === true,
      getRemoveLabel,
      (value) => {
        api.clearValue(value);
        api.focus();
      },
    );
  });
  linkDescription(parts.input, descriptionElement, errorElement);

  let started = false;
  const controller: ComboboxController = {
    api: zag.api,
    root,
    get started() {
      return started;
    },
    mount(target) {
      if (destroyed) throwDestroyed("Combobox");
      target.append(root);
      return this.start();
    },
    start() {
      if (destroyed) throwDestroyed("Combobox");
      if (!started) {
        zag.start();
        nativeField.start();
        started = true;
      }
      return this;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      filterRevision += 1;
      stopClearVisibility();
      stopSelectedTags();
      nativeField.destroy();
      zag.destroy();
      if (setup.ownsRoot) root.remove();
      else setup.cleanup?.();
    },
  };

  if (setup.start) controller.start();
  return controller;
}

function resolveParts(
  root: HTMLElement,
  nativeSelect: HTMLSelectElement,
  items: readonly FuiItem[],
  emptyLabel?: string,
): ComboboxParts {
  const label = requirePart<HTMLLabelElement>(root, "label");
  const control = requirePart<HTMLElement>(root, "control");
  const input = requirePart<HTMLInputElement>(root, "input");
  const selection = requirePart<HTMLElement>(root, "selection");
  const trigger = requirePart<HTMLButtonElement>(root, "trigger");
  const positioner = requirePart<HTMLElement>(root, "positioner");
  const content = requirePart<HTMLElement>(root, "content");
  const list = requirePart<HTMLElement>(root, "list");
  let empty = queryPart<HTMLElement>(root, "empty");

  if (empty === null) {
    empty = h(
      "p",
      {
        class: "fui-combobox-empty",
        data: { fuiPart: "empty" },
        hidden: true,
      },
      emptyLabel ?? "No results",
    );
    content.append(empty);
  }

  addFuiClasses(label, "fui-combobox-label");
  addFuiClasses(control, "fui-combobox-control");
  addFuiClasses(input, "fui-combobox-input");
  addFuiClasses(trigger, "fui-combobox-trigger");
  addFuiClasses(positioner, "fui-combobox-positioner");
  addFuiClasses(content, "fui-combobox-content");
  addFuiClasses(list, "fui-combobox-list");
  addFuiClasses(empty, "fui-combobox-empty");
  addFuiClasses(nativeSelect, "fui-native-select");
  nativeSelect.dataset.fuiPart = "native-select";

  const clearTrigger = queryPart<HTMLButtonElement>(root, "clear-trigger");
  if (clearTrigger) addFuiClasses(clearTrigger, "fui-combobox-clear-trigger");

  const itemElements = queryParts<HTMLElement>(root, "item");
  if (items.length > 0 && itemElements.length === 0) {
    throw new Error('[Faisceau UI] Combobox items require `[data-fui-part="item"]` markup.');
  }
  for (const item of itemElements) addFuiClasses(item, "fui-combobox-item");

  return {
    label,
    control,
    input,
    selection,
    trigger,
    clearTrigger,
    positioner,
    content,
    list,
    empty,
    nativeSelect,
    itemElements,
  };
}

function resolveEnhancedOptions(
  options: EnhanceComboboxOptions,
  nativeSelect: HTMLSelectElement,
  source: NativeSelectSource,
): EnhanceComboboxOptions & { label: string } {
  const label = options.label ?? nativeSelect.getAttribute("aria-label")?.trim();
  if (!label) {
    throw new Error(
      "[Faisceau UI] Combobox enhancement requires options.label or aria-label on the native select.",
    );
  }

  const hasExplicitValue = options.value !== undefined || options.defaultValue !== undefined;
  return {
    ...options,
    disabled: options.disabled ?? nativeSelect.disabled,
    form: options.form ?? nativeSelect.getAttribute("form") ?? undefined,
    label,
    multiple: options.multiple ?? nativeSelect.multiple,
    name: (options.name ?? nativeSelect.name) || undefined,
    placeholder: options.placeholder ?? source.placeholder,
    required: options.required ?? nativeSelect.required,
    ...(!hasExplicitValue ? { defaultValue: source.value } : {}),
  };
}

function mapItems(
  elements: readonly HTMLElement[],
  items: readonly FuiItem[],
  machineId: string,
): Array<{ element: HTMLElement; item: FuiItem }> {
  const itemByValue = new Map(items.map((item) => [item.value, item]));
  const seen = new Set<string>();
  const records = elements.map((element, index) => {
    const value = element.getAttribute("data-value");
    if (value === null) {
      throw new Error(`[Faisceau UI] Combobox item at index ${index} requires data-value.`);
    }
    if (seen.has(value)) {
      throw new Error(`[Faisceau UI] Combobox markup contains duplicate data-value "${value}".`);
    }
    seen.add(value);

    const item = itemByValue.get(value);
    if (!item) {
      throw new Error(
        `[Faisceau UI] Combobox markup item "${value}" is absent from options.items.`,
      );
    }

    element.id ||= `${machineId}:item:${index}`;
    return { element, item };
  });

  for (const item of items) {
    if (!seen.has(item.value)) {
      throw new Error(`[Faisceau UI] Combobox item "${item.value}" has no matching markup node.`);
    }
  }

  return records;
}

function createPartIds(
  id: string,
  root: HTMLElement,
  parts: ComboboxParts,
  items: ReadonlyArray<{ element: HTMLElement; item: FuiItem }>,
): combobox.ElementIds {
  root.id ||= `${id}:root`;
  parts.label.id ||= `${id}:label`;
  parts.control.id ||= `${id}:control`;
  parts.input.id ||= `${id}:input`;
  parts.trigger.id ||= `${id}:trigger`;
  parts.positioner.id ||= `${id}:positioner`;
  parts.content.id ||= `${id}:content`;
  if (parts.clearTrigger) parts.clearTrigger.id ||= `${id}:clear-trigger`;

  const itemIds = new Map(items.map(({ element, item }) => [item.value, element.id]));
  return {
    root: root.id,
    label: parts.label.id,
    control: parts.control.id,
    input: parts.input.id,
    trigger: parts.trigger.id,
    positioner: parts.positioner.id,
    content: parts.content.id,
    clearTrigger: parts.clearTrigger?.id,
    item: (value) => itemIds.get(value) ?? `${id}:item:${value}`,
  };
}

function createCollection(items: readonly FuiItem[]) {
  return combobox.collection({
    items: [...items],
    isItemDisabled: (item) => item.disabled ?? false,
    itemToString: (item) => item.label,
    itemToValue: (item) => item.value,
  });
}

function getFilteredItems(
  items: readonly FuiItem[],
  inputValue: string,
  filter: (item: Readonly<FuiItem>, inputValue: string) => boolean,
): FuiItem[] {
  if (inputValue.length === 0) return [...items];
  return items.filter((item) => filter(item, inputValue));
}

function defaultFilter(item: Readonly<FuiItem>, inputValue: string): boolean {
  return item.label.toLocaleLowerCase().includes(inputValue.trim().toLocaleLowerCase());
}

function defaultRemoveLabel(item: Readonly<FuiItem>): string {
  return `Remove ${item.label}`;
}

function renderSelectedTags(
  selection: HTMLElement,
  items: readonly FuiItem[],
  disabled: boolean,
  getRemoveLabel: (item: Readonly<FuiItem>) => string,
  remove: (value: string) => void,
): void {
  const tags = items.map((item) => {
    const label = h(
      "span",
      { class: "fui-combobox-tag-label", data: { fuiPart: "tag-label" } },
      item.label,
    );
    const removeTrigger = h(
      "button",
      {
        "aria-label": getRemoveLabel(item),
        class: "fui-combobox-tag-remove",
        data: { fuiPart: "tag-remove", value: item.value },
        disabled,
        type: "button",
      },
      createClearIcon(),
    );
    removeTrigger.addEventListener("click", () => remove(item.value));

    return h(
      "span",
      {
        class: "fui-combobox-tag",
        data: { fuiPart: "tag", value: item.value },
      },
      label,
      removeTrigger,
    );
  });

  selection.replaceChildren(...tags);
  selection.hidden = tags.length === 0;
}

function updateFilteredMarkup(
  records: ReadonlyArray<{ element: HTMLElement; item: FuiItem }>,
  filteredItems: readonly FuiItem[],
  empty: HTMLElement,
): void {
  const visibleValues = new Set(filteredItems.map((item) => item.value));
  for (const { element, item } of records) element.hidden = !visibleValues.has(item.value);
  empty.hidden = filteredItems.length > 0;
}

function ensureMessage(
  root: HTMLElement,
  part: "description" | "error",
  text: string | undefined,
  className: `fui-${string}`,
): HTMLElement | null {
  let element = queryPart<HTMLElement>(root, part);
  if (element === null && text !== undefined) {
    element = h("p", { class: className, data: { fuiPart: part } }, text);
    root.append(element);
  }
  if (element) {
    addFuiClasses(element, className);
    if (text !== undefined) element.textContent = text;
  }
  return element;
}

function linkDescription(
  control: HTMLElement,
  description: HTMLElement | null,
  error: HTMLElement | null,
): void {
  const ids = [description, error]
    .filter((element): element is HTMLElement => element !== null)
    .map((element, index) => {
      element.id ||= `${control.id}:message:${index}`;
      return element.id;
    });
  const existing = control.getAttribute("aria-describedby")?.split(/\s+/).filter(Boolean) ?? [];
  const describedBy = [...new Set([...existing, ...ids])];
  if (describedBy.length > 0) control.setAttribute("aria-describedby", describedBy.join(" "));
}

function addCallerClasses(element: Element, className: string | undefined): void {
  const tokens = className?.split(/\s+/).filter(Boolean) ?? [];
  if (tokens.length > 0) element.classList.add(...tokens);
}

function throwDestroyed(name: string): never {
  throw new Error(`[Faisceau UI] Cannot start or mount a destroyed ${name}.`);
}
