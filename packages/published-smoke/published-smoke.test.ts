import { afterEach, describe, expect, it } from 'vite-plus/test'
import {
  combobox as comboboxModule,
  select as selectModule,
  createCheckbox,
  createCollapsible,
  createSelect,
  createTooltip,
  enhanceCombobox,
} from 'faisceau-ui'
import { createCheckbox as createCheckboxFromSubpath } from 'faisceau-ui/checkbox'
import { createCollapsible as createCollapsibleFromSubpath } from 'faisceau-ui/collapsible'
import {
  collection as comboboxCollection,
  createCombobox as createComboboxFromSubpath,
} from 'faisceau-ui/combobox'
import { createDialog as createDialogFromSubpath } from 'faisceau-ui/dialog'
import { createDrawer as createDrawerFromSubpath } from 'faisceau-ui/drawer'
import {
  createSelect as createSelectFromSubpath,
  collection as selectCollection,
  enhanceSelect as enhanceSelectFromSubpath,
} from 'faisceau-ui/select'
import { createToaster as createToasterFromSubpath } from 'faisceau-ui/toast'
import { createTooltip as createTooltipFromSubpath } from 'faisceau-ui/tooltip'
import { createZagMachine, normalizeProps } from 'faisceau-zag'

const items = [
  { label: 'France', value: 'fr' },
  { label: 'Belgique', value: 'be' },
] as const

afterEach(() => {
  document.body.replaceChildren()
})

describe('published package contract', () => {
  it('groups matching submitted values by default through both public component namespaces', async () => {
    for (const component of [comboboxModule, selectModule]) {
      const form = document.createElement('form')
      document.body.append(form)
      const create =
        'createCombobox' in component ? component.createCombobox : component.createSelect
      const controller = create({
        label: 'Choice',
        name: 'choice',
        multiple: true,
        defaultValue: ['first'],
        items: [
          { id: 'first', value: 'shared', label: 'Same' },
          { id: 'second', value: 'shared', label: 'Same' },
        ],
      }).mount(form)
      try {
        expect(controller.api.get().value).toEqual(['first', 'second'])
        expect(controller.api.get().valueAsString).toBe('Same')
        expect(new FormData(form).getAll('choice')).toEqual(['shared', 'shared'])
        controller.api.get().clearValue('second')
        await flushMachine()
        expect(controller.api.get().value).toEqual([])
      } finally {
        controller.destroy()
      }
    }
  })
  it('ships collection factories and reactive replacement through root namespaces and subpaths', async () => {
    expect(comboboxModule.collection).toBe(comboboxCollection)
    expect(selectModule.collection).toBe(selectCollection)
    for (const component of [comboboxModule, selectModule]) {
      const create =
        'createCombobox' in component ? component.createCombobox : component.createSelect
      const controller = create({
        label: 'Country',
        items: component.collection({ items }),
      }).mount(document.body)
      try {
        controller.setItems(
          component.collection({
            items: [{ id: 'switzerland', value: 'ch', label: 'Switzerland' }],
          }),
        )
        await flushMachine()
        expect(controller.api.get().collection.getValues()).toEqual(['switzerland'])
        expect(controller.root.querySelector('option[value="ch"]')?.textContent).toBe('Switzerland')
        controller.api.get().setValue(['switzerland'])
        await flushMachine()
        expect(
          controller.root.querySelector<HTMLSelectElement>('select')!.selectedOptions[0]?.dataset
            .id,
        ).toBe('switzerland')
        expect(controller.root.querySelector<HTMLSelectElement>('select')!.value).toBe('ch')
        expect(controller.root.querySelector('[role="option"]')?.textContent).toContain(
          'Switzerland',
        )
        expect('setCollection' in controller).toBe(false)
      } finally {
        controller.destroy()
      }
    }
  })
  it('ships Select through root and subpath exports with standalone styling', async () => {
    expect(createSelectFromSubpath).toBe(createSelect)
    expect(typeof enhanceSelectFromSubpath).toBe('function')
    const controller = createSelect({ items, label: 'Country' }).mount(document.body)
    try {
      const trigger = controller.root.querySelector<HTMLButtonElement>('.fui-select-trigger')!
      expect(getComputedStyle(trigger).display).toBe('flex')
      trigger.click()
      await flushMachine()
      controller.root.querySelector<HTMLElement>('.fui-select-item[data-value="be"]')!.click()
      await flushMachine()
      expect(controller.api.get().value).toEqual(['be'])
    } finally {
      controller.destroy()
    }
  })
  it('resolves every public entry and runs a styled Select interaction in Chrome', async () => {
    const combobox = createComboboxFromSubpath({ items, label: 'Pays' })
    expect(combobox.root).toBeInstanceOf(HTMLElement)
    combobox.destroy()
    expect(typeof enhanceCombobox).toBe('function')
    expect(typeof enhanceSelectFromSubpath).toBe('function')
    expect(typeof createCheckboxFromSubpath).toBe('function')
    expect(typeof createCollapsibleFromSubpath).toBe('function')
    expect(typeof createDialogFromSubpath).toBe('function')
    expect(typeof createDrawerFromSubpath).toBe('function')
    expect(typeof createToasterFromSubpath).toBe('function')
    expect(typeof createTooltipFromSubpath).toBe('function')
    expect(createCheckbox({ label: 'Terms' }).root).toBeInstanceOf(HTMLElement)
    expect(createCollapsible({ content: 'Details', trigger: 'Toggle' }).root).toBeInstanceOf(
      HTMLElement,
    )
    expect(createTooltip({ content: 'Help', trigger: 'Info' }).root).toBeInstanceOf(HTMLElement)
    expect(typeof createZagMachine).toBe('function')
    expect(typeof normalizeProps).toBe('object')

    const form = document.createElement('form')
    document.body.append(form)
    const controller = createSelect({
      alignItemWithTrigger: false,
      items,
      label: 'Pays',
      name: 'country',
      placeholder: 'Choisir',
    }).mount(form)
    const trigger = requirePart<HTMLButtonElement>(controller.root, 'trigger')
    const control = requirePart<HTMLElement>(controller.root, 'control')

    expect(getComputedStyle(trigger).display).toBe('flex')
    expect(getComputedStyle(control).borderStyle).toBe('solid')

    trigger.click()
    await flushMachine()
    requireItem(controller.root, 'be').click()
    await flushMachine()

    expect(controller.api.get().value).toEqual(['be'])
    expect(new FormData(form).get('country')).toBe('be')
    controller.destroy()
  })
})

function requirePart<T extends Element>(root: ParentNode, part: string): T {
  const className = `fui-select-${part}`
  const element = root.querySelector<T>(`.${className}`)
  if (!element) throw new Error(`Missing published part: ${part}`)
  return element
}

function requireItem(root: ParentNode, value: string): HTMLElement {
  const item = root.querySelector<HTMLElement>(`.fui-select-item[data-value="${value}"]`)
  if (!item) throw new Error(`Missing published item: ${value}`)
  return item
}

async function flushMachine(): Promise<void> {
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}
