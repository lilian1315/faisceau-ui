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
      title: "Dialogue modal",
      description:
        "Backdrop, positioner, contenu titré et bouton de fermeture sont reliés à Zag Dialog. Les triggers restent externes et sont désignés par triggerSelector.",
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
      content: "Formulaire ou contenu libre.",
    }).mount(host);
    trackController(story.root, controller);
    story.setSource(
      `createDialog({ triggerSelector: "#story-dialog-trigger", title, description, content }).mount(target)`,
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
        <section data-part="content">
          <h2 data-part="title">Supprimer le document ?</h2>
          <p>Cette action est définitive.</p>
        </section>
      </div>,
    );
    story.canvas.append(trigger, root);
    trackController(
      story.root,
      enhanceDialog(root, { triggerSelector: "#story-dialog-enhance-trigger" }),
    );
    story.setSource(
      `<button id="story-dialog-enhance-trigger">Supprimer</button>\n<div class="fui-dialog">\n  <section data-part="content">…</section>\n</div>`,
    );
    return story.root;
  },
};
