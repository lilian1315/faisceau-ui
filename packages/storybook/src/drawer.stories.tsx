import { createDrawer, enhanceDrawer } from "faisceau-ui";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { asDom, createStoryShell, trackController } from "./story.tsx";

interface Args {
  swipeDirection: "up" | "down" | "start" | "end";
}
const meta = {
  args: { swipeDirection: "end" },
  argTypes: {
    swipeDirection: { control: "inline-radio", options: ["up", "down", "start", "end"] },
  },
  title: "Drawer/Anatomie",
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

export const create: Story = {
  render: (args) => {
    const story = createStoryShell({
      eyebrow: "createDrawer",
      title: "Panneau latéral",
      description:
        "La machine Zag Drawer gère le focus, les snap points et les gestes de glissement.",
    });
    const host = asDom<HTMLDivElement>(<div />);
    story.canvas.append(host);
    trackController(
      story.root,
      createDrawer({
        ...args,
        snapPoints: [0.5, 1],
        swipeArea: true,
        trigger: "Ouvrir le panneau",
        title: "Filtres",
        description: "Affinez les résultats affichés.",
        content: "Contrôles de filtrage.",
      }).mount(host),
    );
    story.setSource(
      `createDrawer({ swipeDirection: "${args.swipeDirection}", snapPoints: [0.5, 1], swipeArea: true, trigger, title, content }).mount(target)`,
    );
    return story.root;
  },
};

export const enhance: Story = {
  render: (args) => {
    const story = createStoryShell({
      eyebrow: "enhanceDrawer",
      title: "Drawer enrichi",
      description: "Seuls le trigger et le contenu métier sont nécessaires dans le HTML initial.",
    });
    const root = asDom<HTMLDivElement>(
      <div>
        <button class="fui-story__button" data-fui-part="trigger" type="button">
          Navigation
        </button>
        <aside data-fui-part="content">
          <h2 data-fui-part="title">Navigation</h2>
          <nav>Accueil · Documents · Réglages</nav>
        </aside>
      </div>,
    );
    story.canvas.append(root);
    trackController(story.root, enhanceDrawer(root, args));
    story.setSource(
      `<button data-fui-part="trigger">Navigation</button>\n<aside data-fui-part="content">…</aside>`,
    );
    return story.root;
  },
};
