import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { createDialog, enhanceDialog } from './dialog.ts'

afterEach(() => document.body.replaceChildren())

describe('Dialog', () => {
  it('creates an accessible modal and closes it', async () => {
    const onOpenChange = vi.fn()
    const controller = createDialog({
      content: 'Contenu de confirmation',
      description: 'Cette action est réversible.',
      onOpenChange,
      title: 'Confirmer',
    }).mount(document.body)

    controller.api.get().setOpen(true)
    await flushMachine()
    const content = controller.root.querySelector<HTMLElement>('.fui-dialog-content')!
    expect(content.hidden).toBe(false)
    expect(content.getAttribute('role')).toBe('dialog')
    expect(content.getAttribute('aria-labelledby')).toBeTruthy()
    controller.root.querySelector<HTMLButtonElement>('.fui-dialog-close')!.click()
    await flushMachine()
    expect(onOpenChange).toHaveBeenLastCalledWith({ open: false })
  })

  it('binds every trigger matching the selector without owning them', async () => {
    document.body.innerHTML =
      '<button id="open-a" type="button">A</button><button id="open-b" type="button">B</button>'
    const first = document.querySelector<HTMLButtonElement>('#open-a')!
    const second = document.querySelector<HTMLButtonElement>('#open-b')!
    const controller = createDialog({
      content: 'Contenu',
      title: 'Titre',
      triggerSelector: '#open-a, #open-b',
    }).mount(document.body)

    await flushMachine()
    expect(first.hasAttribute('aria-haspopup')).toBe(true)
    expect(second.hasAttribute('aria-haspopup')).toBe(true)
    expect(first.id).toBeTruthy()
    expect(second.id).toBeTruthy()
    expect(first.id).not.toBe(second.id)
    expect(controller.root.querySelector('.fui-dialog-trigger')).toBeNull()

    second.click()
    await flushMachine()
    expect(controller.api.get().open).toBe(true)

    controller.destroy()
    expect(first.hasAttribute('aria-haspopup')).toBe(false)
    expect(second.hasAttribute('aria-haspopup')).toBe(false)
    expect(document.querySelector('#open-a')).not.toBeNull()
    expect(document.querySelector('#open-b')).not.toBeNull()
  })

  it('picks up triggers attached after start', async () => {
    const canvas = document.createElement('div')
    const trigger = document.createElement('button')
    trigger.id = 'late-trigger'
    trigger.type = 'button'
    trigger.textContent = 'Late'
    canvas.append(trigger)
    const host = document.createElement('div')
    canvas.append(host)
    const controller = createDialog({
      content: 'Contenu',
      title: 'Titre',
      triggerSelector: '#late-trigger',
    })
    controller.mount(host)
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false)
    document.body.append(canvas)
    await flushMachine()
    expect(trigger.hasAttribute('aria-haspopup')).toBe(true)
    trigger.click()
    await flushMachine()
    expect(controller.api.get().open).toBe(true)
    controller.destroy()
  })

  it('keeps triggers bound after Zag rewrites their attributes', async () => {
    document.body.innerHTML = '<button id="persist" type="button">Open</button>'
    const trigger = document.querySelector<HTMLButtonElement>('#persist')!
    const controller = createDialog({
      content: 'Contenu',
      title: 'Titre',
      triggerSelector: '#persist',
    }).mount(document.body)
    await flushMachine()
    // Zag assigns its own trigger id, so the selector no longer matches.
    expect(trigger.id).not.toBe('persist')
    // Any DOM mutation runs the observer reconcile; the trigger must survive it.
    document.body.append(document.createElement('div'))
    await flushMachine()
    expect(trigger.hasAttribute('aria-haspopup')).toBe(true)
    trigger.click()
    await flushMachine()
    expect(controller.api.get().open).toBe(true)
    controller.destroy()
  })

  it('generates a unique id for triggers missing one and restores it', async () => {
    document.body.innerHTML =
      '<button class="gen" type="button">A</button><button class="gen" type="button">B</button>'
    const [first, second] = Array.from(document.querySelectorAll<HTMLButtonElement>('.gen'))
    const controller = createDialog({
      content: 'Contenu',
      title: 'Titre',
      triggerSelector: '.gen',
    }).mount(document.body)
    await flushMachine()
    expect(first.dataset.value).toMatch(/^fui-trigger-/)
    expect(second.dataset.value).toMatch(/^fui-trigger-/)
    expect(first.dataset.value).not.toBe(second.dataset.value)
    expect(first.id).not.toBe(second.id)
    controller.destroy()
    expect(first.id).toBe('')
    expect(second.id).toBe('')
  })

  it('rebinds triggers through setTriggerSelector', async () => {
    document.body.innerHTML =
      '<button id="before" type="button">Before</button><button id="after" type="button">After</button>'
    const before = document.querySelector<HTMLButtonElement>('#before')!
    const after = document.querySelector<HTMLButtonElement>('#after')!
    const controller = createDialog({
      content: 'Contenu',
      title: 'Titre',
      triggerSelector: '#before',
    }).mount(document.body)
    await flushMachine()
    expect(before.hasAttribute('aria-haspopup')).toBe(true)

    controller.setTriggerSelector('#after')
    await flushMachine()
    expect(before.hasAttribute('aria-haspopup')).toBe(false)
    expect(after.hasAttribute('aria-haspopup')).toBe(true)
    controller.destroy()
  })

  it('groups the title and close button in a header with a scrolling body', () => {
    const controller = createDialog({
      content: 'Contenu de confirmation',
      description: 'Cette action est réversible.',
      title: 'Confirmer',
    }).mount(document.body)

    const header = controller.root.querySelector('.fui-dialog-header')!
    expect(header).not.toBeNull()
    expect(header.querySelector('.fui-dialog-title')?.textContent).toBe('Confirmer')
    expect(header.querySelector('.fui-dialog-description')?.textContent).toBe(
      'Cette action est réversible.',
    )
    expect(header.querySelector('.fui-dialog-close')).not.toBeNull()
    const content = controller.root.querySelector('.fui-dialog-content')!
    expect(content.children[0]).toBe(header)
    expect(content.children[1]?.classList.contains('fui-dialog-body')).toBe(true)
    expect(
      content.children[1]?.firstElementChild?.classList.contains('fui-dialog-body-content'),
    ).toBe(true)
    controller.destroy()
  })

  it('adds an optional fixed footer after the scrolling body', () => {
    const controller = createDialog({
      content: 'Contenu',
      footer: 'Annuler · Confirmer',
      title: 'Confirmer',
    }).mount(document.body)

    const body = controller.root.querySelector('.fui-dialog-body')!
    expect(body.nextElementSibling?.classList.contains('fui-dialog-footer')).toBe(true)
    expect(body.nextElementSibling?.textContent).toBe('Annuler · Confirmer')
    controller.destroy()
  })

  it('flags the body scroll edges while only the body scrolls', async () => {
    const controller = createDialog({ content: 'Body', title: 'Titre' }).mount(document.body)
    const body = controller.root.querySelector<HTMLElement>('.fui-dialog-body')!
    const spacer = document.createElement('div')
    spacer.style.height = '2000px'
    controller.api.get().setOpen(true)
    await flushMachine()
    body.append(spacer)
    await vi.waitFor(() => expect(body.hasAttribute('data-scroll-bottom')).toBe(true))
    expect(body.hasAttribute('data-scroll-top')).toBe(false)
    body.scrollTop = 500
    body.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => expect(body.hasAttribute('data-scroll-top')).toBe(true))
    expect(body.hasAttribute('data-scroll-bottom')).toBe(true)
    body.scrollTop = body.scrollHeight
    body.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => expect(body.hasAttribute('data-scroll-bottom')).toBe(false))
    expect(body.hasAttribute('data-scroll-top')).toBe(true)
    controller.destroy()
    expect(body.hasAttribute('data-scroll-top')).toBe(false)
    expect(body.hasAttribute('data-scroll-bottom')).toBe(false)
  })

  it('enhances content-only markup and restores it', () => {
    const root = document.createElement('div')
    root.className = 'fui-dialog'
    root.innerHTML =
      '<section class="fui-dialog-content"><h2 class="fui-dialog-title">Profile</h2><p>Body</p></section>'
    document.body.append(root)
    const original = root.innerHTML
    const controller = enhanceDialog(root)
    expect(root.querySelector('.fui-dialog-backdrop')).not.toBeNull()
    const header = root.querySelector('.fui-dialog-header')!
    expect(header.querySelector('.fui-dialog-title')?.textContent).toBe('Profile')
    expect(header.querySelector('.fui-dialog-close')).not.toBeNull()
    const content = root.querySelector('.fui-dialog-content')!
    expect(content.children[0]).toBe(header)
    const body = content.children[1]!
    expect(body.classList.contains('fui-dialog-body')).toBe(true)
    expect(body.querySelector('p')?.textContent).toBe('Body')
    controller.destroy()
    expect(root.innerHTML).toBe(original)
  })

  it('adopts a caller-provided header and restores it', () => {
    const root = document.createElement('div')
    root.className = 'fui-dialog'
    root.innerHTML =
      '<section class="fui-dialog-content"><div class="fui-dialog-header"><h2 class="fui-dialog-title">Profile</h2></div><p>Body</p></section>'
    document.body.append(root)
    const original = root.innerHTML
    const controller = enhanceDialog(root)
    const header = root.querySelector('.fui-dialog-header')!
    expect(header.querySelector('.fui-dialog-title')?.textContent).toBe('Profile')
    expect(header.querySelector('.fui-dialog-close')).not.toBeNull()
    expect(root.querySelector('.fui-dialog-body-content > p')?.textContent).toBe('Body')
    controller.destroy()
    expect(root.innerHTML).toBe(original)
  })

  it('adopts a caller-provided body and restores it', () => {
    const root = document.createElement('div')
    root.className = 'fui-dialog'
    root.innerHTML =
      '<section class="fui-dialog-content"><h2 class="fui-dialog-title">Profile</h2><div class="fui-dialog-body"><div class="fui-dialog-body-content"><p>Body</p></div></div></section>'
    document.body.append(root)
    const original = root.innerHTML
    const controller = enhanceDialog(root)
    expect(root.querySelector('.fui-dialog-body-content > p')?.textContent).toBe('Body')
    controller.destroy()
    expect(root.innerHTML).toBe(original)
  })

  it('adopts a caller-provided footer and restores it', () => {
    const root = document.createElement('div')
    root.className = 'fui-dialog'
    root.innerHTML =
      '<section class="fui-dialog-content"><h2 class="fui-dialog-title">Profile</h2><p>Body</p><footer class="fui-dialog-footer">Actions</footer></section>'
    document.body.append(root)
    const original = root.innerHTML
    const controller = enhanceDialog(root)
    expect(root.querySelector('.fui-dialog-footer')?.textContent).toBe('Actions')
    expect(root.querySelector('.fui-dialog-body')?.nextElementSibling).toBe(
      root.querySelector('.fui-dialog-footer'),
    )
    controller.destroy()
    expect(root.innerHTML).toBe(original)
  })
})

async function flushMachine(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}
