import { createOverlay, enhanceOverlay } from "./overlay.js";
import type { DialogController, DialogOptions, EnhanceDialogOptions } from "./types.js";

export function createDialog(options: DialogOptions): DialogController {
  return createOverlay(options, "dialog");
}

export function enhanceDialog(
  root: HTMLElement,
  options: EnhanceDialogOptions = {},
): DialogController {
  return enhanceOverlay(root, options, "dialog");
}
