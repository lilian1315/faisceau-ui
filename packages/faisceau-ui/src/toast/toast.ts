import { h } from "@lilian1315/create-element";
import { createZagMachine } from "faisceau-zag";
import * as toast from "@zag-js/toast";

import {
  addFuiClasses,
  captureAttributes,
  createKeyedReconciler,
  createId,
  getLookupRoot,
} from "../shared/index.js";
import type { ToasterController, ToasterOptions, ToastOptions } from "./types.ts";

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

  const group = createZagMachine(
    toast.group.machine,
    { getRootNode: () => getLookupRoot(root), id, store },
    toast.group.connect,
  );
  group.bind(root, (api) => api.getGroupProps({ label }));
  const items = createKeyedReconciler<ToastOptions, string, ToastItem>({
    create: (data, index) => createToastItem(root, data, index, group.service),
    destroy: (item) => item.destroy(),
    getKey: (data) => data.id!,
    update: (item, data, index) => item.update(data, index),
  });
  let unsubscribe = (): void => {};
  let started = false;
  let destroyed = false;

  const render = (toasts: ToastOptions[]): void => {
    const ordered = items.reconcile(toasts.filter((toast) => toast.id));
    root.append(...ordered.map((item) => item.root));
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
      items.destroy();
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
  const title = h("div", { class: "fui-toast-title" }, data.title ?? "");
  let description = data.description
    ? h("div", { class: "fui-toast-description" }, data.description)
    : null;
  const close = h("button", {
    class: "fui-toast-close",
    type: "button",
  });
  close.append(h("span", { class: "fui-icon fui-icon--x", "aria-hidden": true }));
  let action = data.action
    ? h("button", { class: "fui-toast-action", type: "button" }, data.action.label)
    : null;
  const element = h(
    "div",
    { class: "fui-toast" },
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
  const permanentBindings = [
    machine.bind(element, (api) => api.getRootProps()),
    machine.bind(title, (api) => api.getTitleProps()),
    machine.bind(close, (api) => api.getCloseTriggerProps()),
  ];
  let disposeDescription = description
    ? machine.bind(description, (api) => api.getDescriptionProps())
    : undefined;
  let disposeAction = action
    ? machine.bind(action, (api) => api.getActionTriggerProps())
    : undefined;
  machine.start();
  return {
    root: element,
    update(nextData, nextIndex) {
      title.textContent = nextData.title ?? "";
      if (nextData.description) {
        if (!description) {
          description = h("div", {
            class: "fui-toast-description",
          });
          title.after(description);
          disposeDescription = machine.bind(description, (api) => api.getDescriptionProps());
        }
        description.textContent = nextData.description;
      } else if (description) {
        disposeDescription?.();
        disposeDescription = undefined;
        description.remove();
        description = null;
      }
      if (nextData.action) {
        if (!action) {
          action = h("button", {
            class: "fui-toast-action",
            type: "button",
          });
          close.before(action);
          disposeAction = machine.bind(action, (api) => api.getActionTriggerProps());
        }
        action.textContent = nextData.action.label;
      } else if (action) {
        disposeAction?.();
        disposeAction = undefined;
        action.remove();
        action = null;
      }
      machine.updateProps({ ...nextData, index: nextIndex });
    },
    destroy() {
      for (const dispose of permanentBindings) dispose();
      disposeDescription?.();
      disposeAction?.();
      machine.destroy();
      element.remove();
    },
  };
}
