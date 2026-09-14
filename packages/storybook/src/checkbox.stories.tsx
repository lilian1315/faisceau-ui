import { createCheckbox, enhanceCheckbox, type CheckboxProps } from "faisceau-ui";
import { asDom } from "@lilian1315/create-element/faisceau/jsx-runtime";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { createStoryShell, trackController } from "./story.tsx";
import { h } from "@lilian1315/create-element/faisceau";

type CheckboxStoryArgs = CheckboxProps;

const meta = {
  argTypes: {
    label: { control: "text", description: "Libellé visible et accessible." },
    description: { control: "text", description: "Aide associée au champ." },
    defaultChecked: { control: "boolean", description: "État initial du contrôle natif." },
    disabled: { control: "boolean", description: "Empêche toute interaction." },
    invalid: { control: "boolean", description: "Expose l’état invalide." },
    readOnly: {
      control: "boolean",
      description: "Affiche la valeur sans permettre sa modification.",
    },
    required: { control: "boolean", description: "Active la validation native required." },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Checkbox Zag reliée à un véritable input natif. Le clic, FormData, required et reset conservent la sémantique du navigateur.",
      },
    },
  },
  title: "Checkbox/Anatomie",
} satisfies Meta<CheckboxStoryArgs>;

export default meta;
type Story = StoryObj<CheckboxStoryArgs>;

export const create: Story = {
  args: {
    label: "Recevoir les nouveautés",
    description: "Vous pourrez modifier ce choix plus tard.",
    defaultChecked: "indeterminate",
  },

  name: "create()",

  render: (args) => {
    const story = createStoryShell({
      description:
        "La factory génère l’input natif, le contrôle visuel, l’indicateur et les messages.",
      eyebrow: "createCheckbox",
      title: "Construction programmatique",
    });
    const host = h("div");
    story.canvas.append(host);
    const controller = createCheckbox({
      ...args,
      onCheckedChange: ({ checked }) => {
        story.output.textContent = `checked = ${String(checked)}`;
      },
    }).mount(host);
    trackController(story.root, controller);
    story.setSource(`createCheckbox({
      label: "${args.label}",
      name: "newsletter",
      value: "yes",
      defaultChecked: ${args.defaultChecked},
      required: ${args.required}
    }).mount(target)`);
    return story.root;
  },
};

export const enhance: Story = {
  name: "enhance()",
  render: (args) => {
    const story = createStoryShell({
      description:
        "Le conteneur et son input suffisent ; le script génère toutes les parts visuelles.",
      eyebrow: "enhanceCheckbox",
      title: "Progressive enhancement",
    });
    const root = asDom<"label">(
      <label class="fui-checkbox">
        <input type="checkbox" class="fui-checkbox-input" checked />
        <span class="fui-label">Recevoir les nouveautés</span>
        <p class="fui-field-description">Vous pourrez modifier ce choix plus tard.</p>
      </label>,
    );

    const source = root.outerHTML;

    story.canvas.append(root);
    const controller = enhanceCheckbox(root, args);

    trackController(story.root, controller);
    story.setSource(source);
    return story.root;
  },
};
