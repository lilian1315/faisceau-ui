import { createToaster, enhanceToaster } from 'faisceau-ui'
import type { Meta, StoryObj } from '@storybook/html-vite'

import { asDom, createStoryShell, trackController } from './story.tsx'

const meta = { title: 'Toast/Anatomie' } satisfies Meta
export default meta
type Story = StoryObj

export const create: Story = {
  name: 'create()',
  render: () => {
    const story = createStoryShell({
      eyebrow: 'createToaster',
      title: 'Notifications',
      description:
        'Chaque notification est une machine enfant du groupe Zag et peut avoir un type, une durée et une action.',
    })
    const host = asDom<HTMLDivElement>(<div />)
    const controls = asDom<HTMLDivElement>(
      <div class="fui-story__row">
        <button class="fui-story__button" type="button">
          Succès
        </button>
        <button class="fui-story__button" type="button">
          Erreur
        </button>
      </div>,
    )
    story.canvas.append(controls, host)
    const toaster = createToaster({ placement: 'bottom-end' }).mount(host)
    trackController(story.root, toaster)
    controls.children[0]!.addEventListener('click', () =>
      toaster.store.success({
        title: 'Document enregistré',
        description: 'Toutes vos modifications sont conservées.',
      }),
    )
    controls.children[1]!.addEventListener('click', () =>
      toaster.store.error({
        title: 'Échec de l’enregistrement',
        description: 'Réessayez dans quelques instants.',
        action: {
          label: 'Réessayer',
          onClick: () => toaster.create({ title: 'Nouvelle tentative' }),
        },
      }),
    )
    story.setSource(
      `const toaster = createToaster({ placement: "bottom-end" }).mount(target)\ntoaster.store.success({ title, description })`,
    )
    return story.root
  },
}

export const enhance: Story = {
  name: 'enhance()',
  render: () => {
    const story = createStoryShell({
      eyebrow: 'enhanceToaster',
      title: 'Région existante',
      description:
        'Une région vide existante reçoit les props accessibles et les notifications créées ensuite.',
    })
    const button = asDom<HTMLButtonElement>(
      <button class="fui-story__button" type="button">
        Notifier
      </button>,
    )
    const region = asDom<HTMLDivElement>(<div id="notifications" />)
    story.canvas.append(button, region)
    const toaster = enhanceToaster(region, { placement: 'top-end' })
    trackController(story.root, toaster)
    button.addEventListener('click', () =>
      toaster.create({ title: 'Mise à jour disponible', closable: true }),
    )
    story.setSource(
      `<div id="notifications"></div>\n<script>enhanceToaster(document.querySelector("#notifications"))</script>`,
    )
    return story.root
  },
}
