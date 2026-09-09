import { h } from "@lilian1315/create-element/faisceau";

import { createCheckIcon, createMinusIcon } from "../shared/index.js";

export interface CheckboxView {
  control: HTMLElement;
  indicator: HTMLElement;
  root: HTMLElement;
}

export function createCheckboxView(): CheckboxView {
  const indicator = h(
    "span",
    { class: "fui-checkbox-indicator" },
    createCheckIcon(),
    createMinusIcon(),
  );
  const control = h("span", { class: "fui-checkbox-control" }, indicator);
  const root = h("div", { class: "fui-checkbox" }, control);
  return { control, indicator, root };
}
