import "@lilian1315/faisceau-ui/styles.css";

import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  createCheckbox,
  createSelect,
  createTooltip,
  enhanceCombobox,
} from "@lilian1315/faisceau-ui";
import { createCombobox as createComboboxFromSubpath } from "@lilian1315/faisceau-ui/combobox";
import { enhanceSelect as enhanceSelectFromSubpath } from "@lilian1315/faisceau-ui/select";
import { createZagMachine, normalizeProps } from "@lilian1315/faisceau-zag";

const items = [
  { label: "France", value: "fr" },
  { label: "Belgique", value: "be" },
] as const;

afterEach(() => {
  document.body.replaceChildren();
});

describe("published package contract", () => {
  it("resolves every public entry and runs a styled Select interaction in Chrome", async () => {
    const combobox = createComboboxFromSubpath({ items, label: "Pays" });
    expect(combobox.root).toBeInstanceOf(HTMLElement);
    combobox.destroy();
    expect(typeof enhanceCombobox).toBe("function");
    expect(typeof enhanceSelectFromSubpath).toBe("function");
    expect(createCheckbox({ label: "Terms" }).root).toBeInstanceOf(HTMLElement);
    expect(createTooltip({ content: "Help", trigger: "Info" }).root).toBeInstanceOf(HTMLElement);
    expect(typeof createZagMachine).toBe("function");
    expect(typeof normalizeProps).toBe("object");

    const form = document.createElement("form");
    document.body.append(form);
    const controller = createSelect({
      alignItemWithTrigger: false,
      items,
      label: "Pays",
      name: "country",
      placeholder: "Choisir",
    }).mount(form);
    const trigger = requirePart<HTMLButtonElement>(controller.root, "trigger");

    expect(getComputedStyle(controller.root).display).toBe("grid");
    expect(getComputedStyle(trigger).borderStyle).toBe("solid");

    trigger.click();
    await flushMachine();
    requireItem(controller.root, "be").click();
    await flushMachine();

    expect(controller.api.get().value).toEqual(["be"]);
    expect(new FormData(form).get("country")).toBe("be");
    controller.destroy();
  });
});

function requirePart<T extends Element>(root: ParentNode, part: string): T {
  const className = part === "native-select" ? "fui-native-select" : `fui-select-${part}`;
  const element = root.querySelector<T>(`.${className}`);
  if (!element) throw new Error(`Missing published part: ${part}`);
  return element;
}

function requireItem(root: ParentNode, value: string): HTMLElement {
  const item = root.querySelector<HTMLElement>(`.fui-select-item[data-value="${value}"]`);
  if (!item) throw new Error(`Missing published item: ${value}`);
  return item;
}

async function flushMachine(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
