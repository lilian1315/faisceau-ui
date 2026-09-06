import { assertType, expectTypeOf, test } from "vite-plus/test";
import { createSelect, type FuiItemInput, type SelectController } from "@lilian1315/faisceau-ui";
import type { ComboboxOptions } from "@lilian1315/faisceau-ui/combobox";
import type { EnhanceSelectOptions } from "@lilian1315/faisceau-ui/select";

test("exposes the declarations shipped through every public UI entry", () => {
  const items = [
    { label: "France", value: "fr" },
    { label: "Belgique", value: "be" },
  ] as const satisfies readonly FuiItemInput[];

  assertType<ComboboxOptions>({ items, label: "Pays" });
  assertType<EnhanceSelectOptions>({ clearable: true });
  expectTypeOf(createSelect({ items, label: "Pays" })).toMatchTypeOf<SelectController>();
});
