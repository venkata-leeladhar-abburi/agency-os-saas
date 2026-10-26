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

### D-020 Token pipeline (M1)
**Status:** Accepted · **Date:** 25 Oct 2026
- **Context:** the pack has `tokens/tokens.json` plus hand-checked `tokens/globals.css`; the build plan asks for a generator and a contrast check in `packages/tokens`.
- **Decision:** `tokens/tokens.json` at the root stays the single source of truth. `packages/tokens/scripts/generate.mjs` writes both `packages/tokens/globals.css` (imported by the app and Storybook) and `tokens/globals.css` (the reference copy); it reproduces the pack's file byte for byte. `scripts/contrast.mjs` checks 41 semantic pairs in each theme (text 4.5:1; control borders, focus and charts 3:1). `pnpm --filter @agency-os/tokens test` fails if either output is stale or a pair fails, so CI checks both. `design/system/tokens.json` is the frozen reference bundle and is not regenerated.
- **Consequences:** to change a token, edit `tokens.json` and run `pnpm --filter @agency-os/tokens generate`.

### D-021 Founder allows Claude to merge non-gate PRs
**Status:** Accepted · **Date:** 25 Oct 2026
- **Decision:** answer to open question 13. Claude merges its own PRs when CI is green; gate milestones (M4 at G1 and G2, M16 at G3) wait for the founder.

### D-022 Theme switching, fonts and design-rule checks
**Status:** Accepted · **Date:** 25 Oct 2026
- **Decision:** `next-themes` sets `data-theme` on `<html>` (light, dark or system; stored under `theme` in localStorage). Geist comes from the `geist` package (`GeistSans.variable`, `GeistMono.variable`); Storybook serves the same variable font files from the package. `scripts/check-design-rules.mjs` (part of `pnpm check`) fails on raw hex, rgb, hsl or oklch colours, arbitrary colour classes, other icon libraries and other font sources in `apps/web` and `packages/ui`. `cn()` in `packages/ui` uses tailwind-merge taught the Agency OS type scale, so `text-title-lg` and `text-foreground` don't cancel each other out.
- **Consequences:** Noto Sans Devanagari and Telugu are in the font stack but not bundled; they come from the device (Android ships them). Revisit if Indian-script names render poorly on desktops.

### D-023 Visual and accessibility checks for Storybook; screenshots in the repo
**Status:** Accepted · **Date:** 25 Oct 2026
- **Decision:** CI builds Storybook and runs Playwright over every story in light and dark: no serious or critical axe violations, and a screenshot per story uploaded as the `storybook` CI artifact. Pixel baselines are not compared yet, because font rendering differs between this cloud container and the GitHub runner; they will be added with a pinned Playwright Docker image before G1 if the founder wants automated visual diffs. The PR screenshot set (light and dark, 390px and 1440px) is committed under `docs/screenshots/<milestone>/` and made with `apps/web/scripts/screenshots.mjs`.

### D-024 Core components (M2)
**Status:** Accepted · **Date:** 25 Oct 2026
- **Decision:** components live in `packages/ui/src/components`, built on Radix (`radix-ui` package) with `class-variance-authority` variants, as shadcn does, restyled to the reference. Toasts use `sonner` through `notify()` and `<Toaster />` (bottom right on desktop, top on phones, 5 seconds). Select stays a styled native select (best on phones for short lists). Avatars render initials directly on the server, so there is no empty flash before hydration. Dropdown menus are non-modal. Component strings that a screen reader hears ("Close", "Dismiss", "Optional", "required") are props with English defaults, so apps pass translated text from next-intl; `packages/ui` does not depend on next-intl.
- **Consequences:** component tests run in Vitest with jsdom and Testing Library (39 tests). Storybook axe checks now scan the whole page, so portalled dialogs, menus and toasts are covered. Differences from the reference are listed in `docs/03-design/differences-from-reference.md` for G1.

### D-025 Money, tax and formatting in core from M3
**Status:** Accepted · **Date:** 25 Oct 2026
- **Context:** InvoiceSummary, MetricCard and the reference screens need money formatting, GST maths and amounts in words, and CLAUDE.md puts all of that in `packages/core`.
- **Decision:** `packages/core` now has `formatMoney` (Indian grouping and lakh/crore compact for INR; locale formats for other currencies; exact decimal strings, no floats), `amountInWords`/`rupeesInWords`, `formatDate` (written month; "Sept" normalised to "Sep"; date-only strings never shift), `financialYear`, `formatInvoiceNumber`/`validateInvoicePrefix`, `validateGstin` (checksum, state codes 01 to 38 and 97), `calculateInvoice` (tax per line per head, half-up; round-off; intra, inter, export with and without LUT, bill of supply; discounts; INR equivalent) and `applyPayment`. All worked cases A to M in `tax-test-cases.md` are tests; coverage is 100% and CI enforces it for tax and money. The CA still reviews these rules before G3 (open question 10).
- **Consequences:** M13 builds invoices on these functions instead of writing them then.

### D-026 Patterns (M3)
**Status:** Accepted · **Date:** 25 Oct 2026
- **Decision:** patterns live in `packages/ui/src/patterns`. Command palette on `cmdk`; DataTable on TanStack Table v8 (smallest-first sorting on every column, column picker, selection and bulk actions, loading and empty rows); PipelineBoard on dnd-kit with a drag handle per card, left/right arrow keys moving to the neighbouring stage and announcements read from dnd-kit's own data. Patterns render `<a>` and take a `linkAs` prop so the app can pass `next/link`. Example data for stories and the prototype lives in `packages/ui/src/example/data.ts`, uses only the names from the design reference, and every screen that shows it carries the "Example data" badge.
- **Consequences:** Storybook story checks run with reduced motion so axe never measures a colour mid-transition. The three reference screens are rebuilt as Storybook stories under Screens.

### D-027 Wireframes as /prototype routes (M4)
**Status:** Accepted · **Date:** 25 Oct 2026
- **Decision:** the 42 R0/R1 wireframes live at `/prototype/[screen]` in `apps/web` (D-017), built from the real shell, navigation, labels and primary actions, with grey boxes for content. Each screen declares its states; `?state=` switches them and `?chrome=0` hides the prototype controls. The routes are on unless `PROTOTYPE=off`; they are removed after G3. Navigation per role follows the information architecture, R0/R1 items only (Playbook is R2). The top bar's **New** is primary only on pages without their own primary action, so a page never has two. Record tabs that are separate pages use `TabLinks` (links with `aria-current`), not ARIA tabs.
- **Consequences:** e2e checks every screen in every state with axe (light and dark) and fails if a page is wider than a 390px phone. CI uploads every screen in light and dark at 390px and 1440px as the `prototype-screenshots` artifact. Hi-fi (G2) restyles the same routes.

### G1 approved
**Status:** Approved · **Date:** 25 Oct 2026
- **Decision:** the founder approved gate G1 (design system in code and wireframes of all 42 R0/R1 screens) with "Approve G1", with no changes requested.
- **Note:** the tree test (pass line: first-click success of 80% or more) had not been run at approval. It moves to run alongside usability round R2, before G2; any label that fails is changed before G2. The labels approved for now are "Sales docs" for quotes and proposals, and no Playbook in the R1 navigation.
- **Consequences:** M4 part 2 (hi-fi prototype on the same `/prototype` routes) can start once G0 is passed or waived (`build-plan.md`: G0 comes before hi-fi).

### G0 waived
**Status:** Waived by the founder · **Date:** 25 Oct 2026
- **Decision:** the founder waived G0 in writing ("Waive G0, test at R2") instead of running the interviews and survey first. Hi-fi (M4 part 2) builds on the documented hypotheses in `docs/01-research/`.
- **Consequences:** usability round R2, before G2, is the real check with owners and clients in India and abroad, together with the tree test moved from G1. Assumptions A1 to A6 stay unvalidated until then; G2's pass lines (task success ≥ 80%, no blockers, SEQ ≥ 5.5) are unchanged.

### D-028 Hi-fi prototype (M4 part 2)
**Status:** Accepted · **Date:** 25 Oct 2026
- **Decision:** the hi-fi prototype restyles the same `/prototype` routes: every placeholder replaced by real components and example data (labelled example names only), with money and tax from `packages/core`. A `Go` helper turns buttons into links between screens so the usability tasks can be clicked through; `apps/web/e2e/flows.spec.ts` checks T1 to T10 and T12. The phone-width check now also measures scrolling main areas, not only the page.
- **Consequences:** wireframe screenshots are replaced by `docs/screenshots/m04-hifi/` (the wireframes stay in git history and PR #4).

### G2 approved
**Status:** Approved · **Date:** 26 Oct 2026
- **Decision:** the founder approved gate G2 (hi-fi prototype of all 42 R0/R1 screens) with "I approved, do next things".
- **Note:** usability round R2 and the tree test had not been run at approval. Recorded as the founder accepting that; both move to run with One Stop's own team and the first beta agencies before G3, and any blocker they find is fixed before G3.
- **Consequences:** the build (M5 to M16) starts.

### D-029 Data layer and RLS (M5 part 1)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Decision:** `packages/db` uses Drizzle 0.45 with postgres.js. Tables are generated into `migrations/0000_*.sql`; RLS, policy functions and seeds are hand-written SQL in later migration files (in `migrations/`, not a separate `policies/` folder, so one migrator applies both in order). Roles and permissions are defined once in `packages/core/src/permissions.ts`; `role_permissions` is seeded from it and a test fails if they differ. Scopes are `all` or `own` (own records only, for project leads and members). Workspace creation and invitation acceptance are `security definer` functions so a user can create the first owner membership or join with a valid token without broad insert rights. Invitation tokens are 24 random bytes; only the SHA-256 hash is stored. A trigger keeps at least one owner per workspace. `audit_log` has no update or delete grant at all. Ids are UUID v7 made in the app.
- **Consequences:** database tests run against real Postgres 16 (a service in CI) with a small shim for Supabase's `auth` schema and roles; on Supabase the real ones are used. Auth screens, the session cookie and the switcher (M5 part 2) need the Supabase dev project.

### D-030 Platform data layer (M6 part 1)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Decision:** plans and limits live in `packages/core/src/plans.ts`, using the default for open question 5 (`defaults-and-content.md` §8) until the founder answers: Free has 1 member, 1 client with a portal, 25 open leads and 3 quotes, proposals and invoices a month; Solo exists but isn't offered. A limit check names the cheapest offered plan that fits. Pending invitations count towards the member limit. Notification kinds and their default channels are in `packages/core/src/notifications.ts`; members save only their changes from the default, per kind. Jobs create notifications through `notify()` under `withService`; members can read, mark read and delete only their own. Subscriptions change only through the Razorpay webhook: the signature is checked (HMAC-SHA256, constant time), each event is applied once (`webhook_events` unique on provider and event id), the workspace id and plan come from the subscription's notes, `active` and `pending` give the paid plan, and `halted`, `cancelled`, `completed`, `expired` and `paused` return the workspace to Free. Data export is JSON of every table plus CSV per table (`toCsv`, which defuses text that would run as a spreadsheet formula), needs `data.export`, never includes token hashes and is written to the audit log.
- **Consequences:** each later milestone adds its usage counter (leads in M8, clients in M9, sales documents in M10, invoices in M13) and its tables to the export. `/api/health` reports the database; `/api/webhooks/razorpay` answers 503 until `RAZORPAY_WEBHOOK_SECRET` and `DATABASE_URL` are set.

### D-031 Leads data layer (M8 part 1)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Decision:** a trigger gives every new workspace the default stages (New, Contacted, Proposal, Won, Lost). Won and Lost can be renamed but their kind can't change and they can't be removed; only open stages are added. Card and stage order uses fractional-index keys (`fractional-indexing`), so a drag writes one row; new leads go on top of their stage, imports go at the bottom. The database refuses a lead in a Lost stage without a reason, or with Other and no note, and clears the reason when the lead moves back. A closed lead loses its follow-up. A new lead's follow-up is the next working day (Monday to Friday) at 11:00 in the workspace's time zone. Phone numbers are stored as digits with a leading +, so search works however they were typed. Delete is a soft delete that needs `leads.delete`, and leads can be restored. The activity timeline is append-only for members, and an activity can only point at a record in its own workspace. CSV import checks every row in core (`toLeadImport`), with messages that say what to fix, and reads amounts as people write them (4,86,000, ₹4.86 L, 2 Cr, 50k). It is refused as a whole if it would pass the plan's open-lead limit. Public enquiries find their workspace through a `security definer` lookup on the hashed form token and are added as the service role for that workspace only. They are kept even past the plan limit, so no enquiry is lost, and they notify the owners.
- **Consequences:** the board, table, record, CSV mapping screen and public form page (M8 part 2) are built on these functions once sign-in exists. Rate limiting on the public form waits for Upstash (question 7).

### D-032 Clients, contacts and portal access (M9 part 1)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Decision:** a client defaults to the workspace's country, currency and time zone. A client in another supported country defaults to that country's currency and time zone instead. A GSTIN is checked in core (with core's fix-it messages), sets the state code (place of supply) and is refused for clients outside India. Each client has exactly one primary contact; removing the primary makes the next contact primary. Members with an `own` client scope (project leads, members) will see the clients of their own projects. Projects arrive in M11, which replaces `owns_client()`; until then they see none.
- **Portal access** works by a verified email, not a separate token. Inviting a contact sets `portal_invited_at`, and the app sends the sign-in link (email, with a WhatsApp share). When that person signs in with the invited email, `claim_portal_access()` links their login to the contact. Only that function can set the link; changing the contact's email removes it, and revoking access stops it at once. Portal users are not workspace members and have no table access. They read their clients through `portal_clients()`, which leaves out internal notes and other contacts. The plan's portal limit counts clients with at least one invited contact.
- **Lead to client:** works on a lead in Won. It carries over the name or company, the contact details, the currency and the notes, links the lead and the client both ways, and returns the same client if run again. A signed proposal (M10) will also allow it.
- **Consequences:** M10 adds signed proposals as a way to convert; M11 replaces `owns_client()`; M14 builds the portal screens on `portal_clients()` and `is_client_contact_for()`.
