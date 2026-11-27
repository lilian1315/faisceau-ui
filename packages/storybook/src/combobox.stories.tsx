import { combobox, createCombobox, enhanceCombobox, type ComboboxProps } from 'faisceau-ui'
import { build } from '@lilian1315/create-element/faisceau/virtual/dom'
import type { Meta, StoryObj } from '@storybook/html-vite'

import { createStoryShell, trackController } from './story.tsx'
import { createElement as h } from '@lilian1315/create-element/faisceau'

type ComboboxStoryArgs = ComboboxProps

const cities = [
  { value: 'paris', label: 'Paris', description: 'Île-de-France' },
  { value: 'lyon', label: 'Lyon', description: 'Auvergne-Rhône-Alpes' },
  { value: 'bordeaux', label: 'Bordeaux', description: 'Nouvelle-Aquitaine' },
  { value: 'lille', label: 'Lille', description: 'Hauts-de-France' },
  { value: 'nantes', label: 'Nantes', description: 'Pays de la Loire' },
  { value: 'rennes', label: 'Rennes', description: 'Bretagne' },
] as const

const meta = {
  argTypes: {
    selectSameValue: {
      control: 'boolean',
      description: 'Sélectionne ensemble les options de même valeur soumise.',
    },
    label: { control: 'text', description: 'Libellé visible et accessible.' },
    description: { control: 'text', description: 'Aide associée au champ.' },
    multiple: {
      control: 'boolean',
      description: 'Affiche les valeurs choisies sous forme de tags.',
    },
    placeholder: { control: 'text', description: 'Indication affichée dans la saisie vide.' },
    emptyLabel: {
      control: 'text',
      description: 'Message affiché quand le filtre ne retourne rien.',
    },
    clearLabel: {
      control: 'text',
      description: 'Nom accessible de l’action d’effacement.',
    },
    disabled: { control: 'boolean', description: 'Empêche toute interaction.' },
    required: { control: 'boolean', description: 'Active la validation native required.' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Combobox Zag reliée à un véritable select natif. La saisie filtre la liste, FormData, required et reset conservent la sémantique du navigateur.',
      },
    },
  },
  title: 'Combobox/Anatomie',
} satisfies Meta<ComboboxStoryArgs>

export default meta
type Story = StoryObj<ComboboxStoryArgs>

export const create: Story = {
  args: {
    label: 'Ville',
    description: 'Saisissez quelques lettres pour filtrer les suggestions.',
    placeholder: 'Rechercher une ville…',
    emptyLabel: 'Aucune ville trouvée',
  },

  name: 'create()',

  render: (args) => {
    const story = createStoryShell({
      description: 'La factory génère le select natif, la saisie, le popup et les options.',
      eyebrow: 'createCombobox',
      title: 'Construction programmatique',
    })
    const host = h('div')
    story.canvas.append(host)
    const controller = createCombobox({
      ...args,
      defaultValue: args.defaultValue ?? (args.multiple ? ['paris', 'lyon'] : []),
      getRemoveLabel: (item) => `Retirer ${item.label}`,
      items: args.items ?? cities,
      name: args.multiple ? 'cities' : 'city',
      onValueChange: ({ value }) => {
        story.output.textContent = `value = ${value.join(', ') || '(vide)'}`
      },
    }).mount(host)
    trackController(story.root, controller)
    story.setSource(`createCombobox({
      label: "${args.label}",
      name: "${args.multiple ? 'cities' : 'city'}",
      items: args.items ?? cities,
      multiple: ${args.multiple},
      emptyLabel: "${args.emptyLabel}"
    }).mount(target)`)
    return story.root
  },
}

export const enhance: Story = {
  name: 'enhance()',

  render: (args) => {
    const story = createStoryShell({
      description:
        'Le conteneur et son select suffisent ; le script génère toutes les parts visuelles.',
      eyebrow: 'enhanceCombobox',
      title: 'Progressive enhancement',
    })
    const root = build<'div'>(
      <div class="fui-combobox">
        <label class="fui-field-label">Ville</label>
        <select class="fui-combobox-native-select" name="city">
          <option value="" data-placeholder="" hidden>
            Rechercher une ville…
          </option>
          <optgroup label="France">
            <option data-id="city-paris" value="paris" selected>
              Paris
            </option>
            <option data-id="city-lyon" value="lyon">
              Lyon
            </option>
            <option data-id="city-bordeaux" value="bordeaux">
              Bordeaux
            </option>
          </optgroup>
        </select>
      </div>,
    )

    const source = root.outerHTML

    story.canvas.append(root)
    const controller = enhanceCombobox(root, args)

    trackController(story.root, controller)
    story.setSource(source)
    return story.root
  },
}

export const Groups: Story = {
  ...create,
  name: 'Groups',
  args: {
    ...create.args,
    items: [
      { value: 'paris', label: 'Paris', group: 'France' },
      { value: 'lyon', label: 'Lyon', group: 'France' },
      { value: 'brussels', label: 'Bruxelles', group: 'Belgique' },
      { value: 'liege', label: 'Liège', group: 'Belgique', disabled: true },
    ],
  },
}

export const SameValues: Story = {
  ...create,
  name: 'Same submitted value',
  args: {
    label: 'Livraison',
    multiple: true,
    selectSameValue: true,
    defaultValue: [],
    items: [
      { id: 'home', value: 'standard', label: 'Livraison à domicile' },
      { id: 'home-alt', value: 'standard', label: 'Livraison à domicile' },
      { id: 'pickup', value: 'standard', label: 'Point relais' },
      { id: 'express', value: 'express', label: 'Livraison express' },
    ],
  },
}

export const DynamicCollection: Story = {
  name: 'setItems()',
  render() {
    const story = createStoryShell({
      eyebrow: 'Combobox · collection',
      title: 'Actualiser les suggestions',
      description:
        'La collection pilote les résultats et le select natif. La saisie en cours continue de filtrer les nouvelles données.',
    })
    const controller = combobox
      .createCombobox({
        label: 'Ville',
        name: 'city',
        items: combobox.collection({ items: cities.slice(0, 3) }),
      })
      .mount(story.canvas)
    const refresh = build<'button'>(
      <button
        type="button"
        onclick={() => controller.setItems(combobox.collection({ items: [...cities] }))}
      >
        Charger toutes les villes
      </button>,
    )
    story.canvas.prepend(refresh)
    trackController(story.root, controller)
    story.setSource(`import * as combobox from 'faisceau-ui/combobox'

const controller = combobox.createCombobox({
  label: 'Ville',
  items: combobox.collection({ items: cities.slice(0, 3) }),
}).mount(target)

controller.setItems(combobox.collection({ items: cities }))`)
    return story.root
  },
}
