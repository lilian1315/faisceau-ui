import { createOverlay, enhanceOverlay } from "../dialog/overlay.js";
import type { DrawerController, DrawerOptions, EnhanceDrawerOptions } from "./types.js";

export function createDrawer(options: DrawerOptions): DrawerController {
  const { side = "right", ...dialogOptions } = options;
  const controller = createOverlay(dialogOptions, "drawer");
  controller.root.dataset.side = side;
  return controller;
}

export function enhanceDrawer(
  root: HTMLElement,
  options: EnhanceDrawerOptions = {},
): DrawerController {
  const { side = "right", ...dialogOptions } = options;
  const controller = enhanceOverlay(root, dialogOptions, "drawer");
  controller.root.dataset.side = side;
  return controller;
}
