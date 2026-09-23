import "../styles/base.scss";
import "../styles/collapsible.scss";
import { h } from "@lilian1315/create-element";
import * as collapsible from "@zag-js/collapsible";
import { createZagMachine } from "faisceau-zag";

import { captureAttributes, createId, getLookupRoot, requireFuiClass } from "../shared/index.ts";
import type {
  CollapsibleController,
  CollapsibleOptions,
  EnhanceCollapsibleOptions,
} from "./types.ts";

interface CollapsibleParts {
  content: HTMLElement;
  indicator: HTMLElement;
  trigger: HTMLButtonElement;
}

export function createCollapsible(options: CollapsibleOptions): CollapsibleController {
  const root = h("div", { class: "fui-collapsible" });
  if (options.className) root.classList.add(...options.className.split(/\s+/).filter(Boolean));
  const indicator = h(
    "span",
    { class: "fui-collapsible-indicator" },
    h("span", { class: "fui-icon fui-icon--chevron-down", "aria-hidden": true }),
  );
  const trigger = h(
    "button",
    { class: "fui-collapsible-trigger", type: "button" },
    h("span", { class: "fui-collapsible-trigger-text" }, options.trigger),
    indicator,
  );
  const content = h("div", { class: "fui-collapsible-content" }, options.content);
  root.append(trigger, content);
  return setupCollapsible(root, options, { content, indicator, trigger }, true);
}

export function enhanceCollapsible(
  root: HTMLElement,
  options: EnhanceCollapsibleOptions = {},
): CollapsibleController {
  if (!root.classList.contains("fui-collapsible")) {
    throw new Error(
      '[Faisceau UI] Collapsible enhancement requires a root with class "fui-collapsible".',
    );
  }
  const trigger = requireFuiClass<HTMLButtonElement>(root, "fui-collapsible-trigger");
  const indicator = requireFuiClass<HTMLElement>(trigger, "fui-collapsible-indicator");
  const content = requireFuiClass<HTMLElement>(root, "fui-collapsible-content");
  return setupCollapsible(root, options, { content, indicator, trigger }, false);
}

function setupCollapsible(
  root: HTMLElement,
  options: EnhanceCollapsibleOptions,
  parts: CollapsibleParts,
  ownsRoot: boolean,
): CollapsibleController {
  const {
    className,
    content: contentText,
    id: requestedId,
    trigger: triggerText,
    ...behavior
  } = options;
  const restores = ownsRoot
    ? []
    : [root, parts.trigger, parts.indicator, parts.content].map(captureAttributes);
  if (!ownsRoot) {
    if (className) root.classList.add(...className.split(/\s+/).filter(Boolean));
    if (triggerText !== undefined) {
      const text = requireFuiClass<HTMLElement>(parts.trigger, "fui-collapsible-trigger-text");
      const children = Array.from(text.childNodes);
      restores.push(() => text.replaceChildren(...children));
      text.replaceChildren(triggerText);
    }
    if (contentText !== undefined) {
      const children = Array.from(parts.content.childNodes);
      restores.push(() => parts.content.replaceChildren(...children));
      parts.content.replaceChildren(contentText);
    }
  }

  const id = requestedId ?? createId("collapsible");
  const zag = createZagMachine(
    collapsible.machine,
    {
      ...behavior,
      getRootNode: () => getLookupRoot(root),
      id,
      ids: {
        content: `${id}:content`,
        trigger: `${id}:trigger`,
      },
    },
    collapsible.connect,
  );

  zag.bind(root, (api) => api.getRootProps());
  zag.bind(parts.trigger, (api) => ({ ...api.getTriggerProps(), disabled: api.disabled }));
  zag.bind(parts.content, (api) => api.getContentProps());
  zag.bind(parts.indicator, (api) => api.getIndicatorProps());

  let started = false;
  let destroyed = false;
  const controller: CollapsibleController = {
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
      else for (const restore of restores.reverse()) restore();
    },
  };

  if (!ownsRoot) controller.start();
  return controller;
}

function throwDestroyed(): never {
  throw new Error("[Faisceau UI] Cannot start or mount a destroyed Collapsible.");
}
