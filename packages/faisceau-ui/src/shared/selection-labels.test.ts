import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import * as select from '../select/index.ts'
import * as combobox from '../combobox/index.ts'

const controllers: { destroy(): void }[] = []
afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.destroy())
  document.body.replaceChildren()
})
const items = [
  { id: 'a', value: 'shared', label: 'Same' },
  { id: 'b', value: 'shared', label: 'Same' },
  { id: 'c', value: 'shared', label: 'Different' },
  { id: 'd', value: 'other', label: 'Same' },
]

for (const [name, create, enhance] of [
  ['select', select.createSelect, select.enhanceSelect],
  ['combobox', combobox.createCombobox, combobox.enhanceCombobox],
] as const) {
  describe(`${name} selected labels`, () => {
    const labels = (root: HTMLElement) =>
      name === 'select'
        ? root.querySelector('.fui-select-value-text')!.textContent
        : Array.from(
            root.querySelectorAll('.fui-combobox-tag-label'),
            (tag) => tag.textContent,
          ).join(', ')

    it('deduplicates exact value/label pairs without changing selection or submission', async () => {
      const form = document.createElement('form')
      document.body.append(form)
      const onValueChange = vi.fn()
      const controller = create({
        label: 'Choice',
        name: 'choice',
        items,
        multiple: true,
        defaultValue: ['a'],
        onValueChange,
      }).mount(form)
      controllers.push(controller)
      expect(controller.api.get().valueAsString).toBe('Same, Different')
      expect(labels(controller.root)).toBe('Same, Different')
      expect(controller.api.get().value).toEqual(['a', 'b', 'c'])
      expect(controller.api.get().selectedItems).toHaveLength(3)
      expect(controller.root.querySelector('select')!.options).toHaveLength(4)
      expect(new FormData(form).getAll('choice')).toEqual(['shared', 'shared', 'shared'])
      controller.api.get().setValue(['a', 'd'])
      await vi.waitFor(() => expect(labels(controller.root)).toBe('Same, Different, Same'))
      expect(onValueChange).toHaveBeenCalledOnce()
      expect(onValueChange.mock.calls[0]![0].value).toEqual(['a', 'b', 'c', 'd'])
      expect(onValueChange.mock.calls[0]![0].items).toHaveLength(4)
      controller.setItems(
        items.map((item) => (item.id === 'b' ? { ...item, label: 'Updated' } : item)),
      )
      await vi.waitFor(() => expect(labels(controller.root)).toBe('Same, Updated, Different, Same'))
    })

    it('deduplicates enhanced selection labels and restores original native options', () => {
      const root = document.createElement('div')
      root.className = `fui-${name}`
      root.innerHTML = `<select class="fui-${name}-native-select" multiple><option data-id="a" value="shared" selected>Same</option><option data-id="b" value="shared">Same</option></select>`
      const before = root.outerHTML
      document.body.append(root)
      const controller = enhance(root)
      controllers.push(controller)
      expect(controller.api.get().valueAsString).toBe('Same')
      expect(labels(root)).toBe('Same')
      expect(root.querySelector('select')!.options).toHaveLength(2)
      controller.destroy()
      expect(root.outerHTML).toBe(before)
    })

    it('also deduplicates labels when independent identities are explicitly selected', () => {
      const controller = create({
        label: 'Choice',
        items,
        multiple: true,
        defaultValue: ['a', 'b', 'd'],
        selectSameValue: false,
      }).mount(document.body)
      controllers.push(controller)
      expect(controller.api.get().value).toEqual(['a', 'b', 'd'])
      expect(labels(controller.root)).toBe('Same, Same')
    })
  })
}

it('deduplicates the single Combobox input and preserves typed search text', async () => {
  const controller = combobox
    .createCombobox({ label: 'Choice', items: items.slice(0, 2), defaultValue: ['a'] })
    .mount(document.body)
  controllers.push(controller)
  const input = controller.root.querySelector('input')!
  expect(controller.api.get().value).toEqual(['a', 'b'])
  expect(controller.api.get().valueAsString).toBe('Same')
  expect(controller.api.get().inputValue).toBe('Same')
  expect(input.value).toBe('Same')
  input.focus()
  input.value = 'Search text'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await vi.waitFor(() => expect(controller.api.get().inputValue).toBe('Search text'))
  expect(input.value).toBe('Search text')
  input.value = 'Same, Same'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await vi.waitFor(() => expect(controller.api.get().inputValue).toBe('Same, Same'))
  expect(input.value).toBe('Same, Same')
})

it('removes every identity represented by a merged independent tag', async () => {
  const form = document.createElement('form')
  document.body.append(form)
  const controller = combobox
    .createCombobox({
      label: 'Choice',
      name: 'choice',
      items,
      multiple: true,
      selectSameValue: false,
      defaultValue: ['a', 'b', 'd'],
    })
    .mount(form)
  controllers.push(controller)
  expect(controller.root.querySelectorAll('.fui-combobox-tag')).toHaveLength(2)
  controller.root.querySelector<HTMLButtonElement>('.fui-combobox-tag-remove')!.click()
  await vi.waitFor(() => expect(controller.api.get().value).toEqual(['d']))
  expect(controller.root.querySelectorAll('.fui-combobox-tag')).toHaveLength(1)
  expect(new FormData(form).getAll('choice')).toEqual(['other'])
})
