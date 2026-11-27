import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import * as select from '../select/index.ts'
import * as combobox from '../combobox/index.ts'

const controllers: { destroy(): void }[] = []
afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.destroy())
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

for (const [name, component, create, enhance] of [
  ['select', select, select.createSelect, select.enhanceSelect],
  ['combobox', combobox, combobox.createCombobox, combobox.enhanceCombobox],
] as const) {
  describe(`${name} native option identities`, () => {
    const selectedIds = (native: HTMLSelectElement) =>
      Array.from(native.selectedOptions, (option) => option.dataset.id)

    it.each([false, true])(
      'creates distinct identities with shared submitted values (multiple=%s)',
      async (multiple) => {
        const form = document.createElement('form')
        document.body.append(form)
        const controller = create({
          label: 'Choice',
          selectSameValue: false,
          name: 'choice',
          multiple,
          required: true,
          defaultValue: ['b'],
          items: [
            { id: 'a', value: 'shared', label: 'First' },
            { id: 'b', value: 'shared', label: 'Second' },
          ],
        }).mount(form)
        controllers.push(controller)
        const native = form.querySelector('select')!
        expect(controller.api.get().collection.getValues()).toEqual(['a', 'b'])
        expect(selectedIds(native)).toEqual(['b'])
        expect(new FormData(form).getAll('choice')).toEqual(['shared'])
        expect(native.checkValidity()).toBe(true)
        controller.api.get().setValue(multiple ? ['a', 'b'] : ['a'])
        await vi.waitFor(() => expect(selectedIds(native)).toEqual(multiple ? ['a', 'b'] : ['a']))
        // Let Zag's deferred native writes finish before inspecting submission.
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(new FormData(form).getAll('choice')).toEqual(
          multiple ? ['shared', 'shared'] : ['shared'],
        )
        form.reset()
        await vi.waitFor(() => expect(controller.api.get().value).toEqual(['b']))
        await vi.waitFor(() => expect(selectedIds(native)).toEqual(['b']))
      },
    )

    it('enhances data-id options, preserves identity across value changes and restores original markup', async () => {
      const form = document.createElement('form')
      const root = document.createElement('div')
      root.className = `fui-${name}`
      root.innerHTML = `<select class="fui-${name}-native-select" name="choice" multiple><option id="dom-a" data-id="a" value="shared" selected>First</option><option id="dom-b" data-id="b" value="shared">Second</option></select>`
      const before = root.outerHTML
      form.append(root)
      document.body.append(form)
      const first = root.querySelector<HTMLOptionElement>('[data-id="a"]')!
      const second = root.querySelector<HTMLOptionElement>('[data-id="b"]')!
      const controller = enhance(root, { selectSameValue: false })
      controllers.push(controller)
      const native = root.querySelector('select')!
      expect(controller.api.get().value).toEqual(['a'])
      const events: string[] = []
      const submittedDuringEvents: FormDataEntryValue[][] = []
      native.addEventListener('input', () =>
        submittedDuringEvents.push(new FormData(form).getAll('choice')),
      )
      native.addEventListener('change', () =>
        submittedDuringEvents.push(new FormData(form).getAll('choice')),
      )
      native.addEventListener('input', () => events.push('input'))
      native.addEventListener('change', () => events.push('change'))
      controller.root.querySelector<HTMLButtonElement>(`.fui-${name}-trigger`)!.click()
      await vi.waitFor(() => expect(controller.api.get().open).toBe(true))
      controller.root.querySelector<HTMLElement>(`.fui-${name}-item[data-value="b"]`)!.click()
      await vi.waitFor(() => expect(controller.api.get().value).toEqual(['a', 'b']))
      await vi.waitFor(() => expect(events).toEqual(['input', 'change']))
      expect(submittedDuringEvents).toEqual([
        ['shared', 'shared'],
        ['shared', 'shared'],
      ])
      expect(new FormData(form).getAll('choice')).toEqual(['shared', 'shared'])
      events.length = 0
      first.selected = false
      second.selected = true
      native.dispatchEvent(new Event('change', { bubbles: true }))
      await vi.waitFor(() => expect(controller.api.get().value).toEqual(['b']))
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(events).toEqual(['change'])
      controller.setItems([
        { id: 'b', value: 'updated', label: 'Updated second' },
        { id: 'a', value: 'shared', label: 'First' },
      ])
      await vi.waitFor(() => expect(new FormData(form).getAll('choice')).toEqual(['updated']))
      expect(root.querySelector('[data-id="a"]')).toBe(first)
      expect(root.querySelector('[data-id="b"]')).toBe(second)
      form.reset()
      await vi.waitFor(() => expect(controller.api.get().value).toEqual(['a']))
      await vi.waitFor(() => expect(new FormData(form).getAll('choice')).toEqual(['shared']))
      controller.destroy()
      expect(root.outerHTML).toBe(before)
      expect(root.querySelector('[data-id="a"]')).toBe(first)
      expect(root.querySelector('[data-id="b"]')).toBe(second)
    })

    it('warns for duplicate identities while permitting duplicate submitted values', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const controller = create({
        label: 'Choice',
        selectSameValue: false,
        items: component.collection({
          items: [
            { id: 'a', value: 'shared', label: 'First' },
            { id: 'a', value: 'ignored', label: 'Duplicate identity' },
            { id: 'b', value: 'shared', label: 'Second' },
          ],
        }),
      })
      controllers.push(controller)
      expect(controller.api.get().collection.getValues()).toEqual(['a', 'b'])
      expect(controller.root.querySelectorAll(`.fui-${name}-item`)).toHaveLength(2)
      expect(warn).toHaveBeenCalledOnce()
    })
  })
}
