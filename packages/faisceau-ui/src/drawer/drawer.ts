import { h } from "@lilian1315/create-element/faisceau";
import { createZagMachine } from "@lilian1315/faisceau-zag";
import * as drawer from "@zag-js/drawer";
import {
  addFuiClasses,
  captureAttributes,
  createId,
  createXIcon,
  getLookupRoot,
} from "../shared/index.js";
import type { DrawerController, DrawerOptions, EnhanceDrawerOptions } from "./types.js";

interface DrawerView {
  backdrop: HTMLElement;
  close: HTMLButtonElement;
  content: HTMLElement;
  description: HTMLElement | null;
  grabber: HTMLElement;
  grabberIndicator: HTMLElement;
  positioner: HTMLElement;
  swipeArea: HTMLElement | null;
  title: HTMLElement;
  trigger: HTMLButtonElement;
}

/** Builds a gesture-aware Zag drawer. Call `.mount(target)` to start it. */
export function createDrawer(options: DrawerOptions): DrawerController {
  const root = h("div");
  const trigger = h("button", { data: { fuiPart: "trigger" }, type: "button" }, options.trigger);
  const title = h("h2", { data: { fuiPart: "title" } }, options.title);
  const description = options.description
    ? h("p", { data: { fuiPart: "description" } }, options.description)
    : null;
  const close = createClose(options.closeLabel);
  const grabberIndicator = h("div", { data: { fuiPart: "grabber-indicator" } });
  const grabber = h("div", { data: { fuiPart: "grabber" } }, grabberIndicator);
  const body = h("div", { class: "fui-drawer-body", data: { fuiPart: "body" } }, options.content);
  const content = h(
    "div",
    { data: { fuiPart: "content" } },
    grabber,
    title,
    description,
    body,
    close,
  );
  const positioner = h("div", { data: { fuiPart: "positioner" } }, content);
  const backdrop = h("div", { data: { fuiPart: "backdrop" } });
  const swipeArea = options.swipeArea ? h("div", { data: { fuiPart: "swipe-area" } }) : null;
  root.append(trigger, backdrop, positioner);
  if (swipeArea) root.append(swipeArea);
  return setupDrawer(
    root,
    {
      backdrop,
      close,
      content,
      description,
      grabber,
      grabberIndicator,
      positioner,
      swipeArea,
      title,
      trigger,
    },
    options,
    true,
    false,
  );
}

/** Enhances existing trigger/content parts and generates the drawer structure around them. */
export function enhanceDrawer(
  root: HTMLElement,
  options: EnhanceDrawerOptions = {},
): DrawerController {
  const trigger = requirePart<HTMLButtonElement>(root, "trigger");
  const content = requirePart<HTMLElement>(root, "content");
  const title =
    root.querySelector<HTMLElement>('[data-fui-part="title"]') ??
    h("h2", { data: { fuiPart: "title" } }, options.title ?? "");
  if (!title.textContent?.trim())
    throw new Error("[Faisceau UI] Drawer enhancement requires a title part or options.title.");
  let description = root.querySelector<HTMLElement>('[data-fui-part="description"]');
  if (!description && options.description)
    description = h("p", { data: { fuiPart: "description" } }, options.description);
  if (!title.parentNode) content.prepend(title);
  if (description && !description.parentNode) title.after(description);
  let close = root.querySelector<HTMLButtonElement>('[data-fui-part="close-trigger"]');
  const ownsClose = close === null;
  if (!close) {
    close = createClose(options.closeLabel);
    content.append(close);
  }
  const grabberIndicator = h("div", { data: { fuiPart: "grabber-indicator" } });
  const grabber = h("div", { data: { fuiPart: "grabber" } }, grabberIndicator);
  content.prepend(grabber);
  const backdrop = h("div", { data: { fuiPart: "backdrop" } });
  const positioner = h("div", { data: { fuiPart: "positioner" } });
  const swipeArea = options.swipeArea ? h("div", { data: { fuiPart: "swipe-area" } }) : null;
  const marker = document.createComment("fui-drawer-content");
  content.before(marker);
  positioner.append(content);
  root.append(backdrop, positioner);
  if (swipeArea) root.append(swipeArea);
  const restore = [root, trigger, content, title, description, close]
    .filter(Boolean)
    .map((element) => captureAttributes(element as Element));
  return setupDrawer(
    root,
    {
      backdrop,
      close,
      content,
      description,
      grabber,
      grabberIndicator,
      positioner,
      swipeArea,
      title,
      trigger,
    },
    options,
    false,
    true,
    () => {
      marker.replaceWith(content);
      grabber.remove();
      if (ownsClose) close.remove();
      backdrop.remove();
      positioner.remove();
      swipeArea?.remove();
      for (const restoreAttributes of restore) restoreAttributes();
    },
  );
}

function setupDrawer(
  root: HTMLElement,
  view: DrawerView,
  options: EnhanceDrawerOptions,
  ownsRoot: boolean,
  autoStart: boolean,
  cleanup?: () => void,
): DrawerController {
  const {
    className,
    closeLabel: _closeLabel,
    description: _description,
    id: requestedId,
    swipeArea: _swipeArea,
    title: _title,
    ...behavior
  } = options;
  const id = requestedId ?? createId("drawer");
  addFuiClasses(root, "fui-drawer");
  for (const [element, part] of [
    [view.trigger, "trigger"],
    [view.backdrop, "backdrop"],
    [view.positioner, "positioner"],
    [view.content, "content"],
    [view.title, "title"],
    [view.description, "description"],
    [view.close, "close"],
    [view.grabber, "grabber"],
    [view.grabberIndicator, "grabber-indicator"],
    [view.swipeArea, "swipe-area"],
  ] as const) {
    if (element) addFuiClasses(element, `fui-drawer-${part}`);
  }
  if (className) root.classList.add(...className.split(/\s+/).filter(Boolean));
  root.dataset.fuiComponent = "drawer";
  root.dataset.fuiPart ||= "root";
  const zag = createZagMachine(
    drawer.machine,
    {
      ...behavior,
      getRootNode: () => getLookupRoot(root),
      id,
      swipeDirection: behavior.swipeDirection,
    },
    (service, normalize) => drawer.connect(service, normalize),
  );
  zag.bind(root, (api) => ({ "data-side": api.getContentState().swipeDirection }));
  zag.bind(view.trigger, (api) => api.getTriggerProps());
  zag.bind(view.backdrop, (api) => api.getBackdropProps());
  zag.bind(view.positioner, (api) => api.getPositionerProps());
  zag.bind(view.content, (api) => api.getContentProps());
  zag.bind(view.title, (api) => api.getTitleProps());
  if (view.description) zag.bind(view.description, (api) => api.getDescriptionProps());
  zag.bind(view.close, (api) => api.getCloseTriggerProps());
  zag.bind(view.grabber, (api) => api.getGrabberProps());
  zag.bind(view.grabberIndicator, (api) => api.getGrabberIndicatorProps());
  if (view.swipeArea) zag.bind(view.swipeArea, (api) => api.getSwipeAreaProps());
  let started = false;
  let destroyed = false;
  const controller: DrawerController = {
    api: zag.api,
    root,
    get started() {
      return started;
    },
    mount(target) {
      if (destroyed) throwDestroyed();
      target.append(root);
      return this.start();
    },
    start() {
      if (destroyed) throwDestroyed();
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
  if (autoStart) controller.start();
  return controller;
}

function createClose(label = "Fermer"): HTMLButtonElement {
  const close = h("button", {
    ariaLabel: label,
    data: { fuiPart: "close-trigger" },
    type: "button",
  });
  close.append(createXIcon());
  return close;
}
function requirePart<T extends HTMLElement>(root: HTMLElement, part: string): T {
  const element = root.querySelector<T>(`[data-fui-part="${part}"]`);
  if (!element) throw new Error(`[Faisceau UI] Drawer enhancement requires a ${part} part.`);
  return element;
}
function throwDestroyed(): never {
  throw new Error("[Faisceau UI] Cannot start or mount a destroyed Drawer.");
}
