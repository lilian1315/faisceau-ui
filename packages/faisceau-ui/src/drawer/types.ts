import type { DialogController, DialogMachineOptions, DialogViewOptions } from "../dialog/types.js";

export type DrawerSide = "top" | "right" | "bottom" | "left";
export type DrawerOptions = DialogMachineOptions & DialogViewOptions & { side?: DrawerSide };
export type EnhanceDrawerOptions = DialogMachineOptions &
  Partial<Omit<DialogViewOptions, "content" | "trigger">> & { side?: DrawerSide };
export type DrawerController = DialogController;
export type DrawerApi = DrawerController["api"] extends { get(): infer Api } ? Api : never;
