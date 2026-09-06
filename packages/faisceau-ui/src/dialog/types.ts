import type * as dialog from "@zag-js/dialog";

import type { FuiController } from "../types.js";

export type DialogMachineOptions = Omit<dialog.Props, "getRootNode" | "id" | "ids">;

export interface DialogViewOptions {
  id?: string;
  className?: string;
  title: string;
  description?: string;
  content: string;
  trigger: string;
  closeLabel?: string;
}

export type DialogOptions = DialogMachineOptions & DialogViewOptions;
export type EnhanceDialogOptions = DialogMachineOptions &
  Partial<Omit<DialogViewOptions, "content" | "trigger">>;
export type DialogApi = dialog.Api;
export type DialogController = FuiController<DialogApi>;
