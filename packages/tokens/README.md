# @agency-os/tokens

Design tokens for Agency OS. The source of truth is `tokens/tokens.json` at the repository root.

| Command | What it does |
| --- | --- |
| `pnpm generate` | Writes `globals.css` (this package, imported by the app and Storybook) and `tokens/globals.css` (the reference copy) from `tokens.json`. |
| `pnpm test` | Fails if either `globals.css` is out of date, runs the WCAG contrast check on every semantic pair in both themes (`node scripts/contrast.mjs` prints the table), and runs the unit tests. |

To change a colour, size or font: edit `tokens/tokens.json`, run `pnpm generate`, then `pnpm test`. Never edit `globals.css` by hand.

Import the theme with `@import "@agency-os/tokens/globals.css";` and the token data with `import { tokens } from '@agency-os/tokens'`.
