import { createCombobox, enhanceCombobox, type ComboboxProps } from "faisceau-ui";
import { asDom } from "@lilian1315/create-element/faisceau/jsx-runtime";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { createStoryShell, trackController } from "./story.tsx";
import { h } from "@lilian1315/create-element/faisceau";

type ComboboxStoryArgs = ComboboxProps;

const cities = [
  { value: "paris", label: "Paris", description: "Île-de-France" },
  { value: "lyon", label: "Lyon", description: "Auvergne-Rhône-Alpes" },
  { value: "bordeaux", label: "Bordeaux", description: "Nouvelle-Aquitaine" },
  { value: "lille", label: "Lille", description: "Hauts-de-France" },
  { value: "nantes", label: "Nantes", description: "Pays de la Loire" },
  { value: "rennes", label: "Rennes", description: "Bretagne" },
] as const;

const meta = {
  argTypes: {
    label: { control: "text", description: "Libellé visible et accessible." },
    description: { control: "text", description: "Aide associée au champ." },
    multiple: {
      control: "boolean",
      description: "Affiche les valeurs choisies sous forme de tags.",
    },
    placeholder: { control: "text", description: "Indication affichée dans la saisie vide." },
    emptyLabel: {
      control: "text",
      description: "Message affiché quand le filtre ne retourne rien.",
    },
    clearLabel: {
      control: "text",
      description: "Nom accessible de l’action d’effacement.",
    },
    disabled: { control: "boolean", description: "Empêche toute interaction." },
    required: { control: "boolean", description: "Active la validation native required." },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Combobox Zag reliée à un véritable select natif. La saisie filtre la liste, FormData, required et reset conservent la sémantique du navigateur.",
      },
    },
  },
  title: "Combobox/Anatomie",
} satisfies Meta<ComboboxStoryArgs>;

export default meta;
type Story = StoryObj<ComboboxStoryArgs>;

export const create: Story = {
  args: {
    label: "Ville",
    description: "Saisissez quelques lettres pour filtrer les suggestions.",
    placeholder: "Rechercher une ville…",
    emptyLabel: "Aucune ville trouvée",
  },

  name: "create()",

  render: (args) => {
    const story = createStoryShell({
      description: "La factory génère le select natif, la saisie, le popup et les options.",
      eyebrow: "createCombobox",
      title: "Construction programmatique",
    });
    const host = h("div");
    story.canvas.append(host);
    const controller = createCombobox({
      ...args,
      defaultValue: args.multiple ? ["paris", "lyon"] : [],
      getRemoveLabel: (item) => `Retirer ${item.label}`,
      items: cities,
      name: args.multiple ? "cities" : "city",
      onValueChange: ({ value }) => {
        story.output.textContent = `value = ${value.join(", ") || "(vide)"}`;
      },
    }).mount(host);
    trackController(story.root, controller);
    story.setSource(`createCombobox({
      label: "${args.label}",
      name: "${args.multiple ? "cities" : "city"}",
      items: cities,
      multiple: ${args.multiple},
      emptyLabel: "${args.emptyLabel}"
    }).mount(target)`);
    return story.root;
  },
};

export const enhance: Story = {
  name: "enhance()",

  render: (args) => {
    const story = createStoryShell({
      description:
        "Le conteneur et son select suffisent ; le script génère toutes les parts visuelles.",
      eyebrow: "enhanceCombobox",
      title: "Progressive enhancement",
    });
    const root = asDom<"div">(
      <div class="fui-combobox">
        <label data-part="label">Ville</label>
        <select data-part="native-select" name="city">
          <option value="" data-placeholder="" hidden>
            Rechercher une ville…
          </option>
          <option value="paris" selected>
            Paris
          </option>
          <option value="lyon">Lyon</option>
          <option value="bordeaux">Bordeaux</option>
        </select>
      </div>,
    );

    const source = root.outerHTML;

    story.canvas.append(root);
    const controller = enhanceCombobox(root, args);

    trackController(story.root, controller);
    story.setSource(source);
    return story.root;
  },
};
