import type * as select from '@zag-js/select'
import type { FuiItem, FuiItemInput } from '../shared/items.ts'
import type { FuiController } from '../types.ts'

export interface SelectProps extends Omit<
  select.Props<FuiItem>,
  'id' | 'ids' | 'collection' | 'getRootNode'
> {
  id?: string
  items: readonly FuiItemInput[]
  label: string
  description?: string
  placeholder?: string
  clearable?: boolean
}

/** Requires only a root and native select; builds the visible control and popup. */
export type EnhanceSelectProps = Omit<SelectProps, 'items' | 'label'> & { label?: string }
export type SelectApi = select.Api
export type SelectController = FuiController<SelectApi>
