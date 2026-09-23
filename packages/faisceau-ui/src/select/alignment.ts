import type * as select from '@zag-js/select'

interface AlignmentElements {
  trigger: HTMLElement
  valueText: HTMLElement
  content: HTMLElement
  list: HTMLElement
}

export function createAlignedPositioning(
  elements: AlignmentElements,
  positioning: select.PositioningOptions = {},
  onAligned: (aligned: boolean) => void = () => {},
): select.PositioningOptions {
  const update = positioning.updatePosition
  return {
    ...positioning,
    strategy: 'fixed',
    flip: false,
    gutter: 0,
    overlap: true,
    async updatePosition(data) {
      if (update) await update(data)
      else await data.updatePosition()
      onAligned(
        data.floatingElement
          ? alignSelectedItem(data.floatingElement, elements, positioning)
          : false,
      )
    },
  }
}

function alignSelectedItem(
  positioner: HTMLElement,
  { trigger, valueText, content, list }: AlignmentElements,
  positioning: select.PositioningOptions,
): boolean {
  const selectedText = list.querySelector<HTMLElement>(
    '.fui-select-item[data-state="checked"] .fui-select-item-text',
  )
  if (!selectedText) return false

  const positionerRect = positioner.getBoundingClientRect()
  const contentRect = content.getBoundingClientRect()
  const listRect = list.getBoundingClientRect()
  const selectedRect = selectedText.getBoundingClientRect()
  const valueRect = valueText.getBoundingClientRect()
  const padding = positioning.overflowPadding ?? 8
  const viewport = trigger.ownerDocument.documentElement

  const itemCenter = selectedRect.top - listRect.top + list.scrollTop + selectedRect.height / 2
  const listOffset = listRect.top - positionerRect.top
  const targetY = valueRect.top + valueRect.height / 2
  const maxScroll = Math.max(0, list.scrollHeight - list.clientHeight)
  const firstAlignedY = targetY - listOffset - itemCenter
  const minY = Math.max(padding, firstAlignedY)
  const maxY = Math.min(
    viewport.clientHeight - padding - positionerRect.height,
    firstAlignedY + maxScroll,
  )
  if (minY > maxY) return false

  const centeredScroll = clamp(itemCenter - list.clientHeight / 2, 0, maxScroll)
  const centeredY = targetY - listOffset - itemCenter + centeredScroll
  const y = clamp(centeredY, minY, maxY)
  const scrollTop = y - firstAlignedY

  list.scrollTop = scrollTop
  positioner.style.setProperty('--y', `${y}px`)

  const localX = selectedRect.left - positionerRect.left
  const minX = padding
  const maxX = Math.max(minX, viewport.clientWidth - padding - contentRect.width)
  positioner.style.setProperty('--x', `${clamp(valueRect.left - localX, minX, maxX)}px`)
  return true
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
