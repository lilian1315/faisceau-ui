import type * as select from "@zag-js/select";

import type { FuiItem, FuiItemInput } from "../shared/index.js";
import type { FuiController, FuiFieldOptions } from "../types.js";

type SelectMachineOptions = Omit<
  select.Props<FuiItem>,
  "collection" | "getRootNode" | "id" | "ids" | "multiple"
>;

interface SelectViewOptions extends FuiFieldOptions {
  /** Allows selecting more than one item without closing the popup. @default false */
  multiple?: boolean;
  /** Aligns the selected item's text with the trigger value. Always disabled in multiple mode. @default true */
  alignItemWithTrigger?: boolean;
  /** Text displayed while no item is selected. */
  placeholder?: string;
  /** Adds an explicit clear button next to the trigger. */
  clearable?: boolean;
  /** Accessible label for the clear button. */
  clearLabel?: string;
}

/** Options for markup built entirely by Faisceau UI. */
export type SelectOptions = SelectMachineOptions &
  SelectViewOptions & {
    items: readonly FuiItemInput[];
    label: string;
  };

/** Options for enhancing a container that owns one native select. */
export type EnhanceSelectOptions = SelectMachineOptions &
  SelectViewOptions & {
    label?: string;
  };

export type SelectApi = select.Api;
export type SelectController = FuiController<SelectApi>;
