# UI review — 18 September 2026

## Scope and coverage

Reviewed the Select creation and enhancement stories, the shared Storybook shell,
and shared button, Tooltip, and Collapsible motion styles. This is a focused pass,
not an audit of every component. The stack remains TypeScript, Zag, Faisceau,
TSX stories, and Sass compiled to vanilla CSS. Project guidance consulted:
`AGENTS.md`, `docs/architecture.md`, and `docs/component-authoring.md`.

Applied better-interface and its accessibility, layout, writing, typography,
colors, and UI domain skills.

| Domain        | Evidence inspected                                                                               | Result                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Accessibility | Select keyboard operation and accessible names; source disclosure focus; language and motion CSS | Fixed motion guards, focus treatment, and French language boundary             |
| Layout        | Select creation at 320px; enhancement at desktop width; shell spacing                            | Reduced nested padding and constrained grid children                           |
| Writing       | Shared disclosure label and Select feedback text                                                 | Simplified source label; connected enhanced Select value feedback              |
| Typography    | Rendered narrow layout and expanded source; caption declarations                                 | Increased code/readout size to the existing caption token and allowed wrapping |
| Colors        | Theme declarations and computed light-mode description/background colors                         | Replaced obsolete tokens and aligned surfaces with the component theme         |
| UI polish     | Shared press/transition declarations and rendered demo shell                                     | Kept static pressed feedback when motion is disabled                           |

## Findings and fixes

All rows below have been implemented. Locations refer to the resulting source.

| Severity | Domain        | Location                                                                                                                                                                                                | Before                                                                                                                     | After                                                                                            | Why                                                                            |
| -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| HIGH     | Accessibility | `packages/faisceau-ui/src/styles/_mixins.scss:43`, `packages/faisceau-ui/src/styles/tooltip.scss:26`, `packages/faisceau-ui/src/styles/collapsible.scss:29`, `packages/storybook/src/storybook.css:167` | Unconditional transitions and press scaling                                                                                | Motion guarded by `prefers-reduced-motion: no-preference`; Collapsible uses static pressed color | Respects reduced-motion preferences without removing state feedback            |
| MEDIUM   | Colors        | `packages/storybook/src/storybook.css:1`, `packages/storybook/src/storybook.css:63`                                                                                                                     | Automatic system scheme mixed with light component tokens; obsolete text token names                                       | Explicit theme scheme and current semantic text/surface tokens                                   | Keeps shell and component colors consistent                                    |
| MEDIUM   | Layout        | `packages/storybook/src/storybook.css:32`                                                                                                                                                               | Fixed nested 24px padding left a narrow control area at 320px                                                              | Responsive padding, constrained grid children, and wrapping                                      | Makes more space available for labels, controls, and source                    |
| MEDIUM   | Writing       | `packages/storybook/src/select.stories.tsx:106`                                                                                                                                                         | Enhanced demo invited interaction but never updated its readout                                                            | Value-change callback updates the live output and forwards the supplied callback                 | Makes the demonstrated result observable                                       |
| LOW      | Accessibility | `packages/faisceau-ui/src/styles/collapsible.scss:37`, `packages/storybook/src/storybook.css:180`, `packages/storybook/src/story.tsx:25`                                                                | Outward Collapsible outline inside an overflow-hidden parent; translucent story-button outline; no local language boundary | Inset Collapsible outline, semantic focus token, and `lang="fr"`                                 | Protects focus visibility and gives assistive technology the intended language |
| LOW      | Typography    | `packages/storybook/src/storybook.css:119`                                                                                                                                                              | 12px source/readout text                                                                                                   | Existing caption token and long-token wrapping                                                   | Improves readability on narrow screens                                         |

The source disclosure now reads “Voir le code source”. The previously unstyled
shared action row also receives wrapping and spacing.

## Verification

- `vp install`: dependencies already up to date.
- `vp check`: formatting, lint, and types passed.
- `vp run ready`: builds, package contracts, Chrome tests, and declaration checks passed.
- `git diff --check`: passed.
- Browser: inspected Select creation at 320px and enhancement at desktop width.
- Browser: Enter opens Select; ArrowDown then Enter selects Belgique; both stories
  report `value = be`.
- Browser: source disclosure opens from the keyboard with a visible focus outline.
- Browser: expanded source at 320px has document scroll width 320px; no horizontal overflow.
- Computed light-mode description pair: `oklch(0.46 0 0)` on `oklch(1 0 0)`;
  calculated WCAG contrast is 7.13:1. The focus token against white is 8.46:1.
- Temporary browser viewport override was reset.

Not verified: screen-reader speech, 200% zoom, RTL, rendered dark/forced-color modes,
reduced-motion emulation, and all empty/error/disabled states. Motion guards and
theme changes were inspected in source; the Chrome suite is not a substitute for
those manual checks.

## Verdict

Approve for the stated scope and checks: no confirmed HIGH finding remains.
This verdict does not cover the unverified states listed above.

## Select follow-up: Zag v2

Compared against Zag's v2 commit `0c147af9066ab82f17691044231ddae9b4e912c9`:
[example styles](https://github.com/chakra-ui/zag/blob/0c147af9066ab82f17691044231ddae9b4e912c9/examples/styles/select.css),
[website demo source](https://github.com/chakra-ui/zag/blob/0c147af9066ab82f17691044231ddae9b4e912c9/website/demos/select.tsx),
and the Select machine's alignment implementation. The live website was not used.
The website demo still has older anatomy; the machine and v2 example stylesheet
are the reference for the separate content and scrolling list.

Fixed the missing root field layout, unused clear-button grid column, missing
indicator binding, intrinsic popup width, inline layer-variable override, and
clipped scrolling list. The popup is a constrained flex column; its list shrinks
and owns scrolling and keyboard focus styling. Select uses an opacity-only entry
animation because transforms interfere with Zag's opening geometry measurements.

Five new Chrome regression cases cover sizing, indicator state and elevation,
constrained lists in both positioning modes, and alignment after animation.
`vp check --fix` and `vp run ready` passed: 76 tests, including 14 Select tests,
plus package builds, declaration checks, and published-package contracts.
Final manual verification was unavailable: the in-app browser remained on a
connection-error page and its navigation policy blocked recovery, even after
Storybook reported ready again on port 64654.
