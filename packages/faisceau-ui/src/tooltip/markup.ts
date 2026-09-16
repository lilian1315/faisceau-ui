import { h } from "@lilian1315/create-element";

export interface TooltipPopup {
  arrow: HTMLElement;
  arrowTip: HTMLElement;
  content: HTMLElement;
  positioner: HTMLElement;
}

export function createTooltipPopup(text: string): TooltipPopup {
  const arrowTip = h("div", {
    class: "fui-tooltip-arrow-tip",
  });
  const arrow = h("div", { class: "fui-tooltip-arrow" }, arrowTip);
  const content = h("div", { class: "fui-tooltip-content" }, arrow, text);
  const positioner = h("div", { class: "fui-tooltip-positioner" }, content);
  return { arrow, arrowTip, content, positioner };
}
