Agency OS runs an agency's whole client journey: get found, win the work, deliver, get paid, hand over. The interface is calm and dense where people work all day (owners, project leads), and warm and simple where clients visit from a WhatsApp link. Indian money, dates and languages are the default; every other market works just as well.

## Content fundamentals

- **Write from the user's side, in plain English.** Name things the way agencies and clients say them: *lead*, *client*, *proposal*, *invoice*, *approval*, *handoff*. Not *record*, *entity*, *workflow instance*.
- **Sentence case everywhere:** buttons, titles, menu items ("Send proposal", "Projects at risk"). Capitalise only names (Razorpay, WhatsApp, GST).
- **Buttons start with a verb and say exactly what happens:** "Send proposal", "Approve design", "Record payment". The toast confirms in the past tense: "Proposal sent".
- **Speak to the person as "you"; the product doesn't say "I" or "we".** On the client portal the agency speaks: "Your designer shared the homepage."
- **Errors say what went wrong and how to fix it,** with no apology: "That GSTIN has 14 characters. It needs 15." Never "Oops" or "Something went wrong" alone.
- **Short sentences, no exclamation marks, no emoji in the interface.** Celebrate with the lime highlight, not with words.
- **Empty screens explain and offer one action:** "No leads yet. Add your first lead or import a CSV."
- **Client portal copy is extra simple:** no jargon ("phase gate" becomes "Approve this design"), and words that translate cleanly to Hindi and Telugu.

### Formats

| Thing | India (default) | International |
| --- | --- | --- |
| Money | ₹4,86,000 · compact ₹4.86 L · ₹1.2 Cr | $486,000 · compact $486K · $1.2M |
| Dates | 25 Oct 2026 (written month, never 10/25) | 25 Oct 2026 / Oct 25, 2026 by locale |
| Time | 10:30 am IST; both zones for foreign clients ("10:30 am IST · 6:00 am London") | Local time first |
| Invoice numbers | `OSS/26-27/014` in Geist Mono | Same |
| Phone | +91 90149 52056 | E.164 with spaces |

Use `AgencyOS.formatMoney(minor, currency, { compact })`, `AgencyOS.formatDate()` and `AgencyOS.rupeesInWords()` (Indian invoices state the total in words). Money is always stored in minor units with a currency code, and always shown with tabular figures.

## Visual foundations

### Colour
- **Neutral first.** Screens are built from `background`, `card`, `popover`, `foreground`, `muted-foreground` and `border`. Colour is for meaning and for the one primary action.
- **Violet is the brand and the action colour.** Use `primary` (#6840ff, `violet-600`) for the single primary button per view, the selected state, links (`link`) and the focus ring (`ring`). Text on it is `primary-foreground` (5.6:1).
- **Lime is the brand highlight, used rarely.** `highlight` (#a1ff62) marks wins and progress: the "Won" pipeline column, completed onboarding steps, the logo tile. Text on it is always `highlight-foreground` (ink). Never put lime text on a light surface.
- **Status colours always carry a word or icon too:** `success`, `warning`, `danger` and `info` as text on their `-soft` backgrounds or on `card`. Success and danger also differ in lightness, so they never rely on red versus green alone.
- **Charts use `chart-1` to `chart-6`,** in order. All are 3:1 or better on `card` in both themes.
- **Every text pair in both themes passes WCAG AA (4.5:1);** borders of controls (`input`) and the focus ring pass 3:1. `subtle-foreground` is for placeholders and tertiary text on `card` and `background` only.
- **Neutrals are warm,** tinted toward the brand ink (#151313), never pure grey.

### Type
- **Geist for everything, Geist Mono for IDs, codes, invoice numbers, GSTINs and keyboard keys.** Both are variable fonts (100 to 900) that include the ₹ sign. Indian scripts in user content fall back to Noto Sans Devanagari and Telugu.
- **Default UI text is `body` (14/20).** Use `body-medium` for buttons and labels, `body-sm` for helpers and timestamps, and `caption` for badges.
- **One `title-lg` (24/30) per page.** Use `title-md` for sections and dialogs, `title-sm` for card titles, and `title-xl` only for the dashboard greeting and the portal home.
- **Numbers that line up use tabular figures.** Big numbers use `metric` (28/32).
- **`overline` (11/16, uppercase, +0.06em)** labels groups in the sidebar, the command palette and sections.
- **The client portal uses `body-lg` (16/24) for running text on phones.**

### Space, size and layout
- **A 4px grid:** `space-1` (4) to `space-16` (64). Cards pad `space-5` on desktop and `space-4` on phones; sections are `space-8` apart.
- **Controls are `control-md` (36px) by default,** `control-sm` in toolbars, `control-lg` for form submits, and `control-xl` (44px) on the client portal and phones.
- **Tables use `row-default` (44px) or the compact density (`row-compact`, 36px).** Show about five columns by default; more are opt-in.
- **App layout:** the sidebar (`sidebar-width` 248, collapses to 64), a top bar (`topbar-height` 56), content up to `content-max` (1280). Reading text stays within `prose-max`.

### Shape and depth
- **Radii:** `radius-md` (8) for buttons and inputs, `radius-lg` (12) for cards and popovers, `radius-xl` (16) for dialogs, the command palette and portal cards, and `radius-full` for avatars, pills and switches.
- **Depth is mostly borders.** Cards are `card` + 1px `border` with no shadow. Shadows mean "floating":
  - `shadow-xs`: inputs and secondary buttons
  - `shadow-sm`: the active sidebar item
  - `shadow-md`: menus and dragged cards
  - `shadow-lg`: dialogs, the command palette and toasts
- **Dark mode adds a faint top highlight** to raised surfaces instead of heavier shadows.

### Motion
- **Durations:** 120 ms for hovers and presses, 200 ms for menus and toggles, 320 ms for dialogs and sheets.
- **Easing:** ease-out `cubic-bezier(.16,1,.3,1)`. Motion confirms an action; it never decorates.
- **Respect reduced motion:** spinners stop, skeletons stop shimmering, transitions are removed.

### States
Every component defines default, hover, focus-visible (2px `ring`, 2px offset), active (1px press), disabled (50% opacity, no pointer) and loading (spinner, `aria-busy`). Every screen designs loading (skeletons), empty (one action), error (what to do next) and no-access states.

## Iconography

- **One family: Phosphor** (MIT). Use the **regular** weight for UI at 16px (inline, buttons) and 18 to 20px (navigation), **fill** only for the selected sidebar item, and **duotone** only for empty states and feature headers (28 to 36px).
- **Icons support a label; they never replace it.** Icon-only buttons need an `aria-label` and a tooltip.
- **Icon colour follows text:** `muted-foreground` by default, `foreground` on hover, `primary` when selected, and the status colour inside alerts and badges.
- **In code use `@phosphor-icons/react`.** The `Icons` asset group holds the core SVGs, which draw in `currentColor` (black in an `<img>`).
- **No emoji** as icons.

## Logo

The mark is the One Stop Solutions glyph (disc, two squares and a quarter circle), as used for Agency OS in the pitch deck, followed by the wordmark "Agency OS" set in Geist SemiBold at -0.03em. Show it in `primary` on light surfaces, and lime (`highlight`) on a violet or ink tile. A dedicated Agency OS logo has not been drawn yet.

## Components

Components are React 18 components on `window.AgencyOS`, styled entirely by these tokens. They are the visual reference for the app. In the codebase the same designs are built on shadcn/ui with Tailwind CSS v4, using these exact token names (see the handoff docs).

- **One primary `Button` per view.** Use `secondary` for everything else, `ghost` in toolbars and tables, and `destructive` only inside a confirmation `Dialog`.
- **Confirm only destructive actions;** everything else shows a `Toast` with Undo.
- **Status is a `Badge` with a dot** (Overdue, Waiting for client, Paid), never colour alone.
- **Agency OS patterns:**
  - `PipelineBoard` for leads
  - `PhaseStepper` and `GateCard` for projects and approvals
  - `InvoiceSummary` for GST, export and multi-currency invoices
  - `Checklist` for onboarding
  - `RecordHeader` for every record page
  - `CommandPalette` (Ctrl/Cmd+K) everywhere

## Accessibility

WCAG 2.1 AA as the floor:
- 4.5:1 for text, 3:1 for controls and focus in both themes
- full keyboard use with a visible focus ring
- labels on every control
- status never by colour alone
- 44px touch targets on the client portal
- reduced motion respected
- Indian scripts render through Noto fallbacks

## Licences

Geist and Geist Mono: SIL Open Font License 1.1 (Vercel). Phosphor Icons: MIT.
