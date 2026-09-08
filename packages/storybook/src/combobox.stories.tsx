import { createCombobox, enhanceCombobox } from "@lilian1315/faisceau-ui";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { asDom, createStoryShell, formatValues, trackController } from "./story.tsx";

interface ComboboxStoryArgs {
  clearLabel: string;
  description: string;
  disabled: boolean;
  emptyLabel: string;
  label: string;
  multiple: boolean;
  placeholder: string;
  required: boolean;
}

const cities = [
  { value: "paris", label: "Paris", description: "Île-de-France" },
  { value: "lyon", label: "Lyon", description: "Auvergne-Rhône-Alpes" },
  { value: "bordeaux", label: "Bordeaux", description: "Nouvelle-Aquitaine" },
  { value: "lille", label: "Lille", description: "Hauts-de-France" },
  { value: "nantes", label: "Nantes", description: "Pays de la Loire" },
  { value: "rennes", label: "Rennes", description: "Bretagne" },
] as const;

const meta = {
  args: {
    clearLabel: "Effacer la recherche",
    description: "Saisissez quelques lettres pour filtrer les suggestions.",
    disabled: false,
    emptyLabel: "Aucune ville trouvée",
    label: "Ville",
    multiple: false,
    placeholder: "Rechercher une ville…",
    required: false,
  },
  argTypes: {
    clearLabel: { control: "text", description: "Nom accessible de l’action d’effacement." },
    description: { control: "text", description: "Texte d’aide relié à la saisie." },
    disabled: { control: "boolean", description: "Désactive la saisie et les actions." },
    emptyLabel: {
      control: "text",
      description: "Message affiché quand le filtre ne retourne rien.",
    },
    label: { control: "text", description: "Libellé visible et accessible." },
    multiple: {
      control: "boolean",
      description: "Affiche les valeurs choisies sous forme de tags.",
    },
    placeholder: { control: "text", description: "Indication affichée dans la saisie vide." },
    required: { control: "boolean", description: "Active la validation HTML native." },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Combobox filtrable pilotée par Zag.js. La collection visuelle se synchronise avec un `<select>` natif utilisable par FormData et la validation du navigateur.",
      },
    },
  },
  title: "Combobox/Anatomie",
} satisfies Meta<ComboboxStoryArgs>;

export default meta;
type Story = StoryObj<ComboboxStoryArgs>;

export const CreeDeToutesPieces: Story = {
  name: "Créée de toutes pièces",
  render: (args) => {
    const story = createStoryShell({
      description:
        "La factory assemble la saisie, la liste filtrable, l’état vide et le select natif.",
      eyebrow: "createCombobox",
      title: "Construction programmatique",
    });
    const host = asDom<HTMLDivElement>(<div />);
    story.canvas.append(host);
    const controller = createCombobox({
      ...args,
      defaultValue: args.multiple ? ["paris", "lyon"] : [],
      getRemoveLabel: (item) => `Retirer ${item.label}`,
      items: cities,
      name: args.multiple ? "cities" : "city",
      onValueChange: ({ value }) => {
        story.output.textContent = `Valeur native : ${formatValues(value)}`;
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

export const MarkupExistant: Story = {
  name: "Enhancement du markup existant",
  render: (args) => {
    const story = createStoryShell({
      description:
        "Les options du select deviennent la collection filtrable ; aucun markup Zag n’est requis.",
      eyebrow: "enhanceCombobox",
      title: "Progressive enhancement",
    });
    const root = asDom<HTMLDivElement>(
      <div>
        <select aria-label={args.label} name="command" required={args.required}>
          <option value="search">Rechercher</option>
          <option value="create">Créer un document</option>
          <option value="share">Partager</option>
          <option value="archive">Archiver</option>
        </select>
      </div>,
    );
    story.setSource(`<div>
  <select name="command" aria-label="${args.label}"${args.required ? " required" : ""}>
    <option value="search">Rechercher</option>
    <option value="create">Créer un document</option>
    <option value="share">Partager</option>
    <option value="archive">Archiver</option>
  </select>
</div>`);
    story.canvas.append(root);
    const controller = enhanceCombobox(root, {
      clearLabel: args.clearLabel,
      description: args.description,
      disabled: args.disabled,
      emptyLabel: args.emptyLabel,
      placeholder: args.placeholder,
    });
    trackController(story.root, controller);
    const nativeSelect = root.querySelector("select")!;
    nativeSelect.addEventListener("change", () => {
      story.output.textContent = `Événement change · value = ${nativeSelect.value}`;
    });
    return story.root;
  },
};

export const SelectionMultiple: Story = {
  name: "Sélection multiple et tags",
  args: { multiple: true },
  render: (args) => CreeDeToutesPieces.render!(args, {} as never),
};

export const EtatVide: Story = {
  name: "Filtre sans résultat",
  parameters: {
    docs: {
      description: {
        story: "Ouvrez la liste puis saisissez une valeur absente pour observer l’état vide.",
      },
    },
  },
  render: (args) => CreeDeToutesPieces.render!(args, {} as never),
};

export const FormulaireNatif: Story = {
  name: "Dans un formulaire natif",
  args: { multiple: true, required: true },
  render: (args) => {
    const story = createStoryShell({
      description: "En mode multiple, FormData reçoit une entrée par option sélectionnée.",
      eyebrow: "FormData · multiple · reset",
      title: "Contrat de formulaire natif",
    });
    const form = asDom<HTMLFormElement>(<form />);
    const host = asDom<HTMLDivElement>(<div />);
    const actions = asDom<HTMLDivElement>(
      <div class="fui-story__actions">
        <button class="fui-story__button" type="submit">
          Envoyer
        </button>
        <button class="fui-story__button" type="reset">
          Réinitialiser
        </button>
      </div>,
    );
    form.append(host, actions);
    story.canvas.append(form);
    const controller = createCombobox({
      ...args,
      defaultValue: ["paris", "lyon"],
      getRemoveLabel: (item) => `Retirer ${item.label}`,
      items: cities,
      name: "cities",
    }).mount(host);
    trackController(story.root, controller);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      story.output.textContent = `FormData : ${JSON.stringify([...new FormData(form).entries()])}`;
    });
    form.addEventListener("reset", () => {
      queueMicrotask(() => {
        story.output.textContent = `Après reset : ${formatValues(controller.api.peek().value)}`;
      });
    });
    story.setSource(`<form>
  <select name="cities" multiple required>…</select>
  <button type="submit">Envoyer</button>
  <button type="reset">Réinitialiser</button>
</form>`);
    return story.root;
  },
};
