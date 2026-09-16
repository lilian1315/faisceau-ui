import { createSelect, enhanceSelect, type SelectProps } from "faisceau-ui";
import { asDom } from "@lilian1315/create-element/faisceau/jsx-runtime";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { createStoryShell, trackController } from "./story.tsx";
import { h } from "@lilian1315/create-element/faisceau";

type SelectStoryArgs = SelectProps;

const countries = [
  { value: "fr", label: "France", description: "Europe" },
  { value: "be", label: "Belgique", description: "Europe" },
  { value: "ch", label: "Suisse", description: "Europe" },
  { value: "mc", label: "Monaco", disabled: true },
] as const;

const meta = {
  argTypes: {
    alignItemWithTrigger: {
      control: "boolean",
      description: "Centre le positionneur sur l’option sélectionnée. Désactivé en mode multiple.",
    },
    label: { control: "text", description: "Libellé visible et accessible." },
    description: { control: "text", description: "Aide associée au champ." },
    multiple: { control: "boolean", description: "Autorise plusieurs valeurs." },
    placeholder: { control: "text", description: "Texte affiché sans sélection." },
    clearable: { control: "boolean", description: "Affiche une action pour vider la sélection." },
    disabled: { control: "boolean", description: "Empêche toute interaction." },
    required: { control: "boolean", description: "Active la validation native required." },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Select Zag relié à un véritable select natif. Le clic, FormData, required et reset conservent la sémantique du navigateur.",
      },
    },
  },
  title: "Select/Anatomie",
} satisfies Meta<SelectStoryArgs>;

export default meta;
type Story = StoryObj<SelectStoryArgs>;

export const create: Story = {
  args: {
    label: "Pays",
    description: "Sélectionnez un pays dans une liste fermée.",
    placeholder: "Choisir un pays",
  },

  name: "create()",

  render: (args) => {
    const story = createStoryShell({
      description: "La factory génère le select natif, le trigger, le popup et les options.",
      eyebrow: "createSelect",
      title: "Construction programmatique",
    });
    const host = h("div");
    story.canvas.append(host);
    const controller = createSelect({
      ...args,
      defaultValue: args.multiple ? ["fr", "be"] : ["fr"],
      items: countries,
      name: args.multiple ? "countries" : "country",
      onValueChange: ({ value }) => {
        story.output.textContent = `value = ${value.join(", ") || "(vide)"}`;
      },
    }).mount(host);
    trackController(story.root, controller);
    story.setSource(`createSelect({
      label: "${args.label}",
      name: "country",
      items: countries,
      defaultValue: ["fr"]
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
      eyebrow: "enhanceSelect",
      title: "Progressive enhancement",
    });
    const root = asDom<"div">(
      <div class="fui-select">
        <label class="fui-field-label">Pays</label>
        <select class="fui-select-native-select" name="country">
          <option value="fr" selected>
            France
          </option>
          <option value="be">Belgique</option>
        </select>
      </div>,
    );

    const source = root.outerHTML;

    story.canvas.append(root);
    const controller = enhanceSelect(root, args);

    trackController(story.root, controller);
    story.setSource(source);
    return story.root;
  },
};
