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
    data: { fuiPart: "arrow-tip" },
  });
  const arrow = h("div", { class: "fui-tooltip-arrow", data: { fuiPart: "arrow" } }, arrowTip);
  const content = h(
    "div",
    { class: "fui-tooltip-content", data: { fuiPart: "content" } },
    arrow,
    text,
  );
  const positioner = h(
    "div",
    { class: "fui-tooltip-positioner", data: { fuiPart: "positioner" } },
    content,
  );
  return { arrow, arrowTip, content, positioner };
}
