## Faisceau UI project instructions

Faisceau UI is a browser-only TypeScript component library. It combines Zag state machines,
Faisceau reactivity, DOM created with `@lilian1315/create-element`, and vanilla CSS.

### Required conventions

- Use the dedicated Zag machine when one exists, pinned to the workspace's Zag Next version.
- Use component-namespaced `fui-<component>-<part>` classes as the sole DOM anatomy contract; do
  not add parallel part-specific data attributes.
- Use Lucide through the shared icon helpers; keep icons decorative unless they convey meaning.
- Provide both `create*` and `enhance*` when a component can reasonably adopt existing markup.
- A created controller starts after insertion through `mount()` or `start()`. An enhanced
  controller starts immediately and restores caller-owned markup and attributes on `destroy()`.
- Form controls participate in native `FormData`, validation, reset, and `input`/`change`
  semantics. Keep the native control in the document.
- Public component options and controller APIs may remain Zag-shaped while the package is
  unpublished. Prefer the current Zag vocabulary over compatibility aliases.
- Use relative `.ts` or `.tsx` specifiers in TypeScript and `import type` for type-only imports.
- Build Storybook stories in TSX with `@lilian1315/create-element/faisceau`.
- Run browser behavior tests in the configured Vitest `chrome` project. Put type assertions in
  `*.test-d.ts`

### Context pointers

- Architecture: before changing package boundaries, the Zag adapter, controller lifecycle, DOM
  ownership, native-form behavior, or public API policy, read `docs/architecture.md`.
- Component work: before adding or substantially changing a component, follow
  `docs/component-authoring.md` through its completion criteria.

### Completion

- Use `vp check` during development.
- Use `vp run ready` before handoff. It checks formatting, lint and types, runs package tests,
  builds every package, and verifies the published-package contract.
- If a new public entry makes the initial typecheck resolve stale declarations, run
  `vp run -r build` once, then rerun `vp run ready`.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
