import "faisceau-ui/styles/select.css";
import "faisceau-ui/styles/checkbox.css";

import { afterEach, describe, expect, it } from "vite-plus/test";
import { createCheckbox, createSelect } from "faisceau-ui";

afterEach(() => {
  document.body.replaceChildren();
});

describe("published per-component styles", () => {
  it("styles Select and Checkbox from their individual stylesheets in Chrome", () => {
    // The bundle entry is deliberately not imported: each per-component
    // stylesheet must carry its tokens, shared base, and component rules.
    const select = createSelect({ items: ["One", "Two"], label: "Pays" }).mount(document.body);
    const trigger = select.root.querySelector<HTMLButtonElement>('[data-part="trigger"]');
    expect(trigger).toBeInstanceOf(HTMLElement);
    expect(getComputedStyle(trigger!).display).toBe("grid");
    expect(getComputedStyle(trigger!).borderStyle).toBe("solid");
    select.destroy();

    const checkbox = createCheckbox({ label: "Terms" }).mount(document.body);
    const control = checkbox.root.querySelector('[data-part="control"]');
    expect(control).toBeInstanceOf(HTMLElement);
    expect(getComputedStyle(control!).display).toBe("grid");
    checkbox.destroy();
  });
});
