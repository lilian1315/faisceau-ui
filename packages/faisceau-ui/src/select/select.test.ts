import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'
import { createSelect, enhanceSelect } from './select.ts'
import type { SelectController, SelectProps } from './types.ts'

const items = [
  { value: 'ng', label: 'Nigeria' },
  { value: 'jp', label: 'Japan', disabled: true },
  { value: 'kr', label: 'Korea' },
  { value: 'ke', label: 'Kenya' },
  { value: 'uk', label: 'United Kingdom' },
]
const controllers: SelectController[] = []
afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.destroy())
  document.body.replaceChildren()
})
function create(props: Partial<SelectProps> = {}, target: ParentNode = document.body) {
  const controller = createSelect({ items, label: 'Country', ...props })
  controllers.push(controller)
  return controller.mount(target)
}
function part<T extends HTMLElement = HTMLElement>(controller: SelectController, name: string): T {
  return controller.root.querySelector<T>(`.fui-select-${name}`)!
}
const trigger = () => page.getByRole('combobox', { name: 'Country' })
const option = (name: string) => page.getByRole('option', { name, exact: true })

describe('Select (Zag v2)', () => {
  it('starts only when mounted, supports detached trees, and tears down idempotently', () => {
    const controller = createSelect({ items, label: 'Country' })
    expect(controller.started).toBe(false)
    expect(controller.root.querySelector('label.fui-label')?.textContent).toBe('Country')
    expect(controller.root.querySelector('option[data-placeholder]')?.textContent).toBe(
      'Select an option',
    )
    const host = document.createElement('div')
    controller.mount(host).start()
    expect(controller.started).toBe(true)
    controller.destroy()
    controller.destroy()
    expect(host.childElementCount).toBe(0)
    expect(controller.started).toBe(false)
    expect(() => controller.start()).toThrow('destroyed Select')
  })

  it('selects with the pointer, exposes labels and descriptions, and emits input then change once', async () => {
    const form = document.createElement('form')
    document.body.append(form)
    const onValueChange = vi.fn()
    const controller = create(
      { name: 'country', description: 'Where do you live?', onValueChange },
      form,
    )
    const events: string[] = []
    form.addEventListener('input', () => events.push('input'))
    form.addEventListener('change', () => events.push('change'))
    await page.getByText('Country', { exact: true }).click()
    await expect.element(trigger()).toHaveFocus()
    expect(part(controller, 'trigger').getAttribute('aria-describedby')).toBe(
      part(controller, 'description').id,
    )
    await trigger().click()
    await expect.element(page.getByRole('listbox', { name: 'Country' })).toBeVisible()
    await expect.element(option('Japan')).toHaveAttribute('aria-disabled', 'true')
    await option('Korea').click()
    await vi.waitFor(() => expect(events).toEqual(['input', 'change']))
    expect(new FormData(form).get('country')).toBe('kr')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    await expect.element(trigger()).toHaveTextContent('Korea')
    await expect.element(trigger()).toHaveFocus()
    expect(controller.api.get().open).toBe(false)
  })

  it.each(['{Enter}', ' ', '{ArrowDown}', '{ArrowUp}'])(
    'opens with %s and closes with Escape',
    async (key) => {
      const controller = create()
      part(controller, 'trigger').focus()
      await userEvent.keyboard(key)
      await expect.element(page.getByRole('listbox')).toHaveFocus()
      await userEvent.keyboard('{Escape}')
      await expect.element(trigger()).toHaveFocus()
      expect(controller.api.get().open).toBe(false)
    },
  )

  it('skips disabled items, supports Home/End, typeahead and keyboard selection', async () => {
    const controller = create()
    part(controller, 'trigger').focus()
    await userEvent.keyboard('{ArrowDown}')
    await expect.element(page.getByRole('listbox')).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    await vi.waitFor(() => expect(controller.api.get().highlightedValue).toBe('kr'))
    await userEvent.keyboard('{End}')
    expect(controller.api.get().highlightedValue).toBe('uk')
    await userEvent.keyboard('{Home}')
    expect(controller.api.get().highlightedValue).toBe('ng')
    await userEvent.keyboard('ke')
    await vi.waitFor(() => expect(controller.api.get().highlightedValue).toBe('ke'))
    await userEvent.keyboard('{Enter}')
    await expect.element(trigger()).toHaveTextContent('Kenya')
  })

  it('supports closed typeahead, looping, clear and deselection', async () => {
    const controller = create({ loopFocus: true, clearable: true, deselectable: true })
    part(controller, 'trigger').focus()
    await userEvent.keyboard('uni')
    await expect.element(trigger()).toHaveTextContent('United Kingdom')
    const clear = page.getByRole('button', { name: 'Clear value' }).element() as HTMLButtonElement
    expect(clear.parentElement).toBe(part(controller, 'control'))
    expect(getComputedStyle(clear).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    clear.click()
    await expect.element(trigger()).toHaveFocus()
    await expect.element(trigger()).toHaveTextContent('Select an option')
    await userEvent.keyboard('{ArrowDown}')
    await expect.element(page.getByRole('listbox')).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    await vi.waitFor(() => expect(controller.api.get().highlightedValue).toBe('uk'))
    await option('Nigeria').click()
    await trigger().click()
    await option('Nigeria').click()
    expect(controller.api.get().value).toEqual([])
  })

  it('dismisses outside without selecting the highlighted option', async () => {
    const controller = create()
    const outside = document.createElement('button')
    outside.textContent = 'Outside'
    Object.assign(outside.style, { position: 'fixed', right: '0', top: '0' })
    document.body.append(outside)
    await trigger().click()
    await option('Korea').hover()
    await vi.waitFor(() => expect(controller.api.get().highlightedValue).toBe('kr'))
    await page.getByRole('button', { name: 'Outside' }).click()
    await vi.waitFor(() => expect(controller.api.get().open).toBe(false))
    expect(controller.api.get().value).toEqual([])
  })

  it('keeps multiple native values through highlight changes and form reset', async () => {
    const form = document.createElement('form')
    document.body.append(form)
    const controller = create(
      { multiple: true, name: 'countries', defaultValue: ['ng'], closeOnSelect: false },
      form,
    )
    await trigger().click()
    await option('Korea').click()
    await option('Kenya').hover()
    expect(controller.api.get().open).toBe(true)
    expect(new FormData(form).getAll('countries')).toEqual(['ng', 'kr'])
    form.reset()
    await vi.waitFor(() => expect(new FormData(form).getAll('countries')).toEqual(['ng']))
    expect(controller.api.get().value).toEqual(['ng'])
  })

  it.each(['input', 'change'])('accepts native %s without an event echo', async (type) => {
    const controller = create()
    const native = part<HTMLSelectElement>(controller, 'native-select')
    const events: string[] = []
    controller.root.addEventListener('input', () => events.push('input'))
    controller.root.addEventListener('change', () => events.push('change'))
    native.value = 'kr'
    native.dispatchEvent(new Event(type, { bubbles: true }))
    await expect.element(trigger()).toHaveTextContent('Korea')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(events).toEqual([type])
  })

  it('preserves native validity and external form ownership, forwarding invalid focus', async () => {
    const form = document.createElement('form')
    form.id = 'country-form'
    document.body.append(form)
    const controller = create({ form: form.id, name: 'country', required: true })
    expect(form.reportValidity()).toBe(false)
    await expect.element(trigger()).toHaveFocus()
    controller.api.get().setValue(['ke'])
    await vi.waitFor(() => expect(form.checkValidity()).toBe(true))
    expect(new FormData(form).get('country')).toBe('ke')
    form.reset()
    await vi.waitFor(() => expect(controller.api.get().value).toEqual([]))
    expect(form.checkValidity()).toBe(false)
  })

  it('follows disabled fieldsets and prevents read-only clearing', async () => {
    const fieldset = document.createElement('fieldset')
    fieldset.disabled = true
    document.body.append(fieldset)
    const controller = create({}, fieldset)
    await expect.element(trigger()).toBeDisabled()
    fieldset.disabled = false
    await expect.element(trigger()).toBeEnabled()
    controller.destroy()
    const readonly = create({ readOnly: true, clearable: true, defaultValue: ['ng'] })
    await trigger().click()
    expect(readonly.api.get().open).toBe(false)
    await expect.element(page.getByRole('button', { name: 'Clear value' })).toBeDisabled()
  })

  it('keeps a controlled value when the consumer ignores selection', async () => {
    const onValueChange = vi.fn()
    const controller = create({ value: ['ng'], onValueChange })
    await trigger().click()
    await option('Korea').click()
    expect(onValueChange).toHaveBeenCalledWith(expect.objectContaining({ value: ['kr'] }))
    expect(controller.api.get().value).toEqual(['ng'])
    await expect.element(trigger()).toHaveTextContent('Nigeria')
    expect(part<HTMLSelectElement>(controller, 'native-select').value).toBe('ng')
  })

  it('enhances partial markup and restores attributes, content, listeners and placement', async () => {
    const root = document.createElement('div')
    root.className = 'fui-select consumer'
    root.innerHTML =
      '<label class="fui-label"><em>Country</em></label><select class="fui-select-native-select"><option value="ng" selected>Nigeria</option><option value="kr">Korea</option></select><p class="fui-select-description">Original help</p>'
    const native = root.querySelector<HTMLSelectElement>('select')!
    native.name = 'country'
    native.value = 'ng'
    document.body.append(root)
    const html = root.outerHTML
    const nodes = [...root.querySelectorAll('*')]
    const controller = enhanceSelect(root, { description: 'Updated help', clearable: true })
    controllers.push(controller)
    expect(controller.started).toBe(true)
    expect(
      part(controller, 'control').compareDocumentPosition(part(controller, 'description')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    await trigger().click()
    await option('Korea').click()
    controller.destroy()
    controller.destroy()
    expect(root.outerHTML).toBe(html)
    expect([...root.querySelectorAll('*')]).toEqual(nodes)
    expect(native.value).toBe('kr')
    expect(root.parentElement).toBe(document.body)
    native.value = 'ke'
    native.dispatchEvent(new Event('change', { bubbles: true }))
    expect(root.querySelector('.fui-select-value-text')).toBeNull()
    expect(root.querySelector('label')!.innerHTML).toBe('<em>Country</em>')
  })

  it('accepts a bare native select and rejects invalid markup without mutation', () => {
    const root = document.createElement('div')
    root.className = 'fui-select'
    root.innerHTML =
      '<select class="fui-select-native-select"><option value="ng">Nigeria</option></select>'
    const html = root.outerHTML
    const controller = enhanceSelect(root, { label: 'Country' })
    expect(part(controller, 'trigger')).not.toBeNull()
    controller.destroy()
    expect(root.outerHTML).toBe(html)
    root.querySelector('select')!.remove()
    expect(() => enhanceSelect(root)).toThrow('fui-select-native-select')
    expect(() => createSelect({ label: 'Country', items: [''] })).toThrow('empty value')
  })

  it('uses a marked native option as the placeholder when enhancing', async () => {
    const form = document.createElement('form')
    form.innerHTML =
      '<div class="fui-select"><label class="fui-label">Mode</label><select class="fui-select-native-select" name="mode" required><option value="" data-placeholder>Choisir un mode</option><option value="simple">Simple</option><option value="expert">Expert</option></select></div>'
    document.body.append(form)
    const root = form.firstElementChild as HTMLElement
    const native = root.querySelector('select')!
    const original = root.outerHTML
    const controller = enhanceSelect(root)
    controllers.push(controller)

    expect(controller.api.get().value).toEqual([])
    expect(part(controller, 'value-text').textContent).toBe('Choisir un mode')
    expect(root.querySelectorAll('.fui-select-item')).toHaveLength(2)
    expect(native.querySelector('option[data-placeholder]')).not.toBeNull()
    expect(form.checkValidity()).toBe(false)

    await page.getByRole('combobox', { name: 'Mode' }).click()
    await option('Expert').click()
    expect(new FormData(form).get('mode')).toBe('expert')
    form.reset()
    await vi.waitFor(() =>
      expect(part(controller, 'value-text').textContent).toBe('Choisir un mode'),
    )
    expect(controller.api.get().value).toEqual([])

    controller.destroy()
    expect(root.outerHTML).toBe(original)
  })

  it('uses standalone styles and aligns the selected text when requested', async () => {
    const controller = create({ alignItemWithTrigger: true, defaultValue: ['kr'] })
    Object.assign(controller.root.style, {
      position: 'fixed',
      top: '180px',
      left: '40px',
      width: '240px',
    })
    expect(part(controller, 'control').getBoundingClientRect().height).toBe(36)
    await trigger().click()
    await vi.waitFor(() =>
      expect(part(controller, 'content').hasAttribute('data-align-with-trigger')).toBe(true),
    )
    await vi.waitFor(() => {
      const value = part(controller, 'value-text').getBoundingClientRect()
      const item = controller.root
        .querySelector('.fui-select-item[data-state="checked"] .fui-select-item-text')!
        .getBoundingClientRect()
      expect(Math.abs(value.left - item.left)).toBeLessThan(2)
      expect(Math.abs(value.top - item.top)).toBeLessThan(2)
    })
    const list = part(controller, 'list')
    expect(list.scrollHeight).toBeLessThanOrEqual(list.clientHeight)
    expect(Number(getComputedStyle(part(controller, 'positioner')).zIndex)).toBeGreaterThanOrEqual(
      50,
    )
  })

  it('uses normal anchored positioning when alignment is requested without a value', async () => {
    const controller = create({ alignItemWithTrigger: true })
    await trigger().click()
    await vi.waitFor(() => expect(controller.api.get().open).toBe(true))
    expect(part(controller, 'content').hasAttribute('data-align-with-trigger')).toBe(false)
    expect(part(controller, 'positioner').style.position).toBe('absolute')
  })

  it('keeps the selected option visible in a long aligned list', async () => {
    const controller = create({
      alignItemWithTrigger: true,
      items: Array.from({ length: 80 }, (_, index) => ({
        value: String(index),
        label: `Option ${index + 1}`,
      })),
      defaultValue: ['79'],
    })
    Object.assign(controller.root.style, {
      position: 'fixed',
      top: '400px',
      left: '40px',
      width: '240px',
    })
    await trigger().click()
    await vi.waitFor(() =>
      expect(part(controller, 'content').hasAttribute('data-align-with-trigger')).toBe(true),
    )
    await vi.waitFor(() => {
      const list = part(controller, 'list').getBoundingClientRect()
      const selected = controller.root
        .querySelector('.fui-select-item[data-state="checked"]')!
        .getBoundingClientRect()
      expect(selected.top).toBeGreaterThanOrEqual(list.top)
      expect(selected.bottom).toBeLessThanOrEqual(list.bottom)
    })
    const value = part(controller, 'value-text').getBoundingClientRect()
    const selectedText = controller.root
      .querySelector('.fui-select-item[data-state="checked"] .fui-select-item-text')!
      .getBoundingClientRect()
    expect(Math.abs(value.top - selectedText.top)).toBeLessThan(2)
    const content = part(controller, 'content').getBoundingClientRect()
    expect(content.height).toBeLessThanOrEqual(320)
    expect(content.top).toBeGreaterThanOrEqual(0)
    expect(content.bottom).toBeLessThanOrEqual(document.documentElement.clientHeight)
    expect(part(controller, 'list').scrollHeight).toBeGreaterThan(
      part(controller, 'list').clientHeight,
    )
    await option('Option 80').click()
    await expect.element(trigger()).toHaveTextContent('Option 80')
    await trigger().click()
    await vi.waitFor(() => {
      const triggerValue = part(controller, 'value-text').getBoundingClientRect()
      const optionText = controller.root
        .querySelector('.fui-select-item[data-state="checked"] .fui-select-item-text')!
        .getBoundingClientRect()
      expect(Math.abs(triggerValue.top - optionText.top)).toBeLessThan(2)
    })
  })
})
