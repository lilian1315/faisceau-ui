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
        "La machine Zag Drawer gère le focus, les snap points et les gestes de glissement. Le trigger reste externe. Le corps défile indépendamment de la zone de grip et du header, avec des ombres de bordure apparaissant quand le contenu dépasse les bords.",
    });
    const trigger = asDom<HTMLButtonElement>(
      <button class="fui-story__button" id="story-drawer-trigger" type="button">
        Ouvrir le panneau
      </button>,
    );
    const host = asDom<HTMLDivElement>(<div />);
    story.canvas.append(trigger, host);
    trackController(
      story.root,
      createDrawer({
        ...args,
        snapPoints: [0.5, 1],
        swipeArea: true,
        triggerSelector: "#story-drawer-trigger",
        title: "Filtres",
        description: "Affinez les résultats affichés.",
        content: Array.from(
          { length: 20 },
          (_, i) =>
            `Ligne de filtre ${i + 1} — texte suffisant pour permettre le défilement du corps du panneau.`,
        ).join("\n"),
      }).mount(host),
    );
    story.setSource(
      `createDrawer({ swipeDirection: "${args.swipeDirection}", snapPoints: [0.5, 1], swipeArea: true, triggerSelector, title, content }).mount(target)`,
    );
    return story.root;
  },
};

export const enhance: Story = {
  render: (args) => {
    const story = createStoryShell({
      eyebrow: "enhanceDrawer",
      title: "Drawer enrichi",
      description:
        "Seul le contenu métier est nécessaire dans le HTML initial ; le trigger est externe.",
    });
    const trigger = asDom<HTMLButtonElement>(
      <button class="fui-story__button" id="story-drawer-enhance-trigger" type="button">
        Navigation
      </button>,
    );
    const root = asDom<HTMLDivElement>(
      <div class="fui-drawer">
        <aside class="fui-drawer-content">
          <h2 class="fui-drawer-title">Navigation</h2>
          <nav>Accueil · Documents · Réglages</nav>
          <p>Ligne 1 — texte suffisant pour permettre le défilement.</p>
          <p>Ligne 2 — texte suffisant pour permettre le défilement.</p>
          <p>Ligne 3 — texte suffisant pour permettre le défilement.</p>
          <p>Ligne 4 — texte suffisant pour permettre le défilement.</p>
          <p>Ligne 5 — texte suffisant pour permettre le défilement.</p>
          <p>Ligne 6 — texte suffisant pour permettre le défilement.</p>
          <p>Ligne 7 — texte suffisant pour permettre le défilement.</p>
          <p>Ligne 8 — texte suffisant pour permettre le défilement.</p>
          <p>Ligne 9 — texte suffisant pour permettre le défilement.</p>
          <p>Ligne 10 — texte suffisant pour permettre le défilement.</p>
        </aside>
      </div>,
    );
    story.canvas.append(trigger, root);
    trackController(
      story.root,
      enhanceDrawer(root, { ...args, triggerSelector: "#story-drawer-enhance-trigger" }),
    );
    story.setSource(
      `<button id="story-drawer-enhance-trigger">Navigation</button>\n<div class="fui-drawer">\n  <aside class="fui-drawer-content">…</aside>\n</div>`,
    );
    return story.root;
  },
};
