import { afterEach, describe, expect, it } from "vite-plus/test";

import { createDrawer } from "./drawer.js";

afterEach(() => document.body.replaceChildren());

describe("Drawer", () => {
  it("uses the dialog accessibility model and exposes its side", async () => {
    const controller = createDrawer({
      content: "Navigation secondaire",
      snapPoints: [0.5, 1],
      swipeDirection: "start",
      swipeArea: true,
      title: "Menu",
      trigger: "Afficher le menu",
    }).mount(document.body);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(controller.root.dataset.side).toBe("left");
    expect(controller.api.get().swipeDirection).toBe("start");
    expect(controller.api.get().snapPoints).toEqual([0.5, 1]);
    expect(
      controller.root.querySelector<HTMLElement>('[data-fui-part="grabber"]')?.style.touchAction,
    ).toBe("none");
    expect(controller.root.querySelector('[data-fui-part="swipe-area"]')).not.toBeNull();
    controller.api.get().setOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(controller.root.querySelector('[data-fui-part="content"]')?.getAttribute("role")).toBe(
      "dialog",
    );
  });
});
