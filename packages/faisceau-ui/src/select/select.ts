import { createZagMachine } from "faisceau-zag";
import * as select from "@zag-js/select";
import { effect } from "faisceau";

import { createField, enhanceField } from "../field/index.ts";
import type { FieldControlContext, FieldControlFactory } from "../field/index.ts";
import {
  captureAttributes,
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
import { createSelectItem, createSelectMarkup } from "./markup.ts";
import type { EnhanceSelectOptions, SelectController, SelectOptions } from "./types.ts";

interface SelectParts {
  label: HTMLLabelElement;
  control: HTMLElement;
  trigger: HTMLButtonElement;
  value: HTMLElement;
  indicator: HTMLElement | null;
  clearTrigger: HTMLButtonElement | null;
  positioner: HTMLElement;
  content: HTMLElement;
  list: HTMLElement;
  nativeSelect: HTMLSelectElement;
  itemElements: HTMLElement[];
}

type SelectSetupOptions = EnhanceSelectOptions & { items?: readonly FuiItemInput[] };

/** Builds a Select tree. Call `.mount(target)` to insert it and start Zag. */
export function createSelect(options: SelectOptions): SelectController {
  return createField({
    ...fieldOptions(options),
    control: selectField(options),
    label: options.label,
  });
}

/** Enhances a fully-authored Field containing a direct `.fui-select` child. */
export function enhanceSelect(
  root: HTMLElement,
  options: EnhanceSelectOptions = {},
): SelectController {
  return enhanceField(root, {
    ...fieldOptions(options),
    control: selectField(options),
  });
}

function selectField(options: SelectSetupOptions): FieldControlFactory<SelectController> {
  return {
    rootClass: "fui-select",
    create(context) {
      if (!("items" in options) || options.items === undefined) {
        throw new Error("[Faisceau UI] Select creation requires options.items.");
      }
      const items = normalizeItems(options.items);
      const markup = createSelectMarkup(options as SelectOptions, items);
      return setupSelect(markup.root, options, context, {
        items,
        nativeSelect: markup.nativeSelect,
        ownsRoot: true,
        start: false,
      });
    },
    enhance(controlRoot, context) {
      const nativeSelect = requireNativeSelect(controlRoot, "Select");
      requireRootClass(controlRoot, "fui-select", "Select");
      requireRootClass(nativeSelect, "fui-native-select", "Select");
      const source = readNativeSelect(nativeSelect);
      const resolvedOptions = resolveEnhancedOptions(
        { ...options, label: options.label ?? context.label.textContent?.trim() },
        nativeSelect,
        source,
      );
      const restoreRoot = captureAttributes(controlRoot);
      const restoreSelect = captureAttributes(nativeSelect);
      const originalOptions = Array.from(nativeSelect.childNodes, (node) => node.cloneNode(true));
      return setupSelect(controlRoot, resolvedOptions, context, {
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

function setupSelect(
  root: HTMLElement,
  options: SelectSetupOptions,
  field: FieldControlContext,
  setup: {
    cleanup?: () => void;
    items: FuiItem[];
    nativeSelect: HTMLSelectElement;
    ownsRoot: boolean;
    restoreNativeSelect?: () => void;
    start: boolean;
  },
): SelectController {
  const {
    alignItemWithTrigger = true,
    className: _className,
    clearLabel,
    clearable,
    id: requestedId,
    items: _items,
    label: _label,
    onOpenChange,
    onValueChange,
    placeholder = "Select an option",
    positioning: requestedPositioning,
    ...behavior
  } = options;
  const parts = resolveParts(
    root,
    setup.nativeSelect,
    setup.items,
    field.label,
    clearable ?? false,
    clearLabel,
  );
  const machineId = requestedId ?? field.id ?? createId("select");

  root.dataset.fuiComponent = "select";
  root.toggleAttribute("data-fui-multiple", behavior.multiple === true);
  if (!parts.label.textContent?.trim()) {
    throw new Error("[Faisceau UI] Select requires a visible, non-empty label.");
  }

  const itemRecords = mapItems(parts.itemElements, setup.items, machineId);
  const ids = createPartIds(machineId, root, parts, itemRecords);
  const collection = createCollection(setup.items);
  const resetValue = [
    ...(behavior.value ?? behavior.defaultValue ?? getNativeSelectValue(parts.nativeSelect)),
  ];
  const itemAligned = alignItemWithTrigger && behavior.multiple !== true;
  let nativeField: NativeSelectFieldController | undefined;
  const machineProps: select.Props<FuiItem> = {
    ...behavior,
    alignItemWithTrigger: itemAligned,
    collection,
    getRootNode: () => getLookupRoot(root),
    id: machineId,
    ids,
    invalid: behavior.invalid ?? field.invalid,
    name: behavior.name ?? (parts.nativeSelect.name || undefined),
    onOpenChange(details) {
      onOpenChange?.(details);
    },
    onValueChange(details) {
      nativeField?.syncFromMachine(details.value);
      onValueChange?.(details);
    },
    positioning: {
      gutter: 6,
      placement: "bottom-start",
      sameWidth: true,
      ...requestedPositioning,
    },
    translations: {
      ...behavior.translations,
      clearTriggerLabel:
        clearLabel ?? behavior.translations?.clearTriggerLabel ?? "Clear selection",
    },
  };
  const zag = createZagMachine(
    select.machine as select.Machine<FuiItem>,
    machineProps,
    select.connect,
  );
  nativeField = createNativeSelectField({
    focusTarget: parts.trigger,
    getValue: () => zag.api.get().value,
    props: {
      autoComplete: behavior.autoComplete,
      disabled: behavior.disabled ?? field.disabled,
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

  zag.bind(root, (api) => api.getRootProps());
  zag.bind(parts.label, (api) => api.getLabelProps());
  zag.bind(parts.control, (api) => api.getControlProps());
  zag.bind(parts.trigger, (api) => api.getTriggerProps());
  zag.bind(parts.value, (api) => api.getValueTextProps());
  zag.bind(parts.positioner, (api) => api.getPositionerProps());
  zag.bind(parts.content, (api) => api.getContentProps());
  zag.bind(parts.list, (api) => api.getListProps());

  if (parts.indicator) zag.bind(parts.indicator, (api) => api.getIndicatorProps());
  if (parts.clearTrigger) {
    zag.bind(parts.clearTrigger, (api) => api.getClearTriggerProps());
  }
  const itemDisposers = new Map<string, () => void>();
  const bindItem = (element: HTMLElement, item: FuiItem): void => {
    const disposers = [zag.bind(element, (api) => api.getItemProps({ item }))];

    const text = queryClass<HTMLElement>(element, "fui-select-item-text");
    if (text) {
      disposers.push(zag.bind(text, (api) => api.getItemTextProps({ item })));
    }

    const indicator = queryClass<HTMLElement>(element, "fui-select-item-indicator");
    if (indicator) {
      disposers.push(zag.bind(indicator, (api) => api.getItemIndicatorProps({ item })));
    }

    itemDisposers.set(item.value, () => disposers.forEach((dispose) => dispose()));
  };
  for (const { element, item } of itemRecords) {
    bindItem(element, item);
  }

  const stopValueText = effect(() => {
    const api = zag.api.get();
    const isPlaceholder = api.value.length === 0;
    parts.value.textContent = isPlaceholder ? placeholder : api.valueAsString;
    parts.value.toggleAttribute("data-placeholder-shown", isPlaceholder);
  });
  if (field.describedBy) parts.trigger.setAttribute("aria-describedby", field.describedBy);

  let started = false;
  let destroyed = false;

  const controller: SelectController = {
    api: zag.api,
    root,
    get started() {
      return started;
    },
    setItems(inputs) {
      if (destroyed) throwDestroyed("Select");
      const nextItems = normalizeItems(inputs);
      const nextValues = new Set(nextItems.map((item) => item.value));
      const elements = new Map(
        queryClasses<HTMLElement>(parts.list, "fui-select-item").map((element) => [
          element.dataset.value!,
          element,
        ]),
      );
      const ordered = reconcileKeyedValues({
        create: (item) => createSelectItem(item),
        current: elements,
        destroy: (element, value) => {
          itemDisposers.get(value)?.();
          itemDisposers.delete(value);
          element.remove();
        },
        getKey: (item) => item.value,
        inputs: nextItems,
        update: (element, item) => {
          itemDisposers.get(item.value)?.();
          updateItemElement(element, item, "select");
          element.id ||= `${machineId}:item:${item.value}`;
          bindItem(element, item);
        },
      });
      parts.list.append(...ordered);
      const value = zag.api.get().value.filter((entry) => nextValues.has(entry));
      const valueChanged = value.length !== zag.api.get().value.length;
      if (valueChanged) nativeField.syncFromMachine(value);
      reconcileNativeSelectOptions(parts.nativeSelect, nextItems, placeholder);
      zag.updateProps({ collection: createCollection(nextItems) });
      if (valueChanged) zag.api.get().setValue(value);
    },
    mount(target) {
      if (destroyed) throwDestroyed("Select");
      target.append(root);
      return this.start();
    },
    start() {
      if (destroyed) throwDestroyed("Select");
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
      stopValueText();
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
  clearable: boolean,
  clearLabel?: string,
): SelectParts {
  const control = requireClass<HTMLElement>(root, "fui-select-control", "Select");
  const trigger = requireClass<HTMLButtonElement>(root, "fui-select-trigger", "Select");
  const value = requireClass<HTMLElement>(root, "fui-select-value", "Select");
  const positioner = requireClass<HTMLElement>(root, "fui-select-positioner", "Select");
  const content = requireClass<HTMLElement>(root, "fui-select-content", "Select");
  const list = requireClass<HTMLElement>(root, "fui-select-list", "Select");
  const clearTrigger = queryClass<HTMLButtonElement>(root, "fui-select-clear-trigger");

  if (clearable && clearTrigger === null) {
    throw new Error(
      "[Faisceau UI] Select enhancement with clearable enabled requires `.fui-select-clear-trigger`.",
    );
  }
  if (clearTrigger && clearLabel) clearTrigger.setAttribute("aria-label", clearLabel);

  const indicator = queryClass<HTMLElement>(root, "fui-select-indicator");
  const itemElements = queryClasses<HTMLElement>(root, "fui-select-item");
  if (items.length > 0 && itemElements.length === 0) {
    throw new Error("[Faisceau UI] Select items require `.fui-select-item` markup.");
  }

  return {
    label,
    control,
    trigger,
    value,
    indicator,
    clearTrigger,
    positioner,
    content,
    list,
    nativeSelect,
    itemElements,
  };
}

function resolveEnhancedOptions(
  options: EnhanceSelectOptions,
  nativeSelect: HTMLSelectElement,
  source: NativeSelectSource,
): EnhanceSelectOptions & { label: string } {
  const label = options.label ?? nativeSelect.getAttribute("aria-label")?.trim();
  if (!label) {
    throw new Error(
      "[Faisceau UI] Select enhancement requires options.label or aria-label on the native select.",
    );
  }

  const hasExplicitValue = options.value !== undefined || options.defaultValue !== undefined;
  return {
    ...options,
    autoComplete: options.autoComplete ?? nativeSelect.getAttribute("autocomplete") ?? undefined,
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
      throw new Error(`[Faisceau UI] Select item at index ${index} requires data-value.`);
    }
    if (seen.has(value)) {
      throw new Error(`[Faisceau UI] Select markup contains duplicate data-value "${value}".`);
    }
    seen.add(value);

    const item = itemByValue.get(value);
    if (!item) {
      throw new Error(`[Faisceau UI] Select markup item "${value}" is absent from options.items.`);
    }

    element.id ||= `${machineId}:item:${index}`;
    return { element, item };
  });

  for (const item of items) {
    if (!seen.has(item.value)) {
      throw new Error(`[Faisceau UI] Select item "${item.value}" has no matching markup node.`);
    }
  }

  return records;
}

function createPartIds(
  id: string,
  root: HTMLElement,
  parts: SelectParts,
  items: ReadonlyArray<{ element: HTMLElement; item: FuiItem }>,
): select.ElementIds {
  root.id ||= `${id}:root`;
  parts.label.id ||= `${id}:label`;
  parts.control.id ||= `${id}:control`;
  parts.trigger.id ||= `${id}:trigger`;
  parts.positioner.id ||= `${id}:positioner`;
  parts.content.id ||= `${id}:content`;
  if (parts.clearTrigger) parts.clearTrigger.id ||= `${id}:clear-trigger`;
  parts.nativeSelect.id ||= `${id}:hidden-select`;

  const itemIds = new Map(items.map(({ element, item }) => [item.value, element.id]));
  return {
    root: root.id,
    label: parts.label.id,
    control: parts.control.id,
    trigger: parts.trigger.id,
    positioner: parts.positioner.id,
    content: parts.content.id,
    clearTrigger: parts.clearTrigger?.id,
    hiddenSelect: parts.nativeSelect.id,
    item: (value) => itemIds.get(String(value)) ?? `${id}:item:${String(value)}`,
  };
}

function createCollection(items: readonly FuiItem[]) {
  return select.collection({
    items: [...items],
    isItemDisabled: (item) => item.disabled ?? false,
    itemToString: (item) => item.label,
    itemToValue: (item) => item.value,
  });
}

function updateItemElement(element: HTMLElement, item: FuiItem, component: "select"): void {
  const fresh = createSelectItem(item);
  element.replaceChildren(...fresh.childNodes);
  element.dataset.value = item.value;
  element.toggleAttribute("data-disabled", item.disabled === true);
  element.className = `fui-${component}-item`;
}

function fieldOptions(options: SelectSetupOptions) {
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
