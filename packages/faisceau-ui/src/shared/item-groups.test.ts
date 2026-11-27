import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'
import { createSelect, enhanceSelect } from '../select/select.ts'
import { createCombobox, enhanceCombobox } from '../combobox/combobox.ts'
import type { FuiItemInput } from './items.ts'

const items = [
  { value: 'fr', label: 'France', group: 'Europe' },
  { value: 'be', label: 'Belgium', group: 'Europe', disabled: true },
  { value: 'jp', label: 'Japan', group: 'Asia' },
  { value: 'other', label: 'Other' },
  { value: 'de', label: 'Germany', group: 'Europe' },
] satisfies FuiItemInput[]
const controllers: { destroy(): void }[] = []
afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.destroy())
  document.body.replaceChildren()
})

for (const [name, create, enhance] of [
  ['select', createSelect, enhanceSelect],
  ['combobox', createCombobox, enhanceCombobox],
] as const) {
  describe(`${name} groups`, () => {
    it('keeps multiple grouped values in native forms and restores defaults on reset', async () => {
      const form = document.createElement('form')
      document.body.append(form)
      const controller = create({
        items,
        label: 'Country',
        name: 'countries',
        multiple: true,
        defaultValue: ['fr', 'jp'],
      }).mount(form)
      controllers.push(controller)
      expect(new FormData(form).getAll('countries')).toEqual(['fr', 'jp'])
      controller.api.get().setValue(['de', 'other'])
      await vi.waitFor(() =>
        expect(new FormData(form).getAll('countries')).toEqual(['other', 'de']),
      )
      form.reset()
      await vi.waitFor(() => expect(new FormData(form).getAll('countries')).toEqual(['fr', 'jp']))
    })

    it('labels groups, preserves order, skips disabled options with the keyboard and submits values', async () => {
      const form = document.createElement('form')
      document.body.append(form)
      const controller = create({ items, label: 'Country', name: 'country' }).mount(form)
      controllers.push(controller)
      const native = controller.root.querySelector('select')!
      expect(Array.from(native.querySelectorAll('optgroup'), (group) => group.label)).toEqual([
        'Europe',
        'Asia',
        'Europe',
      ])
      expect(Array.from(native.options, (option) => option.value)).toEqual([
        '',
        'fr',
        'be',
        'jp',
        'other',
        'de',
      ])
      const groups = controller.root.querySelectorAll<HTMLElement>(`.fui-${name}-item-group`)
      expect(groups).toHaveLength(3)
      expect(new Set(Array.from(groups, (group) => group.id)).size).toBe(3)
      for (const group of groups) {
        expect(group.getAttribute('role')).toBe('group')
        expect(
          group.querySelector(`#${CSS.escape(group.getAttribute('aria-labelledby')!)}`),
        ).not.toBeNull()
      }
      await page.getByRole('combobox', { name: 'Country' }).click()
      await userEvent.keyboard('{ArrowDown}')
      await vi.waitFor(() => expect(controller.api.get().highlightedValue).toBe('fr'))
      await userEvent.keyboard('{ArrowDown}')
      await vi.waitFor(() => expect(controller.api.get().highlightedValue).toBe('jp'))
      await userEvent.keyboard('{Enter}')
      await vi.waitFor(() => expect(new FormData(form).get('country')).toBe('jp'))
      form.reset()
      await vi.waitFor(() => expect(controller.api.get().value).toEqual([]))
    })

    it('preserves native optgroups and their disabled state on enhancement and teardown', async () => {
      const root = document.createElement('div')
      root.className = `fui-${name}`
      root.innerHTML = `<select class="fui-${name}-native-select" name="country" multiple><optgroup label="Europe" disabled><option value="fr">France</option></optgroup><optgroup label="Asia"><option value="jp" selected>Japan</option></optgroup></select>`
      document.body.append(root)
      const before = root.outerHTML
      const originalGroup = root.querySelector('optgroup')!
      const controller = enhance(root, { label: 'Country' })
      controllers.push(controller)
      const disabled = root.querySelector<HTMLElement>(`.fui-${name}-item`)!
      expect(disabled.getAttribute('data-disabled')).not.toBeNull()
      expect(root.querySelector(`.fui-${name}-item-group-label`)?.textContent).toBe('Europe')
      expect(controller.api.get().value).toEqual(['jp'])
      controller.destroy()
      expect(root.outerHTML).toBe(before)
      expect(root.querySelector('optgroup')).toBe(originalGroup)
    })
  })
}

it('filters whole combobox groups and moves retained rows and native options between groups', async () => {
  const controller = createCombobox({ items, label: 'Country' }).mount(document.body)
  controllers.push(controller)
  const root = controller.root
  const row = root.querySelector('.fui-combobox-item[data-value="fr"]')!
  const native = root.querySelector('option[value="fr"]')!
  controller.api.get().setInputValue('France')
  await vi.waitFor(() => {
    const groups = root.querySelectorAll<HTMLElement>('.fui-combobox-item-group')
    expect(Array.from(groups, (group) => group.hidden)).toEqual([false, true, true])
  })
  controller.setItems([
    { value: 'jp', label: 'Japan', group: 'Asia' },
    { value: 'fr', label: 'France', group: 'New group' },
  ])
  expect(root.querySelector('.fui-combobox-item[data-value="fr"]')).toBe(row)
  expect(row.closest('.fui-combobox-item-group')?.textContent).toContain('New group')
  expect(native.parentElement?.getAttribute('label')).toBe('New group')
  expect(root.querySelector('option[value="fr"]')).toBe(native)
  controller.api.get().setInputValue('no match')
  await vi.waitFor(() =>
    expect(root.querySelector<HTMLElement>('.fui-combobox-empty')!.hidden).toBe(false),
  )
  expect(
    Array.from(root.querySelectorAll<HTMLElement>('.fui-combobox-item-group')).every(
      (group) => group.hidden,
    ),
  ).toBe(true)
  controller.api.get().setInputValue('')
  await vi.waitFor(() =>
    expect(root.querySelector<HTMLElement>('.fui-combobox-item-group')!.hidden).toBe(false),
  )
  root.querySelector<HTMLButtonElement>('.fui-combobox-trigger')!.click()
  await vi.waitFor(() => expect(controller.api.get().open).toBe(true))
  row.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await vi.waitFor(() => expect(controller.api.get().value).toEqual(['fr']))
})
