import { h } from "@lilian1315/create-element/faisceau";
import { createZagMachine } from "@lilian1315/faisceau-zag";
import * as combobox from "@zag-js/combobox";
import { effect } from "faisceau";

import { createField, enhanceField } from "../field/index.ts";
import type { FieldControlContext, FieldControlFactory } from "../field/index.ts";
import {
  captureAttributes,
  createClearIcon,
  createId,
  createNativeSelectField,
  getNativeSelectValue,
  getLookupRoot,
  normalizeItems,
  reconcileNativeSelectOptions,
  reconcileKeyedValues,
  readNativeSelect,
  requireNativeSelect,
  setNativeSelectValue,
  type FuiItem,
  type FuiItemInput,
  type NativeSelectFieldController,
  type NativeSelectSource,
} from "../shared/index.js";
import { createComboboxItem, createComboboxMarkup } from "./markup.ts";
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
  return createField({
    ...fieldOptions(options),
    control: comboboxField(options),
    label: options.label,
  });
}

/** Enhances a fully-authored Field containing a direct `.fui-combobox` child. */
export function enhanceCombobox(
  root: HTMLElement,
  options: EnhanceComboboxOptions = {},
): ComboboxController {
  return enhanceField(root, {
    ...fieldOptions(options),
    control: comboboxField(options),
  });
}

function comboboxField(options: ComboboxSetupOptions): FieldControlFactory<ComboboxController> {
  return {
    rootClass: "fui-combobox",
    create(context) {
      if (!("items" in options) || options.items === undefined) {
        throw new Error("[Faisceau UI] Combobox creation requires options.items.");
      }
      const items = normalizeItems(options.items);
      const markup = createComboboxMarkup(options as ComboboxOptions, items);
      return setupCombobox(markup.root, options, context, {
        items,
        nativeSelect: markup.nativeSelect,
        ownsRoot: true,
        start: false,
      });
    },
    enhance(controlRoot, context) {
      const nativeSelect = requireNativeSelect(controlRoot, "Combobox");
      requireRootClass(controlRoot, "fui-combobox", "Combobox");
      requireRootClass(nativeSelect, "fui-native-select", "Combobox");
      const source = readNativeSelect(nativeSelect);
      const resolvedOptions = resolveEnhancedOptions(
        { ...options, label: options.label ?? context.label.textContent?.trim() },
        nativeSelect,
        source,
      );
      const restoreRoot = captureAttributes(controlRoot);
      const restoreSelect = captureAttributes(nativeSelect);
      const originalOptions = Array.from(nativeSelect.childNodes, (node) => node.cloneNode(true));
      return setupCombobox(controlRoot, resolvedOptions, context, {
        cleanup() {
          const value = getNativeSelectValue(nativeSelect);
          nativeSelect.replaceChildren(...originalOptions);
          setNativeSelectValue(nativeSelect, value);
          restoreRoot();
        },
        items: source.items,
        nativeSelect,
        ownsRoot: false,
        restoreNativeSelect: restoreSelect,
        start: true,
      });
    },
  };
}

function setupCombobox(
  root: HTMLElement,
  options: ComboboxSetupOptions,
  fieldContext: FieldControlContext,
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
    className: _className,
    clearLabel,
    emptyLabel,
    filter = defaultFilter,
    getRemoveLabel = defaultRemoveLabel,
    id: requestedId,
    items: _items,
    label: _label,
    onInputValueChange,
    onValueChange,
    ...behavior
  } = options;
  const parts = resolveParts(root, setup.nativeSelect, setup.items, fieldContext.label, emptyLabel);
  const machineId = requestedId ?? fieldContext.id ?? createId("combobox");

  root.dataset.fuiComponent = "combobox";
  root.toggleAttribute("data-fui-multiple", behavior.multiple === true);
  if (!parts.label.textContent?.trim()) {
    throw new Error("[Faisceau UI] Combobox requires a visible, non-empty label.");
  }

  if (emptyLabel !== undefined) parts.empty.textContent = emptyLabel;
  const itemRecords = mapItems(parts.itemElements, setup.items, machineId);
  let currentItems = [...setup.items];
  let itemByValue = new Map(currentItems.map((item) => [item.value, item]));
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
    invalid: behavior.invalid ?? fieldContext.invalid,
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
      disabled: behavior.disabled ?? fieldContext.disabled,
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
    const filteredItems = getFilteredItems(currentItems, inputValue, filter);
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

  const itemDisposers = new Map<string, () => void>();
  const bindItem = (element: HTMLElement, item: FuiItem): void => {
    const disposers = [zag.bind(element, (api) => api.getItemProps({ item }))];

    const text = queryClass<HTMLElement>(element, "fui-combobox-item-text");
    if (text) {
      disposers.push(zag.bind(text, (api) => api.getItemTextProps({ item })));
    }

    const indicator = queryClass<HTMLElement>(element, "fui-combobox-item-indicator");
    if (indicator) {
      disposers.push(zag.bind(indicator, (api) => api.getItemIndicatorProps({ item })));
    }
    itemDisposers.set(item.value, () => disposers.forEach((dispose) => dispose()));
  };
  for (const { element, item } of itemRecords) {
    bindItem(element, item);
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
  if (fieldContext.describedBy) {
    parts.input.setAttribute("aria-describedby", fieldContext.describedBy);
  }

  let started = false;
  const controller: ComboboxController = {
    api: zag.api,
    root,
    get started() {
      return started;
    },
    setItems(inputs) {
      if (destroyed) throwDestroyed("Combobox");
      currentItems = normalizeItems(inputs);
      itemByValue = new Map(currentItems.map((item) => [item.value, item]));
      const nextValues = new Set(itemByValue.keys());
      const elements = new Map(
        queryClasses<HTMLElement>(parts.list, "fui-combobox-item").map((element) => [
          element.dataset.value!,
          element,
        ]),
      );
      const ordered = reconcileKeyedValues({
        create: (item) => createComboboxItem(item),
        current: elements,
        destroy: (element, value) => {
          itemDisposers.get(value)?.();
          itemDisposers.delete(value);
          element.remove();
        },
        getKey: (item) => item.value,
        inputs: currentItems,
        update: (element, item) => {
          itemDisposers.get(item.value)?.();
          const fresh = createComboboxItem(item);
          element.replaceChildren(...fresh.childNodes);
          element.dataset.value = item.value;
          element.toggleAttribute("data-disabled", item.disabled === true);
          element.className = "fui-combobox-item";
          element.id ||= `${machineId}:item:${item.value}`;
          bindItem(element, item);
        },
      });
      parts.list.append(...ordered);
      const value = zag.api.get().value.filter((entry) => nextValues.has(entry));
      const valueChanged = value.length !== zag.api.get().value.length;
      if (valueChanged) nativeField.syncFromMachine(value);
      reconcileNativeSelectOptions(parts.nativeSelect, currentItems, behavior.placeholder ?? "");
      if (valueChanged) zag.api.get().setValue(value);
      updateCollection(zag.api.get().inputValue);
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
      for (const dispose of itemDisposers.values()) dispose();
      itemDisposers.clear();
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
  label: HTMLLabelElement,
  emptyLabel?: string,
): ComboboxParts {
  const control = requireClass<HTMLElement>(root, "fui-combobox-control", "Combobox");
  const input = requireClass<HTMLInputElement>(root, "fui-combobox-input", "Combobox");
  const selection = requireClass<HTMLElement>(root, "fui-combobox-selection", "Combobox");
  const trigger = requireClass<HTMLButtonElement>(root, "fui-combobox-trigger", "Combobox");
  const positioner = requireClass<HTMLElement>(root, "fui-combobox-positioner", "Combobox");
  const content = requireClass<HTMLElement>(root, "fui-combobox-content", "Combobox");
  const list = requireClass<HTMLElement>(root, "fui-combobox-list", "Combobox");
  const empty = requireClass<HTMLElement>(root, "fui-combobox-empty", "Combobox");
  if (emptyLabel !== undefined) empty.textContent = emptyLabel;
  const clearTrigger = queryClass<HTMLButtonElement>(root, "fui-combobox-clear-trigger");
  const itemElements = queryClasses<HTMLElement>(root, "fui-combobox-item");
  if (items.length > 0 && itemElements.length === 0) {
    throw new Error("[Faisceau UI] Combobox items require `.fui-combobox-item` markup.");
  }

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
    const label = h("span", { class: "fui-combobox-tag-label" }, item.label);
    const removeTrigger = h(
      "button",
      {
        "aria-label": getRemoveLabel(item),
        class: "fui-combobox-tag-remove",
        data: { value: item.value },
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
        data: { value: item.value },
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

function fieldOptions(options: ComboboxSetupOptions) {
  return {
    className: options.className,
    description: options.description,
    disabled: options.disabled,
    errorMessage: options.errorMessage,
    id: options.id,
    invalid: options.invalid,
    label: options.label,
  };
}

function queryClass<T extends Element>(root: ParentNode, className: string): T | null {
  return root.querySelector<T>(`.${className}`);
}

function queryClasses<T extends Element>(root: ParentNode, className: string): T[] {
  return Array.from(root.querySelectorAll<T>(`.${className}`));
}

function requireClass<T extends Element>(
  root: ParentNode,
  className: string,
  component: string,
): T {
  const elements = queryClasses<T>(root, className);
  if (elements.length !== 1) {
    throw new Error(
      `[Faisceau UI] ${component} enhancement requires exactly one \`.${className}\` element; found ${elements.length}.`,
    );
  }
  return elements[0]!;
}

function requireRootClass(root: Element, className: string, component: string): void {
  if (!root.classList.contains(className)) {
    throw new Error(`[Faisceau UI] ${component} enhancement requires \`.${className}\`.`);
  }
}

function throwDestroyed(name: string): never {
  throw new Error(`[Faisceau UI] Cannot start or mount a destroyed ${name}.`);
}
