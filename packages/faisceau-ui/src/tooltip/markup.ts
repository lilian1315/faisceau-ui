import { h } from "@lilian1315/create-element";

export interface TooltipPopup {
  arrow: HTMLElement;
  arrowTip: HTMLElement;
  content: HTMLElement;
  positioner: HTMLElement;
}

export function createTooltipPopup(text: string): TooltipPopup {
  const arrowTip = h("div", {
    data: { part: "arrow-tip" },
  });
  const arrow = h("div", { data: { part: "arrow" } }, arrowTip);
  const content = h("div", { data: { part: "content" } }, arrow, text);
  const positioner = h("div", { data: { part: "positioner" } }, content);
  return { arrow, arrowTip, content, positioner };
}
