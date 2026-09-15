import { assertType, expectTypeOf, test } from "vite-plus/test";
import { createSelect, type FuiItemInput, type SelectController } from "faisceau-ui";
import type { ComboboxProps } from "faisceau-ui/combobox";
import type { CheckboxProps } from "faisceau-ui/checkbox";
import type { EnhanceSelectProps } from "faisceau-ui/select";
import type { TooltipOptions } from "faisceau-ui/tooltip";
import type { DialogOptions } from "faisceau-ui/dialog";
import type { DrawerOptions } from "faisceau-ui/drawer";
import type { ToasterOptions } from "faisceau-ui/toast";

test("exposes the declarations shipped through every public UI entry", () => {
  const items = [
    { label: "France", value: "fr" },
    { label: "Belgique", value: "be" },
  ] as const satisfies readonly FuiItemInput[];

  assertType<ComboboxProps>({ items, label: "Pays" });
  assertType<EnhanceSelectProps>({ clearable: true });
  assertType<CheckboxProps>({ label: "Terms" });
  assertType<TooltipOptions>({ content: "Help", trigger: "Info" });
  assertType<DialogOptions>({ content: "Body", title: "Title", triggerSelector: "#open" });
  assertType<DrawerOptions>({
    content: "Body",
    swipeDirection: "end",
    snapPoints: [0.5, 1],
    swipeArea: true,
    title: "Title",
    triggerSelector: "#open",
  });
  assertType<ToasterOptions>({ placement: "bottom-end" });
  expectTypeOf(createSelect({ items, label: "Pays" })).toMatchTypeOf<SelectController>();
});
