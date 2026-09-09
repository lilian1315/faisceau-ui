import { h } from "@lilian1315/create-element/faisceau";

export interface FieldMarkup {
  readonly description: HTMLElement | null;
  readonly error: HTMLElement | null;
  readonly label: HTMLLabelElement;
  readonly root: HTMLElement;
}

export function createFieldMarkup(options: {
  description?: string;
  errorMessage?: string;
  label: string;
}): FieldMarkup {
  const label = h("label", { class: "fui-field-label" }, options.label);
  const description = options.description
    ? h("p", { class: "fui-field-description" }, options.description)
    : null;
  const error = options.errorMessage
    ? h("p", { class: "fui-field-error", role: "alert" }, options.errorMessage)
    : null;
  const root = h("div", { class: "fui-field" }, label);
  return { description, error, label, root };
}
