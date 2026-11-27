import type * as select from '@zag-js/select'
import type { FuiItem } from '../shared/items.ts'
import type { FuiController } from '../types.ts'
import type { FuiItems } from '../shared/collection.ts'

export interface SelectProps extends Omit<
  select.Props<FuiItem>,
  'id' | 'ids' | 'collection' | 'getRootNode'
> {
  id?: string
  /** Item array or Zag collection. Arrays are converted automatically. */
  items: FuiItems
  /** Select enabled items sharing the submitted value together. @default true */
  selectSameValue?: boolean
  label: string
  description?: string
  placeholder?: string
  clearable?: boolean
}

/** Requires only a root and native select; builds the visible control and popup. */
export type EnhanceSelectProps = Omit<SelectProps, 'items' | 'label'> & {
  label?: string
  items?: FuiItems
}
export type SelectApi = select.Api
export interface SelectController extends FuiController<SelectApi> {
  /** Replaces the source with an item array or collection for Zag, the popup and the native select. */
  setItems(items: FuiItems): void
}
