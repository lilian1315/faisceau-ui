import { afterEach, describe, expect, it } from "vite-plus/test";

import { createDrawer, enhanceDrawer } from "./drawer.ts";

afterEach(() => document.body.replaceChildren());

describe("Drawer", () => {
  it("uses the dialog accessibility model and exposes its side", async () => {
    const controller = createDrawer({
      content: "Navigation secondaire",
      snapPoints: [0.5, 1],
      swipeDirection: "start",
      swipeArea: true,
      title: "Menu",
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

  it("opens from every external trigger without owning them", async () => {
    document.body.innerHTML =
      '<button id="menu-a" type="button">A</button><button id="menu-b" type="button">B</button>';
    const first = document.querySelector<HTMLButtonElement>("#menu-a")!;
    const second = document.querySelector<HTMLButtonElement>("#menu-b")!;
    const controller = createDrawer({
      content: "Filtres",
      title: "Filtres",
      triggerSelector: "#menu-a, #menu-b",
    }).mount(document.body);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(first.hasAttribute("aria-haspopup")).toBe(true);
    expect(first.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);
    expect(controller.root.querySelector('[data-fui-part="trigger"]')).toBeNull();

    first.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(controller.api.get().open).toBe(true);

    controller.destroy();
    expect(first.hasAttribute("aria-haspopup")).toBe(false);
    expect(document.querySelector("#menu-a")).not.toBeNull();
  });

  it("configures the swipe area and content dragging like the Zag docs", async () => {
    const controller = createDrawer({
      content: "Filtres",
      contentDraggable: false,
      swipeArea: { disabled: true },
      title: "Filtres",
    }).mount(document.body);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const swipeArea = controller.root.querySelector('[data-fui-part="swipe-area"]')!;
    expect(swipeArea.hasAttribute("data-disabled")).toBe(true);
    controller.api.get().setOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(controller.root.querySelector('[data-fui-part="content"]')?.getAttribute("role")).toBe(
      "dialog",
    );
    controller.destroy();
  });

  it("enhances content-only markup and restores it", () => {
    const root = document.createElement("div");
    root.className = "fui-drawer";
    root.innerHTML =
      '<aside data-fui-part="content"><h2 data-fui-part="title">Navigation</h2><nav>Liens</nav></aside>';
    document.body.append(root);
    const original = root.innerHTML;
    const controller = enhanceDrawer(root);
    expect(root.querySelector('[data-fui-part="backdrop"]')).not.toBeNull();
    expect(root.querySelector('[data-fui-part="grabber"]')).not.toBeNull();
    controller.destroy();
    expect(root.innerHTML).toBe(original);
  });
});
