import { h } from "@lilian1315/create-element/faisceau";
import { createZagMachine } from "@lilian1315/faisceau-zag";
import * as checkbox from "@zag-js/checkbox";

import { createField, enhanceField } from "../field/index.ts";
import type { FieldControlContext, FieldControlFactory } from "../field/index.ts";
import { captureAttributes, createId, getLookupRoot } from "../shared/index.js";
import { createCheckboxView } from "./markup.ts";
import type { CheckboxController, CheckboxOptions, EnhanceCheckboxOptions } from "./types.ts";

type CheckboxSetupOptions = CheckboxOptions | (EnhanceCheckboxOptions & { label?: string });

interface CheckboxSetup {
  cleanup?: () => void;
  input: HTMLInputElement;
  ownsRoot: boolean;
  restoreInput?: () => void;
  start: boolean;
}

/** Builds a native-form-compatible Field and Checkbox. Call `.mount(target)` to start it. */
export function createCheckbox(options: CheckboxOptions): CheckboxController {
  return createField({
    ...fieldOptions(options),
    control: checkboxField(options),
    label: options.label,
  });
}

/** Enhances a fully-authored Field containing a direct `.fui-checkbox` child. */
export function enhanceCheckbox(
  root: HTMLElement,
  options: EnhanceCheckboxOptions = {},
): CheckboxController {
  return enhanceField(root, {
    ...fieldOptions(options),
    control: checkboxField(options),
  });
}

function checkboxField(options: CheckboxSetupOptions): FieldControlFactory<CheckboxController> {
  return {
    rootClass: "fui-checkbox",
    create(context) {
      const input = h("input", { class: "fui-native-checkbox", type: "checkbox" });
      const view = createCheckboxView();
      view.root.prepend(input);
      return setupCheckbox(view.root, options, context, {
        input,
        ownsRoot: true,
        start: false,
      });
    },
    enhance(controlRoot, context) {
      requireRootClass(controlRoot, "fui-checkbox", "Checkbox");
      const inputs = controlRoot.querySelectorAll<HTMLInputElement>(
        'input.fui-native-checkbox[type="checkbox"]',
      );
      if (inputs.length !== 1) {
        throw new Error(
          `[Faisceau UI] Checkbox enhancement requires exactly one native \`input.fui-native-checkbox[type="checkbox"]\`; found ${inputs.length}.`,
        );
      }
      const input = inputs[0]!;
      const control = requireClass<HTMLElement>(controlRoot, "fui-checkbox-control", "Checkbox");
      const indicator = requireClass<HTMLElement>(
        controlRoot,
        "fui-checkbox-indicator",
        "Checkbox",
      );
      const restores = [controlRoot, input, control, indicator].map(captureAttributes);
      const original = {
        checked: input.checked,
        defaultChecked: input.defaultChecked,
        indeterminate: input.indeterminate,
      };
      return setupCheckbox(
        controlRoot,
        {
          ...options,
          defaultChecked:
            options.checked ?? (input.indeterminate ? "indeterminate" : input.checked),
          disabled: options.disabled ?? input.disabled,
          form: options.form ?? input.getAttribute("form") ?? undefined,
          label: options.label ?? context.label.textContent?.trim(),
          name: (options.name ?? input.name) || undefined,
          required: options.required ?? input.required,
          value: options.value ?? input.value,
        },
        context,
        {
          cleanup() {
            for (const restore of restores.reverse()) restore();
          },
          input,
          ownsRoot: false,
          restoreInput() {
            input.checked = original.checked;
            input.defaultChecked = original.defaultChecked;
            input.indeterminate = original.indeterminate;
          },
          start: true,
        },
      );
    },
  };
}

function setupCheckbox(
  root: HTMLElement,
  options: CheckboxSetupOptions,
  field: FieldControlContext,
  setup: CheckboxSetup,
): CheckboxController {
  const {
    className: _className,
    description: _description,
    errorMessage: _errorMessage,
    id: requestedId,
    label: _label,
    onCheckedChange,
    ...behavior
  } = options;
  const control = requireClass<HTMLElement>(root, "fui-checkbox-control", "Checkbox");
  const indicator = requireClass<HTMLElement>(root, "fui-checkbox-indicator", "Checkbox");
  const id = requestedId ?? field.id ?? createId("checkbox");
  root.dataset.fuiComponent = "checkbox";

  const zag = createZagMachine(
    checkbox.machine,
    {
      ...behavior,
      disabled: behavior.disabled ?? field.disabled,
      getRootNode: () => getLookupRoot(root),
      id,
      ids: {
        control: `${id}:control`,
        hiddenInput: setup.input.id || `${id}:input`,
        label: field.label.id,
        root: `${id}:checkbox`,
      },
      invalid: behavior.invalid ?? field.invalid,
      onCheckedChange(details) {
        onCheckedChange?.(details);
      },
    },
    checkbox.connect,
  );

  zag.bind(root, (api) => api.getRootProps());
  zag.bind(control, (api) => api.getControlProps());
  zag.bind(indicator, (api) => api.getIndicatorProps());
  zag.bind(field.label, (api) => api.getLabelProps());
  zag.bind(setup.input, (api) => api.getHiddenInputProps());
  if (field.describedBy) setup.input.setAttribute("aria-describedby", field.describedBy);
  const onControlClick = (): void => setup.input.click();
  control.addEventListener("click", onControlClick);

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
      control.removeEventListener("click", onControlClick);
      zag.destroy();
      setup.restoreInput?.();
      if (setup.ownsRoot) root.remove();
      else setup.cleanup?.();
    },
  };
  if (setup.start) controller.start();
  return controller;
}

function fieldOptions(options: CheckboxSetupOptions) {
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

function requireClass<T extends Element>(
  root: ParentNode,
  className: string,
  component: string,
): T {
  const elements = root.querySelectorAll<T>(`.${className}`);
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

function throwDestroyed(): never {
  throw new Error("[Faisceau UI] Cannot start or mount a destroyed Checkbox.");
}
