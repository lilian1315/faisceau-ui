import { h } from "@lilian1315/create-element";
import { createZagMachine } from "faisceau-zag";
import * as tooltip from "@zag-js/tooltip";

import { addFuiClasses, captureAttributes, createId, getLookupRoot } from "../shared/index.js";
import { createTooltipPopup } from "./markup.ts";
import type { EnhanceTooltipOptions, TooltipController, TooltipOptions } from "./types.ts";

interface TooltipSetup {
  cleanup?: () => void;
  ownsRoot: boolean;
  start: boolean;
  trigger: HTMLElement;
}

/** Builds a tooltip with a button trigger. Call `.mount(target)` to start it. */
export function createTooltip(options: TooltipOptions): TooltipController {
  const root = h("div", { class: "fui-tooltip", data: { fuiComponent: "tooltip" } });
  const trigger = h(
    "button",
    {
      class: "fui-tooltip-trigger fui-tooltip-trigger--generated",
      data: { fuiPart: "trigger" },
      type: "button",
    },
    options.trigger,
  );
  root.append(trigger);
  return setupTooltip(root, options, { ownsRoot: true, start: false, trigger });
}

/** Enhances an existing trigger, using `content` or its native `title` text. */
export function enhanceTooltip(
  trigger: HTMLElement,
  options: EnhanceTooltipOptions = {},
): TooltipController {
  const content = options.content ?? trigger.getAttribute("title")?.trim();
  if (!content) {
    throw new Error(
      "[Faisceau UI] Tooltip enhancement requires options.content or a non-empty title attribute on the trigger.",
    );
  }

  const restoreTrigger = captureAttributes(trigger);
  trigger.removeAttribute("title");
  return setupTooltip(
    trigger,
    { ...options, content },
    {
      cleanup: restoreTrigger,
      ownsRoot: false,
      start: true,
      trigger,
    },
  );
}

function setupTooltip(
  root: HTMLElement,
  options: EnhanceTooltipOptions & { content: string },
  setup: TooltipSetup,
): TooltipController {
  const { className, content: text, id: requestedId, positioning, ...behavior } = options;
  const popup = createTooltipPopup(text);
  const id = requestedId ?? createId("tooltip");
  addFuiClasses(setup.trigger, "fui-tooltip-trigger");
  if (className) setup.trigger.classList.add(...className.split(/\s+/).filter(Boolean));
  setup.trigger.dataset.fuiPart ||= "trigger";
  setup.trigger.after(popup.positioner);

  const zag = createZagMachine(
    tooltip.machine,
    {
      ...behavior,
      getRootNode: () => getLookupRoot(setup.trigger),
      id,
      ids: {
        arrow: `${id}:arrow`,
        content: `${id}:content`,
        positioner: `${id}:positioner`,
        trigger: `${id}:trigger`,
      },
      positioning: { gutter: 6, placement: "top", ...positioning },
    },
    tooltip.connect,
  );

  zag.bind(setup.trigger, (api) => api.getTriggerProps());
  zag.bind(popup.positioner, (api) => api.getPositionerProps());
  zag.bind(popup.content, (api) => api.getContentProps());
  zag.bind(popup.arrow, (api) => api.getArrowProps());
  zag.bind(popup.arrowTip, (api) => api.getArrowTipProps());

  let started = false;
  let destroyed = false;
  const controller: TooltipController = {
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
      popup.positioner.remove();
      if (setup.ownsRoot) root.remove();
      else setup.cleanup?.();
    },
  };

  if (setup.start) controller.start();
  return controller;
}

function throwDestroyed(): never {
  throw new Error("[Faisceau UI] Cannot start or mount a destroyed Tooltip.");
}
