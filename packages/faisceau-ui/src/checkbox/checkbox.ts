import { h } from "@lilian1315/create-element/faisceau";
import { createZagMachine } from "@lilian1315/faisceau-zag";
import * as checkbox from "@zag-js/checkbox";

import { addFuiClasses, captureAttributes, createId, getLookupRoot } from "../shared/index.js";
import { createCheckboxView, createFieldMessage } from "./markup.ts";
import type { CheckboxController, CheckboxOptions, EnhanceCheckboxOptions } from "./types.ts";

interface CheckboxSetup {
  cleanup?: () => void;
  input: HTMLInputElement;
  ownsRoot: boolean;
  restoreInput?: () => void;
  start: boolean;
}

/** Builds a native-form-compatible checkbox. Call `.mount(target)` to start it. */
export function createCheckbox(options: CheckboxOptions): CheckboxController {
  const root = h("div");
  const input = h("input", { type: "checkbox" });
  const view = createCheckboxView(options.label);
  view.field.prepend(input);
  root.append(view.field);

  return setupCheckbox(root, options, {
    input,
    ownsRoot: true,
    start: false,
  });
}

/** Enhances a container holding exactly one native `input[type=checkbox]`. */
export function enhanceCheckbox(
  root: HTMLElement,
  options: EnhanceCheckboxOptions = {},
): CheckboxController {
  const inputs = root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  if (inputs.length !== 1) {
    throw new Error(
      `[Faisceau UI] Checkbox enhancement requires exactly one native input[type="checkbox"] inside the provided container; found ${inputs.length}.`,
    );
  }

  const input = inputs[0]!;
  const label = options.label ?? input.getAttribute("aria-label")?.trim();
  if (!label) {
    throw new Error(
      "[Faisceau UI] Checkbox enhancement requires options.label or aria-label on the native input.",
    );
  }

  const restoreRoot = captureAttributes(root);
  const restoreAttributes = captureAttributes(input);
  const original = {
    checked: input.checked,
    defaultChecked: input.defaultChecked,
    indeterminate: input.indeterminate,
    nextSibling: input.nextSibling,
    parent: input.parentNode!,
  };
  const view = createCheckboxView(label);
  input.replaceWith(view.field);
  view.field.prepend(input);
  const description = createFieldMessage("description", options.description);
  const error = createFieldMessage("error", options.errorMessage);
  view.field.after(...[description, error].filter((item): item is HTMLElement => item !== null));

  return setupCheckbox(
    root,
    {
      ...options,
      defaultChecked: options.checked ?? (input.indeterminate ? "indeterminate" : input.checked),
      disabled: options.disabled ?? input.disabled,
      form: options.form ?? input.getAttribute("form") ?? undefined,
      label,
      name: (options.name ?? input.name) || undefined,
      required: options.required ?? input.required,
      value: options.value ?? input.value,
    },
    {
      cleanup() {
        const reference = original.nextSibling;
        original.parent.insertBefore(
          input,
          reference?.parentNode === original.parent ? reference : null,
        );
        view.field.remove();
        description?.remove();
        error?.remove();
        restoreRoot();
      },
      input,
      ownsRoot: false,
      restoreInput() {
        restoreAttributes();
        input.checked = original.checked;
        input.defaultChecked = original.defaultChecked;
        input.indeterminate = original.indeterminate;
      },
      start: true,
    },
  );
}

function setupCheckbox(
  root: HTMLElement,
  options: CheckboxOptions,
  setup: CheckboxSetup,
): CheckboxController {
  const {
    className,
    description,
    errorMessage,
    id: requestedId,
    label: _label,
    onCheckedChange,
    ...behavior
  } = options;
  const field = root.querySelector<HTMLLabelElement>('[data-fui-part="field"]')!;
  const control = root.querySelector<HTMLElement>('[data-fui-part="control"]')!;
  const indicator = root.querySelector<HTMLElement>('[data-fui-part="indicator"]')!;
  const label = root.querySelector<HTMLElement>('[data-fui-part="label"]')!;
  const descriptionElement =
    root.querySelector<HTMLElement>('[data-fui-part="description"]') ??
    createFieldMessage("description", description);
  const errorElement =
    root.querySelector<HTMLElement>('[data-fui-part="error"]') ??
    createFieldMessage("error", errorMessage);
  if (descriptionElement && !descriptionElement.isConnected) root.append(descriptionElement);
  if (errorElement && !errorElement.isConnected) root.append(errorElement);

  const id = requestedId ?? createId("checkbox");
  if (descriptionElement) descriptionElement.id ||= `${id}:description`;
  if (errorElement) errorElement.id ||= `${id}:error`;
  addFuiClasses(root, "fui-checkbox");
  addFuiClasses(setup.input, "fui-native-checkbox");
  if (className) root.classList.add(...className.split(/\s+/).filter(Boolean));
  root.dataset.fuiComponent = "checkbox";
  root.dataset.fuiPart ||= "root";
  setup.input.dataset.fuiPart = "native-input";

  const zag = createZagMachine(
    checkbox.machine,
    {
      ...behavior,
      getRootNode: () => getLookupRoot(root),
      id,
      ids: {
        control: `${id}:control`,
        hiddenInput: setup.input.id || `${id}:input`,
        label: `${id}:label`,
        root: `${id}:field`,
      },
      invalid: behavior.invalid ?? errorElement !== null,
      onCheckedChange(details) {
        onCheckedChange?.(details);
      },
    },
    checkbox.connect,
  );

  zag.bind(field, (api) => api.getRootProps());
  zag.bind(control, (api) => api.getControlProps());
  zag.bind(indicator, (api) => api.getIndicatorProps());
  zag.bind(label, (api) => api.getLabelProps());
  zag.bind(setup.input, (api) => api.getHiddenInputProps());

  const describedBy = [descriptionElement?.id, errorElement?.id].filter(Boolean).join(" ");
  if (describedBy) setup.input.setAttribute("aria-describedby", describedBy);
  const form = setup.input.form;
  const onReset = (): void => {
    queueMicrotask(() => zag.api.get().setChecked(setup.input.checked));
  };

  let started = false;
  let destroyed = false;
  const controller: CheckboxController = {
    api: zag.api,
    root,
    get started() {
      return started;
    },
    mount(target) {
      if (destroyed) throwDestroyed();
      target.append(root);
      return this.start();
    },
    start() {
      if (destroyed) throwDestroyed();
      if (!started) {
        zag.start();
        form?.addEventListener("reset", onReset);
        started = true;
      }
      return this;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      form?.removeEventListener("reset", onReset);
      zag.destroy();
      setup.restoreInput?.();
      if (setup.ownsRoot) root.remove();
      else setup.cleanup?.();
    },
  };

  if (setup.start) controller.start();
  return controller;
}

function throwDestroyed(): never {
  throw new Error("[Faisceau UI] Cannot start or mount a destroyed Checkbox.");
}
