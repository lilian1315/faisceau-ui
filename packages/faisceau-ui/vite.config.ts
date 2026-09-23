import { playwright } from "vite-plus/test/browser-playwright";
import { defineConfig } from "vite-plus";
import { fileURLToPath } from "node:url";

const adapterSource = fileURLToPath(new URL("../faisceau-zag/src/index.ts", import.meta.url));

export default defineConfig({
  pack: {
    platform: "browser",
    exports: true,
    unbundle: true,
    css: { inject: true },
    deps: { resolveDepSubpath: true },
    dts: { tsconfig: "tsconfig.build.json" },
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
    copy: ["src/icons"],
    format: ["esm"],
    sourcemap: true,
    publint: true,
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
