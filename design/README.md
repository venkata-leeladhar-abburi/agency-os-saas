# Design reference

The approved look of Agency OS (design system version 1). Claude Code rebuilds these designs with shadcn/ui and Tailwind in `packages/ui` and compares its work against this folder.

| Path | What |
| --- | --- |
| `showcase.html` | Open in a browser (double-click). Every component and three example screens (owner dashboard, leads pipeline with a lead open, client portal on a phone), with a light/dark switch. Works offline. |
| `screens/` | Screenshots in light and dark: the cover, the three screens and key components. |
| `system/README.md` | The brand book: content, colour, type, space, shape, motion, states, icons, logo, components, accessibility, licences. |
| `system/tokens.json`, `system/tokens.css` | The tokens (same as `../tokens/`). |
| `system/components/` | The reference components (`bundle.js`, `bundle.css`), types (`index.d.ts`), and one folder per component with guidelines (`README.md`) and a preview. |
| `system/fonts/` | Geist and Geist Mono variable fonts (SIL Open Font License). In the app, load them from the `geist` npm package instead. |
| `system/assets/Icons/` | The core Phosphor icons used in navigation (MIT). In the app use `@phosphor-icons/react`. |
| `system/assets/Logos/` | The Agency OS mark in violet, lime and ink. |

The reference components are for **looking at**, not for shipping: they are a single script with React 18 globals. The app uses real React components built on shadcn/ui.

All names, companies and amounts in the screens are example data.
