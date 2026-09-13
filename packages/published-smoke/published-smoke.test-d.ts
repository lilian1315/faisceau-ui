import { assertType, expectTypeOf, test } from "vite-plus/test";
import { createSelect, type FuiItemInput, type SelectController } from "faisceau-ui";
import type { ComboboxOptions } from "faisceau-ui/combobox";
import type { CheckboxProps } from "faisceau-ui/checkbox";
import type { EnhanceSelectOptions } from "faisceau-ui/select";
import type { TooltipOptions } from "faisceau-ui/tooltip";
import type { DialogOptions } from "faisceau-ui/dialog";
import type { DrawerOptions } from "faisceau-ui/drawer";
import type { FieldControlContext } from "faisceau-ui/field";
import type { ToasterOptions } from "faisceau-ui/toast";

test("exposes the declarations shipped through every public UI entry", () => {
  const items = [
    { label: "France", value: "fr" },
    { label: "Belgique", value: "be" },
  ] as const satisfies readonly FuiItemInput[];

  assertType<ComboboxOptions>({ items, label: "Pays" });
  expectTypeOf<FieldControlContext["label"]>().toEqualTypeOf<HTMLLabelElement>();
  assertType<EnhanceSelectOptions>({ clearable: true });
  assertType<CheckboxProps>({ label: "Terms" });
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
