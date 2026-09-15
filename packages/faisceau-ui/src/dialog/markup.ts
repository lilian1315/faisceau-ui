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
}

export function createOverlayView(options: {
  closeLabel?: string;
  content: string;
  description?: string;
  title: string;
  variant: OverlayVariant;
}): OverlayView {
  const title = h("h2", { data: { part: "title" } }, options.title);
  const description = options.description
    ? h("p", { data: { part: "description" } }, options.description)
    : null;
  const close = h("button", {
    ariaLabel: options.closeLabel ?? "Fermer",
    data: { part: "close-trigger" },
    type: "button",
  });
  close.append(createXIcon());
  const content = h(
    "div",
    { data: { part: "content" } },
    title,
    description,
    h("div", { data: { part: "body" } }, options.content),
    close,
  );
  const positioner = h("div", { data: { part: "positioner" } }, content);
  const backdrop = h("div", {
    data: { part: "backdrop" },
  });
  return { backdrop, close, content, description, positioner, title };
}
