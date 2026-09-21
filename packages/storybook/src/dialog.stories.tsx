import { createDialog, enhanceDialog } from "faisceau-ui";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { asDom, createStoryShell, trackController } from "./story.tsx";

const meta = { title: "Dialog/Anatomie" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const create: Story = {
  render: () => {
    const story = createStoryShell({
      eyebrow: "createDialog",
      title: "Dialogue modale",
      description:
        "Backdrop, positioner, contenu titré et bouton de fermeture sont reliés à Zag Dialog. Les triggers restent externes et sont désignés par triggerSelector. Le corps de la boîte défile indépendamment du header, avec des ombres de bordure apparaissant quand le contenu dépasse les bords.",
    });
    const trigger = asDom<HTMLButtonElement>(
      <button class="fui-story__button" id="story-dialog-trigger" type="button">
        Modifier le profil
      </button>,
    );
    const host = asDom<HTMLDivElement>(<div />);
    story.canvas.append(trigger, host);
    const controller = createDialog({
      triggerSelector: "#story-dialog-trigger",
      title: "Modifier le profil",
      description: "Les changements seront visibles immédiatement.",
      footer: "Annuler · Enregistrer les modifications",
      content: Array.from(
        { length: 20 },
        (_, i) =>
          `Ligne de contenu numéro ${i + 1} — texte suffisant pour permettre le défilement du corps de la boîte de dialogue.`,
      ).join("\n"),
    }).mount(host);
    trackController(story.root, controller);
    story.setSource(
      `createDialog({ triggerSelector: "#story-dialog-trigger", title, description, content, footer }).mount(target)`,
    );
    return story.root;
  },
};

export const enhance: Story = {
  render: () => {
    const story = createStoryShell({
      eyebrow: "enhanceDialog",
      title: "Progressive enhancement",
      description:
        "Le script conserve le contenu, puis génère les éléments structurels manquants. Un bouton externe ouvre le dialogue via triggerSelector.",
    });
    const trigger = asDom<HTMLButtonElement>(
      <button class="fui-story__button" id="story-dialog-enhance-trigger" type="button">
        Supprimer
      </button>,
    );
    const root = asDom<HTMLDivElement>(
      <div class="fui-dialog">
        <section class="fui-dialog-content">
          <h2 class="fui-dialog-title">Supprimer le document ?</h2>
          <p>Cette action est définitive.</p>
          <p>Ligne 1 — texte suffisant pour permettre le défilement du corps.</p>
          <p>Ligne 2 — texte suffisant pour permettre le défilement du corps.</p>
          <p>Ligne 3 — texte suffisant pour permettre le défilement du corps.</p>
          <p>Ligne 4 — texte suffisant pour permettre le défilement du corps.</p>
          <p>Ligne 5 — texte suffisant pour permettre le défilement du corps.</p>
          <p>Ligne 6 — texte suffisant pour permettre le défilement du corps.</p>
          <p>Ligne 7 — texte suffisant pour permettre le défilement du corps.</p>
          <p>Ligne 8 — texte suffisant pour permettre le défilement du corps.</p>
          <p>Ligne 9 — texte suffisant pour permettre le défilement du corps.</p>
          <p>Ligne 10 — texte suffisant pour permettre le défilement du corps.</p>
          <footer class="fui-dialog-footer">Annuler · Supprimer le document</footer>
        </section>
      </div>,
    );
    story.canvas.append(trigger, root);
    trackController(
      story.root,
      enhanceDialog(root, { triggerSelector: "#story-dialog-enhance-trigger" }),
    );
    story.setSource(
      `<button id="story-dialog-enhance-trigger">Supprimer</button>\n<div class="fui-dialog">\n  <section class="fui-dialog-content">\n    …\n    <footer class="fui-dialog-footer">…</footer>\n  </section>\n</div>`,
    );
    return story.root;
  },
};
