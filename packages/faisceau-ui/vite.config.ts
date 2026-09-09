import { playwright } from "vite-plus/test/browser-playwright";
import { defineConfig } from "vite-plus";
import { fileURLToPath } from "node:url";

const adapterSource = fileURLToPath(new URL("../faisceau-zag/src/index.ts", import.meta.url));

export default defineConfig({
  pack: {
    dts: {
      tsconfig: "tsconfig.build.json",
    },
    entry: [
      "src/index.ts",
      "src/field/index.ts",
      "src/checkbox/index.ts",
      "src/combobox/index.ts",
      "src/select/index.ts",
      "src/tooltip/index.ts",
      "src/dialog/index.ts",
      "src/drawer/index.ts",
      "src/toast/index.ts",
    ],
    format: ["esm"],
    sourcemap: true,
  },
  test: {
    alias: [{ find: /^@lilian1315\/faisceau-zag$/, replacement: adapterSource }],
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium", name: "chrome" }],
      provider: playwright({ launchOptions: { channel: "chromium" } }),
    },
    include: ["src/**/*.test.ts"],
  },
});
