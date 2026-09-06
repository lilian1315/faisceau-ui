import { playwright } from "vite-plus/test/browser-playwright";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      smoke: {
        command: [
          "pnpm --dir ../faisceau-zag pack --dry-run",
          "pnpm --dir ../faisceau-ui pack --dry-run",
          "node verify-exports.ts",
          "vp test",
        ],
        dependsOn: [{ task: "build", from: "dependencies" }],
      },
    },
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium", name: "chrome" }],
      provider: playwright({ launchOptions: { channel: "chromium" } }),
    },
    include: ["published-smoke.test.ts"],
    typecheck: {
      enabled: true,
    },
  },
});
