import type * as drawer from "@zag-js/drawer";
import type { FuiController } from "../types.js";

type DrawerMachineOptions = Omit<drawer.Props, "getRootNode" | "id" | "ids">;
interface DrawerViewOptions {
  id?: string;
  className?: string;
  title: string;
  description?: string;
  content: string;
  /** CSS selector resolved against the lookup root; every match opens the drawer. */
  triggerSelector?: string;
  closeLabel?: string;
  /** Generate an edge swipe area in addition to external triggers. */
  swipeArea?: boolean;
}
export type DrawerOptions = DrawerMachineOptions & DrawerViewOptions;
export type EnhanceDrawerOptions = DrawerMachineOptions &
  Partial<Omit<DrawerViewOptions, "content">>;
export type DrawerApi = drawer.Api;
export interface DrawerController extends FuiController<DrawerApi> {
  /** Replaces the trigger selector and rebinds every matching element. */
  setTriggerSelector(selector: string | undefined): void;
  /** Re-resolves the current selector, picking up triggers added after start. */
  refreshTriggers(): void;
}
