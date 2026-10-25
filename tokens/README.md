# Tokens

| File | Use |
| --- | --- |
| `tokens.json` | **Source of truth.** Colour ramps and semantic colours (light and dark), type styles, spacing, radius, shadows and sizes, each with a usage note. |
| `globals.css` | The app's theme for **Tailwind CSS v4 + shadcn/ui**, generated from `tokens.json`. Copy to `apps/web/app/globals.css` (or import it from `packages/tokens`) at milestone M1. Needs `tailwindcss` and `tw-animate-css`. Light by default; dark under `[data-theme="dark"]` or `.dark`. |
| `tokens.css` | Plain CSS variables and type classes used by the reference bundle in `design/`. |

`globals.css` was compiled with Tailwind CSS 4.1 to check it: utilities such as `bg-background`, `text-muted-foreground`, `border-input`, `ring-ring`, `shadow-md`, `rounded-lg`, `h-control-md`, `w-sidebar-width`, `max-w-content`, `text-title-lg`, `text-overline-caps` and `dark:` variants are generated.

At M1, move the generator into `packages/tokens` (a small Node script that reads `tokens.json` and writes `globals.css`), plus the contrast check, so changes stay in one place. Don't edit `globals.css` by hand.

Font variables: the theme expects `--font-geist-sans` and `--font-geist-mono`, which the `geist` package's `GeistSans.variable` and `GeistMono.variable` class names provide on `<html>`.
