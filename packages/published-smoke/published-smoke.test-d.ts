import { assertType, expectTypeOf, test } from "vite-plus/test";
import { createSelect, type FuiItemInput, type SelectController } from "@lilian1315/faisceau-ui";
import type { ComboboxOptions } from "@lilian1315/faisceau-ui/combobox";
import type { CheckboxOptions } from "@lilian1315/faisceau-ui/checkbox";
import type { EnhanceSelectOptions } from "@lilian1315/faisceau-ui/select";
import type { TooltipOptions } from "@lilian1315/faisceau-ui/tooltip";
import type { DialogOptions } from "@lilian1315/faisceau-ui/dialog";
import type { DrawerOptions } from "@lilian1315/faisceau-ui/drawer";
import type { ToasterOptions } from "@lilian1315/faisceau-ui/toast";

test("exposes the declarations shipped through every public UI entry", () => {
  const items = [
    { label: "France", value: "fr" },
    { label: "Belgique", value: "be" },
  ] as const satisfies readonly FuiItemInput[];

  assertType<ComboboxOptions>({ items, label: "Pays" });
  assertType<EnhanceSelectOptions>({ clearable: true });
  assertType<CheckboxOptions>({ label: "Terms" });
  assertType<TooltipOptions>({ content: "Help", trigger: "Info" });
  assertType<DialogOptions>({ content: "Body", title: "Title", trigger: "Open" });
  assertType<DrawerOptions>({
    content: "Body",
    swipeDirection: "end",
    snapPoints: [0.5, 1],
    swipeArea: true,
    title: "Title",
    trigger: "Open",
  });
  assertType<ToasterOptions>({ placement: "bottom-end" });
  expectTypeOf(createSelect({ items, label: "Pays" })).toMatchTypeOf<SelectController>();
});
