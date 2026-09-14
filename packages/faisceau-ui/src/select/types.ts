import type * as select from "@zag-js/select";

import type { FuiItem, FuiItemInput } from "../shared/index.js";
import type { FuiController } from "../types.js";

export interface SelectProps extends Omit<
  select.Props<FuiItem>,
  "collection" | "getRootNode" | "id" | "ids"
> {
  id?: string;
  /** Available options. Strings become `{ value, label }` items. */
  items: readonly FuiItemInput[];
  /** Visible label rendered above the trigger. */
  label?: string;
  /** Supporting text rendered below the control. */
  description?: string;
  /** Text displayed while no item is selected. @default "Select an option" */
  placeholder?: string;
  /** Adds an explicit clear button next to the trigger. */
  clearable?: boolean;
  /** Accessible label for the clear button. */
  clearLabel?: string;
}

export type EnhanceSelectProps = Omit<SelectProps, "items"> & {
  /** Replaces the options read from the native select when provided. */
  items?: readonly FuiItemInput[];
};

export type SelectApi = select.Api;
export type SelectController = FuiController<SelectApi>;
