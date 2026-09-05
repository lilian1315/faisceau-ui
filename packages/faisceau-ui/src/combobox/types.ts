import type * as combobox from "@zag-js/combobox";

import type { FuiItem, FuiItemInput } from "../shared/index.js";
import type { FuiController, FuiFieldOptions } from "../types.js";

type ComboboxMachineOptions = Omit<
  combobox.Props<FuiItem>,
  "allowCustomValue" | "collection" | "getRootNode" | "id" | "ids" | "onInputValueChange"
>;

interface ComboboxViewOptions extends FuiFieldOptions {
  /** Items shown in the suggestion list. */
  items: readonly FuiItemInput[];
  /** Visible label associated with the input. */
  label: string;
  /** Accessible label for the clear button. */
  clearLabel?: string;
  /** Message displayed when filtering returns no items. */
  emptyLabel?: string;
  /** Override the default case-insensitive label filter. */
  filter?: (item: Readonly<FuiItem>, inputValue: string) => boolean;
  /** Called after the built-in collection filter has run. */
  onInputValueChange?: combobox.Props<FuiItem>["onInputValueChange"];
}

/** Options for markup built entirely by Faisceau UI. */
export type ComboboxOptions = ComboboxMachineOptions & ComboboxViewOptions;

/** Options for enhancing a container that owns one native select. */
export type EnhanceComboboxOptions = ComboboxMachineOptions &
  Omit<ComboboxViewOptions, "items" | "label"> & {
    label?: string;
  };

export type ComboboxApi = combobox.Api;
export type ComboboxController = FuiController<ComboboxApi>;
