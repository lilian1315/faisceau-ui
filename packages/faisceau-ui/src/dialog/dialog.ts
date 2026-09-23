import '../styles/base.scss'
import '../styles/dialog.scss'
import { createOverlay, enhanceOverlay } from './overlay.ts'
import type { DialogController, DialogOptions, EnhanceDialogOptions } from './types.ts'

export function createDialog(options: DialogOptions): DialogController {
  return createOverlay(options, 'dialog')
}

export function enhanceDialog(
  root: HTMLElement,
  options: EnhanceDialogOptions = {},
): DialogController {
  return enhanceOverlay(root, options, 'dialog')
}
