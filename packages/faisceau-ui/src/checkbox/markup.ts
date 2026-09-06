import { h } from "@lilian1315/create-element/faisceau";

import { createCheckIcon, createMinusIcon } from "../shared/index.js";

export interface CheckboxView {
  control: HTMLElement;
  field: HTMLLabelElement;
  indicator: HTMLElement;
  label: HTMLElement;
}

export function createCheckboxView(labelText: string): CheckboxView {
  const indicator = h(
    "span",
    { class: "fui-checkbox-indicator", data: { fuiPart: "indicator" } },
    createCheckIcon(),
    createMinusIcon(),
  );
  const control = h(
    "span",
    { class: "fui-checkbox-control", data: { fuiPart: "control" } },
    indicator,
  );
  const label = h("span", { class: "fui-checkbox-label", data: { fuiPart: "label" } }, labelText);
  const field = h(
    "label",
    { class: "fui-checkbox-field", data: { fuiPart: "field" } },
    control,
    label,
  );
  return { control, field, indicator, label };
}

export function createFieldMessage(
  part: "description" | "error",
  text: string | undefined,
): HTMLElement | null {
  if (!text) return null;
  return h(
    "p",
    {
      class: part === "error" ? "fui-field-error" : "fui-field-description",
      data: { fuiPart: part },
      role: part === "error" ? "alert" : undefined,
    },
    text,
  );
}
