import type * as combobox from "@zag-js/combobox";

import type { FuiItem, FuiItemInput } from "../shared/index.js";
import type { FuiController, FuiFieldOptions } from "../types.js";

type ComboboxMachineOptions = Omit<
  combobox.Props<FuiItem>,
  | "allowCustomValue"
  | "collection"
  | "getRootNode"
  | "id"
  | "ids"
  | "multiple"
  | "onInputValueChange"
>;

interface ComboboxViewOptions extends FuiFieldOptions {
  /** Items shown in the suggestion list. */
  items: readonly FuiItemInput[];
  /** Visible label associated with the input. */
  label: string;
  /** Allows selecting more than one item and renders the choices as removable tags. @default false */
  multiple?: boolean;
  /** Accessible label for the clear button. */
  clearLabel?: string;
  /** Message displayed when filtering returns no items. */
  emptyLabel?: string;
  /** Override the default case-insensitive label filter. */
  filter?: (item: Readonly<FuiItem>, inputValue: string) => boolean;
  /** Builds the accessible label for a selected item's remove button. */
  getRemoveLabel?: (item: Readonly<FuiItem>) => string;
  /** Called after the built-in collection filter has run. */
  onInputValueChange?: combobox.Props<FuiItem>["onInputValueChange"];
}

/** Options for markup built entirely by Faisceau UI. */
export type ComboboxOptions = ComboboxMachineOptions & ComboboxViewOptions;

/** Options for enhancing a fully-authored Field with a direct Combobox child. */
export type EnhanceComboboxOptions = ComboboxMachineOptions &
  Omit<ComboboxViewOptions, "items" | "label"> & {
    /** Optionally replaces the authored Field label while enhanced. */
    label?: string;
  };

export type ComboboxApi = combobox.Api;
export interface ComboboxController extends FuiController<ComboboxApi> {
  /** Replaces the authoritative suggestion collection. */
  setItems(items: readonly FuiItemInput[]): void;
}
