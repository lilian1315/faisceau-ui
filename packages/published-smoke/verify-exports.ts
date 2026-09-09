import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = dirname(fileURLToPath(import.meta.url));

interface PackageContract {
  directory: string;
  exports: ReadonlyArray<readonly [specifier: string, expectedTarget: string]>;
  files: readonly string[];
}

interface PackageManifest {
  name: string;
  files: string[];
  exports: Record<string, ExportConditions>;
}

type ExportConditions = string | ExportConditionMap;

interface ExportConditionMap {
  [condition: string]: ExportConditions;
}

const contracts = [
  {
    directory: "../faisceau-zag",
    exports: [
      ["@lilian1315/faisceau-zag", "./dist/index.mjs"],
      ["@lilian1315/faisceau-zag/package.json", "./package.json"],
    ],
    files: ["./dist/index.d.mts", "./dist/index.mjs", "./package.json"],
  },
  {
    directory: "../faisceau-ui",
    exports: [
      ["@lilian1315/faisceau-ui", "./dist/index.mjs"],
      ["@lilian1315/faisceau-ui/field", "./dist/field/index.mjs"],
      ["@lilian1315/faisceau-ui/select", "./dist/select/index.mjs"],
      ["@lilian1315/faisceau-ui/combobox", "./dist/combobox/index.mjs"],
      ["@lilian1315/faisceau-ui/checkbox", "./dist/checkbox/index.mjs"],
      ["@lilian1315/faisceau-ui/tooltip", "./dist/tooltip/index.mjs"],
      ["@lilian1315/faisceau-ui/dialog", "./dist/dialog/index.mjs"],
      ["@lilian1315/faisceau-ui/drawer", "./dist/drawer/index.mjs"],
      ["@lilian1315/faisceau-ui/toast", "./dist/toast/index.mjs"],
      ["@lilian1315/faisceau-ui/styles.css", "./src/styles/index.css"],
      ["@lilian1315/faisceau-ui/package.json", "./package.json"],
    ],
    files: [
      "./dist/index.d.mts",
      "./dist/index.mjs",
      "./dist/field/index.d.mts",
      "./dist/field/index.mjs",
      "./dist/select/index.d.mts",
      "./dist/select/index.mjs",
      "./dist/combobox/index.d.mts",
      "./dist/combobox/index.mjs",
      "./dist/checkbox/index.d.mts",
      "./dist/checkbox/index.mjs",
      "./dist/tooltip/index.d.mts",
      "./dist/tooltip/index.mjs",
      "./dist/dialog/index.d.mts",
      "./dist/dialog/index.mjs",
      "./dist/drawer/index.d.mts",
      "./dist/drawer/index.mjs",
      "./dist/toast/index.d.mts",
      "./dist/toast/index.mjs",
      "./src/styles/index.css",
      "./src/styles/index.d.ts",
      "./package.json",
    ],
  },
] satisfies PackageContract[];

for (const contract of contracts) {
  const directory = resolve(packageDirectory, contract.directory);
  const manifest = JSON.parse(
    await readFile(resolve(directory, "package.json"), "utf8"),
  ) as PackageManifest;

  for (const file of contract.files) await access(resolve(directory, file));

  for (const [specifier, expectedTarget] of contract.exports) {
    const resolvedTarget = fileURLToPath(import.meta.resolve(specifier));
    const expectedPath = resolve(directory, expectedTarget);

    if (resolvedTarget !== expectedPath) {
      throw new Error(`${specifier} resolved to ${resolvedTarget} instead of ${expectedPath}`);
    }
  }

  for (const [subpath, conditions] of Object.entries(manifest.exports)) {
    for (const target of exportTargets(conditions)) {
      const included =
        target === "./package.json" ||
        manifest.files.some((entry) => target === `./${entry}` || target.startsWith(`./${entry}/`));

      if (!included) throw new Error(`${manifest.name} export ${subpath} is excluded from files`);
      await access(resolve(directory, target));
    }
  }
}

const [ui, field, select, combobox, checkbox, tooltip, dialog, drawer, toast, zag] =
  await Promise.all([
    import("@lilian1315/faisceau-ui"),
    import("@lilian1315/faisceau-ui/field"),
    import("@lilian1315/faisceau-ui/select"),
    import("@lilian1315/faisceau-ui/combobox"),
    import("@lilian1315/faisceau-ui/checkbox"),
    import("@lilian1315/faisceau-ui/tooltip"),
    import("@lilian1315/faisceau-ui/dialog"),
    import("@lilian1315/faisceau-ui/drawer"),
    import("@lilian1315/faisceau-ui/toast"),
    import("@lilian1315/faisceau-zag"),
  ]);

for (const [name, value] of Object.entries({
  createCombobox: ui.createCombobox,
  createField: ui.createField,
  createFieldFromSubpath: field.createField,
  createSelect: ui.createSelect,
  createSelectFromSubpath: select.createSelect,
  createComboboxFromSubpath: combobox.createCombobox,
  createCheckbox: ui.createCheckbox,
  createCheckboxFromSubpath: checkbox.createCheckbox,
  createTooltip: ui.createTooltip,
  createTooltipFromSubpath: tooltip.createTooltip,
  createDialog: ui.createDialog,
  createDialogFromSubpath: dialog.createDialog,
  createDrawer: ui.createDrawer,
  createDrawerFromSubpath: drawer.createDrawer,
  createToaster: ui.createToaster,
  createToasterFromSubpath: toast.createToaster,
  createZagMachine: zag.createZagMachine,
})) {
  if (typeof value !== "function") throw new TypeError(`Published export ${name} is not callable`);
}

if (typeof zag.normalizeProps !== "object") {
  throw new TypeError("Published export normalizeProps is not an object");
}

function exportTargets(conditions: ExportConditions): string[] {
  if (typeof conditions === "string") return [conditions];
  return Object.values(conditions).flatMap(exportTargets);
}
