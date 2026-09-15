import { h } from "@lilian1315/create-element";
import * as combobox from "@zag-js/combobox";
import { effect } from "faisceau";
import { createZagMachine } from "faisceau-zag";

import type { ComboboxController, ComboboxProps, EnhanceComboboxProps } from "./types.ts";
import {
  createClearIcon,
  createId,
  getLookupRoot,
  normalizeItems,
  reconcileKeyedValues,
  type FuiItem,
  type FuiItemInput,
} from "../shared/index.js";
import { captureAttributes, captureChildNodes, ensureText, insertAfter } from "../shared/dom.ts";
import {
  buildControl,
  buildItem,
  buildNativeSelect,
  buildOptions,
  buildPopup,
  hideNativeSelect,
  reconcileNativeSelectOptions,
} from "./markup.ts";

export function createCombobox(options: ComboboxProps): ComboboxController {
  return factory(undefined, options);
}

export function enhanceCombobox(
  root: HTMLDivElement,
  options?: EnhanceComboboxProps,
): ComboboxController {
  return factory(root, options);
}

function factory(
  root?: HTMLDivElement,
  options?: ComboboxProps | EnhanceComboboxProps,
): ComboboxController {
  if (root && !root.classList.contains("fui-combobox")) {
    throw new Error(
      "[Faisceau UI] Combobox enhance mode need a root with the `fui-combobox` class",
    );
  }

  const enhanceMode = !!root;
  const restores: (() => void)[] = [];
  options ??= { items: [] };

  let multiple: boolean = options.multiple ?? false;
  let placeholder: string | undefined = options.placeholder;

  let nativeSelect: HTMLSelectElement;
  let items: FuiItem[];
  let initialValue: string[];

  if (root) {
    const found = root.querySelector<HTMLSelectElement>("select.fui-native-select");
    if (!found) throw new Error("[Faisceau UI] missing Combobox `select.fui-native-select`");
    nativeSelect = found;
    restores.push(captureAttributes(root), captureAttributes(nativeSelect));
    if (typeof options.multiple === "undefined") multiple = nativeSelect.multiple;

    initialValue = [...(options.value ?? options.defaultValue ?? readSelected(nativeSelect))];
    if (options.items) {
      items = normalizeItems(options.items);
      const known = new Set(items.map((item) => item.value));
      initialValue = initialValue.filter((value) => known.has(value));
      restores.push(captureChildNodes(nativeSelect));
      nativeSelect.replaceChildren(
        ...buildOptions(items, options.placeholder, multiple, initialValue),
      );
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
    };
    placeholder ??= readPlaceholder(nativeSelect);
    // The adopted select becomes the submitted control; Zag must not see it.
    nativeSelect.setAttribute("aria-hidden", "true");
    nativeSelect.tabIndex = -1;
    hideNativeSelect(nativeSelect);
    if (options.name !== undefined) nativeSelect.name = options.name;
    if (options.form !== undefined) nativeSelect.setAttribute("form", options.form);
    if (options.multiple !== undefined) nativeSelect.multiple = multiple;
    if (options.disabled !== undefined) nativeSelect.disabled = options.disabled;
    if (options.required !== undefined) nativeSelect.required = options.required;
  } else {
    if (options.items === undefined)
      throw new Error("[Faisceau UI] Combobox creation requires options.items.");
    items = normalizeItems(options.items);
    initialValue = [...(options.value ?? options.defaultValue ?? [])];
    root = h("div", { class: "fui-combobox" }) as HTMLDivElement;
    nativeSelect = buildNativeSelect(items, { ...options, multiple, value: initialValue });
    root.append(nativeSelect);
  }

  root.toggleAttribute("data-fui-multiple", multiple);

  const label = ensureText(
    root,
    { tag: "label", class: "fui-field-label" },
    (parent, node) => parent.prepend(node),
    options.label,
    enhanceMode,
    restores,
  );
  ensureText(
    root,
    { tag: "p", class: "fui-field-description" },
    (parent, node) => parent.append(node),
    options.description,
    enhanceMode,
    restores,
  );

  // Every other part is always generated fresh, in both modes.
  const { control, selection, input, clearTrigger, trigger } = buildControl({
    clearLabel: options.clearLabel,
    placeholder,
  });
  insertAfter(root, control, nativeSelect);
  restores.push(() => control.remove());
  const { positioner, content, list, empty } = buildPopup(items, options.emptyLabel);
  insertAfter(root, positioner, control);
  restores.push(() => positioner.remove());

  const {
    items: _items,
    label: _label,
    description: _description,
    placeholder: _placeholder,
    clearLabel: _clearLabel,
    emptyLabel: _emptyLabel,
    filter = defaultFilter,
    getRemoveLabel = defaultRemoveLabel,
    id: requestedId,
    value,
    defaultValue: _defaultValue,
    onInputValueChange,
    ...behavior
  } = options;

  let currentItems = [...items];
  let itemByValue = new Map(currentItems.map((item) => [item.value, item]));
  const initialInput = behavior.inputValue ?? behavior.defaultInputValue ?? "";
  const initialItems = getFilteredItems(currentItems, initialInput, filter);
  updateFilteredMarkup(list, empty, initialItems);

  let updateCollection = (_inputValue: string): void => {};
  const zag = createZagMachine(
    combobox.machine as combobox.Machine<FuiItem>,
    {
      ...behavior,
      multiple,
      collection: createCollection(initialItems),
      getRootNode: () => getLookupRoot(root),
      id: requestedId ?? createId("combobox"),
      inputBehavior: behavior.inputBehavior ?? "autohighlight",
      // The native select owns submission; the filter input must stay nameless.
      name: undefined,
      onInputValueChange(details) {
        updateCollection(details.inputValue);
        onInputValueChange?.(details);
      },
      openOnClick: behavior.openOnClick ?? true,
      positioning: {
        gutter: 6,
        placement: "bottom-start",
        sameWidth: true,
        ...behavior.positioning,
      },
      ...(value !== undefined ? { value } : { defaultValue: initialValue }),
    },
    combobox.connect,
  );

  zag.bind(root, (api) => api.getRootProps());
  if (label) zag.bind(label, (api) => api.getLabelProps());
  zag.bind(control, (api) => api.getControlProps());
  zag.bind(input, (api) => api.getInputProps());
  zag.bind(trigger, (api) => api.getTriggerProps());
  zag.bind(clearTrigger, (api) => api.getClearTriggerProps());
  zag.bind(positioner, (api) => api.getPositionerProps());
  zag.bind(content, (api) => api.getContentProps());
  zag.bind(list, (api) => api.getListProps());

  const itemDisposers = new Map<string, () => void>();
  const bindItem = (element: HTMLElement, item: FuiItem): void => {
    const disposers = [zag.bind(element, (api) => api.getItemProps({ item }))];
    const text = element.querySelector<HTMLElement>(".fui-combobox-item-text");
    if (text) disposers.push(zag.bind(text, (api) => api.getItemTextProps({ item })));
    const indicator = element.querySelector<HTMLElement>(".fui-combobox-item-indicator");
    if (indicator)
      disposers.push(zag.bind(indicator, (api) => api.getItemIndicatorProps({ item })));
    itemDisposers.set(item.value, () => disposers.forEach((dispose) => dispose()));
  };
  for (const [index, item] of currentItems.entries()) {
    bindItem(list.children[index] as HTMLElement, item);
  }

  // Unlike Select, Zag's Combobox owns no hidden select, so the native select is
  // synced here with the exact hidden-select protocol from `@zag-js/select`:
  // options mirror the machine value (`syncSelectElement`), every machine change
  // emits one bubbling `change` tagged as internal (`dispatchChangeEvent`), and
  // native `input`/`change` events flow back into the machine unless internal.
  const syncNativeValue = (next: readonly string[]): void => {
    syncSelectElement(nativeSelect, next, multiple);
    queueMicrotask(() => {
      if (destroyed) return;
      nativeSelect.dispatchEvent(
        markAsInternalChangeEvent(new Event("change", { bubbles: true, composed: true })),
      );
    });
  };
  const handleNativeChange = (event: Event): void => {
    if (isInternalChangeEvent(event)) return;
    zag.api.get().setValue(readSelected(nativeSelect));
  };
  const focusInput = (event: Event): void => {
    event.preventDefault();
    input.focus({ preventScroll: true });
  };
  nativeSelect.addEventListener("input", handleNativeChange);
  nativeSelect.addEventListener("change", handleNativeChange);
  // Like Zag's hidden select, a focused native control hands focus to the visible
  // one. Browser extensions and failed native validation can land focus here.
  nativeSelect.addEventListener("focus", focusInput);

  const stopSync = effect(() => {
    const api = zag.api.get();
    if (!sameValues(readSelected(nativeSelect), api.value)) syncNativeValue(api.value);
  });
  const stopClearVisibility = effect(() => {
    const api = zag.api.get();
    clearTrigger.hidden = api.inputValue.length === 0 && !api.hasSelectedItems;
  });
  const stopSelectedTags = effect(() => {
    const api = zag.api.get();
    const selectedItems = api.value.flatMap((entry) => {
      const item = itemByValue.get(entry);
      return item === undefined ? [] : [item];
    });
    renderSelectedTags(
      selection,
      multiple ? selectedItems : [],
      api.disabled || behavior.readOnly === true,
      getRemoveLabel,
      (entry) => {
        api.clearValue(entry);
        api.focus();
      },
    );
  });

  let filterRevision = 0;
  let started = false;
  let destroyed = false;
  updateCollection = (inputValue): void => {
    const filteredItems = getFilteredItems(currentItems, inputValue, filter);
    updateFilteredMarkup(list, empty, filteredItems);
    const revision = ++filterRevision;

    queueMicrotask(() => {
      if (destroyed || revision !== filterRevision) return;
      zag.updateProps({ collection: createCollection(filteredItems) });
    });
  };

  let form: HTMLFormElement | null = null;
  let fieldsetObserver: MutationObserver | null = null;
  const baseDisabled = behavior.disabled ?? false;
  const handleFormReset = (event: Event): void => {
    if (event.defaultPrevented) return;
    // Mirrors Zag's `trackFormControl`: reset restores the machine's initial value
    // and the sync effect rewrites the native options from there.
    const next = [...initialValue];
    if (!sameValues(next, zag.api.get().value)) zag.api.get().setValue(next);
  };
  const applyFieldsetDisabled = (fieldsetDisabled: boolean): void => {
    // Mirrors Zag's fieldset tracking: the observable disabled state combines the
    // machine prop with the closest fieldset. The native select needs no manual
    // update; a disabled fieldset disables its form controls by itself.
    const next = baseDisabled || fieldsetDisabled;
    if (next !== zag.api.get().disabled) zag.updateProps({ disabled: next });
  };

  const controller: ComboboxController = {
    api: zag.api,
    root,
    get started() {
      return started;
    },
    setItems(inputs) {
      if (destroyed) return throwDestroyed();
      currentItems = normalizeItems(inputs);
      itemByValue = new Map(currentItems.map((item) => [item.value, item]));
      const nextValues = new Set(itemByValue.keys());
      const elements = new Map(
        Array.from(list.children)
          .filter((element) => element.classList.contains("fui-combobox-item"))
          .map((element) => [element.getAttribute("data-value")!, element as HTMLElement] as const),
      );
      const ordered = reconcileKeyedValues({
        create: (item) => buildItem(item),
        current: elements,
        destroy: (element, entry) => {
          itemDisposers.get(entry)?.();
          itemDisposers.delete(entry);
          element.remove();
        },
        getKey: (item) => item.value,
        inputs: currentItems,
        update: (element, item) => {
          itemDisposers.get(item.value)?.();
          const fresh = buildItem(item);
          element.replaceChildren(...fresh.childNodes);
          element.dataset.value = item.value;
          element.toggleAttribute("data-disabled", item.disabled === true);
          element.className = "fui-combobox-item";
          bindItem(element, item);
        },
      });
      list.append(...ordered);
      const api = zag.api.get();
      const next = api.value.filter((entry) => nextValues.has(entry));
      if (next.length !== api.value.length) syncNativeValue(next);
      reconcileNativeSelectOptions(nativeSelect, currentItems, placeholder ?? "");
      if (next.length !== api.value.length) api.setValue(next);
      updateCollection(api.inputValue);
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
        // Mirrors the select machine entry: the native selection is rewritten from
        // the machine value, and the label takes ownership of the native control.
        syncSelectElement(nativeSelect, zag.api.get().value, multiple);
        if (label?.id) nativeSelect.setAttribute("aria-labelledby", label.id);
        form = nativeSelect.form;
        form?.addEventListener("reset", handleFormReset, { passive: true });
        const fieldset = nativeSelect.closest("fieldset");
        if (fieldset) {
          applyFieldsetDisabled(fieldset.disabled);
          fieldsetObserver = new MutationObserver(() => applyFieldsetDisabled(fieldset.disabled));
          fieldsetObserver.observe(fieldset, { attributes: true, attributeFilter: ["disabled"] });
        }
        started = true;
      }
      return this;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      const value = zag.api.get().value;
      filterRevision += 1;
      stopSync();
      stopClearVisibility();
      stopSelectedTags();
      for (const dispose of itemDisposers.values()) dispose();
      itemDisposers.clear();
      nativeSelect.removeEventListener("input", handleNativeChange);
      nativeSelect.removeEventListener("change", handleNativeChange);
      nativeSelect.removeEventListener("focus", focusInput);
      form?.removeEventListener("reset", handleFormReset);
      fieldsetObserver?.disconnect();
      fieldsetObserver = null;
      zag.destroy();

      if (enhanceMode) {
        restores.forEach((restore) => restore());
        syncSelectElement(nativeSelect, value, multiple);
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
    .map((option) => {
      const group = option.parentElement;
      const description = option.dataset.description?.trim();
      const disabled = option.disabled || (group instanceof HTMLOptGroupElement && group.disabled);
      return {
        value: option.value,
        label: option.label || option.text,
        ...(disabled ? { disabled: true as const } : {}),
        ...(description ? { description } : {}),
      };
    });
}

/** Reads the selected values with the exact `getSelectedValues` logic from `@zag-js/select`. */
function readSelected(native: HTMLSelectElement): string[] {
  return native.multiple
    ? Array.from(native.selectedOptions, (option) => option.value)
    : native.value
      ? [native.value]
      : [];
}

/** Reads the placeholder text from the explicitly-marked option, if any. */
function readPlaceholder(native: HTMLSelectElement): string | undefined {
  return (
    native.querySelector<HTMLOptionElement>("option[data-placeholder]")?.label.trim() || undefined
  );
}

/** Writes the machine value onto the native options (`syncSelectElement` in `@zag-js/select`). */
function syncSelectElement(
  native: HTMLSelectElement,
  value: readonly string[],
  multiple: boolean,
): void {
  if (value.length === 0 && !multiple) {
    native.selectedIndex = -1;
    return;
  }
  for (const option of native.options) {
    option.selected = value.includes(option.value);
  }
}

/** Tags machine-originated changes so the native handler ignores them (`@zag-js/dom-query`). */
const INTERNAL_CHANGE_EVENT = Symbol.for("zag.changeEvent");

function isInternalChangeEvent(event: Event): boolean {
  return Object.prototype.hasOwnProperty.call(event, INTERNAL_CHANGE_EVENT);
}

function markAsInternalChangeEvent<T extends Event>(event: T): T {
  if (isInternalChangeEvent(event)) return event;
  Object.defineProperty(event, INTERNAL_CHANGE_EVENT, { value: true });
  return event;
}

/** Order-insensitive value comparison (native order follows the document). */
function sameValues(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightValues = new Set(right);
  return left.every((value) => rightValues.has(value));
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
  list: HTMLElement,
  empty: HTMLElement,
  filteredItems: readonly FuiItem[],
): void {
  const visibleValues = new Set(filteredItems.map((item) => item.value));
  for (const element of list.children) {
    if (element instanceof HTMLElement && element.classList.contains("fui-combobox-item")) {
      element.hidden = !visibleValues.has(element.dataset.value ?? "");
    }
  }
  empty.hidden = filteredItems.length > 0;
}

function throwDestroyed(): never {
  throw new Error("[Faisceau UI] Cannot start or mount a destroyed Combobox.");
}
