import type * as tooltip from '@zag-js/tooltip'

import type { FuiController } from '../types.js'

type TooltipMachineOptions = Omit<tooltip.Props, 'getRootNode' | 'id' | 'ids'>

interface TooltipViewOptions {
  /** Text displayed inside the tooltip. */
  content: string
  /** Extra caller-owned class added to the trigger. */
  className?: string
  /** Stable machine id. A `fui-*` id is generated when omitted. */
  id?: string
}

/** Options for a tooltip and trigger built entirely by Faisceau UI. */
export type TooltipOptions = TooltipMachineOptions &
  TooltipViewOptions & {
    /** Visible text of the generated button trigger. */
    trigger: string
  }

/** Options for enhancing an existing trigger. Content falls back to its title attribute. */
export type EnhanceTooltipOptions = TooltipMachineOptions & Partial<TooltipViewOptions>

export type TooltipApi = tooltip.Api
export type TooltipController = FuiController<TooltipApi>
