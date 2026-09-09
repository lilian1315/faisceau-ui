import { h } from "@lilian1315/create-element";
import { createXIcon } from "../shared/index.js";

export type OverlayVariant = "dialog" | "drawer";

export interface OverlayView {
  backdrop: HTMLElement;
  close: HTMLButtonElement;
  content: HTMLElement;
  description: HTMLElement | null;
  positioner: HTMLElement;
  title: HTMLElement;
  trigger: HTMLButtonElement;
}

export function createOverlayView(options: {
  closeLabel?: string;
  content: string;
  description?: string;
  title: string;
  trigger: string;
  variant: OverlayVariant;
}): OverlayView {
  const trigger = h(
    "button",
    { class: `fui-${options.variant}-trigger`, data: { fuiPart: "trigger" }, type: "button" },
    options.trigger,
  );
  const title = h(
    "h2",
    { class: `fui-${options.variant}-title`, data: { fuiPart: "title" } },
    options.title,
  );
  const description = options.description
    ? h(
        "p",
        { class: `fui-${options.variant}-description`, data: { fuiPart: "description" } },
        options.description,
      )
    : null;
  const close = h("button", {
    ariaLabel: options.closeLabel ?? "Fermer",
    class: `fui-${options.variant}-close`,
    data: { fuiPart: "close-trigger" },
    type: "button",
  });
  close.append(createXIcon());
  const content = h(
    "div",
    { class: `fui-${options.variant}-content`, data: { fuiPart: "content" } },
    title,
    description,
    h("div", { class: `fui-${options.variant}-body`, data: { fuiPart: "body" } }, options.content),
    close,
  );
  const positioner = h(
    "div",
    { class: `fui-${options.variant}-positioner`, data: { fuiPart: "positioner" } },
    content,
  );
  const backdrop = h("div", {
    class: `fui-${options.variant}-backdrop`,
    data: { fuiPart: "backdrop" },
  });
  return { backdrop, close, content, description, positioner, title, trigger };
}
