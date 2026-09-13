import type * as checkbox from "@zag-js/checkbox";
import type { FuiController } from "../types";

export type CheckboxProps = Omit<checkbox.Props, "getRootNode" | "id" | "ids"> & {
  id?: checkbox.Props["id"];
  label?: string;
  description?: string;
};

export type CheckboxApi = checkbox.Api;
export type CheckboxController = FuiController<CheckboxApi>;
