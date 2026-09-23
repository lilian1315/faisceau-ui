import { h } from '@lilian1315/create-element/faisceau'
import { asDom } from '@lilian1315/create-element/faisceau/jsx-runtime'
import type { Meta, StoryObj } from '@storybook/html-vite'
import { createSelect, enhanceSelect } from 'faisceau-ui/select'
import type { SelectProps } from 'faisceau-ui/select'
import { createStoryShell, trackController } from './story.tsx'

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
    const form = asDom<'form'>(
      <form style={{ display: 'grid', gap: '16px', width: '320px', maxWidth: '100%' }} />,
    )
    const host = h('div')
    const shortListButton = h('button', { type: 'button' }, 'Short list')
    const longListButton = h('button', { type: 'button' }, 'Long list')
    const listActions = h(
      'div',
      { style: 'display: flex; gap: 12px' },
      shortListButton,
      longListButton,
    )
    form.append(listActions, host)
    story.canvas.append(form)
    let controller: ReturnType<typeof createSelect>

    const renderSelect = (mode: 'short' | 'long') => {
      controller?.destroy()
      const items = mode === 'short' ? args.items : longList
      controller = createSelect({
        ...args,
        items,
        ...(mode === 'long' && args.value === undefined && args.defaultValue === undefined
          ? { defaultValue: ['40'] }
          : {}),
        onValueChange(details) {
          story.output.textContent = `value = ${JSON.stringify(details.value)}`
          args.onValueChange?.(details)
        },
      }).mount(host)
      shortListButton.setAttribute('aria-pressed', String(mode === 'short'))
      longListButton.setAttribute('aria-pressed', String(mode === 'long'))
      story.setSource(
        `createSelect({\n  label: "Country",\n  name: "country",\n  items: ${mode === 'short' ? 'countries' : 'longList'},\n  multiple: ${!!args.multiple},\n  clearable: ${!!args.clearable}\n}).mount(form)`,
      )
    }

    shortListButton.addEventListener('click', () => renderSelect('short'))
    longListButton.addEventListener('click', () => renderSelect('long'))
    renderSelect('short')
    form.append(
      asDom<'div'>(
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit">Read FormData</button>
          <button type="reset">Reset</button>
        </div>,
      ),
    )
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      story.output.textContent = JSON.stringify([...new FormData(form)])
    })
    trackController(story.root, { destroy: () => controller.destroy() })
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
    const root = asDom<'div'>(
      <div class="fui-select" style={{ width: '320px' }}>
        <label class="fui-label">Country</label>
        <select class="fui-select-native-select" name="country">
          <option value="" data-placeholder>
            Choose a country
          </option>
          <option value="ng">Nigeria</option>
          <option value="jp">Japan</option>
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
    const destroy = h(
      'button',
      {
        type: 'button',
        onclick: () => {
          controller.destroy()
          destroy.disabled = true
        },
      },
      'Destroy enhancement',
    )
    story.canvas.append(destroy)
    trackController(story.root, controller)
    story.setSource(`${source}\n\nenhanceSelect(root)`)
    return story.root
  },
}
