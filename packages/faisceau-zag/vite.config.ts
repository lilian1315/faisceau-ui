import { playwright } from "vite-plus/test/browser-playwright";
import { defineConfig } from "vite-plus";
import { lintJsrExports } from "jsr-exports-lint/tsdown";

const jsrManifest = new URL("./jsr.json", import.meta.url);

export default defineConfig({
  pack: {
    deps: { resolveDepSubpath: true },
    dts: true,
    format: ["esm"],
    sourcemap: true,
    exports: true,
    publint: true,
    hooks: {
      "build:done": lintJsrExports(jsrManifest as unknown as string),
    },
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium", name: "chrome" }],
      provider: playwright({ launchOptions: { channel: "chromium" } }),
    },
    include: ["src/**/*.test.ts"],
    typecheck: {
      enabled: true,
    },
  },
});
