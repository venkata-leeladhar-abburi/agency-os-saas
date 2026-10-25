# @agency-os/ui

Agency OS components: shadcn/ui patterns on Radix, restyled to the design system in `design/` with tokens only.

| Command                       | What it does                                                                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm storybook`              | Storybook on port 6006 with a light/dark toolbar.                                                                                                                                                          |
| `pnpm build-storybook`        | Static Storybook in `storybook-static/`.                                                                                                                                                                   |
| `pnpm test`                   | Component tests (Vitest, jsdom, Testing Library): states, keyboard, ARIA.                                                                                                                                  |
| `pnpm test:stories`           | Builds nothing; serves `storybook-static/` and runs axe on every story in light and dark, saving a screenshot of each. Run `build-storybook` first. Set `PW_CHROMIUM_PATH` to use a preinstalled Chromium. |
| `pnpm lint`, `pnpm typecheck` |                                                                                                                                                                                                            |

Use in an app: import `@agency-os/tokens/globals.css` then `@agency-os/ui/styles.css` in the global stylesheet, add `@source` for `packages/ui/src`, and render `<Toaster />` once.

Rules: tokens only (no raw colours), Phosphor icons only, every component has default, hover, focus-visible, active, disabled and loading states where they apply, and a story showing them. Strings a screen reader hears are props with English defaults so apps can translate them.
