// Generates a sibling `<name>.css.d.ts` declaration for every compiled
// stylesheet exposed through the package `exports` (each CSS subpath carries
// a `types` condition pointing at its declaration), so TypeScript consumers
// can side-effect import `faisceau-ui/styles/<name>.css` without declaring
// their own `*.css` module shim.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8'))

for (const [subpath, target] of Object.entries(manifest.exports)) {
  if (!subpath.endsWith('.css')) continue
  const cssTarget = typeof target === 'string' ? target : target.default
  writeFileSync(resolve(packageDir, `${cssTarget}.d.ts`), 'export {};\n')
}
