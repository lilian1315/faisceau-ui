import { h } from "@lilian1315/create-element/faisceau";
import { createZagMachine } from "@lilian1315/faisceau-zag";
import * as dialog from "@zag-js/dialog";

import {
  addFuiClasses,
  captureAttributes,
  createId,
  createXIcon,
  getLookupRoot,
} from "../shared/index.js";
import { createOverlayView, type OverlayVariant, type OverlayView } from "./markup.js";
import type { DialogController, DialogMachineOptions } from "./types.js";

interface SetupOptions extends DialogMachineOptions {
  className?: string;
  closeLabel?: string;
  description?: string;
  id?: string;
  title?: string;
}

export function createOverlay(
  options: SetupOptions & { content: string; description?: string; title: string; trigger: string },
  variant: OverlayVariant,
): DialogController {
  const root = h("div");
  const view = createOverlayView({ ...options, variant });
  root.append(view.trigger, view.backdrop, view.positioner);
  return setupOverlay(root, view, options, variant, true, false);
}

export function enhanceOverlay(
  root: HTMLElement,
  options: SetupOptions,
  variant: OverlayVariant,
): DialogController {
  const trigger = requirePart<HTMLButtonElement>(root, "trigger");
  const content = requirePart<HTMLElement>(root, "content");
  const title =
    root.querySelector<HTMLElement>('[data-fui-part="title"]') ??
    h("h2", { data: { fuiPart: "title" } }, options.title ?? "");
  if (!title.textContent?.trim())
    throw new Error(`[Faisceau UI] ${variant} enhancement requires a title part or options.title.`);
  let description = root.querySelector<HTMLElement>('[data-fui-part="description"]');
  if (!description && options.description)
    description = h("p", { data: { fuiPart: "description" } }, options.description);
  if (!title.parentNode) content.prepend(title);
  if (description && !description.parentNode) title.after(description);
  let close = root.querySelector<HTMLButtonElement>('[data-fui-part="close-trigger"]');
  const ownsClose = close === null;
  if (!close) {
    close = h("button", {
      ariaLabel: options.closeLabel ?? "Fermer",
      data: { fuiPart: "close-trigger" },
      type: "button",
    });
    close.append(createXIcon());
    content.append(close);
  }
  const backdrop = h("div", { data: { fuiPart: "backdrop" } });
  const positioner = h("div", { data: { fuiPart: "positioner" } });
  const marker = document.createComment(`fui-${variant}-content`);
  content.before(marker);
  positioner.append(content);
  root.append(backdrop, positioner);
  const restore = [root, trigger, content, title, description, close]
    .filter(Boolean)
    .map((el) => captureAttributes(el as Element));
  return setupOverlay(
    root,
    { backdrop, close, content, description, positioner, title, trigger },
    options,
    variant,
    false,
    true,
    () => {
      marker.replaceWith(content);
      if (ownsClose) close.remove();
      backdrop.remove();
      positioner.remove();
      for (const restoreAttributes of restore) restoreAttributes();
    },
  );
}

function setupOverlay(
  root: HTMLElement,
  view: OverlayView,
  options: SetupOptions,
  variant: OverlayVariant,
  ownsRoot: boolean,
  start: boolean,
  cleanup?: () => void,
): DialogController {
  const {
    className,
    closeLabel: _closeLabel,
    description: _description,
    id: requestedId,
    title: _title,
    ...behavior
  } = options;
  const id = requestedId ?? createId(variant);
  addFuiClasses(root, `fui-${variant}`);
  for (const part of [
    "trigger",
    "backdrop",
    "positioner",
    "content",
    "title",
    "description",
    "close",
  ] as const) {
    const element = part === "close" ? view.close : view[part];
    if (element) addFuiClasses(element, `fui-${variant}-${part === "close" ? "close" : part}`);
  }
  if (className) root.classList.add(...className.split(/\s+/).filter(Boolean));
  root.dataset.fuiComponent = variant;
  root.dataset.fuiPart ||= "root";
  const zag = createZagMachine(
    dialog.machine,
    { ...behavior, getRootNode: () => getLookupRoot(root), id },
    dialog.connect,
  );
  zag.bind(view.trigger, (api) => api.getTriggerProps());
  zag.bind(view.backdrop, (api) => api.getBackdropProps());
  zag.bind(view.positioner, (api) => api.getPositionerProps());
  zag.bind(view.content, (api) => api.getContentProps());
  zag.bind(view.title, (api) => api.getTitleProps());
  if (view.description) zag.bind(view.description, (api) => api.getDescriptionProps());
  zag.bind(view.close, (api) => api.getCloseTriggerProps());
  let started = false;
  let destroyed = false;
  const controller: DialogController = {
    api: zag.api,
    root,
    get started() {
      return started;
    },
    mount(target) {
      if (destroyed) throw new Error(`[Faisceau UI] Cannot mount a destroyed ${variant}.`);
      target.append(root);
      return this.start();
    },
    start() {
      if (destroyed) throw new Error(`[Faisceau UI] Cannot start a destroyed ${variant}.`);
      if (!started) {
        zag.start();
        started = true;
      }
      return this;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      zag.destroy();
      if (ownsRoot) root.remove();
      else cleanup?.();
    },
  };
  if (start) controller.start();
  return controller;
}

function requirePart<T extends HTMLElement>(root: HTMLElement, part: string): T {
  const element = root.querySelector<T>(`[data-fui-part="${part}"]`);
  if (!element) throw new Error(`[Faisceau UI] Overlay enhancement requires a ${part} part.`);
  return element;
}
