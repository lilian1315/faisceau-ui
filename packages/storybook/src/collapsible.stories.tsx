import { asDom } from '@lilian1315/create-element/faisceau/jsx-runtime'
import { h } from '@lilian1315/create-element/faisceau'
import type { Meta, StoryObj } from '@storybook/html-vite'
import { createCollapsible, enhanceCollapsible, type CollapsibleOptions } from 'faisceau-ui'

import { createStoryShell, trackController } from './story.tsx'

type CollapsibleStoryArgs = Pick<CollapsibleOptions, 'defaultOpen' | 'disabled'>

const meta = {
  args: { defaultOpen: false, disabled: false },
  argTypes: {
    defaultOpen: { control: 'boolean', description: 'État ouvert initial.' },
    disabled: { control: 'boolean', description: 'Désactive le déclencheur.' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Disclosure accessible pilotée par Zag, avec un déclencheur natif et un contenu repliable.',
      },
    },
  },
  title: 'Collapsible/Anatomie',
} satisfies Meta<CollapsibleStoryArgs>

export default meta
type Story = StoryObj<CollapsibleStoryArgs>

export const create: Story = {
  name: 'create()',
  render: (args) => {
    const story = createStoryShell({
      description: 'La factory construit toutes les parts puis démarre au montage.',
      eyebrow: 'createCollapsible',
      title: 'Détails à la demande',
    })
    const host = h('div')
    story.canvas.append(host)
    const controller = createCollapsible({
      ...args,
      content: 'Les réglages avancés restent disponibles sans encombrer la vue principale.',
      onOpenChange: ({ open }) => {
        story.output.textContent = `open = ${String(open)}`
      },
      trigger: 'Réglages avancés',
    }).mount(host)
    trackController(story.root, controller)
    story.setSource(`createCollapsible({
      trigger: "Réglages avancés",
      content: "…",
      defaultOpen: ${args.defaultOpen},
      disabled: ${args.disabled}
    }).mount(target)`)
    return story.root
  },
}

export const enhance: Story = {
  name: 'enhance()',
  render: (args) => {
    const story = createStoryShell({
      description: 'L’anatomie HTML existante est conservée et restaurée lors du destroy.',
      eyebrow: 'enhanceCollapsible',
      title: 'Progressive enhancement',
    })
    const root = asDom<'section'>(
      <section class="fui-collapsible">
        <button class="fui-collapsible-trigger" type="button">
          <span class="fui-collapsible-trigger-text">Informations techniques</span>
          <span class="fui-collapsible-indicator" aria-hidden="true">
            ↓
          </span>
        </button>
        <div class="fui-collapsible-content">
          Cette section provient directement du document HTML.
        </div>
      </section>,
    )
    const source = root.outerHTML
    story.canvas.append(root)
    const controller = enhanceCollapsible(root, args)
    trackController(story.root, controller)
    story.setSource(source)
    return story.root
  },
}
