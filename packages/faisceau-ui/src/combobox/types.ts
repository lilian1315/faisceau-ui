import type * as combobox from '@zag-js/combobox'

import type { FuiItem, FuiItemInput } from '../shared/index.js'
import type { FuiController } from '../types.js'

export interface ComboboxProps extends Omit<
  combobox.Props<FuiItem>,
  'allowCustomValue' | 'collection' | 'getRootNode' | 'id' | 'ids' | 'onInputValueChange'
> {
  id?: string
  /** Available options. Strings become `{ value, label }` items. */
  items: readonly FuiItemInput[]
  /** Visible label rendered above the control. */
  label?: string
  /** Supporting text rendered below the control. */
  description?: string
  /** Text displayed in the empty input. @default "Select an option" */
  placeholder?: string
  /** Accessible label for the clear button. */
  clearLabel?: string
  /** Message displayed when filtering returns no items. */
  emptyLabel?: string
  /** Override the default case-insensitive label filter. */
  filter?: (item: Readonly<FuiItem>, inputValue: string) => boolean
  /** Builds the accessible label for a selected item's remove button. */
  getRemoveLabel?: (item: Readonly<FuiItem>) => string
  /** Called after the built-in collection filter has run. */
  onInputValueChange?: combobox.Props<FuiItem>['onInputValueChange']
}

export type EnhanceComboboxProps = Omit<ComboboxProps, 'items'> & {
  /** Replaces the options read from the native select when provided. */
  items?: readonly FuiItemInput[]
}

/** @deprecated Use {@link ComboboxProps} instead. */
export type ComboboxOptions = ComboboxProps
/** @deprecated Use {@link EnhanceComboboxProps} instead. */
export type EnhanceComboboxOptions = EnhanceComboboxProps

export type ComboboxApi = combobox.Api
export interface ComboboxController extends FuiController<ComboboxApi> {
  /** Replaces the authoritative suggestion collection. */
  setItems(items: readonly FuiItemInput[]): void
}
