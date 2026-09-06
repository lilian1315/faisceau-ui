import type * as checkbox from "@zag-js/checkbox";

import type { FuiController, FuiFieldOptions } from "../types.js";

type CheckboxMachineOptions = Omit<checkbox.Props, "getRootNode" | "id" | "ids">;

interface CheckboxViewOptions extends FuiFieldOptions {
  /** Visible label associated with the native checkbox. */
  label: string;
}

/** Options for a checkbox built entirely by Faisceau UI. */
export type CheckboxOptions = CheckboxMachineOptions & CheckboxViewOptions;

/** Options for enhancing a container that owns one native checkbox. */
export type EnhanceCheckboxOptions = Omit<CheckboxMachineOptions, "defaultChecked"> &
  FuiFieldOptions & {
    /** Falls back to the native input's aria-label. */
    label?: string;
  };

export type CheckboxApi = checkbox.Api;
export type CheckboxController = FuiController<CheckboxApi>;
