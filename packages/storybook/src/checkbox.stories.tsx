import { createCheckbox, enhanceCheckbox } from "@lilian1315/faisceau-ui";
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

export const CreeDeToutesPieces: Story = {
  name: "Créée de toutes pièces",
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

export const MarkupExistant: Story = {
  name: "Enhancement du markup existant",
  render: (args) => {
    const story = createStoryShell({
      description:
        "Le conteneur et son input suffisent ; le script génère toutes les parts visuelles.",
      eyebrow: "enhanceCheckbox",
      title: "Progressive enhancement",
    });
    const root = asDom<HTMLDivElement>(
      <div>
        <input
          aria-label={args.label}
          checked={args.checked}
          name="notifications"
          required={args.required}
          type="checkbox"
          value="enabled"
        />
      </div>,
    );
    story.canvas.append(root);
    const controller = enhanceCheckbox(root, {
      description: args.description,
      disabled: args.disabled,
      invalid: args.invalid,
      readOnly: args.readOnly,
    });
    trackController(story.root, controller);
    story.setSource(`<div>
  <input type="checkbox" name="notifications" value="enabled" aria-label="${args.label}">
</div>`);
    return story.root;
  },
};

export const FormulaireNatif: Story = {
  name: "Dans un formulaire natif",
  args: { checked: true, required: true },
  render: (args) => {
    const story = createStoryShell({
      description:
        "Soumettez puis réinitialisez le formulaire pour observer le contrat HTML natif.",
      eyebrow: "FormData · validity · reset",
      title: "Contrat de formulaire natif",
    });
    const form = asDom<HTMLFormElement>(
      <form>
        <div data-host />
        <div class="fui-story__actions">
          <button class="fui-story__button" type="submit">
            Envoyer
          </button>
          <button class="fui-story__button" type="reset">
            Réinitialiser
          </button>
        </div>
      </form>,
    );
    story.canvas.append(form);
    const host = form.querySelector<HTMLElement>("[data-host]")!;
    const { checked, ...options } = args;
    const controller = createCheckbox({
      ...options,
      defaultChecked: checked,
      label: args.label,
      name: "terms",
      value: "accepted",
    }).mount(host);
    trackController(story.root, controller);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      story.output.textContent = `FormData : ${JSON.stringify([...new FormData(form).entries()])}`;
    });
    form.addEventListener("reset", () => {
      queueMicrotask(() => {
        story.output.textContent = `Après reset : checked = ${controller.api.peek().checked}`;
      });
    });
    story.setSource(`<form>
  <input type="checkbox" name="terms" value="accepted" required>
  <button type="submit">Envoyer</button>
  <button type="reset">Réinitialiser</button>
</form>`);
    return story.root;
  },
};
