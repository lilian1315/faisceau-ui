import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import * as select from '../select/index.ts'
import * as combobox from '../combobox/index.ts'

const controllers: { destroy(): void }[] = []
afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.destroy())
  document.body.replaceChildren()
})
const items = [
  { id: 'a', value: 'shared', label: 'First' },
  { id: 'b', value: 'shared', label: 'Second' },
  { id: 'disabled', value: 'shared', label: 'Unavailable', disabled: true },
  { id: 'other', value: 'other', label: 'Other' },
]

for (const [name, create, enhance] of [
  ['select', select.createSelect, select.enhanceSelect],
  ['combobox', combobox.createCombobox, combobox.enhanceCombobox],
] as const) {
  describe(`${name} same submitted value selection`, () => {
    const selected = (root: HTMLElement) =>
      Array.from(
        root.querySelectorAll<HTMLElement>(`.fui-${name}-item[aria-selected="true"]`),
        (row) => row.dataset.value,
      )

    it.each([false, true])(
      'groups initial, API and reset selection by default (multiple=%s)',
      async (multiple) => {
        const form = document.createElement('form')
        document.body.append(form)
        const controller = create({
          label: 'Choice',
          name: 'choice',
          items,
          multiple,
          defaultValue: ['a'],
        }).mount(form)
        controllers.push(controller)
        expect(controller.api.get().value).toEqual(['a', 'b'])
        expect(selected(controller.root)).toEqual(['a', 'b'])
        expect(
          controller.root.querySelector('[role="listbox"]')?.getAttribute('aria-multiselectable'),
        ).toBe('true')
        expect(new FormData(form).getAll('choice')).toEqual(
          multiple ? ['shared', 'shared'] : ['shared'],
        )
        form.reset()
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(new FormData(form).getAll('choice')).toEqual(
          multiple ? ['shared', 'shared'] : ['shared'],
        )
        controller.api.get().setValue(['other'])
        await vi.waitFor(() => expect(selected(controller.root)).toEqual(['other']))
        controller.api.get().setValue(['b'])
        await vi.waitFor(() => expect(selected(controller.root)).toEqual(['a', 'b']))
        form.reset()
        await vi.waitFor(() => expect(controller.api.get().value).toEqual(['a', 'b']))
        if (name === 'combobox')
          (controller as combobox.ComboboxController).api.get().setInputValue('')
        await vi.waitFor(() => expect(selected(controller.root)).toEqual(['a', 'b']))
      },
    )

    it('selects and removes a group through pointer, API and native changes with one notification', async () => {
      const form = document.createElement('form')
      document.body.append(form)
      const onValueChange = vi.fn()
      const controller = create({
        label: 'Choice',
        name: 'choice',
        items,
        multiple: true,
        onValueChange,
      }).mount(form)
      controllers.push(controller)
      const native = controller.root.querySelector('select')!
      const events: string[] = []
      native.addEventListener('input', () => events.push('input'))
      native.addEventListener('change', () => events.push('change'))
      controller.root.querySelector<HTMLButtonElement>(`.fui-${name}-trigger`)!.click()
      await vi.waitFor(() => expect(controller.api.get().open).toBe(true))
      controller.root.querySelector<HTMLElement>(`.fui-${name}-item[data-value="a"]`)!.click()
      await vi.waitFor(() => expect(selected(controller.root)).toEqual(['a', 'b']))
      await vi.waitFor(() => expect(events).toEqual(['input', 'change']))
      expect(onValueChange).toHaveBeenCalledOnce()
      expect(onValueChange.mock.calls[0]![0].value).toEqual(['a', 'b'])
      expect(onValueChange.mock.calls[0]![0].items.map((item: { id: string }) => item.id)).toEqual([
        'a',
        'b',
      ])
      expect(new FormData(form).getAll('choice')).toEqual(['shared', 'shared'])
      events.length = 0
      controller.root.querySelector<HTMLElement>(`.fui-${name}-item[data-value="b"]`)!.click()
      await vi.waitFor(() => expect(controller.api.get().value).toEqual([]))
      await vi.waitFor(() => expect(events).toEqual(['input', 'change']))
      controller.api.get().selectValue('a')
      await vi.waitFor(() => expect(selected(controller.root)).toEqual(['a', 'b']))
      controller.api.get().clearValue('b')
      await vi.waitFor(() => expect(selected(controller.root)).toEqual([]))
      const first = native.querySelector<HTMLOptionElement>('[data-id="a"]')!
      first.selected = true
      native.dispatchEvent(new Event('change', { bubbles: true }))
      await vi.waitFor(() => expect(selected(controller.root)).toEqual(['a', 'b']))
      await vi.waitFor(() =>
        expect(new FormData(form).getAll('choice')).toEqual(['shared', 'shared']),
      )
      first.selected = false
      native.dispatchEvent(new Event('change', { bubbles: true }))
      await vi.waitFor(() => expect(controller.api.get().value).toEqual([]))
      expect(new FormData(form).getAll('choice')).toEqual([])
    })

    it('keeps controlled groups unchanged when the consumer ignores a proposed change', async () => {
      const onValueChange = vi.fn()
      const controller = create({
        label: 'Choice',
        items,
        multiple: true,
        value: ['a'],
        onValueChange,
      }).mount(document.body)
      controllers.push(controller)
      controller.api.get().setValue(['other'])
      await vi.waitFor(() => expect(onValueChange).toHaveBeenCalledOnce())
      expect(onValueChange.mock.calls[0]![0].value).toEqual(['other'])
      expect(controller.api.get().value).toEqual(['a', 'b'])
      expect(selected(controller.root)).toEqual(['a', 'b'])
    })

    it('expands new peers on replacement and keeps surviving group identities', async () => {
      const controller = create({
        label: 'Choice',
        items,
        multiple: true,
        defaultValue: ['a'],
      }).mount(document.body)
      controllers.push(controller)
      controller.setItems([...items, { id: 'c', value: 'shared', label: 'Third' }])
      await vi.waitFor(() => expect(selected(controller.root)).toEqual(['a', 'b', 'c']))
      controller.setItems([{ id: 'c', value: 'shared', label: 'Third' }])
      await vi.waitFor(() => expect(controller.api.get().value).toEqual(['c']))
      expect(selected(controller.root)).toEqual(['c'])
      controller.setItems([{ id: 'other', value: 'other', label: 'Other' }])
      await vi.waitFor(() => expect(controller.api.get().value).toEqual([]))
    })

    it('enhances grouped defaults and can opt out without changing native multiple mode', async () => {
      for (const enabled of [true, false]) {
        const root = document.createElement('div')
        root.className = `fui-${name}`
        root.innerHTML = `<select class="fui-${name}-native-select"><option data-id="a" value="shared" selected>First</option><option data-id="b" value="shared">Second</option></select>`
        const before = root.outerHTML
        document.body.append(root)
        const controller = enhance(root, { selectSameValue: enabled })
        controllers.push(controller)
        expect(selected(root)).toEqual(enabled ? ['a', 'b'] : ['a'])
        expect(root.querySelector('select')!.multiple).toBe(false)
        controller.destroy()
        expect(root.outerHTML).toBe(before)
      }
    })
  })
}

it('uses the full Combobox source to group hidden matches and remove grouped tags', async () => {
  const controller = combobox
    .createCombobox({ label: 'Choice', items, multiple: true })
    .mount(document.body)
  controllers.push(controller)
  controller.api.get().setInputValue('First')
  await vi.waitFor(() => expect(controller.api.get().collection.getValues()).toEqual(['a']))
  controller.api.get().setOpen(true)
  await vi.waitFor(() => expect(controller.api.get().open).toBe(true))
  controller.root.querySelector<HTMLElement>('.fui-combobox-item[data-value="a"]')!.click()
  await vi.waitFor(() => expect(controller.api.get().value).toEqual(['a', 'b']))
  expect(controller.root.querySelectorAll('.fui-combobox-tag')).toHaveLength(2)
  controller.root.querySelector<HTMLButtonElement>('.fui-combobox-tag-remove')!.click()
  await vi.waitFor(() => expect(controller.api.get().value).toEqual([]))
  expect(controller.root.querySelectorAll('.fui-combobox-tag')).toHaveLength(0)
})
