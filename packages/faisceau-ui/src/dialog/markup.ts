import { createElement as h } from '@lilian1315/create-element'

export type OverlayVariant = 'dialog' | 'drawer'

export interface OverlayView {
  backdrop: HTMLElement
  body: HTMLElement
  bodyContent: HTMLElement
  close: HTMLButtonElement
  content: HTMLElement
  description: HTMLElement | null
  footer: HTMLElement | null
  header: HTMLElement
  positioner: HTMLElement
  title: HTMLElement
}

export function createOverlayView(options: {
  closeLabel?: string
  content: string
  description?: string
  footer?: string
  title: string
  variant: OverlayVariant
}): OverlayView {
  const title = h('h2', { class: `fui-${options.variant}-title`, children: options.title })
  const description = options.description
    ? h('p', { class: `fui-${options.variant}-description`, children: options.description })
    : null
  const close = h('button', {
    ariaLabel: options.closeLabel ?? 'Fermer',
    class: `fui-${options.variant}-close`,
    type: 'button',
  })
  close.append(h('span', { class: 'fui-icon fui-icon--x', ariaHidden: 'true' }))
  const header = h('div', {
    class: `fui-${options.variant}-header`,
    children: [title, description, close],
  })
  const bodyContent = h('div', {
    class: `fui-${options.variant}-body-content`,
    children: options.content,
  })
  const body = h('div', { class: `fui-${options.variant}-body`, children: bodyContent })
  const footer =
    options.footer === undefined
      ? null
      : h('div', { class: `fui-${options.variant}-footer`, children: options.footer })
  const content = h('div', {
    class: `fui-${options.variant}-content`,
    children: [header, body, footer],
  })
  const positioner = h('div', { class: `fui-${options.variant}-positioner`, children: content })
  const backdrop = h('div', { class: `fui-${options.variant}-backdrop` })
  return {
    backdrop,
    body,
    bodyContent,
    close,
    content,
    description,
    footer,
    header,
    positioner,
    title,
  }
}
