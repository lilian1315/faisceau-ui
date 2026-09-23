import '../styles/base.scss'
import '../styles/checkbox.scss'
import { h } from '@lilian1315/create-element'
import * as checkbox from '@zag-js/checkbox'
import { createZagMachine } from 'faisceau-zag'
import type { CheckboxController, CheckboxProps } from './types'
import { createId, getLookupRoot } from '../shared'
import { captureAttributes, ensureText, insertAfter } from '../shared/dom'

export function createCheckbox(options?: CheckboxProps): CheckboxController {
  return factory(undefined, options)
}

export function enhanceCheckbox(
  root: HTMLLabelElement,
  options: CheckboxProps,
): CheckboxController {
  return factory(root, options)
}

function factory(root?: HTMLLabelElement, options?: CheckboxProps): CheckboxController {
  if (root && !root.classList.contains('fui-checkbox')) {
    throw new Error('[Faisceau UI] checkbox enhance mode need a root with the `fui-checkbox` class')
  }

  const enhanceMode = !!root
  const restores: (() => void)[] = []

  if (!options) options = {}

  const mOptions: checkbox.Props = {
    id: options.id ?? createId('checkbox'),
    ...options,
  }

  let input: HTMLInputElement
  let indicator = h(
    'span',
    { class: 'fui-checkbox-indicator' },
    h('span', { class: 'fui-icon fui-icon--check', 'aria-hidden': true }),
    h('span', { class: 'fui-icon fui-icon--minus', 'aria-hidden': true }),
  )
  let control = h('span', { class: 'fui-checkbox-control' }, indicator)

  if (root) {
    const _input = root.querySelector<HTMLInputElement>("input[type='checkbox'].fui-checkbox-input")
    if (!_input)
      throw new Error("[Faisceau UI] missing Checkbox `input[type='checkbox'].fui-checkbox-input`")
    input = _input
    if (typeof mOptions.name === 'undefined') mOptions.name = input.name
    if (typeof mOptions.value === 'undefined') mOptions.value = input.value
    if (typeof mOptions.defaultChecked === 'undefined') mOptions.defaultChecked = input.checked
    if (typeof mOptions.form === 'undefined') {
      mOptions.form = input.getAttribute('form') ?? undefined
    }
    if (typeof mOptions.disabled === 'undefined') mOptions.disabled = input.disabled
    if (typeof mOptions.required === 'undefined') mOptions.required = input.required
    if (typeof mOptions.readOnly === 'undefined') mOptions.readOnly = input.readOnly

    ;[root, input].forEach((el) => restores.push(captureAttributes(el)))
  } else {
    root = h('label', { class: 'fui-checkbox' })
    input = h('input', { class: 'fui-checkbox-input' })
    root.append(input)
  }

  insertAfter(root, control, input)
  restores.push(() => control.remove())

  const label = ensureText(
    root,
    { tag: 'span', class: 'fui-field-label' },
    (parent, node) => insertAfter(parent, node, control),
    options.label,
    enhanceMode,
    restores,
  )
  ensureText(
    root,
    { tag: 'p', class: 'fui-field-description' },
    (parent, node) => insertAfter(parent, node, label ?? control),
    options.description,
    enhanceMode,
    restores,
  )

  mOptions.getRootNode = () => getLookupRoot(root)
  const zag = createZagMachine(checkbox.machine, mOptions, checkbox.connect)

  zag.bind(root, (api) => api.getRootProps())
  zag.bind(input, (api) => api.getHiddenInputProps())
  zag.bind(control, (api) => api.getControlProps())
  zag.bind(indicator, (api) => api.getIndicatorProps())
  if (label) zag.bind(label, (api) => api.getLabelProps())

  let started = false
  let destroyed = false

  const controller: CheckboxController = {
    api: zag.api,
    root,
    get started() {
      return started
    },
    mount(target: ParentNode) {
      if (destroyed) return throwDestroyed()
      target.append(root)
      return this.start()
    },
    start() {
      if (destroyed) return throwDestroyed()
      if (!started) {
        zag.start()
        started = true
      }
      return this
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      zag.destroy()

      if (enhanceMode) {
        restores?.forEach((r) => r())
        input.checked = zag.api.get().checked
        return
      }

      root?.remove()
    },
  }

  if (enhanceMode) controller.start()

  return controller
}

function throwDestroyed(): never {
  throw new Error('[Faisceau UI] Cannot start or mount a destroyed Checkbox.')
}
