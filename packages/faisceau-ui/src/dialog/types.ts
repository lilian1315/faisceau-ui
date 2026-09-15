import type * as dialog from "@zag-js/dialog";

import type { FuiController } from "../types.js";

export type DialogMachineOptions = Omit<dialog.Props, "getRootNode" | "id" | "ids">;

export interface DialogViewOptions {
  id?: string;
  className?: string;
  title: string;
  description?: string;
  content: string;
  /** CSS selector resolved against the lookup root; every match opens the dialog. */
  triggerSelector?: string;
  closeLabel?: string;
}

export type DialogOptions = DialogMachineOptions & DialogViewOptions;
export type EnhanceDialogOptions = DialogMachineOptions &
  Partial<Omit<DialogViewOptions, "content">>;
export type DialogApi = dialog.Api;
export interface DialogController extends FuiController<DialogApi> {
  /** Replaces the trigger selector and rebinds every matching element. */
  setTriggerSelector(selector: string | undefined): void;
  /** Re-resolves the current selector, picking up triggers added after start. */
  refreshTriggers(): void;
}
