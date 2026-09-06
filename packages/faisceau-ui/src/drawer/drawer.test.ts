import { afterEach, describe, expect, it } from "vite-plus/test";

import { createDrawer } from "./drawer.js";

afterEach(() => document.body.replaceChildren());

describe("Drawer", () => {
  it("uses the dialog accessibility model and exposes its side", async () => {
    const controller = createDrawer({
      content: "Navigation secondaire",
      side: "left",
      title: "Menu",
      trigger: "Afficher le menu",
    }).mount(document.body);
    expect(controller.root.dataset.side).toBe("left");
    controller.api.get().setOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(controller.root.querySelector('[data-fui-part="content"]')?.getAttribute("role")).toBe(
      "dialog",
    );
  });
});
