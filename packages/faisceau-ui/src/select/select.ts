import { h } from "@lilian1315/create-element";
import * as select from "@zag-js/select";
import { effect } from "faisceau";
import { createZagMachine } from "faisceau-zag";

import type { EnhanceSelectProps, SelectController, SelectProps } from "./types.ts";
import {
  createId,
  getLookupRoot,
  normalizeItems,
  type FuiItem,
  type FuiItemInput,
} from "../shared/index.js";
import { captureAttributes, captureChildNodes, insertAfter } from "../shared/dom.ts";
import { buildControl, buildNativeSelect, buildOptions, buildPopup } from "./markup.ts";

export function createSelect(options: SelectProps): SelectController {
  return factory(undefined, options);
}

export function enhanceSelect(
  root: HTMLDivElement,
  options?: EnhanceSelectProps,
): SelectController {
  return factory(root, options);
}

function factory(
  root?: HTMLDivElement,
  options?: SelectProps | EnhanceSelectProps,
): SelectController {
  if (root && !root.classList.contains("fui-select")) {
    throw new Error("[Faisceau UI] Select enhance mode need a root with the `fui-select` class");
  }

  const enhanceMode = !!root;
  const restores: (() => void)[] = [];
  const generated: HTMLElement[] = [];
  options ??= { items: [] };

  const multiple = options.multiple ?? root?.querySelector("select")?.multiple ?? false;
  const placeholder = options.placeholder ?? "Select an option";

  let nativeSelect: HTMLSelectElement;
  let items: FuiItem[];
  let initialValue: string[];

  if (root) {
    const found = root.querySelector<HTMLSelectElement>("select.fui-native-select");
    if (!found) throw new Error("[Faisceau UI] missing Select `select.fui-native-select`");
    nativeSelect = found;
    restores.push(captureAttributes(root), captureAttributes(nativeSelect));

    initialValue = [...(options.value ?? options.defaultValue ?? readSelected(nativeSelect))];
    if (options.items) {
      items = normalizeItems(options.items);
      const known = new Set(items.map((item) => item.value));
      initialValue = initialValue.filter((value) => known.has(value));
      restores.push(captureChildNodes(nativeSelect));
      nativeSelect.replaceChildren(...buildOptions(items, placeholder, multiple, initialValue));
    } else {
      items = normalizeItems(readItems(nativeSelect));
    }
    // Like Checkbox, unspecified form props are read from the adopted element.
    options = {
      ...options,
      name: options.name ?? (nativeSelect.name || undefined),
      disabled: options.disabled ?? nativeSelect.disabled,
      required: options.required ?? nativeSelect.required,
      form: options.form ?? nativeSelect.getAttribute("form") ?? undefined,
      autoComplete: options.autoComplete ?? nativeSelect.getAttribute("autocomplete") ?? undefined,
    };
  } else {
    if (options.items === undefined)
      throw new Error("[Faisceau UI] Select creation requires options.items.");
    items = normalizeItems(options.items);
    initialValue = [...(options.value ?? options.defaultValue ?? [])];
    root = h("div", { class: "fui-select" }) as HTMLDivElement;
    nativeSelect = buildNativeSelect(items, { ...options, multiple, value: initialValue });
    root.append(nativeSelect);
  }

  const label = ensureText<HTMLLabelElement>(
    root,
    "label.fui-field-label",
    () => h("label", { class: "fui-field-label" }) as HTMLLabelElement,
    "prepend",
    options.label,
    enhanceMode,
    generated,
    restores,
  );
  ensureText<HTMLParagraphElement>(
    root,
    "p.fui-field-description",
    () => h("p", { class: "fui-field-description" }) as HTMLParagraphElement,
    "append",
    options.description,
    enhanceMode,
    generated,
    restores,
  );

  // Every other part is always generated fresh, in both modes.
  const { control, trigger, value: valueText, clearTrigger } = buildControl(options);
  insertAfter(root, control, nativeSelect);
  generated.push(control);
  const { positioner, content, list } = buildPopup(items);
  insertAfter(root, positioner, control);
  generated.push(positioner);

  const {
    items: _items,
    label: _label,
    description: _description,
    placeholder: _placeholder,
    clearable: _clearable,
    clearLabel: _clearLabel,
    id: requestedId,
    value,
    defaultValue: _defaultValue,
    ...behavior
  } = options;
  const zag = createZagMachine(
    select.machine as select.Machine<FuiItem>,
    {
      ...behavior,
      multiple,
      collection: select.collection({
        items: [...items],
        isItemDisabled: (item) => item.disabled ?? false,
        itemToString: (item) => item.label,
        itemToValue: (item) => item.value,
      }),
      id: requestedId ?? createId("select"),
      getRootNode: () => getLookupRoot(root),
      ...(value !== undefined ? { value } : { defaultValue: initialValue }),
    },
    select.connect,
  );

  zag.bind(root, (api) => api.getRootProps());
  zag.bind(nativeSelect, (api) => api.getHiddenSelectProps());
  if (label) zag.bind(label, (api) => api.getLabelProps());
  zag.bind(control, (api) => api.getControlProps());
  zag.bind(trigger, (api) => api.getTriggerProps());
  zag.bind(valueText, (api) => api.getValueTextProps());
  zag.bind(positioner, (api) => api.getPositionerProps());
  zag.bind(content, (api) => api.getContentProps());
  zag.bind(list, (api) => api.getListProps());
  if (clearTrigger) zag.bind(clearTrigger, (api) => api.getClearTriggerProps());
  for (const [index, item] of items.entries()) {
    const element = list.children[index] as HTMLElement;
    zag.bind(element, (api) => api.getItemProps({ item }));
    const text = element.querySelector<HTMLElement>(".fui-select-item-text");
    if (text) zag.bind(text, (api) => api.getItemTextProps({ item }));
    const indicator = element.querySelector<HTMLElement>(".fui-select-item-indicator");
    if (indicator) zag.bind(indicator, (api) => api.getItemIndicatorProps({ item }));
  }

  // One subscription drives the value text, the placeholder state, and the
  // native repair. The native select is Zag's hidden select, which syncs
  // options, emits one bubbling `change` per value change, and follows form
  // reset. One gap remains: Zag also maps the value onto `select.value`, which
  // only selects a single option, so re-renders wipe multiple selections.
  // Repairing the options here never dispatches, so the cycle terminates.
  const stopSync = effect(() => {
    const api = zag.api.get();
    const empty = api.value.length === 0;
    valueText.textContent = empty ? placeholder : api.valueAsString;
    valueText.toggleAttribute("data-placeholder-shown", empty);
    if (!sameValues(readSelected(nativeSelect), api.value)) applyValue(nativeSelect, api.value);
  });

  let started = false;
  let destroyed = false;

  const controller: SelectController = {
    api: zag.api,
    root,
    get started() {
      return started;
    },
    mount(target: ParentNode) {
      if (destroyed) return throwDestroyed();
      target.append(root);
      return this.start();
    },
    start() {
      if (destroyed) return throwDestroyed();
      if (!started) {
        zag.start();
        started = true;
      }
      return this;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      const value = zag.api.get().value;
      stopSync();
      zag.destroy();

      if (enhanceMode) {
        for (const node of generated) node.remove();
        restores.forEach((restore) => restore());
        applyValue(nativeSelect, value);
        return;
      }

      root?.remove();
    },
  };

  if (enhanceMode) controller.start();

  return controller;
}

/** Reads items from native options, skipping the explicitly-marked placeholder. */
function readItems(native: HTMLSelectElement): FuiItemInput[] {
  return Array.from(native.options)
    .filter((option) => !option.hasAttribute("data-placeholder"))
    .map((option) => ({
      value: option.value,
      label: option.label || option.text,
      ...(option.disabled ? { disabled: true as const } : {}),
    }));
}

/** Reads the selected values, excluding the explicitly-marked placeholder. */
function readSelected(native: HTMLSelectElement): string[] {
  const placeholder = native.querySelector("option[data-placeholder]");
  return Array.from(native.selectedOptions)
    .filter((option) => option !== placeholder)
    .map((option) => option.value);
}

/** Applies a value to the native select without emitting events. */
function applyValue(native: HTMLSelectElement, value: readonly string[]): void {
  const selected = new Set(value);
  for (const option of native.options) {
    option.selected = option.hasAttribute("data-placeholder")
      ? selected.size === 0
      : selected.has(option.value);
  }
}

/** Order-insensitive value comparison (native order follows the document). */
function sameValues(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightValues = new Set(right);
  return left.every((value) => rightValues.has(value));
}

/** Adopts a label or description, generating it from a string option if missing. */
function ensureText<T extends HTMLElement>(
  root: HTMLElement,
  selector: string,
  create: () => T,
  where: "prepend" | "append",
  text: string | undefined,
  enhanceMode: boolean,
  generated: HTMLElement[],
  restores: (() => void)[],
): T | null {
  let node = root.querySelector<T>(selector);
  if (typeof text === "string" && !node) {
    node = create();
    root[where](node);
    generated.push(node);
  }
  if (node && text !== undefined) {
    if (enhanceMode && !generated.includes(node)) restores.push(captureChildNodes(node));
    node.replaceChildren(new Text(text));
  }
  return node;
}

function throwDestroyed(): never {
  throw new Error("[Faisceau UI] Cannot start or mount a destroyed Select.");
}
