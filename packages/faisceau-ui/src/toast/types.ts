import type * as toast from '@zag-js/toast'

export type ToastOptions = toast.Options<string>
export type ToastPlacement = toast.Placement
export type ToastStore = toast.Store<string>

export interface ToasterOptions extends toast.StoreProps {
  id?: string
  label?: string
  className?: string
}

export interface ToasterController {
  readonly root: HTMLElement
  readonly store: ToastStore
  readonly started: boolean
  create(options: ToastOptions): string
  dismiss(id?: string): void
  mount(target: ParentNode): this
  start(): this
  destroy(): void
}
