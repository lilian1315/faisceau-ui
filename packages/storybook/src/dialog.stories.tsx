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
        "Trigger, backdrop, positioner, contenu titré et bouton de fermeture sont reliés à Zag Dialog.",
    });
    const host = asDom<HTMLDivElement>(<div />);
    story.canvas.append(host);
    const controller = createDialog({
      trigger: "Modifier le profil",
      title: "Modifier le profil",
      description: "Les changements seront visibles immédiatement.",
      content: "Formulaire ou contenu libre.",
    }).mount(host);
    trackController(story.root, controller);
    story.setSource(`createDialog({ trigger, title, description, content }).mount(target)`);
    return story.root;
  },
};

export const enhance: Story = {
  render: () => {
    const story = createStoryShell({
      eyebrow: "enhanceDialog",
      title: "Progressive enhancement",
      description:
        "Le script conserve le trigger et le contenu, puis génère les éléments structurels manquants.",
    });
    const root = asDom<HTMLDivElement>(
      <div>
        <button class="fui-story__button" data-fui-part="trigger" type="button">
          Supprimer
        </button>
        <section data-fui-part="content">
          <h2 data-fui-part="title">Supprimer le document ?</h2>
          <p>Cette action est définitive.</p>
        </section>
      </div>,
    );
    story.canvas.append(root);
    trackController(story.root, enhanceDialog(root));
    story.setSource(
      `<div>\n  <button data-fui-part="trigger">Supprimer</button>\n  <section data-fui-part="content">…</section>\n</div>`,
    );
    return story.root;
  },
};
