import { h } from "@lilian1315/create-element";
import { createZagMachine } from "faisceau-zag";
import * as drawer from "@zag-js/drawer";
import {
  addFuiClasses,
  captureAttributes,
  createId,
  createTriggerBinding,
  createXIcon,
  getLookupRoot,
  requirePart,
} from "../shared/index.js";
import { captureChildNodes } from "../shared/dom.ts";
import type { DrawerController, DrawerOptions, EnhanceDrawerOptions } from "./types.ts";

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
}

interface DrawerSetupOptions extends EnhanceDrawerOptions {
  className?: string;
  closeLabel?: string;
  description?: string;
  id?: string;
  title?: string;
  triggerSelector?: string;
}

/** Builds a gesture-aware Zag drawer. Call `.mount(target)` to start it. */
export function createDrawer(options: DrawerOptions): DrawerController {
  return factory(undefined, options);
}

/** Enhances an existing content part and generates the drawer structure around it. */
export function enhanceDrawer(
  root: HTMLElement,
  options: EnhanceDrawerOptions = {},
): DrawerController {
  return factory(root, options);
}

function factory(
  root: HTMLElement | undefined,
  options: DrawerOptions | EnhanceDrawerOptions,
): DrawerController {
  if (root && !root.classList.contains("fui-drawer")) {
    throw new Error("[Faisceau UI] Drawer enhance mode need a root with the `fui-drawer` class");
  }

  const enhanceMode = !!root;
  const restores: Array<() => void> = [];
  const generated: HTMLElement[] = [];
  options ??= {};

  let content: HTMLElement;
  let title: HTMLElement;
  let description: HTMLElement | null;
  let close: HTMLButtonElement;
  let backdrop: HTMLElement;
  let positioner: HTMLElement;
  let grabber: HTMLElement;
  let grabberIndicator: HTMLElement;
  let swipeArea: HTMLElement | null = null;
  let marker: Comment | null = null;

  const wantsSwipeArea = options.swipeArea === true;

  if (root) {
    content = requirePart<HTMLElement>(root, "content");
    restores.push(captureAttributes(root), captureAttributes(content));
    const adoptedTitle = root.querySelector<HTMLElement>('[data-part="title"]');
    if (adoptedTitle) {
      title = adoptedTitle;
      restores.push(captureAttributes(title));
      if (options.title !== undefined) {
        restores.push(captureChildNodes(title));
        title.replaceChildren(new Text(options.title));
      }
    } else {
      title = h("h2", { data: { part: "title" } }, options.title ?? "");
      content.prepend(title);
      generated.push(title);
    }
    if (!title.textContent?.trim()) {
      throw new Error("[Faisceau UI] Drawer enhancement requires a title part or options.title.");
    }
    const adoptedDescription = root.querySelector<HTMLElement>('[data-part="description"]');
    if (adoptedDescription) {
      description = adoptedDescription;
      restores.push(captureAttributes(description));
      if (options.description !== undefined) {
        restores.push(captureChildNodes(description));
        description.replaceChildren(new Text(options.description));
      }
    } else if (options.description !== undefined) {
      description = h("p", { data: { part: "description" } }, options.description);
      title.after(description);
      generated.push(description);
    } else {
      description = null;
    }
    const adoptedClose = root.querySelector<HTMLButtonElement>('[data-part="close-trigger"]');
    if (adoptedClose) {
      close = adoptedClose;
      restores.push(captureAttributes(close));
    } else {
      close = createClose(options.closeLabel);
      content.append(close);
      generated.push(close);
    }
    grabberIndicator = h("div", { data: { part: "grabber-indicator" } });
    grabber = h("div", { data: { part: "grabber" } }, grabberIndicator);
    content.prepend(grabber);
    generated.push(grabber);
    backdrop = h("div", { data: { part: "backdrop" } });
    positioner = h("div", { data: { part: "positioner" } });
    generated.push(backdrop, positioner);
    if (wantsSwipeArea) {
      swipeArea = h("div", { data: { part: "swipe-area" } });
      generated.push(swipeArea);
    }
    marker = root.ownerDocument.createComment("fui-drawer-content");
    content.before(marker);
    positioner.append(content);
    root.append(backdrop, positioner);
    if (swipeArea) root.append(swipeArea);
  } else {
    if (options.title === undefined)
      throw new Error("[Faisceau UI] Drawer creation requires options.title.");
    if ((options as DrawerOptions).content === undefined)
      throw new Error("[Faisceau UI] Drawer creation requires options.content.");
    const created = options as DrawerOptions;
    root = h("div") as HTMLElement;
    title = h("h2", { data: { part: "title" } }, created.title);
    description = created.description
      ? h("p", { data: { part: "description" } }, created.description)
      : null;
    close = createClose(created.closeLabel);
    grabberIndicator = h("div", { data: { part: "grabber-indicator" } });
    grabber = h("div", { data: { part: "grabber" } }, grabberIndicator);
    const body = h("div", { data: { part: "body" } }, created.content);
    content = h("div", { data: { part: "content" } }, grabber, title, description, body, close);
    positioner = h("div", { data: { part: "positioner" } }, content);
    backdrop = h("div", { data: { part: "backdrop" } });
    if (wantsSwipeArea) swipeArea = h("div", { data: { part: "swipe-area" } });
    root.append(backdrop, positioner);
    if (swipeArea) root.append(swipeArea);
  }

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
    },
    options as DrawerSetupOptions,
    { enhanceMode, generated, marker, restores },
  );
}

function setupDrawer(
  root: HTMLElement,
  view: DrawerView,
  options: DrawerSetupOptions,
  setup: {
    enhanceMode: boolean;
    generated: HTMLElement[];
    marker: Comment | null;
    restores: Array<() => void>;
  },
): DrawerController {
  const {
    className,
    closeLabel: _closeLabel,
    description: _description,
    id: requestedId,
    swipeArea: _swipeArea,
    title: _title,
    triggerSelector: initialSelector,
    ...behavior
  } = options;
  const id = requestedId ?? createId("drawer");
  addFuiClasses(root, "fui-drawer");
  if (className) root.classList.add(...className.split(/\s+/).filter(Boolean));
  root.dataset.part ||= "root";
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
  zag.bind(view.backdrop, (api) => api.getBackdropProps());
  zag.bind(view.positioner, (api) => api.getPositionerProps());
  zag.bind(view.content, (api) => api.getContentProps());
  zag.bind(view.title, (api) => api.getTitleProps());
  if (view.description) zag.bind(view.description, (api) => api.getDescriptionProps());
  zag.bind(view.close, (api) => api.getCloseTriggerProps());
  zag.bind(view.grabber, (api) => api.getGrabberProps());
  zag.bind(view.grabberIndicator, (api) => api.getGrabberIndicatorProps());
  if (view.swipeArea) zag.bind(view.swipeArea, (api) => api.getSwipeAreaProps());

  const triggers = createTriggerBinding(zag, {
    component: "Drawer",
    getScope: () => getLookupRoot(root),
    getTriggerProps: (api) => api.getTriggerProps(),
  });
  triggers.setSelector(initialSelector);

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
        triggers.refresh();
        started = true;
      }
      return this;
    },
    setTriggerSelector(selector) {
      if (destroyed) throwDestroyed();
      triggers.setSelector(selector);
    },
    refreshTriggers() {
      if (destroyed) throwDestroyed();
      triggers.refresh();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      triggers.destroy();
      zag.destroy();
      if (setup.enhanceMode) {
        for (const node of setup.generated) node.remove();
        setup.marker?.replaceWith(view.content);
        for (const restore of setup.restores) restore();
      } else {
        root.remove();
      }
    },
  };
  if (setup.enhanceMode) controller.start();
  return controller;
}

function createClose(label = "Fermer"): HTMLButtonElement {
  const close = h("button", {
    ariaLabel: label,
    data: { part: "close-trigger" },
    type: "button",
  });
  close.append(createXIcon());
  return close;
}

function throwDestroyed(): never {
  throw new Error("[Faisceau UI] Cannot start or mount a destroyed Drawer.");
}
