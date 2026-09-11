import { createTooltip, enhanceTooltip } from "faisceau-ui";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { asDom, createStoryShell, trackController } from "./story.tsx";

interface TooltipStoryArgs {
  closeDelay: number;
  content: string;
  disabled: boolean;
  interactive: boolean;
  openDelay: number;
  placement: "top" | "right" | "bottom" | "left";
  trigger: string;
}

const meta = {
  args: {
    closeDelay: 150,
    content: "Créer un nouveau document",
    disabled: false,
    interactive: false,
    openDelay: 400,
    placement: "top",
    trigger: "Créer",
  },
  argTypes: {
    closeDelay: {
      control: { min: 0, step: 50, type: "number" },
      description: "Délai avant fermeture.",
    },
    content: { control: "text", description: "Texte concis exposé au survol et au focus." },
    disabled: { control: "boolean", description: "Désactive l’affichage du tooltip." },
    interactive: {
      control: "boolean",
      description: "Maintient le contenu ouvert lorsqu’il est survolé.",
    },
    openDelay: {
      control: { min: 0, step: 50, type: "number" },
      description: "Délai avant ouverture.",
    },
    placement: { control: "inline-radio", options: ["top", "right", "bottom", "left"] },
    trigger: { control: "text", description: "Texte du bouton généré." },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Tooltip Zag accessible au pointeur, au clavier et à Escape. L’enhancement remplace temporairement title afin d’éviter deux infobulles concurrentes.",
      },
    },
  },
  title: "Tooltip/Anatomie",
} satisfies Meta<TooltipStoryArgs>;

export default meta;
type Story = StoryObj<TooltipStoryArgs>;

export const CreeDeToutesPieces: Story = {
  name: "Créé de toutes pièces",
  render: (args) => {
    const story = createStoryShell({
      description: "Survolez le bouton ou donnez-lui le focus pour afficher le contenu positionné.",
      eyebrow: "createTooltip",
      title: "Construction programmatique",
    });
    const host = asDom<HTMLDivElement>(<div />);
    story.canvas.append(host);
    const { placement, ...options } = args;
    const controller = createTooltip({
      ...options,
      onOpenChange: ({ open }) => {
        story.output.textContent = `open = ${open}`;
      },
      positioning: { placement },
    }).mount(host);
    trackController(story.root, controller);
    story.setSource(`createTooltip({
  trigger: "${args.trigger}",
  content: "${args.content}",
  openDelay: ${args.openDelay},
  positioning: { placement: "${args.placement}" }
}).mount(target)`);
    return story.root;
  },
};

export const TriggerExistant: Story = {
  name: "Enhancement d’un trigger existant",
  render: (args) => {
    const story = createStoryShell({
      description: "L’attribut title fournit le contenu puis est restauré au teardown.",
      eyebrow: "enhanceTooltip",
      title: "Progressive enhancement",
    });
    const trigger = asDom<HTMLButtonElement>(
      <button class="fui-story__button" title={args.content} type="button">
        {args.trigger}
      </button>,
    );
    story.canvas.append(trigger);
    const controller = enhanceTooltip(trigger, {
      closeDelay: args.closeDelay,
      disabled: args.disabled,
      interactive: args.interactive,
      openDelay: args.openDelay,
      positioning: { placement: args.placement },
    });
    trackController(story.root, controller);
    story.setSource(`<button type="button" title="${args.content}">${args.trigger}</button>`);
    return story.root;
  },
};

export const SansDelai: Story = {
  name: "Sans délai",
  args: { closeDelay: 0, openDelay: 0 },
  render: (args) => CreeDeToutesPieces.render!(args, {} as never),
};
