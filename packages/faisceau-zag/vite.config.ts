import { playwright } from 'vite-plus/test/browser-playwright'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    deps: { resolveDepSubpath: true },
    dts: true,
    format: ['esm'],
    sourcemap: true,
    exports: true,
    publint: true,
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: 'chromium', name: 'chrome' }],
      provider: playwright({ launchOptions: { channel: 'chromium' } }),
    },
    include: ['src/**/*.test.ts'],
    typecheck: {
      enabled: true,
    },
  },
})
