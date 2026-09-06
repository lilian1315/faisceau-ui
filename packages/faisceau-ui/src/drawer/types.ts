import type * as drawer from "@zag-js/drawer";
import type { FuiController } from "../types.js";

type DrawerMachineOptions = Omit<drawer.Props, "getRootNode" | "id" | "ids">;
interface DrawerViewOptions {
  id?: string;
  className?: string;
  title: string;
  description?: string;
  content: string;
  trigger: string;
  closeLabel?: string;
  /** Generate an edge swipe area in addition to the visible trigger. */
  swipeArea?: boolean;
}
export type DrawerOptions = DrawerMachineOptions & DrawerViewOptions;
export type EnhanceDrawerOptions = DrawerMachineOptions &
  Partial<Omit<DrawerViewOptions, "content" | "trigger">>;
export type DrawerApi = drawer.Api;
export type DrawerController = FuiController<DrawerApi>;
