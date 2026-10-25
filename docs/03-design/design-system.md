# Agency OS design system

**Status:** version 1, waiting for the founder's approval at gate G1 (see `../00-plan/build-plan.md`).

**See it:**
- **Live:** the Agency OS Design System page on claude.ai (link in `../00-plan/open-questions.md`, item 0). It is private to the founder until shared.
- **Offline:** open `design/showcase.html` from this repo in a browser. It shows every component and the three example screens, with a light/dark switch.
- **Screenshots:** `design/screens/*.png`, in light and dark.

**Source of truth:** `tokens/tokens.json`. `tokens/globals.css` (for the app) and `tokens/tokens.css` (for the reference bundle) are generated from it. Never edit a colour, size or font in a component; change the token and regenerate.

## 1. Decisions

| Area | Choice | Why |
| --- | --- | --- |
| Base | **shadcn/ui** (Radix primitives) + **Tailwind CSS v4** + CSS variables | We own the component code; Radix gives accessible behaviour; themes are a token swap; it already has the SaaS parts we need (sidebar, data table, command palette, sheet, toast, form, charts). |
| Look | Our tokens, type, icons, density and patterns on top | A default shadcn app looks like every other one. Ours reads as Agency OS: warm neutrals, violet action colour, lime for wins, Geist. |
| Type | **Geist** and **Geist Mono** (variable, 100 to 900, SIL OFL) | Clear at 13 to 14px in dense tables; includes the ₹ sign; tabular figures for money; free for commercial use. |
| Icons | **Phosphor** (MIT), regular weight, `@phosphor-icons/react` | One premium family with matching outline, fill and duotone weights; 1,500+ icons including `currency-inr` and `whatsapp-logo`. |
| Colour | Violet `#6840ff`, lime `#a1ff62`, ink `#151313` (from the Agency OS deck) on warm neutrals | Brand continuity with the deck and the One Stop site; every text pair checked to WCAG AA in both themes. |
| Themes | Light (default) and dark from day one | Rulebook section 8. Dark mode is a token swap, not a second design. |

If the founder wants a paid display face for marketing pages, send the font files and the web licence; it would apply to `display-lg` and `display` only.

## 2. Colour

### Raw scales
Warm neutral (18 steps, `neutral-0` white to `neutral-975`), violet, lime, green, amber, red, blue, teal and rose, each 50 to 950. Values in `tokens/tokens.json`. **Components never use raw scales directly;** they use the semantic tokens below. Tailwind's default palette is removed in `globals.css`, so a stray `bg-sky-500` fails the build.

### Semantic tokens (light / dark)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | neutral-50 | neutral-975 | App canvas |
| `foreground` | neutral-950 | neutral-50 | Main text |
| `card` / `card-foreground` | neutral-0 / 950 | neutral-925 / 50 | Cards, panels, tables |
| `popover` / `popover-foreground` | neutral-0 / 950 | neutral-900 / 50 | Menus, dialogs, command palette |
| `primary` / `primary-foreground` | violet-600 / white | violet-600 / white | The one primary action per view, selected states |
| `primary-hover` | violet-700 | violet-700 | Primary hover and press |
| `secondary` / `secondary-foreground` | neutral-100 / 950 | neutral-850 / 50 | Secondary buttons |
| `muted` / `muted-foreground` | neutral-100 / 600 | neutral-900 / 400 | Quiet fills; secondary text |
| `subtle-foreground` | neutral-500 | neutral-450 | Placeholders, tertiary text (on card and background only) |
| `accent` / `accent-foreground` | neutral-100 / 950 | neutral-850 / 50 | Hover rows, menu items, ghost buttons |
| `highlight` / `highlight-foreground` | lime-300 / ink | lime-300 / ink | Wins: the Won column, completed steps, celebrations. Never lime text on light surfaces. |
| `brand-soft` / `brand-soft-foreground` | violet-50 / 700 | violet-950 / 300 | Brand badges, selected rows, tips |
| `link` | violet-700 | violet-300 | Inline links |
| `destructive` / `destructive-foreground` | red-600 / white | red-600 / white | Destructive button fill (inside a confirmation only) |
| `border` / `border-strong` | neutral-200 / 300 | neutral-850 / 800 | Hairlines (decorative) |
| `input` | neutral-450 | neutral-500 | Control borders (3:1) |
| `ring` | violet-600 | violet-400 | Focus ring, 2px with 2px offset |
| `success`, `warning`, `danger`, `info` | green-700, amber-800, red-700, blue-700 | green-300, amber-300, red-300, blue-300 | Status text and icons |
| `*-soft` | the 50 step | the 950 step | Backgrounds behind status text |
| `chart-1` to `chart-6` | violet-600, teal-600, amber-600, rose-500, blue-500, lime-700 | violet-400, teal-400, amber-400, rose-400, blue-400, lime-300 | Chart series, in order |
| `sidebar`, `sidebar-foreground`, `sidebar-active`, `sidebar-active-foreground` | neutral-50, 700, 0, 950 | neutral-975, 400, 900, 50 | App sidebar |

shadcn's own sidebar names (`sidebar-primary`, `sidebar-accent`, `sidebar-border`, `sidebar-ring`) are aliases of ours in `globals.css`, so shadcn blocks work unchanged.

### Contrast (WCAG 2.1, checked by script)

| Pair | Light | Dark | Needs |
| --- | --- | --- | --- |
| `foreground` on `background` | 17.2 | 18.2 | 4.5:1 |
| `muted-foreground` on `card` | 6.0 | 6.7 | 4.5:1 |
| `subtle-foreground` on `card` | 5.1 | 5.4 | 4.5:1 |
| `primary-foreground` on `primary` | 5.6 | 5.6 | 4.5:1 |
| `link` on `card` | 7.7 | 10.8 | 4.5:1 |
| `highlight-foreground` on `highlight` | 15.0 | 15.0 | 4.5:1 |
| `destructive-foreground` on `destructive` | 4.7 | 4.7 | 4.5:1 |
| `success` / `warning` / `danger` / `info` on their `-soft` | 5.3 / 6.9 / 6.1 / 5.6 | 9.7 / 10.1 / 9.4 / 9.6 | 4.5:1 |
| `input` on `card` / `popover` | 3.4 / 3.4 | 3.6 / 3.4 | 3:1 |
| `ring` on `card` / `background` | 5.6 / 5.2 | 7.6 / 8.2 | 3:1 |
| `chart-1` to `chart-6` on `card` | 3.0 to 5.6 | 7.6 to 14.7 | 3:1 |

All 30 text pairs in the token file pass in both themes. Re-run the check whenever a colour changes (`../04-engineering/testing.md`, "Tokens").

### Rules
- Neutral first; colour carries meaning. One `primary` button per view.
- Status is never colour alone: a Badge always has a word, and success and danger also differ in lightness.
- Client portal branding: an agency can set its brand colour. It replaces `primary`, `ring` and `brand-soft-foreground` **only if** white text on it reaches 4.5:1; otherwise the portal keeps violet and settings explain why.

## 3. Type

Geist for everything; Geist Mono for IDs, invoice numbers, GSTINs, codes and keyboard keys. Noto Sans Devanagari and Noto Sans Telugu are fallbacks for names and notes typed in Indian scripts.

| Style | Size / line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- |
| `display-lg` | 48 / 52 | 600 | -0.035em | Marketing and public profile hero only |
| `display` | 40 / 44 | 600 | -0.03em | Big empty-state and onboarding headlines |
| `title-xl` | 32 / 38 | 600 | -0.025em | Dashboard greeting, portal home |
| `title-lg` | 24 / 30 | 600 | -0.02em | Page title (one per page) |
| `title-md` | 20 / 28 | 600 | -0.015em | Sections, dialogs |
| `title-sm` | 16 / 24 | 600 | -0.01em | Card titles |
| `body-lg` | 16 / 24 | 400 | — | Client portal text on phones, long reading |
| `body` | 14 / 20 | 400 | — | Default UI text |
| `body-medium` | 14 / 20 | 500 | — | Buttons, labels |
| `body-sm` | 13 / 18 | 400 | — | Helpers, timestamps |
| `caption` | 12 / 16 | 500 | — | Badges, chips |
| `overline` | 11 / 16 | 600 | +0.06em, uppercase | Group labels |
| `metric` | 28 / 32 | 600 | -0.02em | Dashboard numbers (tabular figures) |
| `mono` / `mono-sm` | 13 / 20, 12 / 16 | 400 / 450 | — | IDs, codes, shortcuts |

In Tailwind: `text-title-lg`, `text-body-sm`, `text-overline-caps` and so on. Money and numbers that line up always use `tabular-nums`.

**Engineering note:** load Geist through the `geist` npm package (full font files). If you load it through `next/font/google` instead, include the `latin-ext` subset or the ₹ sign falls back to another font.

## 4. Space, size, shape, depth, motion

- **Spacing:** a 4px grid (Tailwind's default `--spacing`): `p-1` 4px … `p-16` 64px. Cards pad 20px on desktop, 16px on phones; sections sit 32px apart.
- **Control heights:** `control-sm` 32, `control-md` 36 (default), `control-lg` 40 (form submit), `control-xl` 44 (client portal and phones). Table rows: `row-default` 44, `row-compact` 36.
- **Layout:** `sidebar-width` 248 (collapsed 64), `topbar-height` 56, `content` max 1280, `prose` max 680.
- **Radius:** `xs` 4, `sm` 6, `md` 8 (buttons, inputs), `lg` 12 (cards, popovers), `xl` 16 (dialogs, command palette, portal cards), `full` (avatars, pills, switches).
- **Depth:** mostly borders. `shadow-xs` inputs and secondary buttons; `shadow-sm` the active sidebar item; `shadow-md` menus and dragged cards; `shadow-lg` dialogs, command palette, toasts, sheets. Dark mode adds a faint top highlight instead of heavier shadows.
- **Motion:** 120ms (hover, press), 200ms (menus, toggles), 320ms (dialogs, sheets); ease-out `cubic-bezier(0.16, 1, 0.3, 1)`. Motion confirms, never decorates. Reduced motion removes it.

## 5. Icons

- Phosphor **regular** for UI at 16px (inline, buttons) and 18 to 20px (navigation); **fill** only for the selected sidebar item and the active portal tab; **duotone** only for empty states and feature headers (28 to 36px).
- Icons support a label; they never replace it. Icon-only buttons need `aria-label` and a tooltip.
- Colour follows text: `muted-foreground` by default, `foreground` on hover, `primary` when selected, the status colour inside alerts and badges.
- No emoji as icons. No second icon library.

## 6. Components

The reference bundle (`design/system/components/bundle.js`) shows how each one looks and behaves. In the app, build each one on its shadcn base and match the reference.

| Agency OS component | shadcn base | Notes |
| --- | --- | --- |
| Button | `button` | Variants: primary, secondary, soft, ghost, destructive, highlight, link. Sizes sm, md, lg, xl. `loading` and `kbd` props. |
| IconButton | `button` (size icon) | Always `aria-label` + tooltip |
| Input, Textarea, Select | `input`, `textarea`, `select` + `form` | Label, hint, error, optional; prefix (₹, https://) and icon slots |
| Checkbox, Switch | `checkbox`, `switch` | Label and description |
| Badge | `badge` | Tones: neutral, brand, success, warning, danger, info, highlight, outline; optional dot or icon |
| Avatar, AvatarGroup | `avatar` | Initials on a tinted fill derived from the name |
| Tabs, Segmented | `tabs`, `toggle-group` | Tabs switch views of a record; Segmented switches display mode |
| Sidebar, Topbar | `sidebar`, `breadcrumb` | Groups per role, counts, collapse to 64px |
| CommandPalette | `command` (cmdk) in `dialog` | Ctrl/Cmd+K everywhere; grouped results; actions with shortcuts |
| Card, Alert, Toast, Dialog | `card`, `alert`, `sonner`, `dialog` / `alert-dialog` | Toasts carry Undo; destructive actions use alert-dialog |
| Sheet (lead and record drawer) | `sheet` | Opens a record without leaving the list |
| EmptyState | — | Duotone icon, one sentence, one action |
| Skeleton, Progress | `skeleton`, `progress` | Skeletons for anything over ~300ms |
| MetricCard, Sparkline | `card` + `chart` | The whole card links to the list behind the number |
| DataTable | `table` + TanStack Table | About 5 default columns; column picker, sort, filter, saved views, bulk actions, density |
| PipelineBoard, LeadCard | dnd-kit | Drag between stages; column totals; Won column uses `highlight` |
| PhaseStepper, GateCard | — | Seven phases; gates show approver and status; compact version for phones |
| InvoiceSummary | `table` | GST (CGST + SGST or IGST), export under LUT, any currency, amount in words |
| Checklist | — | Onboarding; progress; dismiss and reopen from Help |
| ActivityFeed, RecordHeader | — | Every record page uses RecordHeader |

Every component defines default, hover, focus-visible, active, disabled and loading states. Every screen designs loading, empty, error and no-access states.

## 7. Patterns decided once

- Modal (dialog) for short focused decisions; sheet for viewing or editing a record without losing the list; a full page for long forms and builders.
- Confirm only destructive or high-impact actions; everything else gets a toast with Undo.
- Numbers right-aligned in tables; money with tabular figures; invoice numbers in Geist Mono.
- Dates with a written month (25 Oct 2026); money in Indian format for INR (₹4,86,000, compact ₹4.86 L, ₹1.2 Cr) and the client's locale for other currencies.
- Empty states always give one action.

## 8. Governance

- **Storybook** in `packages/ui` documents every component and its states, with short do and don't notes. It replaces the reference bundle once G1 is approved.
- **Adding a component:** first check the list above and shadcn. A one-off becomes a system component after it is used three times. Additions are noted in `docs/00-plan/decisions.md`.
- **Visual check:** each component's Storybook story is compared with `design/screens/` and `design/showcase.html` before it is marked done.
- **Tokens:** change `tokens/tokens.json`, regenerate `globals.css`, re-run the contrast check, update this page.
- **Mobile (R7):** add Style Dictionary to export the same tokens to React Native.

## Sources

The rulebook (`ux-principles.md`) lists the UX articles. Design-system references read: f1studioz (SaaS design system guide), designpixil (design system for SaaS), Eleken (design system for SaaS), Donux (design systems). Their shared advice, applied here: start from an open-source base, replace its tokens, keep the core small, document states, and grow by repetition.
