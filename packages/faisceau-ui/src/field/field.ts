import { captureAttributes, createId } from "../shared/index.js";
import type { FuiController } from "../types.js";
import { createFieldMarkup } from "./markup.ts";
import type {
  EnhanceFieldOptions,
  FieldControlContext,
  FieldController,
  FieldOptions,
} from "./types.ts";

export function createField<Controller extends FuiController<unknown>>(
  options: FieldOptions<Controller>,
): FieldController<Controller> {
  const markup = createFieldMarkup(options);
  const id = options.id ?? createId("field");
  markup.root.id = `${id}:field`;
  prepareFieldParts(id, markup.label, markup.description, markup.error);
  const control = options.control.create(
    createContext(id, markup.label, markup.description, markup.error, options),
  );
  markup.root.append(
    control.root,
    ...[markup.description, markup.error].filter((node): node is HTMLElement => node !== null),
  );
  if (options.className) markup.root.classList.add(...splitClasses(options.className));

  return wrapController(markup.root, control, true);
}

export function enhanceField<Controller extends FuiController<unknown>>(
  root: HTMLElement,
  options: EnhanceFieldOptions<Controller>,
): FieldController<Controller> {
  requireRootClass(root, "fui-field", "Field");
  const label = requireDirectChild<HTMLLabelElement>(root, "fui-field-label", "Field");
  const controlRoot = requireDirectChild<HTMLElement>(root, options.control.rootClass, "Field");
  const description = queryDirectChild<HTMLElement>(root, "fui-field-description");
  const error = queryDirectChild<HTMLElement>(root, "fui-field-error");
  if (options.description !== undefined && description === null) {
    throw missingClass("Field", "fui-field-description");
  }
  if (options.errorMessage !== undefined && error === null) {
    throw missingClass("Field", "fui-field-error");
  }

  const restore = [root, label, description, error]
    .filter((element): element is HTMLElement => element !== null)
    .map(captureAttributes);
  const originalText = {
    description: description?.textContent,
    error: error?.textContent,
    label: label.textContent,
  };
  const id = options.id ?? (root.id || createId("field"));
  root.id ||= `${id}:field`;
  prepareFieldParts(id, label, description, error);
  if (options.label !== undefined) label.textContent = options.label;
  if (options.description !== undefined && description)
    description.textContent = options.description;
  if (options.errorMessage !== undefined && error) error.textContent = options.errorMessage;
  let control: Controller;
  try {
    control = options.control.enhance(
      controlRoot,
      createContext(id, label, description, error, options),
    );
  } catch (error) {
    restoreField();
    throw error;
  }

  return wrapController(root, control, false, restoreField);

  function restoreField(): void {
    for (const restoreAttributes of restore.reverse()) restoreAttributes();
    label.textContent = originalText.label;
    if (description) description.textContent = originalText.description ?? "";
    if (error) error.textContent = originalText.error ?? "";
  }
}

function createContext(
  id: string,
  label: HTMLLabelElement,
  description: HTMLElement | null,
  error: HTMLElement | null,
  options: { disabled?: boolean; invalid?: boolean },
): FieldControlContext {
  const describedBy = [description?.id, error?.id].filter(Boolean).join(" ") || undefined;
  return {
    describedBy,
    disabled: options.disabled === true,
    id,
    invalid: options.invalid ?? error !== null,
    label,
  };
}

function prepareFieldParts(
  id: string,
  label: HTMLLabelElement,
  description: HTMLElement | null,
  error: HTMLElement | null,
): void {
  label.id ||= `${id}:label`;
  if (description) description.id ||= `${id}:description`;
  if (error) {
    error.id ||= `${id}:error`;
    error.setAttribute("role", "alert");
  }
}

function wrapController<Controller extends FuiController<unknown>>(
  root: HTMLElement,
  control: Controller,
  ownsRoot: boolean,
  restore?: () => void,
): FieldController<Controller> {
  let destroyed = false;
  const wrapper = Object.create(control) as FieldController<Controller>;
  Object.defineProperties(wrapper, {
    api: { enumerable: true, value: control.api },
    control: { enumerable: true, value: control },
    root: { enumerable: true, value: root },
    started: { enumerable: true, get: () => control.started },
  });
  wrapper.mount = function mount(target: ParentNode) {
    if (destroyed) throw new Error("[Faisceau UI] Cannot mount a destroyed Field.");
    target.append(root);
    return this.start();
  };
  wrapper.start = function start() {
    if (destroyed) throw new Error("[Faisceau UI] Cannot start a destroyed Field.");
    control.start();
    return this;
  };
  wrapper.destroy = function destroy() {
    if (destroyed) return;
    destroyed = true;
    control.destroy();
    if (ownsRoot) root.remove();
    else restore?.();
  };
  return wrapper;
}

function queryDirectChild<T extends Element>(root: HTMLElement, className: string): T | null {
  return root.querySelector<T>(`:scope > .${className}`);
}

function requireDirectChild<T extends Element>(
  root: HTMLElement,
  className: string,
  component: string,
): T {
  const elements = root.querySelectorAll<T>(`:scope > .${className}`);
  if (elements.length !== 1) throw missingClass(component, className, elements.length);
  return elements[0]!;
}

function requireRootClass(root: HTMLElement, className: string, component: string): void {
  if (!root.classList.contains(className)) throw missingClass(component, className, 0);
}

function missingClass(component: string, className: string, count = 0): Error {
  return new Error(
    `[Faisceau UI] ${component} enhancement requires exactly one direct \`.${className}\` element; found ${count}.`,
  );
}

function splitClasses(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}
