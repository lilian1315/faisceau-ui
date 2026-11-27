import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import * as combobox from '../combobox/index.ts'
import * as select from '../select/index.ts'
import { collection as zagCollection } from '@zag-js/combobox'
import type { FuiItem } from './items.ts'

const controllers: { destroy(): void }[] = []
afterEach(() => {
  vi.restoreAllMocks()
  controllers.splice(0).forEach((controller) => controller.destroy())
  document.body.replaceChildren()
})

for (const [name, component, create, enhance] of [
  ['combobox', combobox, combobox.createCombobox, combobox.enhanceCombobox],
  ['select', select, select.createSelect, select.enhanceSelect],
] as const) {
  describe(`${name} reactive collections`, () => {
    const initial = () =>
      component.collection({
        items: [
          { value: 'fr', label: 'France', group: 'Europe' },
          { value: 'be', label: 'Belgium', group: 'Europe' },
        ],
      })

    it('preserves unchanged row contents while reconciling new items', () => {
      const source = initial()
      const controller = create({ label: 'Country', items: source }).mount(document.body)
      controllers.push(controller)
      const row = controller.root.querySelector<HTMLElement>(`.fui-${name}-item[data-value="fr"]`)!
      const text = row.querySelector(`.fui-${name}-item-text`)!.firstChild
      controller.setItems(source.append({ value: 'ch', label: 'Switzerland' }))
      expect(controller.root.querySelector(`.fui-${name}-item[data-value="fr"]`)).toBe(row)
      expect(row.querySelector(`.fui-${name}-item-text`)!.firstChild).toBe(text)
    })

    it('renders custom collection groups in Zag navigation order', () => {
      const source = component.collection({
        items: [
          { value: 'jp', label: 'Japan' },
          { value: 'fr', label: 'France' },
          { value: 'be', label: 'Belgium' },
        ],
        groupBy: (item) => (item.value === 'jp' ? 'Asia' : 'Europe'),
        groupSort: ['Europe', 'Asia'],
      })
      const controller = create({ label: 'Country', items: source }).mount(document.body)
      controllers.push(controller)
      expect(
        Array.from(
          controller.root.querySelectorAll<HTMLElement>(`.fui-${name}-item`),
          (row) => row.dataset.value,
        ),
      ).toEqual(['fr', 'be', 'jp'])
      expect(
        Array.from(controller.root.querySelectorAll('optgroup'), (group) => group.label),
      ).toEqual(['Europe', 'Asia'])
      expect(controller.api.get().collection.firstValue).toBe('fr')
      expect(controller.api.get().collection.getNextValue('fr')).toBe('be')
    })

    it('ignores duplicate mapped values in external collections without mutating the source', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const source = zagCollection<FuiItem>({
        items: [
          { value: 'FR', label: 'France' },
          { value: 'fr', label: 'Ignored France', disabled: true },
          { value: 'be', label: 'Belgium' },
        ],
        itemToValue: (item) => item.value.toLowerCase(),
        itemToString: (item) => `${item.label}!`,
      })
      const form = document.createElement('form')
      document.body.append(form)
      const controller = create({
        label: 'Country',
        items: source,
        multiple: true,
        name: 'country',
        defaultValue: ['fr', 'be'],
      }).mount(form)
      controllers.push(controller)
      expect(controller.api.get().collection.getValues()).toEqual(['fr', 'be'])
      expect(controller.api.get().collection.items[0]).toBe(source.items[0])
      expect(source.items).toHaveLength(3)
      expect(form.querySelectorAll(`.fui-${name}-item`)).toHaveLength(2)
      expect(form.querySelector('option[value="fr"]')?.textContent).toBe('France!')
      expect(new FormData(form).getAll('country')).toEqual(['fr', 'be'])
      expect(warn).toHaveBeenCalledOnce()
      controller.setItems(source.append({ value: 'Be', label: 'Ignored Belgium' }))
      await vi.waitFor(() => expect(controller.api.get().collection.items).toHaveLength(2))
      expect(warn).toHaveBeenCalledTimes(3)
      expect(new FormData(form).getAll('country')).toEqual(['fr', 'be'])
    })

    it('warns and ignores duplicate native options during enhancement, then restores them', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const root = document.createElement('div')
      root.className = `fui-${name}`
      root.innerHTML = `<select class="fui-${name}-native-select" multiple><option value="fr" selected>France</option><option value="fr" selected>Ignored</option><option value="be">Belgium</option></select>`
      const before = root.outerHTML
      const first = root.querySelector('option')!
      document.body.append(root)
      const controller = enhance(root)
      controllers.push(controller)
      expect(controller.api.get().collection.getValues()).toEqual(['fr', 'be'])
      expect(controller.api.get().value).toEqual(['fr'])
      expect(root.querySelectorAll('option')).toHaveLength(2)
      expect(root.querySelector('option')).toBe(first)
      expect(warn).toHaveBeenCalledOnce()
      controller.destroy()
      expect(root.outerHTML).toBe(before)
    })

    it('reads existing native options when enhancement receives no items or options', () => {
      const root = document.createElement('div')
      root.className = `fui-${name}`
      root.innerHTML = `<select class="fui-${name}-native-select"><option value="fr" selected>France</option></select>`
      document.body.append(root)
      const controller = enhance(root)
      controllers.push(controller)
      expect(controller.api.get().collection.getValues()).toEqual(['fr'])
      expect(controller.api.get().value).toEqual(['fr'])
    })

    it('accepts arrays and collections through the same items prop and setter', async () => {
      const controller = create({ label: 'Country', items: ['One'] }).mount(document.body)
      controllers.push(controller)
      const mapped = component.collection({
        items: [{ value: 'two', label: 'Two' }],
        itemToString: (item) => item.label.toUpperCase(),
      })
      controller.setItems(mapped)
      await vi.waitFor(() => expect(controller.api.get().collection).toBe(mapped))
      expect(controller.root.querySelector(`.fui-${name}-item`)?.textContent).toContain('TWO')
      controller.setItems(['Three', { value: 'four', label: 'Four' }])
      await vi.waitFor(() =>
        expect(controller.api.get().collection.getValues()).toEqual(['Three', 'four']),
      )
      expect(
        Array.from(controller.root.querySelector('select')!.options, (option) => option.value),
      ).toEqual(['', 'Three', 'four'])
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      controller.setItems([
        { value: 'dup', label: 'One' },
        { value: 'dup', label: 'Two' },
      ])
      await vi.waitFor(() => expect(controller.api.get().collection.getValues()).toEqual(['dup']))
      expect(controller.root.querySelector(`.fui-${name}-item`)?.textContent).toContain('One')
      expect(warn).toHaveBeenCalledOnce()
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Ignoring item at index 1'))
    })

    it.each(['array', 'collection'])(
      'accepts %s items on enhancement and restores native markup',
      async (mode) => {
        const root = document.createElement('div')
        root.className = `fui-${name}`
        root.innerHTML = `<select class="fui-${name}-native-select"><option value="fr" selected>France</option></select>`
        const before = root.outerHTML
        document.body.append(root)
        const entries = [
          { value: 'fr', label: 'French Republic' },
          { value: 'be', label: 'Belgium' },
        ]
        const controller = enhance(root, {
          label: 'Country',
          items: mode === 'array' ? entries : component.collection({ items: entries }),
        })
        controllers.push(controller)
        await vi.waitFor(() =>
          expect(controller.api.get().collection.getValues()).toEqual(['fr', 'be']),
        )
        expect(root.querySelector('option[value="fr"]')?.textContent).toBe('French Republic')
        controller.destroy()
        expect(root.outerHTML).toBe(before)
      },
    )

    it('replaces collections before mount and keeps the latest collection on start', async () => {
      const controller = create({ label: 'Country', items: initial() })
      controllers.push(controller)
      controller.setItems(component.collection({ items: [{ value: 'ch', label: 'Switzerland' }] }))
      expect(controller.started).toBe(false)
      expect(controller.root.querySelector(`.fui-${name}-item`)?.textContent).toContain(
        'Switzerland',
      )
      controller.mount(document.body)
      await vi.waitFor(() => expect(controller.api.get().collection.getValues()).toEqual(['ch']))
      controller.api.get().setValue(['ch'])
      await vi.waitFor(() => expect(controller.root.querySelector('select')!.value).toBe('ch'))
      controller.destroy()
      expect(controller.started).toBe(false)
      expect(() => controller.setItems(initial())).toThrow('destroyed')
    })

    it('updates labels, descriptions, groups and disabled state while retaining row and option identity', async () => {
      const form = document.createElement('form')
      document.body.append(form)
      const onValueChange = vi.fn()
      const controller = create({
        label: 'Country',
        name: 'country',
        items: initial(),
        defaultValue: ['be'],
        onValueChange,
      }).mount(form)
      controllers.push(controller)
      const row = controller.root.querySelector<HTMLElement>(`.fui-${name}-item[data-value="be"]`)!
      const option = controller.root.querySelector('option[value="be"]')!
      controller.setItems(
        component.collection({
          items: [
            { value: 'ch', label: 'Switzerland', disabled: true },
            {
              value: 'be',
              label: 'Belgique',
              description: 'Updated',
              group: 'Benelux',
            },
          ],
        }),
      )
      await vi.waitFor(() => expect(row.textContent).toContain('Belgique'))
      expect(controller.root.querySelector(`.fui-${name}-item[data-value="be"]`)).toBe(row)
      expect(controller.root.querySelector('option[value="be"]')).toBe(option)
      expect(row.textContent).toContain('Updated')
      expect(
        controller.root
          .querySelector(`.fui-${name}-item[data-value="ch"]`)
          ?.hasAttribute('data-disabled'),
      ).toBe(true)
      expect(option.closest('optgroup')?.label).toBe('Benelux')
      expect(new FormData(form).get('country')).toBe('be')
      expect(controller.api.get().value).toEqual(['be'])
      expect(onValueChange).not.toHaveBeenCalled()
      controller.api.get().setValue([])
      await vi.waitFor(() => expect(controller.api.get().value).toEqual([]))
      controller.root.querySelector<HTMLButtonElement>(`.fui-${name}-trigger`)!.click()
      await vi.waitFor(() => expect(controller.api.get().open).toBe(true))
      row.click()
      await vi.waitFor(() => expect(new FormData(form).get('country')).toBe('be'))
    })

    it('prunes removed selections and keeps required validation and reset working', async () => {
      const form = document.createElement('form')
      document.body.append(form)
      const controller = create({
        label: 'Country',
        items: initial(),
        defaultValue: ['fr', 'be'],
        multiple: true,
        required: true,
        name: 'countries',
      }).mount(form)
      controllers.push(controller)
      controller.setItems(component.collection({ items: [{ value: 'be', label: 'Belgique' }] }))
      await vi.waitFor(() => expect(controller.api.get().value).toEqual(['be']))
      expect(new FormData(form).getAll('countries')).toEqual(['be'])
      controller.api.get().setValue([])
      await vi.waitFor(() =>
        expect(controller.root.querySelector('select')!.validity.valueMissing).toBe(true),
      )
      form.reset()
      await vi.waitFor(() => expect(controller.api.get().value).toEqual(['be']))
      expect(new FormData(form).getAll('countries')).toEqual(['be'])
      controller.setItems(component.collection({ items: [] }))
      await vi.waitFor(() => expect(controller.api.get().value).toEqual([]))
      expect(new FormData(form).getAll('countries')).toEqual([])
    })

    it('shares native event ordering without echoing external changes after collection replacement', async () => {
      const controller = create({ label: 'Country', items: initial() }).mount(document.body)
      controllers.push(controller)
      controller.setItems(initial().append({ value: 'ch', label: 'Switzerland' }))
      const native = controller.root.querySelector('select')!
      const events: string[] = []
      native.addEventListener('input', () => events.push('input'))
      native.addEventListener('change', () => events.push('change'))
      controller.root.querySelector<HTMLButtonElement>(`.fui-${name}-trigger`)!.click()
      await vi.waitFor(() => expect(controller.api.get().open).toBe(true))
      controller.root.querySelector<HTMLElement>(`.fui-${name}-item[data-value="be"]`)!.click()
      await vi.waitFor(() => expect(events).toEqual(['input', 'change']))
      events.length = 0
      native.value = 'fr'
      native.dispatchEvent(new Event('input', { bubbles: true }))
      native.dispatchEvent(new Event('change', { bubbles: true }))
      await vi.waitFor(() => expect(controller.api.get().value).toEqual(['fr']))
      // Flush deferred machine notifications before checking for an event echo.
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(events).toEqual(['input', 'change'])
      events.length = 0
      controller.setItems(component.collection({ items: [] }))
      await vi.waitFor(() => expect(controller.api.get().value).toEqual([]))
      await vi.waitFor(() => expect(events).toEqual(['input', 'change']))
    })

    it('returns to the initial collection and cancels queued reset work on destroy', async () => {
      const form = document.createElement('form')
      document.body.append(form)
      const source = initial()
      const onValueChange = vi.fn()
      const controller = create({
        label: 'Country',
        items: source,
        defaultValue: ['fr'],
        onValueChange,
      }).mount(form)
      controllers.push(controller)
      controller.setItems(source.remove('be'))
      controller.setItems(source)
      await vi.waitFor(() =>
        expect(controller.api.get().collection.getValues()).toEqual(['fr', 'be']),
      )
      expect(form.querySelector('option[value="be"]')).not.toBeNull()
      controller.api.get().setValue(['be'])
      await vi.waitFor(() => expect(controller.api.get().value).toEqual(['be']))
      form.addEventListener('reset', (event) => event.preventDefault(), {
        capture: true,
        once: true,
      })
      form.reset()
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(controller.api.get().value).toEqual(['be'])
      form.reset()
      controller.destroy()
      onValueChange.mockClear()
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(onValueChange).not.toHaveBeenCalled()
    })

    it('restores original enhanced option nodes, groups, text and attributes after updates', async () => {
      const root = document.createElement('div')
      root.className = `fui-${name}`
      root.innerHTML = `<select class="fui-${name}-native-select" name="country"><option value="" data-placeholder hidden>Choose</option><optgroup label="Europe"><option value="fr" selected>France</option><option value="be">Belgium</option></optgroup></select>`
      const before = root.outerHTML
      const option = root.querySelector('option[value="fr"]')!
      const group = root.querySelector('optgroup')!
      document.body.append(root)
      const controller = enhance(root, { label: 'Country' })
      controllers.push(controller)
      controller.setItems(
        component.collection({
          items: [
            { value: 'fr', label: 'French', group: 'New group', disabled: true },
            { value: 'ch', label: 'Switzerland' },
          ],
        }),
      )
      await vi.waitFor(() => expect(option.textContent).toBe('French'))
      controller.destroy()
      expect(root.outerHTML).toBe(before)
      expect(root.querySelector('option[value="fr"]')).toBe(option)
      expect(root.querySelector('optgroup')).toBe(group)
    })

    it('uses collection mappings consistently in Zag, the DOM and native submission', async () => {
      const form = document.createElement('form')
      document.body.append(form)
      const controller = create({
        label: 'Country',
        name: 'country',
        defaultValue: ['fr-id'],
        items: component.collection({
          items: [{ value: 'fr', label: 'France' }],
          itemToValue: (item) => `${item.value}-id`,
          itemToString: (item) => `Country ${item.label.toUpperCase()}`,
        }),
      }).mount(form)
      controllers.push(controller)
      expect(
        controller.root.querySelector(`.fui-${name}-item[data-value="fr-id"]`)?.textContent,
      ).toContain('FRANCE')
      expect(new FormData(form).get('country')).toBe('fr-id')
      if (name === 'combobox') {
        const search = controller as combobox.ComboboxController
        search.api.get().setInputValue('Country')
        await vi.waitFor(() => expect(search.api.get().collection.getValues()).toEqual(['fr-id']))
        search.api.get().setInputValue('')
      }
      controller.setItems(component.collection({ items: [{ value: 'be', label: 'Belgium' }] }))
      await vi.waitFor(() => expect(controller.api.get().value).toEqual([]))
      controller.api.get().setValue(['be'])
      await vi.waitFor(() => expect(new FormData(form).get('country')).toBe('be'))
    })
  })
}

it('filters derived results without dropping selected native options or tag labels', async () => {
  const form = document.createElement('form')
  document.body.append(form)
  const controller = combobox
    .createCombobox({
      label: 'Country',
      name: 'country',
      multiple: true,
      defaultValue: ['be', 'fr'],
      items: combobox.collection({
        items: [
          { value: 'fr', label: 'France' },
          { value: 'be', label: 'Belgium' },
        ],
      }),
    })
    .mount(form)
  controllers.push(controller)
  controller.api.get().setInputValue('Bel')
  await vi.waitFor(() => expect(controller.api.get().collection.getValues()).toEqual(['be']))
  controller.setItems(
    combobox.collection({
      items: [
        { value: 'fr', label: 'French Republic' },
        { value: 'be', label: 'Belgique' },
        { value: 'by', label: 'Belarus' },
      ],
    }),
  )
  await vi.waitFor(() => expect(controller.api.get().collection.getValues()).toEqual(['be', 'by']))
  expect(
    Array.from(form.querySelectorAll('.fui-combobox-tag-label'), (tag) => tag.textContent),
  ).toEqual(['Belgique', 'French Republic'])
  expect(Array.from(form.querySelector('select')!.options, (option) => option.value)).toEqual([
    'fr',
    'be',
    'by',
  ])
  expect(new FormData(form).getAll('country')).toEqual(['fr', 'be'])
  controller.api.get().setInputValue('')
  await vi.waitFor(() => expect(controller.api.get().collection.size).toBe(3))
})

it('preserves a Combobox empty multiple value separately from no selection', async () => {
  const form = document.createElement('form')
  document.body.append(form)
  const controller = combobox
    .createCombobox({
      label: 'Values',
      name: 'values',
      multiple: true,
      items: [
        { value: '', label: 'Empty value' },
        { value: 'other', label: 'Other' },
      ],
      defaultValue: [''],
    })
    .mount(form)
  controllers.push(controller)
  expect(new FormData(form).getAll('values')).toEqual([''])
  controller.api.get().setValue([])
  await vi.waitFor(() => expect(new FormData(form).getAll('values')).toEqual([]))
  const native = form.querySelector('select')!
  native.options[0]!.selected = true
  native.dispatchEvent(new Event('change', { bubbles: true }))
  await vi.waitFor(() => expect(controller.api.get().value).toEqual(['']))
})
