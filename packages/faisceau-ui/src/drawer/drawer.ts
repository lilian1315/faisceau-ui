import '../styles/base.scss'
import '../styles/drawer.scss'
import { h } from '@lilian1315/create-element'
import { createZagMachine } from 'faisceau-zag'
import * as drawer from '@zag-js/drawer'
import {
  addFuiClasses,
  bindScrollShadows,
  captureAttributes,
  createId,
  createTriggerBinding,
  getLookupRoot,
  requireFuiClass,
} from '../shared/index.js'
import { captureChildNodes } from '../shared/dom.ts'
import type { DrawerController, DrawerOptions, EnhanceDrawerOptions } from './types.ts'

interface DrawerView {
  backdrop: HTMLElement
  body: HTMLElement
  bodyContent: HTMLElement
  close: HTMLButtonElement
  content: HTMLElement
  description: HTMLElement | null
  footer: HTMLElement | null
  grabber: HTMLElement
  grabberIndicator: HTMLElement
  header: HTMLElement
  positioner: HTMLElement
  swipeArea: HTMLElement | null
  title: HTMLElement
}

interface DrawerSetupOptions extends EnhanceDrawerOptions {
  className?: string
  closeLabel?: string
  description?: string
  footer?: string
  id?: string
  title?: string
  triggerSelector?: string
}

/** Builds a gesture-aware Zag drawer. Call `.mount(target)` to start it. */
export function createDrawer(options: DrawerOptions): DrawerController {
  return factory(undefined, options)
}

/** Enhances an existing content part and generates the drawer structure around it. */
export function enhanceDrawer(
  root: HTMLElement,
  options: EnhanceDrawerOptions = {},
): DrawerController {
  return factory(root, options)
}

function factory(
  root: HTMLElement | undefined,
  options: DrawerOptions | EnhanceDrawerOptions,
): DrawerController {
  if (root && !root.classList.contains('fui-drawer')) {
    throw new Error('[Faisceau UI] Drawer enhance mode need a root with the `fui-drawer` class')
  }

  const enhanceMode = !!root
  const restores: Array<() => void> = []
  const generated: HTMLElement[] = []
  options ??= {}

  let content: HTMLElement
  let header: HTMLElement
  let body: HTMLElement
  let bodyContent: HTMLElement
  let footer: HTMLElement | null
  let title: HTMLElement
  let description: HTMLElement | null
  let close: HTMLButtonElement
  let backdrop: HTMLElement
  let positioner: HTMLElement
  let grabber: HTMLElement
  let grabberIndicator: HTMLElement
  let swipeArea: HTMLElement | null = null
  let marker: Comment | null = null

  const wantsSwipeArea = normalizeSwipeArea(options.swipeArea) !== null

  if (root) {
    content = requireFuiClass<HTMLElement>(root, 'fui-drawer-content')
    restores.push(captureAttributes(root), captureAttributes(content))
    const adoptedHeader = root.querySelector<HTMLElement>('.fui-drawer-header')
    if (adoptedHeader) {
      header = adoptedHeader
      restores.push(captureAttributes(header), captureChildNodes(header))
    } else {
      header = h('div', { class: 'fui-drawer-header' })
      generated.push(header)
    }
    // Snapshot content children before adopted parts move into the header so
    // destroy() can put caller-owned nodes back in their original order.
    restores.push(captureChildNodes(content))
    const adoptedTitle = root.querySelector<HTMLElement>('.fui-drawer-title')
    if (adoptedTitle) {
      title = adoptedTitle
      restores.push(captureAttributes(title))
      if (options.title !== undefined) {
        restores.push(captureChildNodes(title))
        title.replaceChildren(new Text(options.title))
      }
      if (title.parentElement !== header) header.prepend(title)
    } else {
      title = h('h2', { class: 'fui-drawer-title' }, options.title ?? '')
      header.prepend(title)
      generated.push(title)
    }
    if (!title.textContent?.trim()) {
      throw new Error('[Faisceau UI] Drawer enhancement requires a title part or options.title.')
    }
    const adoptedDescription = root.querySelector<HTMLElement>('.fui-drawer-description')
    if (adoptedDescription) {
      description = adoptedDescription
      restores.push(captureAttributes(description))
      if (options.description !== undefined) {
        restores.push(captureChildNodes(description))
        description.replaceChildren(new Text(options.description))
      }
      if (description.parentElement !== header) title.after(description)
    } else if (options.description !== undefined) {
      description = h('p', { class: 'fui-drawer-description' }, options.description)
      title.after(description)
      generated.push(description)
    } else {
      description = null
    }
    const adoptedClose = root.querySelector<HTMLButtonElement>('.fui-drawer-close')
    if (adoptedClose) {
      close = adoptedClose
      restores.push(captureAttributes(close))
      if (close.parentElement !== header) header.append(close)
    } else {
      close = createClose(options.closeLabel)
      header.append(close)
      generated.push(close)
    }
    grabberIndicator = h('div', { class: 'fui-drawer-grabber-indicator' })
    grabber = h('div', { class: 'fui-drawer-grabber' }, grabberIndicator)
    content.prepend(grabber)
    generated.push(grabber)
    if (!adoptedHeader) grabber.after(header)
    const adoptedBody = root.querySelector<HTMLElement>('.fui-drawer-body')
    if (adoptedBody) {
      body = adoptedBody
      restores.push(captureAttributes(body), captureChildNodes(body))
    } else {
      body = h('div', { class: 'fui-drawer-body' })
      generated.push(body)
    }
    // Only the body scrolls: gather every leftover content node into it.
    for (const node of Array.from(content.childNodes)) {
      if (node !== header && node !== grabber && node !== body) body.append(node)
    }
    if (!adoptedBody) {
      if (header.parentElement === content) header.after(body)
      else content.append(body)
    }
    const adoptedBodyContent = body.querySelector<HTMLElement>('.fui-drawer-body-content')
    if (adoptedBodyContent) {
      bodyContent = adoptedBodyContent
      restores.push(captureAttributes(bodyContent))
    } else {
      bodyContent = h('div', { class: 'fui-drawer-body-content' })
      generated.push(bodyContent)
      for (const node of Array.from(body.childNodes)) bodyContent.append(node)
      body.append(bodyContent)
    }
    const adoptedFooter = root.querySelector<HTMLElement>('.fui-drawer-footer')
    if (adoptedFooter) {
      footer = adoptedFooter
      restores.push(captureAttributes(footer))
      if (options.footer !== undefined) {
        restores.push(captureChildNodes(footer))
        footer.replaceChildren(new Text(options.footer))
      }
      if (footer.parentElement !== content) body.after(footer)
    } else if (options.footer !== undefined) {
      footer = h('div', { class: 'fui-drawer-footer' }, options.footer)
      body.after(footer)
      generated.push(footer)
    } else {
      footer = null
    }
    backdrop = h('div', { class: 'fui-drawer-backdrop' })
    positioner = h('div', { class: 'fui-drawer-positioner' })
    generated.push(backdrop, positioner)
    if (wantsSwipeArea) {
      swipeArea = h('div', { class: 'fui-drawer-swipe-area' })
      generated.push(swipeArea)
    }
    marker = root.ownerDocument.createComment('fui-drawer-content')
    content.before(marker)
    positioner.append(content)
    root.append(backdrop, positioner)
    if (swipeArea) root.append(swipeArea)
  } else {
    if (options.title === undefined)
      throw new Error('[Faisceau UI] Drawer creation requires options.title.')
    if ((options as DrawerOptions).content === undefined)
      throw new Error('[Faisceau UI] Drawer creation requires options.content.')
    const created = options as DrawerOptions
    root = h('div') as HTMLElement
    title = h('h2', { class: 'fui-drawer-title' }, created.title)
    description = created.description
      ? h('p', { class: 'fui-drawer-description' }, created.description)
      : null
    close = createClose(created.closeLabel)
    grabberIndicator = h('div', { class: 'fui-drawer-grabber-indicator' })
    grabber = h('div', { class: 'fui-drawer-grabber' }, grabberIndicator)
    bodyContent = h('div', { class: 'fui-drawer-body-content' }, created.content)
    body = h('div', { class: 'fui-drawer-body' }, bodyContent)
    footer =
      created.footer === undefined ? null : h('div', { class: 'fui-drawer-footer' }, created.footer)
    header = h('div', { class: 'fui-drawer-header' }, title, description, close)
    content = h('div', { class: 'fui-drawer-content' }, grabber, header, body, footer)
    positioner = h('div', { class: 'fui-drawer-positioner' }, content)
    backdrop = h('div', { class: 'fui-drawer-backdrop' })
    if (wantsSwipeArea) swipeArea = h('div', { class: 'fui-drawer-swipe-area' })
    root.append(backdrop, positioner)
    if (swipeArea) root.append(swipeArea)
  }

  return setupDrawer(
    root,
    {
      backdrop,
      body,
      bodyContent,
      close,
      content,
      description,
      footer,
      grabber,
      grabberIndicator,
      header,
      positioner,
      swipeArea,
      title,
    },
    options as DrawerSetupOptions,
    { enhanceMode, generated, marker, restores },
  )
}

function setupDrawer(
  root: HTMLElement,
  view: DrawerView,
  options: DrawerSetupOptions,
  setup: {
    enhanceMode: boolean
    generated: HTMLElement[]
    marker: Comment | null
    restores: Array<() => void>
  },
): DrawerController {
  const {
    className,
    closeLabel: _closeLabel,
    contentDraggable,
    description: _description,
    footer: _footer,
    id: requestedId,
    swipeArea: swipeAreaOption,
    title: _title,
    triggerSelector: initialSelector,
    ...behavior
  } = options
  const id = requestedId ?? createId('drawer')
  addFuiClasses(root, 'fui-drawer')
  for (const [element, part] of [
    [view.backdrop, 'backdrop'],
    [view.positioner, 'positioner'],
    [view.content, 'content'],
    [view.header, 'header'],
    [view.title, 'title'],
    [view.description, 'description'],
    [view.body, 'body'],
    [view.bodyContent, 'body-content'],
    [view.footer, 'footer'],
    [view.close, 'close'],
    [view.grabber, 'grabber'],
    [view.grabberIndicator, 'grabber-indicator'],
    [view.swipeArea, 'swipe-area'],
  ] as const) {
    if (element) addFuiClasses(element, `fui-drawer-${part}`)
  }
  if (className) root.classList.add(...className.split(/\s+/).filter(Boolean))
  root.dataset.fuiComponent = 'drawer'
  const zag = createZagMachine(
    drawer.machine,
    {
      ...behavior,
      getRootNode: () => getLookupRoot(root),
      id,
      swipeDirection: behavior.swipeDirection,
    },
    (service, normalize) => drawer.connect(service, normalize),
  )
  zag.bind(root, (api) => ({ 'data-side': api.getContentState().swipeDirection }))
  zag.bind(view.backdrop, (api) => api.getBackdropProps())
  zag.bind(view.positioner, (api) => api.getPositionerProps())
  zag.bind(view.content, (api) => api.getContentProps({ draggable: contentDraggable ?? true }))
  zag.bind(view.title, (api) => api.getTitleProps())
  if (view.description) zag.bind(view.description, (api) => api.getDescriptionProps())
  zag.bind(view.close, (api) => api.getCloseTriggerProps())
  zag.bind(view.grabber, (api) => api.getGrabberProps())
  zag.bind(view.grabberIndicator, (api) => api.getGrabberIndicatorProps())
  if (view.swipeArea) {
    const swipeAreaProps = normalizeSwipeArea(swipeAreaOption) ?? {}
    zag.bind(view.swipeArea, (api) => api.getSwipeAreaProps({ ...swipeAreaProps }))
  }

  const triggers = createTriggerBinding(zag, {
    component: 'Drawer',
    getScope: () => getLookupRoot(root),
    getTriggerProps: (api, triggerValue) => api.getTriggerProps({ value: triggerValue }),
  })
  triggers.setSelector(initialSelector)
  const unbindScrollShadows = bindScrollShadows(view.body)

  let started = false
  let destroyed = false
  const controller: DrawerController = {
    api: zag.api,
    root,
    get started() {
      return started
    },
    mount(target) {
      if (destroyed) throwDestroyed()
      target.append(root)
      return this.start()
    },
    start() {
      if (destroyed) throwDestroyed()
      if (!started) {
        zag.start()
        triggers.refresh()
        started = true
      }
      return this
    },
    setTriggerSelector(selector) {
      if (destroyed) throwDestroyed()
      triggers.setSelector(selector)
    },
    refreshTriggers() {
      if (destroyed) throwDestroyed()
      triggers.refresh()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      unbindScrollShadows()
      triggers.destroy()
      zag.destroy()
      if (setup.enhanceMode) {
        for (const node of setup.generated) node.remove()
        setup.marker?.replaceWith(view.content)
        for (const restore of setup.restores) restore()
      } else {
        root.remove()
      }
    },
  }
  if (setup.enhanceMode) controller.start()
  return controller
}

function normalizeSwipeArea(
  swipeArea: boolean | drawer.SwipeAreaProps | undefined,
): drawer.SwipeAreaProps | null {
  if (!swipeArea) return null
  return swipeArea === true ? {} : { ...swipeArea }
}

function createClose(label = 'Fermer'): HTMLButtonElement {
  const close = h('button', {
    ariaLabel: label,
    class: 'fui-drawer-close',
    type: 'button',
  })
  close.append(h('span', { class: 'fui-icon fui-icon--x', 'aria-hidden': true }))
  return close
}

function throwDestroyed(): never {
  throw new Error('[Faisceau UI] Cannot start or mount a destroyed Drawer.')
}
