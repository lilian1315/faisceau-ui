import { playwright } from "vite-plus/test/browser-playwright";
import { defineConfig } from "vite-plus";
import { fileURLToPath } from "node:url";
import { lintJsrExports } from "jsr-exports-lint/tsdown";

const adapterSource = fileURLToPath(new URL("../faisceau-zag/src/index.ts", import.meta.url));
const jsrManifest = new URL("./jsr.json", import.meta.url);

export default defineConfig({
  pack: {
    // Disabled so the Sass-compiled `dist/styles/*.css` stylesheets (built before
    // `vp pack` runs) survive the bundle step and publint check.
    clean: false,
    deps: { resolveDepSubpath: true },
    dts: {
      tsconfig: "tsconfig.build.json",
    },
    entry: [
      "src/index.ts",
      "src/checkbox/index.ts",
      "src/collapsible/index.ts",
      "src/combobox/index.ts",
      "src/select/index.ts",
      "src/tooltip/index.ts",
      "src/dialog/index.ts",
      "src/drawer/index.ts",
      "src/toast/index.ts",
    ],
    format: ["esm"],
    sourcemap: true,
    publint: true,
    hooks: {
      "build:done": lintJsrExports(jsrManifest as unknown as string),
    },
  },
  test: {
    alias: [{ find: /^faisceau-zag$/, replacement: adapterSource }],
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium", name: "chrome" }],
      provider: playwright({ launchOptions: { channel: "chromium" } }),
    },
    include: ["src/**/*.test.ts"],
  },
});
