import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import "../styles/index.scss";
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
      controller.root.querySelector<HTMLElement>(".fui-drawer-grabber")?.style.touchAction,
    ).toBe("none");
    expect(controller.root.querySelector(".fui-drawer-swipe-area")).not.toBeNull();
    controller.api.get().setOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(controller.root.querySelector(".fui-drawer-content")?.getAttribute("role")).toBe(
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
    expect(controller.root.querySelector(".fui-drawer-trigger")).toBeNull();

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
    const swipeArea = controller.root.querySelector(".fui-drawer-swipe-area")!;
    expect(swipeArea.hasAttribute("data-disabled")).toBe(true);
    controller.api.get().setOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(controller.root.querySelector(".fui-drawer-content")?.getAttribute("role")).toBe(
      "dialog",
    );
    controller.destroy();
  });

  it("groups the title and close button in a header with a scrolling body", async () => {
    const controller = createDrawer({
      content: "Navigation secondaire",
      title: "Menu",
    }).mount(document.body);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const header = controller.root.querySelector(".fui-drawer-header")!;
    expect(header.querySelector(".fui-drawer-title")?.textContent).toBe("Menu");
    expect(header.querySelector(".fui-drawer-close")).not.toBeNull();
    expect(header.previousElementSibling?.classList.contains("fui-drawer-grabber")).toBe(true);
    expect(header.nextElementSibling?.classList.contains("fui-drawer-body")).toBe(true);
    expect(
      header.nextElementSibling?.firstElementChild?.classList.contains("fui-drawer-body-content"),
    ).toBe(true);
    controller.destroy();
  });

  it("flags the body scroll edges while only the body scrolls", async () => {
    const controller = createDrawer({ content: "Body", title: "Menu" }).mount(document.body);
    const body = controller.root.querySelector<HTMLElement>(".fui-drawer-body")!;
    const spacer = document.createElement("div");
    spacer.style.height = "2000px";
    controller.api.get().setOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    body.append(spacer);
    await vi.waitFor(() => expect(body.hasAttribute("data-scroll-bottom")).toBe(true));
    expect(body.hasAttribute("data-scroll-top")).toBe(false);
    body.scrollTop = body.scrollHeight;
    body.dispatchEvent(new Event("scroll"));
    await vi.waitFor(() => expect(body.hasAttribute("data-scroll-bottom")).toBe(false));
    expect(body.hasAttribute("data-scroll-top")).toBe(true);
    controller.destroy();
  });

  it("enhances content-only markup and restores it", () => {
    const root = document.createElement("div");
    root.className = "fui-drawer";
    root.innerHTML =
      '<aside class="fui-drawer-content"><h2 class="fui-drawer-title">Navigation</h2><nav>Liens</nav></aside>';
    document.body.append(root);
    const original = root.innerHTML;
    const controller = enhanceDrawer(root);
    expect(root.querySelector(".fui-drawer-backdrop")).not.toBeNull();
    expect(root.querySelector(".fui-drawer-grabber")).not.toBeNull();
    const header = root.querySelector(".fui-drawer-header")!;
    expect(header.querySelector(".fui-drawer-title")?.textContent).toBe("Navigation");
    expect(header.querySelector(".fui-drawer-close")).not.toBeNull();
    expect(root.querySelector(".fui-drawer-body-content > nav")?.textContent).toBe("Liens");
    controller.destroy();
    expect(root.innerHTML).toBe(original);
  });
});
