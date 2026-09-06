import { createDrawer, enhanceDrawer } from "@lilian1315/faisceau-ui";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { asDom, createStoryShell, trackController } from "./story.js";

interface Args {
  side: "top" | "right" | "bottom" | "left";
}
const meta = {
  args: { side: "right" },
  argTypes: { side: { control: "inline-radio", options: ["top", "right", "bottom", "left"] } },
  title: "Drawer/Anatomie",
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

export const CreeDeToutesPieces: Story = {
  render: (args) => {
    const story = createStoryShell({
      eyebrow: "createDrawer",
      title: "Panneau latéral",
      description:
        "Le Drawer réutilise la sémantique, le focus trap et la fermeture de Zag Dialog.",
    });
    const host = asDom<HTMLDivElement>(<div />);
    story.canvas.append(host);
    trackController(
      story.root,
      createDrawer({
        ...args,
        trigger: "Ouvrir le panneau",
        title: "Filtres",
        description: "Affinez les résultats affichés.",
        content: "Contrôles de filtrage.",
      }).mount(host),
    );
    story.setSource(
      `createDrawer({ side: "${args.side}", trigger, title, content }).mount(target)`,
    );
    return story.root;
  },
};

export const MarkupExistant: Story = {
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
