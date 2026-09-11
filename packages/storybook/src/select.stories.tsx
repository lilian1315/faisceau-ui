import { createSelect, enhanceSelect } from "faisceau-ui";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { asDom, createStoryShell, formatValues, trackController } from "./story.tsx";

interface SelectStoryArgs {
  alignItemWithTrigger: boolean;
  clearable: boolean;
  description: string;
  disabled: boolean;
  label: string;
  multiple: boolean;
  placeholder: string;
  required: boolean;
}

const countries = [
  { value: "fr", label: "France", description: "Europe" },
  { value: "be", label: "Belgique", description: "Europe" },
  { value: "ch", label: "Suisse", description: "Europe" },
  { value: "ca", label: "Canada", description: "Amérique du Nord" },
  { value: "mc", label: "Monaco", disabled: true },
] as const;

const meta = {
  args: {
    alignItemWithTrigger: true,
    clearable: true,
    description: "Sélectionnez un pays dans une liste fermée.",
    disabled: false,
    label: "Pays",
    multiple: false,
    placeholder: "Choisir un pays",
    required: false,
  },
  argTypes: {
    alignItemWithTrigger: {
      control: "boolean",
      description: "Centre le positionneur sur l’option sélectionnée. Désactivé en mode multiple.",
    },
    clearable: { control: "boolean", description: "Affiche une action pour vider la sélection." },
    description: { control: "text", description: "Texte d’aide relié au contrôle." },
    disabled: { control: "boolean", description: "Désactive le contrôle natif et visuel." },
    label: { control: "text", description: "Libellé visible et accessible." },
    multiple: { control: "boolean", description: "Autorise plusieurs valeurs." },
    placeholder: { control: "text", description: "Texte affiché sans sélection." },
    required: { control: "boolean", description: "Active la validation HTML native." },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Select accessible piloté par Zag.js. Chaque story expose le rendu visuel tout en conservant un `<select>` natif comme source de vérité du formulaire.",
      },
    },
  },
  title: "Select/Anatomie",
} satisfies Meta<SelectStoryArgs>;

export default meta;
type Story = StoryObj<SelectStoryArgs>;

export const CreeDeToutesPieces: Story = {
  name: "Créé de toutes pièces",
  render: (args) => {
    const story = createStoryShell({
      description:
        "La factory génère le select natif, le trigger, le popup, les options et les messages.",
      eyebrow: "createSelect",
      title: "Construction programmatique",
    });
    const host = asDom<HTMLDivElement>(<div />);
    story.canvas.append(host);

    const controller = createSelect({
      ...args,
      defaultValue: args.multiple ? ["fr", "be"] : ["fr"],
      items: countries,
      name: args.multiple ? "countries" : "country",
      onValueChange: ({ value }) => {
        story.output.textContent = `Valeur native : ${formatValues(value)}`;
      },
    }).mount(host);
    trackController(story.root, controller);
    story.output.textContent = `Valeur native : ${formatValues(controller.api.peek().value)}`;
    story.setSource(`createSelect({
  label: "${args.label}",
  name: "${args.multiple ? "countries" : "country"}",
  items: countries,
  multiple: ${args.multiple},
  alignItemWithTrigger: ${args.alignItemWithTrigger}
}).mount(target)`);
    return story.root;
  },
};

export const MarkupExistant: Story = {
  name: "Enhancement du markup existant",
  args: { clearable: false, description: "Le script ne demande que le conteneur et son select." },
  render: (args) => {
    const story = createStoryShell({
      description:
        "Le markup initial reste déclaratif ; tous les éléments visuels sont générés au démarrage.",
      eyebrow: "enhanceSelect",
      title: "Progressive enhancement",
    });
    const template = createSelect({
      defaultValue: ["staging"],
      description: args.description,
      items: [
        { label: "Développement", value: "dev" },
        { label: "Préproduction", value: "staging" },
        { label: "Production", value: "production" },
      ],
      label: args.label,
      name: "environment",
      required: args.required,
    });
    const root = template.root.cloneNode(true) as HTMLDivElement;
    template.destroy();
    story.setSource(`<div class="fui-field">
  <label class="fui-field-label">${args.label}</label>
  <div class="fui-select">
    <select class="fui-native-select" name="environment">…</select>
    <div class="fui-select-control">…</div>
    <div class="fui-select-positioner">…</div>
  </div>
  <p class="fui-field-description">${args.description}</p>
</div>`);
    story.canvas.append(root);
    const controller = enhanceSelect(root, {
      alignItemWithTrigger: args.alignItemWithTrigger,
      clearable: args.clearable,
      description: args.description,
      disabled: args.disabled,
      placeholder: args.placeholder,
    });
    trackController(story.root, controller);
    const nativeSelect = root.querySelector("select")!;
    nativeSelect.addEventListener("change", () => {
      story.output.textContent = `Événement change · value = ${nativeSelect.value || "(vide)"}`;
    });
    story.output.textContent = `Valeur native initiale : ${nativeSelect.value}`;
    return story.root;
  },
};

export const SelectionMultiple: Story = {
  name: "Sélection multiple",
  args: { clearable: false, multiple: true },
  render: (args) => CreeDeToutesPieces.render!(args, {} as never),
};

export const FormulaireNatif: Story = {
  name: "Dans un formulaire natif",
  args: { required: true },
  render: (args) => {
    const story = createStoryShell({
      description:
        "Soumission, required et reset passent par les API HTML standards du navigateur.",
      eyebrow: "FormData · validity · reset",
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
    const controller = createSelect({
      ...args,
      defaultValue: ["be"],
      items: countries,
      name: "country",
    }).mount(host);
    trackController(story.root, controller);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = [...new FormData(form).entries()];
      story.output.textContent = `FormData : ${JSON.stringify(values)}`;
    });
    form.addEventListener("reset", () => {
      queueMicrotask(() => {
        story.output.textContent = `Après reset : ${formatValues(controller.api.peek().value)}`;
      });
    });
    story.setSource(`<form>
  <select name="country" required>…</select>
  <button type="submit">Envoyer</button>
  <button type="reset">Réinitialiser</button>
</form>`);
    return story.root;
  },
};

export const EtatsEtValidation: Story = {
  name: "États et validation",
  args: {
    description: "Une aide contextuelle est associée au trigger.",
    required: true,
  },
  render: (args) => CreeDeToutesPieces.render!(args, {} as never),
};
