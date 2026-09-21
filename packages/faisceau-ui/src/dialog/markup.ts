import { h } from "@lilian1315/create-element";
import { createXIcon } from "../shared/index.js";

export type OverlayVariant = "dialog" | "drawer";

export interface OverlayView {
  backdrop: HTMLElement;
  body: HTMLElement;
  bodyContent: HTMLElement;
  close: HTMLButtonElement;
  content: HTMLElement;
  description: HTMLElement | null;
  header: HTMLElement;
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
  const title = h("h2", { class: `fui-${options.variant}-title` }, options.title);
  const description = options.description
    ? h("p", { class: `fui-${options.variant}-description` }, options.description)
    : null;
  const close = h("button", {
    ariaLabel: options.closeLabel ?? "Fermer",
    class: `fui-${options.variant}-close`,
    type: "button",
  });
  close.append(createXIcon());
  const header = h("div", { class: `fui-${options.variant}-header` }, title, description, close);
  const bodyContent = h("div", { class: `fui-${options.variant}-body-content` }, options.content);
  const body = h("div", { class: `fui-${options.variant}-body` }, bodyContent);
  const content = h("div", { class: `fui-${options.variant}-content` }, header, body);
  const positioner = h("div", { class: `fui-${options.variant}-positioner` }, content);
  const backdrop = h("div", { class: `fui-${options.variant}-backdrop` });
  return { backdrop, body, bodyContent, close, content, description, header, positioner, title };
}
