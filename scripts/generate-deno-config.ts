import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { format } from "vite-plus/fmt";
import { parse } from "yaml";

import viteConfig from "../vite.config.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const denoConfigPath = resolve(root, "deno.json");
const workspacePath = resolve(root, "pnpm-workspace.yaml");

const workspace = parse(readFileSync(workspacePath, "utf8"));
const rootManifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const workspacePackages = readdirSync(resolve(root, "packages"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(root, "packages", entry.name))
  // Only JSR-published packages (with a jsr.json manifest) take part in the deno workspace.
  .filter(
    (directory) =>
      existsSync(resolve(directory, "package.json")) && existsSync(resolve(directory, "jsr.json")),
  )
  .map((directory) => {
    return {
      manifest: JSON.parse(readFileSync(resolve(directory, "package.json"), "utf8")),
      jsr: JSON.parse(readFileSync(resolve(directory, "jsr.json"), "utf8")),
    };
  });
const dependencies = [
  ...Object.entries({ ...rootManifest.dependencies, ...rootManifest.devDependencies }),
  ...workspacePackages.flatMap(({ manifest }) =>
    Object.entries({
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
    }),
  ),
];
const workspaceImports = Object.fromEntries(
  dependencies
    .filter(([, requirement]) => String(requirement).startsWith("workspace:"))
    .map(([name]) => {
      const dependency = workspacePackages.find(({ manifest }) => manifest.name === name);
      if (!dependency) throw new Error(`Missing workspace package for ${name}`);
      return [name, `jsr:${dependency.jsr.name}@^${dependency.jsr.version}`];
    }),
);
const npmImports = Object.fromEntries(
  dependencies
    .filter(([, requirement]) => !String(requirement).startsWith("workspace:"))
    .map(([name, requirement]) => {
      const version = requirement === "catalog:" ? workspace.catalog[name] : requirement;
      if (typeof version !== "string")
        throw new Error(`Invalid dependency requirement for ${name}`);
      if (version.startsWith("npm:") || version.startsWith("jsr:")) return [name, version];
      return [name, `npm:${name}@${version}`];
    }),
);

const expectedConfig = {
  workspace: ["packages/*"],
  imports: { ...workspaceImports, ...npmImports },
};

const expected = await format("deno.json", JSON.stringify(expectedConfig), viteConfig.fmt);
writeFileSync(denoConfigPath, expected.code);
