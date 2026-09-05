import { h } from "@lilian1315/create-element/faisceau";
import { createZagMachine } from "@lilian1315/faisceau-zag";
import * as select from "@zag-js/select";
import { effect } from "faisceau";

import {
  addFuiClasses,
  captureAttributes,
  createClearIcon,
  createId,
  getNativeSelectValue,
  normalizeItems,
  queryPart,
  queryParts,
  readNativeSelect,
  requirePart,
  requireNativeSelect,
  setNativeSelectValue,
  type FuiItem,
  type FuiItemInput,
  type NativeSelectSource,
} from "../shared/index.js";
import { createSelectMarkup, enhanceSelectMarkup } from "./markup.js";
import { createItemAlignedPositioning } from "./positioning.js";
import type { EnhanceSelectOptions, SelectController, SelectOptions } from "./types.js";

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
  const items = normalizeItems(options.items);
  const markup = createSelectMarkup(options, items);
  return setupSelect(markup.root, options, {
    items,
    nativeSelect: markup.nativeSelect,
    ownsRoot: true,
    start: false,
  });
}

/** Enhances a container holding one native select and generates the visual UI. */
export function enhanceSelect(
  root: HTMLElement,
  options: EnhanceSelectOptions = {},
): SelectController {
  const nativeSelect = requireNativeSelect(root, "Select");
  const source = readNativeSelect(nativeSelect);
  const resolvedOptions = resolveEnhancedOptions(options, nativeSelect, source);
  const restoreRoot = captureAttributes(root);
  const restoreSelect = captureAttributes(nativeSelect);
  const generated = enhanceSelectMarkup(root, nativeSelect, resolvedOptions, source.items);

  return setupSelect(root, resolvedOptions, {
    cleanup(value) {
      for (const element of generated) element.remove();
      restoreRoot();
      restoreSelect();
      setNativeSelectValue(nativeSelect, value);
    },
    items: source.items,
    nativeSelect,
    ownsRoot: false,
    start: true,
  });
}

function setupSelect(
  root: HTMLElement,
  options: SelectSetupOptions,
  setup: {
    cleanup?: (value: string[]) => void;
    items: FuiItem[];
    nativeSelect: HTMLSelectElement;
    ownsRoot: boolean;
    start: boolean;
  },
): SelectController {
  const {
    alignItemWithTrigger = true,
    className,
    clearLabel,
    clearable,
    description,
    errorMessage,
    id: requestedId,
    items: _items,
    label: nextLabel,
    onOpenChange,
    placeholder = "Select an option",
    positioning: requestedPositioning,
    ...behavior
  } = options;
  const parts = resolveParts(root, setup.nativeSelect, setup.items, clearable ?? false, clearLabel);
  const machineId = requestedId ?? createId("select");

  root.dataset.fuiComponent = "select";
  root.dataset.fuiPart ||= "root";
  root.toggleAttribute("data-fui-multiple", behavior.multiple === true);
  addFuiClasses(root, "fui-select");
  addCallerClasses(root, className);

  if (nextLabel !== undefined) parts.label.textContent = nextLabel;
  if (!parts.label.textContent?.trim()) {
    throw new Error("[Faisceau UI] Select requires a visible, non-empty label.");
  }

  const descriptionElement = ensureMessage(
    root,
    "description",
    description,
    "fui-field-description",
  );
  const errorElement = ensureMessage(root, "error", errorMessage, "fui-field-error");
  if (errorElement) errorElement.setAttribute("role", "alert");

  const itemRecords = mapItems(parts.itemElements, setup.items, machineId);
  const ids = createPartIds(machineId, root, parts, itemRecords);
  const collection = createCollection(setup.items);
  const itemByValue = new Map(itemRecords.map(({ element, item }) => [item.value, element]));
  const itemAligned = alignItemWithTrigger && behavior.multiple !== true;
  const positioning = itemAligned
    ? createItemAlignedPositioning({
        fallbackGutter: 6,
        getSelectedItem: () => {
          const selectedValue = getNativeSelectValue(parts.nativeSelect)[0];
          return selectedValue === undefined ? null : (itemByValue.get(selectedValue) ?? null);
        },
        positioner: parts.positioner,
        requested: requestedPositioning,
        trigger: parts.trigger,
        valueText: parts.value,
      })
    : {
        gutter: 6,
        placement: "bottom-start" as const,
        sameWidth: true,
        ...requestedPositioning,
      };
  parts.positioner.toggleAttribute("data-fui-item-aligned", itemAligned);
  if (itemAligned) parts.positioner.removeAttribute("data-fui-positioned");
  const machineProps: select.Props<FuiItem> = {
    ...behavior,
    collection,
    getRootNode: () => getLookupRoot(root),
    id: machineId,
    ids,
    invalid: behavior.invalid ?? errorElement !== null,
    name: behavior.name ?? (parts.nativeSelect.name || undefined),
    onOpenChange(details) {
      if (itemAligned) parts.positioner.removeAttribute("data-fui-positioned");
      onOpenChange?.(details);
    },
    positioning,
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
  let changingFromNative = false;
  const handleNativeChange = (): void => {
    if (changingFromNative) return;
    changingFromNative = true;
    zag.api.get().setValue(getNativeSelectValue(parts.nativeSelect));
    changingFromNative = false;
  };
  parts.nativeSelect.addEventListener("input", handleNativeChange);
  parts.nativeSelect.addEventListener("change", handleNativeChange);

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
  zag.bind(parts.nativeSelect, (api) => api.getHiddenSelectProps());

  for (const { element, item } of itemRecords) {
    zag.bind(element, (api) => api.getItemProps({ item }));

    const text = queryPart<HTMLElement>(element, "item-text");
    if (text) {
      addFuiClasses(text, "fui-select-item-text");
      zag.bind(text, (api) => api.getItemTextProps({ item }));
    }

    const indicator = queryPart<HTMLElement>(element, "item-indicator");
    if (indicator) {
      addFuiClasses(indicator, "fui-select-item-indicator");
      zag.bind(indicator, (api) => api.getItemIndicatorProps({ item }));
    }

    const itemDescription = queryPart<HTMLElement>(element, "item-description");
    if (itemDescription) addFuiClasses(itemDescription, "fui-select-item-description");
  }

  const stopValueText = effect(() => {
    const api = zag.api.get();
    const isPlaceholder = api.value.length === 0;
    parts.value.textContent = isPlaceholder ? placeholder : api.valueAsString;
    parts.value.toggleAttribute("data-placeholder-shown", isPlaceholder);
  });
  const stopNativeSelectSync = effect(() => {
    setNativeSelectValue(parts.nativeSelect, zag.api.get().value);
  });

  linkDescription(parts.trigger, descriptionElement, errorElement);

  let started = false;
  let destroyed = false;

  const controller: SelectController = {
    api: zag.api,
    root,
    get started() {
      return started;
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
        started = true;
      }
      return this;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopValueText();
      stopNativeSelectSync();
      parts.nativeSelect.removeEventListener("input", handleNativeChange);
      parts.nativeSelect.removeEventListener("change", handleNativeChange);
      const value = getNativeSelectValue(parts.nativeSelect);
      zag.destroy();
      if (setup.ownsRoot) root.remove();
      else setup.cleanup?.(value);
    },
  };

  if (setup.start) controller.start();
  return controller;
}

function resolveParts(
  root: HTMLElement,
  nativeSelect: HTMLSelectElement,
  items: readonly FuiItem[],
  clearable: boolean,
  clearLabel?: string,
): SelectParts {
  const label = requirePart<HTMLLabelElement>(root, "label");
  const control = requirePart<HTMLElement>(root, "control");
  const trigger = requirePart<HTMLButtonElement>(root, "trigger");
  const value = requirePart<HTMLElement>(root, "value");
  const positioner = requirePart<HTMLElement>(root, "positioner");
  const content = requirePart<HTMLElement>(root, "content");
  const list = requirePart<HTMLElement>(root, "list");
  let clearTrigger = queryPart<HTMLButtonElement>(root, "clear-trigger");

  if (clearable && clearTrigger === null) {
    clearTrigger = h(
      "button",
      {
        "aria-label": clearLabel ?? "Clear selection",
        class: "fui-select-clear-trigger",
        data: { fuiPart: "clear-trigger" },
        type: "button",
      },
      createClearIcon(),
    );
    control.append(clearTrigger);
  }

  addFuiClasses(label, "fui-select-label");
  addFuiClasses(control, "fui-select-control");
  addFuiClasses(trigger, "fui-select-trigger");
  addFuiClasses(value, "fui-select-value");
  addFuiClasses(positioner, "fui-select-positioner");
  addFuiClasses(content, "fui-select-content");
  addFuiClasses(list, "fui-select-list");

  const indicator = queryPart<HTMLElement>(root, "indicator");
  if (indicator) addFuiClasses(indicator, "fui-select-indicator");
  if (clearTrigger) addFuiClasses(clearTrigger, "fui-select-clear-trigger");

  const itemElements = queryParts<HTMLElement>(root, "item");
  if (items.length > 0 && itemElements.length === 0) {
    throw new Error('[Faisceau UI] Select items require `[data-fui-part="item"]` markup.');
  }
  for (const item of itemElements) addFuiClasses(item, "fui-select-item");

  addFuiClasses(nativeSelect, "fui-native-select");
  nativeSelect.dataset.fuiPart = "native-select";

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

function getLookupRoot(element: Element): Document | ShadowRoot {
  const root = element.getRootNode();
  return "getElementById" in root ? (root as Document | ShadowRoot) : element.ownerDocument;
}
