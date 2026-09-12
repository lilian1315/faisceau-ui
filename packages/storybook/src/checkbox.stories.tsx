import { createCheckbox, enhanceCheckbox } from "faisceau-ui";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { asDom, createStoryShell, trackController } from "./story.tsx";

interface CheckboxStoryArgs {
  checked: boolean;
  description: string;
  disabled: boolean;
  invalid: boolean;
  label: string;
  readOnly: boolean;
  required: boolean;
}

const meta = {
  args: {
    checked: false,
    description: "Vous pourrez modifier ce choix plus tard.",
    disabled: false,
    invalid: false,
    label: "Recevoir les nouveautés",
    readOnly: false,
    required: false,
  },
  argTypes: {
    checked: { control: "boolean", description: "État initial du contrôle natif." },
    description: { control: "text", description: "Aide associée au champ." },
    disabled: { control: "boolean", description: "Empêche toute interaction." },
    invalid: { control: "boolean", description: "Expose l’état invalide." },
    label: { control: "text", description: "Libellé visible et accessible." },
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
  name: "create()",
  render: (args) => {
    const story = createStoryShell({
      description:
        "La factory génère l’input natif, le contrôle visuel, l’indicateur et les messages.",
      eyebrow: "createCheckbox",
      title: "Construction programmatique",
    });
    const host = asDom<HTMLDivElement>(<div />);
    story.canvas.append(host);
    const { checked, ...options } = args;
    const controller = createCheckbox({
      ...options,
      defaultChecked: checked,
      errorMessage: args.invalid ? "Ce choix doit être confirmé." : undefined,
      name: "newsletter",
      onCheckedChange: ({ checked }) => {
        story.output.textContent = `checked = ${String(checked)}`;
      },
      value: "yes",
    }).mount(host);
    trackController(story.root, controller);
    story.setSource(`createCheckbox({
  label: "${args.label}",
  name: "newsletter",
  value: "yes",
  defaultChecked: ${args.checked},
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
    const template = createCheckbox({
      checked: args.checked,
      description: args.description,
      label: args.label,
      name: "notifications",
      required: args.required,
      value: "enabled",
    });
    const root = template.root.cloneNode(true) as HTMLDivElement;
    template.destroy();
    story.canvas.append(root);
    const controller = enhanceCheckbox(root, {
      description: args.description,
      disabled: args.disabled,
      invalid: args.invalid,
      readOnly: args.readOnly,
    });
    trackController(story.root, controller);
    story.setSource(`<div class="fui-field">
  <label class="fui-field-label">${args.label}</label>
  <div class="fui-checkbox">
    <input class="fui-native-checkbox" type="checkbox" name="notifications" value="enabled">
    <span class="fui-checkbox-control">…</span>
  </div>
  <p class="fui-field-description">${args.description}</p>
</div>`);
    return story.root;
  },
};
