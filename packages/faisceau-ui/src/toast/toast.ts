import { h } from "@lilian1315/create-element/faisceau";
import { createZagMachine } from "@lilian1315/faisceau-zag";
import * as toast from "@zag-js/toast";

import {
  addFuiClasses,
  captureAttributes,
  createId,
  createXIcon,
  getLookupRoot,
} from "../shared/index.js";
import type { ToasterController, ToasterOptions, ToastOptions } from "./types.js";

interface ToastItem {
  destroy(): void;
  root: HTMLElement;
  update(data: ToastOptions, index: number): void;
}

export function createToaster(options: ToasterOptions = {}): ToasterController {
  return setupToaster(h("div"), options, true, false);
}

export function enhanceToaster(root: HTMLElement, options: ToasterOptions = {}): ToasterController {
  return setupToaster(root, options, false, true);
}

function setupToaster(
  root: HTMLElement,
  options: ToasterOptions,
  ownsRoot: boolean,
  autoStart: boolean,
): ToasterController {
  const { className, id: requestedId, label = "Notifications", ...storeOptions } = options;
  const restoreRoot = captureAttributes(root);
  const id = requestedId ?? createId("toast");
  const store = toast.createStore<string>(storeOptions);
  addFuiClasses(root, "fui-toast-group");
  if (className) root.classList.add(...className.split(/\s+/).filter(Boolean));
  root.dataset.fuiComponent = "toast";
  root.dataset.fuiPart ||= "group";

  const group = createZagMachine(
    toast.group.machine,
    { getRootNode: () => getLookupRoot(root), id, store },
    toast.group.connect,
  );
  group.bind(root, (api) => api.getGroupProps({ label }));
  const items = new Map<string, ToastItem>();
  let unsubscribe = (): void => {};
  let started = false;
  let destroyed = false;

  const render = (toasts: ToastOptions[]): void => {
    const visible = new Set<string>();
    toasts.forEach((data, index) => {
      if (!data.id) return;
      visible.add(data.id);
      if (!items.has(data.id))
        items.set(data.id, createToastItem(root, data, index, group.service));
      else items.get(data.id)!.update(data, index);
    });
    for (const [itemId, item] of items) {
      if (visible.has(itemId)) continue;
      item.destroy();
      items.delete(itemId);
    }
  };

  const controller: ToasterController = {
    root,
    store,
    get started() {
      return started;
    },
    create(data) {
      return store.create(data);
    },
    dismiss(toastId) {
      store.dismiss(toastId);
    },
    mount(target) {
      if (destroyed) throw new Error("[Faisceau UI] Cannot mount a destroyed Toaster.");
      target.append(root);
      return this.start();
    },
    start() {
      if (destroyed) throw new Error("[Faisceau UI] Cannot start a destroyed Toaster.");
      if (!started) {
        group.start();
        unsubscribe = store.subscribe(() => {
          queueMicrotask(() => render(store.getVisibleToasts()));
        });
        render(store.getVisibleToasts());
        started = true;
      }
      return this;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      for (const item of items.values()) item.destroy();
      items.clear();
      group.destroy();
      if (ownsRoot) root.remove();
      else restoreRoot();
    },
  };
  if (autoStart) controller.start();
  return controller;
}

function createToastItem(
  root: HTMLElement,
  data: ToastOptions,
  index: number,
  parent: toast.GroupService,
): ToastItem {
  const title = h(
    "div",
    { class: "fui-toast-title", data: { fuiPart: "title" } },
    data.title ?? "",
  );
  const description = data.description
    ? h(
        "div",
        { class: "fui-toast-description", data: { fuiPart: "description" } },
        data.description,
      )
    : null;
  const close = h("button", {
    class: "fui-toast-close",
    data: { fuiPart: "close-trigger" },
    type: "button",
  });
  close.append(createXIcon());
  const action = data.action
    ? h(
        "button",
        { class: "fui-toast-action", data: { fuiPart: "action-trigger" }, type: "button" },
        data.action.label,
      )
    : null;
  const element = h(
    "div",
    { class: "fui-toast", data: { fuiPart: "root" } },
    h("div", { class: "fui-toast-copy" }, title, description),
    action,
    close,
  );
  root.append(element);
  const machine = createZagMachine(
    toast.machine,
    {
      ...data,
      getRootNode: () => getLookupRoot(root),
      index,
      parent,
      translations: { closeTriggerLabel: "Fermer la notification" },
    },
    toast.connect,
  );
  machine.bind(element, (api) => api.getRootProps());
  machine.bind(title, (api) => api.getTitleProps());
  if (description) machine.bind(description, (api) => api.getDescriptionProps());
  machine.bind(close, (api) => api.getCloseTriggerProps());
  if (action) machine.bind(action, (api) => api.getActionTriggerProps());
  machine.start();
  return {
    root: element,
    update(nextData, nextIndex) {
      machine.updateProps({ ...nextData, index: nextIndex });
    },
    destroy() {
      machine.destroy();
      element.remove();
    },
  };
}
