# Decisions

Short records of decisions that are not obvious from the code. Newest at the bottom. **Status:** Proposed (waiting for the founder at the named gate), Accepted, or Replaced (by a later entry).

Format: context → decision → consequences.

---

### D-001 Build the design system on shadcn/ui
**Status:** Proposed (G1) · **Date:** 25 Oct 2026
- **Context:** we need accessible, owned components fast, with a look that is ours.
- **Decision:** shadcn/ui (Radix primitives) with Tailwind CSS v4 and CSS variables, restyled with Agency OS tokens, type, icons and patterns.
- **Consequences:** the component code lives in our repo (`packages/ui`); upgrades are manual; the reference design in `design/` is the visual target.

### D-002 Brand colours and token names
**Status:** Proposed (G1) · **Date:** 25 Oct 2026
- **Context:** the Agency OS deck uses violet `#6840ff`, lime `#a1ff62` and ink `#151313`.
- **Decision:** warm neutral ramp plus violet (action), lime (wins), and status ramps, generated in OKLCH and checked to WCAG AA in both themes. Token names follow shadcn (`background`, `primary`, `muted-foreground`, …) plus ours (`highlight`, `brand-soft`, `link`, `success`, `warning`, `danger`, `info`, `subtle-foreground`, `primary-hover`).
- **Consequences:** shadcn components work without renaming; Tailwind's default palette is removed so only tokens exist.

### D-003 Geist and Geist Mono
**Status:** Proposed (G1) · **Date:** 25 Oct 2026
- **Decision:** Geist for all UI text, Geist Mono for IDs and codes, loaded from the `geist` npm package (full files, includes ₹). Noto Sans Devanagari and Telugu as fallbacks.
- **Consequences:** free (SIL OFL). A paid display face for marketing is optional (open question 3).

### D-004 Phosphor icons only
**Status:** Proposed (G1) · **Date:** 25 Oct 2026
- **Decision:** `@phosphor-icons/react`; regular weight for UI, fill for selected navigation, duotone for empty states. No second icon library.

### D-005 Next.js App Router, TypeScript, pnpm + Turborepo monorepo
**Status:** Proposed (G0) · **Date:** 25 Oct 2026
- **Decision:** one Next.js app (`apps/web`) with route groups for the app, client portal, public pages and marketing; shared packages (`ui`, `tokens`, `core`, `db`, `emails`, `jobs`, `i18n`, `config`). Expo app added in R7.
- **Consequences:** one deploy for all surfaces; the portal can split out later if needed.

### D-006 Supabase with row-level security for multi-tenancy
**Status:** Proposed (G0) · **Date:** 25 Oct 2026
- **Decision:** Supabase Postgres (Mumbai region), Auth, Storage and Realtime; shared schema with `workspace_id` and RLS on every table; Drizzle for schema, queries and migrations, with requests run under the user's JWT claims.
- **Consequences:** isolation enforced by the database; cross-tenant tests are mandatory.

### D-007 Money in minor units
**Status:** Accepted · **Date:** 25 Oct 2026
- **Decision:** all amounts are integers in minor units with an ISO currency code; quantities and exchange rates are `numeric`; tax rates in basis points.
- **Consequences:** no floating-point errors; formatting only through `core` helpers.

### D-008 GST invoices, export under LUT and per-invoice currency in R1
**Status:** Proposed (G0; deck question Q3) · **Date:** 25 Oct 2026
- **Context:** Indian clients expect GST invoices from the first invoice; fixing tax later means migrating data.
- **Decision:** the R1 invoice engine covers tax invoice (CGST + SGST or IGST), bill of supply, export under LUT, and proforma, in any currency.
- **Consequences:** a chartered accountant must review before G3.

### D-009 Team basics and the client portal in R1
**Status:** Proposed (G0) · **Date:** 25 Oct 2026
- **Decision:** members and roles and the client portal ship in R1 (the deck had them later). HR features stay in R4.
- **Consequences:** R1 is larger; it proves the full loop that sells the product.

### D-010 Razorpay for payments
**Status:** Proposed (G0) · **Date:** 25 Oct 2026
- **Decision:** invoice payments through Payment Links on **the agency's own Razorpay account**; Agency OS subscriptions through Razorpay Subscriptions on One Stop's account. Foreign-currency invoices can be marked paid manually (bank, Wise, PayPal) with FIRA/FIRC records.
- **Consequences:** no client money passes through Agency OS in R1. International subscription billing is decided later (open question 9).

### D-011 In-house accept-and-sign for proposals in R1
**Status:** Proposed (G3 legal check) · **Date:** 25 Oct 2026
- **Decision:** clients accept proposals with a typed or drawn signature, verified by an email (later phone) code, with an audit trail and document hash in a signed PDF. A `SignatureProvider` interface allows DocuSeal or an Aadhaar eSign provider later.
- **Consequences:** no extra vendor in R1; a lawyer confirms adequacy before G3 (open question 11).

### D-012 Background jobs on Inngest, email on Resend
**Status:** Proposed (G0) · **Date:** 25 Oct 2026
- **Decision:** Inngest for jobs, schedules and retries; Resend with React Email templates.

### D-013 Analytics and errors
**Status:** Proposed (G0) · **Date:** 25 Oct 2026
- **Decision:** PostHog (events, flags, masked session replay) and Sentry (errors, performance). No personal data in event properties.

### D-014 Localisation
**Status:** Accepted · **Date:** 25 Oct 2026
- **Decision:** `next-intl`; en-IN default, en-US and en-GB at launch; Hindi and Telugu after launch; dates with a written month; Indian number format for INR.

### D-015 WhatsApp through share links first
**Status:** Accepted · **Date:** 25 Oct 2026
- **Decision:** R1 uses `wa.me` share links and the phone share sheet; the WhatsApp Business Platform comes in R6.
- **Consequences:** no Meta account or template approval needed for launch.

### D-016 Phone OTP behind a flag until DLT registration
**Status:** Proposed (G0) · **Date:** 25 Oct 2026
- **Decision:** Google and email magic link from day one; phone OTP for Indian numbers enabled once the founder completes DLT registration with an SMS provider.

### D-017 Code-first design and prototypes
**Status:** Proposed (G1) · **Date:** 25 Oct 2026
- **Decision:** wireframes and the hi-fi prototype are built as real screens with example data under `/prototype`, reviewed on the Vercel preview. Figma only if the founder asks.
- **Consequences:** one source of truth; the prototype becomes the product.

---

Add new decisions below this line, numbered D-018 onward. Record gate approvals here too, for example: "G1 approved by the founder on <date>; changes requested: …".

### D-018 M0 tool versions and test setup
**Status:** Accepted · **Date:** 25 Oct 2026
- **Decision:** Node 22, pnpm 10.28, Turborepo 2.11, Next.js 16.4, React 19.3, TypeScript 5.9 (not 7, until the lint tooling supports it), ESLint 9 (flat config), Vitest 5, Playwright 1.64, Storybook 10 (React + Vite, in `packages/ui`), Prettier 3.9. All pinned in `package.json`.
- **Consequences:** `pnpm check` runs lint, typecheck, unit tests and the format check. e2e runs with `pnpm --filter @agency-os/web e2e`; set `PW_CHROMIUM_PATH` to use a preinstalled Chromium.

### D-019 Working branch until the founder creates `main`
**Status:** Accepted · **Date:** 25 Oct 2026
- **Decision:** the pack and M0 are on `claude/clever-ramanujan-2d8uch` because the remote has no `main`. Open questions use their defaults (including question 13) until the founder answers.
