import type * as collapsible from '@zag-js/collapsible'

import type { FuiController } from '../types.ts'

export type CollapsibleMachineOptions = Omit<collapsible.Props, 'getRootNode' | 'id' | 'ids'>

export interface CollapsibleViewOptions {
  /** Stable machine id. A `fui-*` id is generated when omitted. */
  id?: string
  /** Visible text of the disclosure trigger. */
  trigger: string
  /** Content revealed by the disclosure. */
  content: string
  /** Extra caller-owned class added to the root. */
  className?: string
}

export type CollapsibleOptions = CollapsibleMachineOptions & CollapsibleViewOptions
export type EnhanceCollapsibleOptions = CollapsibleMachineOptions & Partial<CollapsibleViewOptions>

export type CollapsibleApi = collapsible.Api
export type CollapsibleController = FuiController<CollapsibleApi>
