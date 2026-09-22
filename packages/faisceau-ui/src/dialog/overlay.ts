import { h } from "@lilian1315/create-element";
import { createZagMachine } from "faisceau-zag";
import * as dialog from "@zag-js/dialog";

import {
  addFuiClasses,
  bindScrollShadows,
  captureAttributes,
  createId,
  createTriggerBinding,
  getLookupRoot,
  requireFuiClass,
} from "../shared/index.js";
import { captureChildNodes as captureChildren } from "../shared/dom.ts";
import { createOverlayView, type OverlayVariant, type OverlayView } from "./markup.ts";
import type {
  DialogController,
  DialogMachineOptions,
  DialogOptions,
  EnhanceDialogOptions,
} from "./types.ts";

interface SetupOptions extends DialogMachineOptions {
  className?: string;
  closeLabel?: string;
  description?: string;
  footer?: string;
  id?: string;
  title?: string;
  triggerSelector?: string;
}

export function createOverlay(
  options: SetupOptions & { content: string; title: string },
  variant: OverlayVariant,
): DialogController {
  return factory(undefined, options, variant);
}

export function enhanceOverlay(
  root: HTMLElement,
  options: SetupOptions,
  variant: OverlayVariant,
): DialogController {
  return factory(root, options, variant);
}

function factory(
  root: HTMLElement | undefined,
  options: (DialogOptions | EnhanceDialogOptions) & SetupOptions,
  variant: OverlayVariant,
): DialogController {
  if (root && !root.classList.contains(`fui-${variant}`)) {
    throw new Error(
      `[Faisceau UI] ${capitalize(variant)} enhance mode need a root with the \`fui-${variant}\` class`,
    );
  }

  const enhanceMode = !!root;
  const restores: Array<() => void> = [];
  const generated: HTMLElement[] = [];
  options ??= {};

  let content: HTMLElement;
  let header: HTMLElement;
  let body: HTMLElement;
  let bodyContent: HTMLElement;
  let footer: HTMLElement | null;
  let title: HTMLElement;
  let description: HTMLElement | null;
  let close: HTMLButtonElement;
  let backdrop: HTMLElement;
  let positioner: HTMLElement;
  let marker: Comment | null = null;
  const classPrefix = `fui-${variant}`;

  if (root) {
    content = requireFuiClass<HTMLElement>(root, `${classPrefix}-content`);
    restores.push(captureAttributes(root), captureAttributes(content));
    const adoptedHeader = root.querySelector<HTMLElement>(`.${classPrefix}-header`);
    if (adoptedHeader) {
      header = adoptedHeader;
      restores.push(captureAttributes(header), captureChildren(header));
    } else {
      header = h("div", { class: `${classPrefix}-header` });
      generated.push(header);
    }
    // Snapshot content children before adopted parts move into the header so
    // destroy() can put caller-owned nodes back in their original order.
    restores.push(captureChildren(content));
    const adoptedTitle = root.querySelector<HTMLElement>(`.${classPrefix}-title`);
    if (adoptedTitle) {
      title = adoptedTitle;
      restores.push(captureAttributes(title));
      if (options.title !== undefined) {
        restores.push(captureChildren(title));
        title.replaceChildren(new Text(options.title));
      }
      if (title.parentElement !== header) header.prepend(title);
    } else {
      title = h("h2", { class: `${classPrefix}-title` }, options.title ?? "");
      header.prepend(title);
      generated.push(title);
    }
    if (!title.textContent?.trim()) {
      throw new Error(
        `[Faisceau UI] ${capitalize(variant)} enhancement requires a title part or options.title.`,
      );
    }
    const adoptedDescription = root.querySelector<HTMLElement>(`.${classPrefix}-description`);
    if (adoptedDescription) {
      description = adoptedDescription;
      restores.push(captureAttributes(description));
      if (options.description !== undefined) {
        restores.push(captureChildren(description));
        description.replaceChildren(new Text(options.description));
      }
      if (description.parentElement !== header) title.after(description);
    } else if (options.description !== undefined) {
      description = h("p", { class: `${classPrefix}-description` }, options.description);
      title.after(description);
      generated.push(description);
    } else {
      description = null;
    }
    const adoptedClose = root.querySelector<HTMLButtonElement>(`.${classPrefix}-close`);
    if (adoptedClose) {
      close = adoptedClose;
      restores.push(captureAttributes(close));
      if (close.parentElement !== header) header.append(close);
    } else {
      close = createClose(variant, options.closeLabel);
      header.append(close);
      generated.push(close);
    }
    if (!adoptedHeader) content.prepend(header);
    const adoptedBody = root.querySelector<HTMLElement>(`.${classPrefix}-body`);
    if (adoptedBody) {
      body = adoptedBody;
      restores.push(captureAttributes(body), captureChildren(body));
    } else {
      body = h("div", { class: `${classPrefix}-body` });
      generated.push(body);
    }
    // Only the body scrolls: gather every leftover content node into it.
    for (const node of Array.from(content.childNodes)) {
      if (node !== header && node !== body) body.append(node);
    }
    if (!adoptedBody) {
      if (header.parentElement === content) header.after(body);
      else content.append(body);
    }
    const adoptedBodyContent = body.querySelector<HTMLElement>(`.${classPrefix}-body-content`);
    if (adoptedBodyContent) {
      bodyContent = adoptedBodyContent;
      restores.push(captureAttributes(bodyContent));
    } else {
      bodyContent = h("div", { class: `${classPrefix}-body-content` });
      generated.push(bodyContent);
      for (const node of Array.from(body.childNodes)) bodyContent.append(node);
      body.append(bodyContent);
    }
    const adoptedFooter = root.querySelector<HTMLElement>(`.${classPrefix}-footer`);
    if (adoptedFooter) {
      footer = adoptedFooter;
      restores.push(captureAttributes(footer));
      if (options.footer !== undefined) {
        restores.push(captureChildren(footer));
        footer.replaceChildren(new Text(options.footer));
      }
      if (footer.parentElement !== content) body.after(footer);
    } else if (options.footer !== undefined) {
      footer = h("div", { class: `${classPrefix}-footer` }, options.footer);
      body.after(footer);
      generated.push(footer);
    } else {
      footer = null;
    }
    backdrop = h("div", { class: `${classPrefix}-backdrop` });
    positioner = h("div", { class: `${classPrefix}-positioner` });
    generated.push(backdrop, positioner);
    marker = root.ownerDocument.createComment(`fui-${variant}-content`);
    content.before(marker);
    positioner.append(content);
    root.append(backdrop, positioner);
  } else {
    if (options.title === undefined)
      throw new Error(`[Faisceau UI] ${capitalize(variant)} creation requires options.title.`);
    if ((options as DialogOptions).content === undefined)
      throw new Error(`[Faisceau UI] ${capitalize(variant)} creation requires options.content.`);
    root = h("div", { class: `fui-${variant}` }) as HTMLElement;
    const view = createOverlayView({ ...(options as DialogOptions), variant });
    ({
      backdrop,
      body,
      bodyContent,
      close,
      content,
      description,
      footer,
      header,
      positioner,
      title,
    } = view);
    root.append(backdrop, positioner);
  }

  return setupOverlay(
    root,
    { backdrop, body, bodyContent, close, content, description, footer, header, positioner, title },
    options,
    {
      enhanceMode,
      generated,
      marker,
      restores,
      variant,
    },
  );
}

function setupOverlay(
  root: HTMLElement,
  view: OverlayView,
  options: SetupOptions,
  setup: {
    enhanceMode: boolean;
    generated: HTMLElement[];
    marker: Comment | null;
    restores: Array<() => void>;
    variant: OverlayVariant;
  },
): DialogController {
  const {
    className,
    closeLabel: _closeLabel,
    description: _description,
    footer: _footer,
    id: requestedId,
    title: _title,
    triggerSelector: initialSelector,
    ...behavior
  } = options;
  const id = requestedId ?? createId(setup.variant);
  addFuiClasses(root, `fui-${setup.variant}`);
  for (const part of [
    "backdrop",
    "positioner",
    "content",
    "header",
    "title",
    "description",
    "body",
    "bodyContent",
    "footer",
    "close",
  ] as const) {
    const element = part === "close" ? view.close : view[part];
    if (element)
      addFuiClasses(
        element,
        `fui-${setup.variant}-${part === "bodyContent" ? "body-content" : part}`,
      );
  }
  if (className) root.classList.add(...className.split(/\s+/).filter(Boolean));
  root.dataset.fuiComponent = setup.variant;
  const zag = createZagMachine(
    dialog.machine,
    { ...behavior, getRootNode: () => getLookupRoot(root), id },
    dialog.connect,
  );
  zag.bind(view.backdrop, (api) => api.getBackdropProps());
  zag.bind(view.positioner, (api) => api.getPositionerProps());
  zag.bind(view.content, (api) => api.getContentProps());
  zag.bind(view.title, (api) => api.getTitleProps());
  if (view.description) zag.bind(view.description, (api) => api.getDescriptionProps());
  zag.bind(view.close, (api) => api.getCloseTriggerProps());

  const triggers = createTriggerBinding(zag, {
    component: capitalize(setup.variant),
    getScope: () => getLookupRoot(root),
    getTriggerProps: (api, triggerValue) => api.getTriggerProps({ value: triggerValue }),
  });
  triggers.setSelector(initialSelector);
  const unbindScrollShadows = bindScrollShadows(view.body);

  let started = false;
  let destroyed = false;
  const controller: DialogController = {
    api: zag.api,
    root,
    get started() {
      return started;
    },
    mount(target) {
      if (destroyed) throwDestroyed(setup.variant);
      target.append(root);
      return this.start();
    },
    start() {
      if (destroyed) throwDestroyed(setup.variant);
      if (!started) {
        zag.start();
        triggers.refresh();
        started = true;
      }
      return this;
    },
    setTriggerSelector(selector) {
      if (destroyed) throwDestroyed(setup.variant);
      triggers.setSelector(selector);
    },
    refreshTriggers() {
      if (destroyed) throwDestroyed(setup.variant);
      triggers.refresh();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unbindScrollShadows();
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

function createClose(variant: OverlayVariant, label = "Fermer"): HTMLButtonElement {
  const close = h("button", {
    ariaLabel: label,
    class: `fui-${variant}-close`,
    type: "button",
  });
  close.append(h("span", { class: "fui-icon fui-icon--x", "aria-hidden": true }));
  return close;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function throwDestroyed(variant: OverlayVariant): never {
  throw new Error(`[Faisceau UI] Cannot start or mount a destroyed ${capitalize(variant)}.`);
}
