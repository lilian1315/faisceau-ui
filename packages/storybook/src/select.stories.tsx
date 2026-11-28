import { createElement as h } from '@lilian1315/create-element/faisceau'
import { build } from '@lilian1315/create-element/faisceau/virtual/dom'
import type { Meta, StoryObj } from '@storybook/html-vite'
import { collection, createSelect, enhanceSelect } from 'faisceau-ui/select'
import type { SelectProps } from 'faisceau-ui/select'
import { createStoryShell, trackController } from './story.tsx'
import { signal, computed, effect, untracked } from 'faisceau'

const countries = [
  { value: 'ng', label: 'Nigeria' },
  { value: 'jp', label: 'Japan' },
  { value: 'kr', label: 'Korea', disabled: true },
  { value: 'ke', label: 'Kenya' },
  { value: 'uk', label: 'United Kingdom' },
]

const longList = Array.from({ length: 80 }, (_, index) => ({
  value: String(index),
  label: `Option ${index + 1}`,
}))

const meta = {
  title: 'Select/Examples',
  args: { label: 'Country', placeholder: 'Choose a country', items: countries, name: 'country' },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    description: { control: 'text' },
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
    clearable: { control: 'boolean' },
    alignItemWithTrigger: { control: 'boolean' },
  },
  render(args) {
    const story = createStoryShell({
      eyebrow: 'Select · Zag v2',
      title: 'Choose a country',
      description: 'Use the pointer, arrow keys, or type a country name. Korea is unavailable.',
    })

    const mode = signal<'short' | 'long'>('short')

    const host = h('div')
    const form = build<'form'>(
      <form style={{ display: 'grid', gap: '16px', width: '320px', maxWidth: '100%' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            aria-pressed={computed(() => (mode.get() === 'short' ? 'true' : 'false'))}
            onclick={() => mode.set('short')}
            type="button"
          >
            Short list
          </button>
          <button
            aria-pressed={computed(() => (mode.get() === 'long' ? 'true' : 'false'))}
            onclick={() => mode.set('long')}
            type="button"
          >
            Long list
          </button>
        </div>
        {host}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit">Read FormData</button>
          <button type="reset">Reset</button>
        </div>
      </form>,
    )
    story.canvas.append(form)
    const controller = createSelect({
      ...args,
      onValueChange(details) {
        story.output.textContent = `value = ${JSON.stringify(details.value)}`
        args.onValueChange?.(details)
      },
    }).mount(host)
    const stopCollection = effect(() => {
      const currentMode = mode.get()
      untracked(() => {
        controller.setItems(
          currentMode === 'short' ? (args.items ?? countries) : collection({ items: longList }),
        )
        if (currentMode === 'long' && args.value === undefined && args.defaultValue === undefined)
          controller.api.get().setValue(['40'])
        story.setSource(
          `import * as select from 'faisceau-ui/select'\n\nconst controller = select.createSelect({ label: "Country", name: "country", items: countries }).mount(form)\ncontroller.setItems(select.collection({ items: ${currentMode === 'short' ? 'countries' : 'longList'} }))`,
        )
      })
    })

    form.addEventListener('submit', (event) => {
      event.preventDefault()
      story.output.textContent = JSON.stringify([...new FormData(form)])
    })
    trackController(story.root, {
      destroy: () => {
        stopCollection()
        controller.destroy()
      },
    })
    return story.root
  },
} satisfies Meta<SelectProps>
export default meta
type Story = StoryObj<SelectProps>

export const Create: Story = {
  name: 'create()',
  args: {
    description: 'Your country of residence.',
    clearable: true,
  },
}

export const Enhance: Story = {
  name: 'enhance()',
  render() {
    const story = createStoryShell({
      eyebrow: 'enhanceSelect',
      title: 'Adopt a native select',
      description:
        'A root and native select are enough. The visible control and popup are generated; destroy restores the original markup and keeps the current value.',
    })
    const root = build<'div'>(
      <div class="fui-select" style={{ width: '320px' }}>
        <label class="fui-label">Country</label>
        <select class="fui-select-native-select" name="country">
          <option value="" data-placeholder>
            Choose a country
          </option>
          <optgroup label="Africa">
            <option value="ng">Nigeria</option>
          </optgroup>
          <optgroup label="Asia">
            <option value="jp">Japan</option>
          </optgroup>
        </select>
      </div>,
    )
    const source = root.outerHTML
    story.canvas.append(root)
    const controller = enhanceSelect(root, {
      onValueChange: ({ value }) => {
        story.output.textContent = JSON.stringify(value)
      },
    })
    const destroy = h('button', {
      type: 'button',
      onclick: () => {
        controller.destroy()
        destroy.disabled = true
      },
      children: 'Destroy enhancement',
    })
    story.canvas.append(destroy)
    trackController(story.root, controller)
    story.setSource(`${source}\n\nenhanceSelect(root)`)
    return story.root
  },
}

export const Groups: Story = {
  name: 'Groups',
  args: {
    items: [
      { value: 'ng', label: 'Nigeria', group: 'Africa' },
      { value: 'ke', label: 'Kenya', group: 'Africa' },
      { value: 'jp', label: 'Japan', group: 'Asia' },
      { value: 'kr', label: 'Korea', group: 'Asia', disabled: true },
      { value: 'uk', label: 'United Kingdom' },
    ],
  },
}
