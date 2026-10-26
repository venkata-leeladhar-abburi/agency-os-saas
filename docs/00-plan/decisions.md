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

### D-033 Quotes, proposals and signing (M10 part 1)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Numbers:** quotes are numbered `PREFIX/QYY-YY/NNN` (for example `OSS/Q26-27/001`), consecutive per financial year and within 16 characters. Numbers come from one `document_sequences` table (kind `quote` or `invoice`, row-locked by `take_document_number()`). It replaces the `invoice_sequences` table named in the data model, and invoices (M13) use it too.
- **Quote totals** come from `calculateQuote` in core. A discount on the whole quote is spread over the lines in proportion before tax (largest remainder, so the paise always add up), and then the invoice GST rules apply. Place of supply comes from the client (its state, or export for a client abroad). A lead's quote assumes the workspace's state, or export when the currency isn't INR, and the user can change it. The LUT applies when it is valid on the quote date. A quote can be edited only while it's a draft.
- **Proposals** start from the Standard proposal template. Sending fixes the blocks and the quote and stores the SHA-256 of exactly what the client sees. The link is valid for 14 days and only its hash is stored. Views are counted, and the first view tells the sender.
- **Signing:** the signer asks for a 6-digit code by email (valid 10 minutes, at most 5 codes an hour, at most 5 tries per code; only its hash is stored). Signing checks that the content still matches the hash sent. It writes a signature record (name, verified email, time, IP, user agent, document hash) that no one can change or delete, accepts the quote, and tells the sender and the owners. A signed proposal can't be reopened, and it lets the lead convert to a client even before it is moved to Won.
- **Plan limits:** Free's 3 quotes and 3 proposals a month count documents sent in the current calendar month, in the workspace's time zone. Drafts are unlimited.
- **Consequences:** the editor, public page, signature drawing (Storage), PDFs and the code email (Resend) come in M10 part 2. The CA and the lawyer review the wording before G3.

### D-034 Projects, phases and gates (M11 part 1)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Templates:** the built-in templates (Seven phases, Blank) are defined in `packages/core/src/phases.ts`. A workspace's own templates, saved from a project, are one `phase_templates` row with the phases as JSON in the same shape. This replaces the three template tables in the data model.
- **Checklist:** a phase's starter checklist goes into `checklist_items`, separate from tasks (M12). It is internal and drives progress: done items ÷ all items in phases that aren't skipped.
- **Access:** `own` scope means being on the project (a member or its lead). `owns_client()` now means "a client of one of your projects", so project leads and members see those clients. A project lead can create projects they lead. Finance reads all projects. Every child row (members, phases, checklist, gates, approvers) must belong to its parent's workspace.
- **Gates:** status and decisions change only through `request_gate`, `decide_gate_internal`, `decide_gate_as_client` and `skip_phase`. Editing the row directly is refused. A client gate is decided in the portal by a contact of the project's client (the named contact when there is one). An internal gate is decided by its named approver, or by `gates.approve` when none is named. Asking for changes needs a comment. Approval finishes the phase. A later phase can't start or finish while an earlier non-skipped gate isn't approved. Every request and decision goes on the project timeline and the audit log.
- **Signed proposals:** a project started from a signed proposal begins with Proposal accepted approved and Connect done.
- **Portal:** `portal_projects()` gives the client phases, client lines, deliverables, gates and progress, never the checklist, budget or team.
- **Notifications:** members can't write notifications, so user actions (gate requests and decisions) return a notification event. A job delivers it as the service role with `notify()`.
- **Consequences:** M12 links tasks to phases; M14 builds the portal approval screens on these functions.

### D-035 Tasks, comments and the team (M12 part 1)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Tasks:** statuses and priorities match the approved prototype (To do, In progress, In review, Done; Low, Normal, High). A task belongs to a project, optionally a phase of that project, and optionally a parent task in the same project. Subtasks go one level deep. Board order uses fractional-index keys (`COLLATE "C"`). `completed_at` is set when a task moves to Done and cleared when it moves back. Deleting a task is a soft delete that needs `tasks.delete` and takes its subtasks with it.
- **Access:** the project's team sees and edits its tasks (`own` scope = on the project). Someone assigned a task on another project sees that task only. Assignees must be active members.
- **Comments:** authors edit and delete their own. Mentions keep only members of the workspace and notify them (the "task assigned or mentioned" notification). As with gates, the function returns the event and a job delivers it.
- **Daily updates:** one per member, day and project, saved again to update it. The member sees their own, the project's lead sees the project's, and people with `members.write` see all.
- **Team page:** `team_overview()` gives each member's role, active projects and open tasks as counts only, to anyone with `members.read`.

### D-040 Founder answers: plan limits and message notifications
**Status:** Approved by the founder · **Date:** 26 Oct 2026
- **Plans:** the limits in `defaults-and-content.md` §8 are confirmed as enforced since M6 (open question 5).
- **Message notifications:** a new message in a project thread notifies the other side in the app and by email. The team gets the in-app list and email; the client gets the portal and email. Each person can turn it off in Settings (open question 17). It's added to the notification defaults with M14.
- **Database access from cloud sessions:** these sessions allow only HTTPS, so migrations run on the Supabase project from a GitHub Actions workflow started by hand (`DATABASE_URL_DIRECT` as a repository secret). The app talks to Supabase Auth and Storage over HTTPS.

### D-041 Building the workspace screens before the database is reachable
**Status:** Accepted (founder asked to build with example data) · **Date:** 26 Oct 2026
- **Example mode:** with `EXAMPLE_MODE=true` the app skips sign-in and opens the example workspace at `/w/one-stop`. Every screen shows the "Example data" badge. Never set in production.
- **One data layer:** screens read and write only through `apps/web/lib/data`. Today it works on an in-memory example store (`example-store.ts`), so forms really save during review; it resets when the server restarts. Each function is swapped for its `packages/db` query (through `withUser`) as screens are wired up; what the screens receive stays the same.
- **Rules stay in one place:** form checks live in `apps/web/lib/forms.ts` and call `packages/core` for money, GSTIN, invoice prefixes and payments; the display rules (follow-ups, invoice status, GST treatment per client) live in `lib/data/views.ts`. Both are unit-tested, and the server actions run the same checks.
- **Server and client parts:** server pages pass icons to client components by name only, because components can't cross from the server to the browser.

### D-042 Sales docs, signing, imports, the enquiry form and search (example mode)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Quotes:** for a lead or a client, priced in the client's currency (from their country). GST comes from the client's state against the workspace's (`calculateQuote`), and a whole-quote discount is spread over the lines before tax. The summary shows each line before the discount, then the discount and the taxable subtotal.
- **Proposals:** made from a quote with the Standard proposal template (`defaults-and-content.md` §3), scope filled from the quote's lines. Blocks still showing template text are marked "Fill this in" for the agency and left out of the client's view; sending warns about them. Links use a 128-bit token and are kept out of search engines. A view is counted when the client opens the link, not from the agency's preview.
- **Signing:** the client types their name, gets a 6-digit code by email (10 minutes, 5 tries), and enters it. The signature records name, email, time and IP. Signing makes the lead a client. Until email is set up (`RESEND_API_KEY`), example mode shows the code on screen, clearly labelled; outside example mode signing says it isn't available yet rather than pretending.
- **CSV import:** up to 5,000 rows and 5 MB. Columns are matched from their names (the core now also reads "Client name", "Org", "Mail" and "Where from"), can be changed, and every row is checked again on the server. Rows with problems, and leads already in the workspace (same email or phone), are skipped with the reason and row number.
- **Enquiry form:** a public page at `/f/<workspace>` with the fields in `defaults-and-content.md` §2, including the consent tick. Each enquiry becomes a lead with source Website. Five enquiries a minute per network; a hidden field turns bots away.
- **Command palette:** Ctrl/Cmd+K or the sidebar search. It loads every record's name and a line about it when it opens and filters in the browser; actions and "Go to" show before you type.
