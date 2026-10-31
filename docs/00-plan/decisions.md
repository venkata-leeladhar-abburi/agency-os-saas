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

### D-043 Onboarding, example data, notifications and the client portal (example mode)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Addresses:** the client portal lives at `/p/<workspace>` as `architecture.md` says, so proposal links moved from `/p/<token>` (D-042) to `/proposal/<token>`. Both are kept out of search engines.
- **Setup checklist:** the five steps in `defaults-and-content.md` §5, on Today and the dashboard, ticked from the workspace's own records (example records don't count). Hiding it is remembered; Help brings it back. "Add your logo and services" is ticked by services for now; logo upload arrives with file storage.
- **Example data:** every example record is marked. "Remove it" removes them, except an example record your own records still point to (a client on your invoice, a project you messaged on), which stays and is named in the result. Help can load the examples again; nothing is duplicated.
- **Notifications:** the categories and default channels in `defaults-and-content.md` §7 that this build produces (enquiry, proposal viewed, signed or declined, client approval or changes, mentioned in a task, payment received, client message per D-040). The in-app list follows each setting; email settings are saved and apply once email sending is set up. The team's own replies don't notify the team.
- **Client portal:** home ("Needs you", progress per project, latest), project (phases, approve or ask for changes with a required note, the client's past decisions, messages), payments and invoice, messages, account. Every read and write is scoped to the client's own projects and issued invoices; drafts never show. Approving moves the project to the next phase and records who, when and any comment. Real sign-in is the contact's email link (with the database); in example mode the agency opens any invited client's portal from the client page.
- **Payments in example mode:** "Pay" records an example UPI payment, labelled on screen as moving no money. Outside example mode the page says online payment isn't set up yet. Real payments need Razorpay test keys.
- **Sign-off titles are nouns** ("Homepage design", like the template's "Design sign-off"); screens add the verb: "Approve: Homepage design", "Srinivas Beere approved: Homepage design".
- **Known dev-only warning:** the dev server logs a React script-tag warning on 404 responses (from the theme script). A production build doesn't; checked with `next build` and `next start`.

### D-044 Team, invites, settings sections, plan limits, export and audit log (example mode)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Settings sections:** Workspace, Members and roles, Plan and billing, Notifications, Data export and Audit log, each its own page with a side menu (the approved S07 layout).
- **Invites:** by email with a role (any role but Owner); a 128-bit link valid for 7 days; send again (a new link, the old one stops working) or cancel. Until email sending is set up, the agency copies the link. Existing members and a second open invite are refused. Accepting gives the invite's role; a link works once. In example mode the invited person types a name to accept; real invites sign in with the invited email (M5, with the database).
- **Roles:** changed from the members list; a workspace always keeps an owner, and you can't remove yourself. The "What each role can do" table is read from the permission matrix in `packages/core`, so it can't drift from what the database enforces.
- **Plan limits (`defaults-and-content.md` §8, confirmed in D-040):** checked when adding (members including open invites, clients on the portal, open leads, quotes, proposals and invoices this month), never when viewing or exporting. At a limit, the upgrade dialog names the limit and lists the offered plans with room. Example records don't count. CSV import adds as many open leads as there's room for and lists the rest as skipped with the reason. Enquiries from the public form are never blocked, so no prospect is lost; the board shows them as usual.
- **Changing plans:** Razorpay subscriptions (M6 part 2) need test keys. Example mode switches plans without payment, labelled on screen, so limits can be tried.
- **Data export:** each list as CSV (money as decimals in the record's currency) and everything as one JSON file, on every plan. Access secrets (proposal link tokens, signing codes) stay out of the file. Each download is in the audit log.
- **Audit log:** invites, joins, role changes, removals, plan changes, settings changes, invoices issued, payments recorded, proposals sent, portal invites, exports and example-data removal, with who, when (IST) and the caller's IP; filter by kind, 200 a page.
- **Daily updates:** one per person a day (posting again replaces it); the team page shows today's and who hasn't posted.

### D-045 Branding, bank details and PDFs (example mode)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Brand colour (`design-system.md` §2):** saved as a hex value. It replaces `primary` (and a 15% darker `primary-hover`) in the client portal, the proposal link and the enquiry form only when white text on it reaches 4.5:1. `ring` follows only where it keeps 3:1 against the page, and `brand-soft-foreground` only where it keeps 4.5:1 on the soft tint, checked per theme; links keep the link colour. A colour that fails is still saved, and Settings → Branding explains, with the ratio, that the portal keeps the Agency OS violet. The contrast maths is in `packages/core` (tested); the colours it compares come from the tokens. Only a parsed hex value can reach the style sheet.
- **Logo:** PNG or JPEG under 500 KB, checked by its first bytes, not its name (SVG is refused because it can carry scripts). In example mode it's kept as a data URL; with Storage it moves to the `logos` bucket. The setup checklist's first step ("Add your logo and services") now needs both.
- **Free plan:** logo and colour show on every plan; the Free plan adds "Powered by Agency OS" to the portal and the PDFs (`prd-mvp.md`: "Powered by Agency OS on the free plan").
- **Invoice details:** workspace address, bank details (name on the account, account number, IFSC; SWIFT shown only to clients outside India) and the invoice footer (default "Thank you for your business.", `defaults-and-content.md` §4).
- **PDFs (`api-and-integrations.md`):** `@react-pdf/renderer` 4.9.0 with Geist and Geist Mono embedded. Invoices print what a GST tax invoice needs: supplier and recipient names, addresses and GSTINs, number and date, place of supply with the state name, SAC and rate per line, taxable value, CGST/SGST or IGST, total in words, reverse charge "No", and a signatory line; exports under LUT carry the LUT note; drafts say they aren't tax invoices. Quotes and proposals use the same layout. Until Storage and Inngest are set up, PDFs are made on request and never cached (`Cache-Control: private, no-store`); the plan to store them in the `pdfs` bucket from a job stays.
- **Signed proposals:** signing now records the method (email code), the browser and a SHA-256 fingerprint of the exact proposal text and quote lines. The signed PDF adds a signing record page that prints it and says whether the document still matches. The client downloads their copy from the proposal link once signed.
- **Who can download:** download routes don't pass through the workspace layout, so they check membership themselves (a non-member and a missing workspace get the same 404). The portal serves only the signed-in client's issued invoices.
- **Not yet:** the payment link and its QR code on the invoice PDF (Razorpay test keys); Noto Devanagari and Telugu fonts for names in Indian scripts (to add with the font files).

### D-046 Invoice reminders, the pay link and the client's invoice page (example mode)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Reminders (`defaults-and-content.md` §4):** on by default, by email to the client contact: 3 days before the due date, on it, 3 and 7 days after. A reminder that would fall before the issue date is left out. Each invoice gets at most one email a day: if several are due (say the job didn't run), the latest goes and the earlier ones show as skipped. Paying the invoice or switching reminders off cancels the rest; what was sent stays in the history. A reminder is marked sent only after the email provider accepts it. The schedule logic is in `packages/core` (tested); the invoice editor has the switch (a checkbox, since the form has Save) and the invoice page has it as a switch.
- **Sending:** `runReminders` does the daily job's work and sends through Resend once `RESEND_API_KEY` and `EMAIL_FROM` are set, with replies going to the agency. A scheduled job (Inngest, with the database) will call it. Until email is set up, due reminders show "Waiting for email setup" rather than pretending they went out; the example invoices' sent history is example data.
- **Reminder email:** React Email in `packages/emails`, colours and font from the tokens, the agency's logo, a "Pay ₹…" button in their colour when it's readable. Subject from `defaults-and-content.md` §7, "Invoice [number] is due on [date]", put in the past tense after the due date ("was due on"). The agency can preview it from the invoice; the preview page allows no scripts.
- **Pay link (`/pay/<token>`, S34):** every invoice gets an unguessable token (the database keeps its hash, as `data-model.md` says for `public_token_hash`). It opens the issued invoice without sign-in: who it's from and to, dates, place of supply, the lines and GST, pay by UPI, card or net banking, the PDF, and the bank details for a transfer with the invoice number as the reference. States: due, partly paid, overdue, payment failed (Razorpay's return) and paid. Drafts have no working link. Out of search engines, no referrer. The portal's invoice page uses the same view.
- **WhatsApp:** the invoice page has "Send on WhatsApp" with a plain message and the pay link, straight to the client's chat when their number has a country code.
- **Payments:** "Net banking" is added to the payment methods. In example mode, paying records an example payment with the method chosen; real payments wait for Razorpay test keys.

### D-047 Dashboard figures (example mode)
**Status:** Accepted · **Date:** 26 Oct 2026
- **Money (`prd-mvp.md` E1.9):** Received (payments this calendar month, IST), Pending (due or partly paid, the amount still due) and Overdue, all in rupees. An invoice in another currency is converted at the exchange rate on its invoice date; one without a rate is left out and the dashboard says how many. The sums are in `packages/core` (`moneySummary`, tested against `tax-test-cases.md` D and H).
- **Win rate:** won ÷ (won + lost) for leads decided in the last 90 days, dated by their won or lost activity. With none decided, it says so rather than showing 0%.
- **Projects at risk:** past the due date (shown as late), a client sign-off waiting a day or more, open tasks past their due date, or 90% of the budget used. Each row says which.
- **Links:** every figure opens the list behind it: Received → invoices with a payment this month, Pending → due, Overdue → overdue, Pipeline → leads, a name in Team load → that person's tasks. The invoice list has status tabs (All, Due, Overdue, Paid, Drafts).
- **First week:** with nothing quoted, billed or in the pipeline, the dashboard shows "Your numbers start here" (`defaults-and-content.md` §6) and links to the setup checklist instead of zeros.

### D-048 Hardening pass, part 1 (no database needed)
**Status:** Accepted · **Date:** 27 Oct 2026
- **Headers:** a nonce-based CSP on every page, set in `proxy.ts` (`'strict-dynamic'`; inline styles allowed for React style attributes and the brand colour sheet; images from `data:` and `https:` for logos and signed storage URLs). Routes that answer with their own document (the email preview, PDFs) keep their own stricter policy. HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` and `Permissions-Policy` on every response; no `X-Powered-By`.
- **Rate limits:** one module (`lib/rate-limit.ts`) for all public endpoints, counting in Upstash Redis when its keys are set and in memory otherwise. Limits in `LIMITS` (signing codes, signing tries, enquiries, links that open nothing). Results in `../04-engineering/hardening-2026-10.md`.
- **Pay links** can be replaced from the invoice; the old link stops at once and the audit log records it.
- **Dependencies:** `pnpm audit --prod --audit-level=high` in CI, Dependabot (weekly npm, monthly Actions) and CodeQL.
- **Performance:** Geist Mono isn't preloaded (rarely on first paint). Budgets are judged with applied 4G throttling until Lighthouse CI runs on the preview; the simulated figures are recorded too.
- **Accessibility:** the client-facing pages (portal, pay link, proposal link, enquiry form) use 16 px body text and 44 px targets on phones; autocomplete is set only on fields about the person filling the form in.
- **Example data** dates follow the IST calendar (they used the UTC date, so tests and screens were a day off between midnight and 5:30 am IST), and today's example history is never in the future.

### D-049 Prototype brought up to date with the build
*Numbered D-041 on `main`; renumbered when merged with D-041 to D-048 from the example-mode build.*
**Status:** Accepted · **Date:** 26 Oct 2026
- **Decision:** the approved prototype (`/prototype`) now matches what M5 to M12 and the founder's answers decided, so R2 and the tree test use the product as it is built. Where a rule lives in `packages/core`, the prototype reads it from there instead of repeating it: lead sources and lost reasons, plan names and prices, notification defaults, the quote number format, the proposal link's validity and the Design phase checklist.
- **Screens changed:** S06 and S07 (message notifications from D-040; a Notifications tab in Settings, with in-app and email switches per event), S09 (prices confirmed, the "proposal" note removed), S14 (a note is required when the lost reason is Other, D-031), S15 (sources from core), S18 (quote number `OSS/Q26-27/018` given on send, D-033), S19 (the link works for 14 days), S20 (the signer asks for a 6-digit code that works for 10 minutes; the signed record, D-033), S23 (primary contact; portal access by the invited email, D-032), S27 (who approves a gate, the full Design checklist, the next phase waits for the sign-off, D-034), S39 (asking for changes needs a note, D-034), S41 (the team gets the client's messages by email, D-040).
- **Message notifications:** the `message.posted` kind is added to core's notification defaults and to `defaults-and-content.md` §7 now rather than with M14, so Settings and the prototype show it. Delivery still comes with M14.
- **Consequences:** a later change to one of these rules in core shows in the prototype on its own.

### D-050 Invoices and payments in the database (M13, part 1)
**Status:** Accepted · **Date:** 27 Oct 2026
- **Tables:** `invoices`, `invoice_items`, `payments`, `reminders` (`packages/db`, migrations 0014 and 0015), from `data-model.md`. Two small changes from that table: the invoice `type` uses packages/core's document types (`tax_invoice`, `export_invoice`, `bill_of_supply`; proforma comes later), and "overdue" isn't stored but worked out from the due date when read, so it can't go stale. `payment_links` waits for Razorpay.
- **What the database enforces:** a draft's lines change freely; once issued, the number, client, currency, rate, dates, tax and totals never change and the invoice can't be deleted, only cancelled (its number stays used). Payments go only on issued invoices, in the invoice's currency, never above what's due (tax-test-cases.md H); each payment updates the paid amount and moves the invoice to partly paid or paid. Payments are never edited or deleted. A repeated Razorpay webhook is ignored.
- **Numbers:** consecutive per financial year through the existing row-locked sequence, `OSS/26-27/001`, restarting each April. Issuing counts towards the plan's invoices a month.
- **Who sees invoices:** roles with `invoices.read` (owner, admin, finance), and project leads for invoices on their own projects. Portal contacts see their client's issued invoices through `portal_invoices()`.
- **Pay links:** the token is an HMAC of the invoice id and a version, keyed by `LINK_SIGNING_SECRET` (new env var). The database stores only its hash, as the security rules ask, yet the invoice page can always show the link. "Make a new link" raises the version, so the old link stops at once. Cancelled invoices and drafts have no working link.
- **Reminders:** the daily job reads `remindersDue` (one per invoice a day, to the client's primary contact) and records each with `markReminderSent` once the email provider accepts it.
- **Tests:** 15 database tests against a real Postgres: numbering and the April restart, the locks, payments and over-payment, the monthly limit, roles and cross-tenant isolation, project-lead scope, the pay link and its replacement, reminders, the portal.

### D-051 Invoice and settings screens read and write the database
**Status:** Accepted · **Date:** 27 Oct 2026
- **How a screen reaches the database:** each `/w/<workspace>` page passes its slug to the data function. `workspaceCtx(slug)` (once per request) finds the signed-in member's workspace; signed out goes to sign-in, not a member gives the same 404 as no such workspace. Every query then runs through `withUser`, so RLS decides what the member sees. In example mode, or when a caller passes no slug (public pages and jobs not wired yet), the same functions use the example store, so the domains still to wire keep working.
- **Wired now:** the invoice list, invoice page, editor (draft or issue in one transaction), payments, reminders switch, new pay link, invoice PDF and reminder preview; workspace settings (name, GSTIN, LUT, prefix, payment terms, services, address, bank, footer, migration 0016) and the brand colour. The plan check before a new invoice counts issued invoices this month in the database.
- **Audit:** the database writes the audit entries for these actions; the screens add their own only in example mode, so nothing is logged twice.
- **Not yet in database mode:** logo upload (needs Storage; the form says so and keeps the brand colour working) and online payment on the pay page (needs Razorpay).
- **Tests:** 5 web tests run these functions as a member against a real Postgres (skipped without `TEST_DATABASE_URL`), including another workspace seeing nothing.

### D-052 Leads and clients on the database
**Status:** Accepted · **Date:** 27 Oct 2026
- **Wired:** the leads board and table, lead page (timeline, notes, follow-up, stage, lost with reason, won), new lead; the clients list (billed and outstanding from issued invoices, project count), client page (timeline, invoices), new client with the GSTIN check, and the portal invite. Plan limits for open leads and clients with a portal use the database's counts.
- **Stages:** the screens keep the five stages; the database keeps each workspace's own, seeded with the same five. Won and Lost match by kind, open stages by order (first New, second Contacted, the rest Proposal). Renaming or adding stages waits for the stage editor (not in the MVP screens).
- **Won:** one transaction moves the lead to Won and makes the client from it (`convertLeadToClient`); doing it again returns the same client.
- **Timeline:** database activity kinds map to the timeline's words (added, moved, note, lost with the note, won, portal invite, quotes and proposals); follow-up changes stay off the timeline, as in example mode. Names come from members' profiles.
- **Until projects are wired:** a real client's page shows no projects (the count on the list is real).
- **Portal invite:** gives the primary contact access and records it on the client's timeline; the sign-in email waits for Resend.
- **Tests:** 6 web tests against Postgres: add, move, note, follow-up, lost, won once, GSTIN, money and portal, and another workspace seeing none of it.

### D-053 Projects and tasks on the database
**Status:** Accepted · **Date:** 27 Oct 2026
- **Wired:** the projects list, project page (phases, the current gate and its request, client decisions, tasks), new project from a template; the tasks board and table (everyone, mine, one person's), task page (edit, status, subtasks, comments with @mentions), new task; client pages now list their projects.
- **People by name:** the forms pick the project lead and assignees by name, as in example mode; the data layer turns a name into the member's id (the first active member with that name). Pickers list active members with a name.
- **Current phase:** the first phase not done or skipped; its gate shows once requested (waiting, approved, changes asked). The gate's title comes from the template; a request worded differently sends that wording as its message.
- **Phases on tasks:** task forms list the project's own phases from the database, so saved templates work too.
- **Health:** late tasks are counted from the database (open tasks past their due date, IST).
- **Not yet:** budget used stays at zero until time and costs are tracked; project messages need their own table, which comes with the portal, so the Messages card shows in example mode only. Notifications for gate requests, assignments and mentions are returned by the database functions and wait for the job runner (Inngest) to deliver them.
- **Tests:** 4 web tests against Postgres: a project from the seven phases, the gate request, tasks with subtasks, comments, mentions and status, late tasks, and another workspace seeing none of it.

### D-054 Quotes and proposals on the database
**Status:** Accepted · **Date:** 27 Oct 2026
- **Wired:** the sales list, quote page, new quote (with the valid-until date typed in the editor), quote PDF; proposal from a quote (one per quote), editing, sending, the proposal page and PDF; quotes and proposals on a lead's page. The public link `/proposal/<token>`: view (counted, except the agency's preview), sign, decline, the signed PDF.
- **Link:** like pay links (D-050), the token is an HMAC of the proposal id keyed by `LINK_SIGNING_SECRET`, so the agency can copy the link again; only its hash is stored. A proposal can't be re-sent, so there's one version.
- **Where the code goes:** new column `proposals.sent_to` (migration 0017) keeps the address the proposal was sent to; the signing code goes there. The signing code email is a new template in `packages/emails` (wording proposed here for the founder to review: subject "482915 is your code to sign with One Stop Solutions"). It goes out through Resend once `RESEND_API_KEY` and `EMAIL_FROM` are set; until then the page says signing isn't available yet. Sending the proposal by email also waits for Resend; the agency copies the link or shares it on WhatsApp meanwhile.
- **Signing wins the lead:** as in example mode, a signed proposal moves its lead to Won and makes the client (on behalf of the person who sent it), and the quote and proposal point to that client. Sending moves a lead in New or Contacted to Proposal.
- **Totals:** quote pages and PDFs show the totals the quote was saved with (its own place of supply and LUT), not recalculated from today's settings, so a sent quote can't change. The signed PDF checks the hash recorded when the proposal was sent.
- **Plan limits:** quotes and proposals a month count those sent this month, as the database enforces it.
- **Tests:** 6 web tests against Postgres (quote with GST, one proposal per quote, edit, send and link, view counting and preview, signing with the code and winning the lead, decline once, another workspace seeing none of it), 2 more database tests, 2 email tests.

### D-055 Team, notifications and the audit log on the database
**Status:** Accepted · **Date:** 27 Oct 2026
- **Wired:** the members page (invite, send again, cancel, change role, remove), the team page (members with their projects and open tasks, daily updates), the notification bell and list (mark read, mark all read), each member's notification settings, the audit log with its filter and pages, and the workspace header (the member's name and unread count).
- **Emails of members:** sign-in emails live in Supabase's `auth.users`, which members can't read. Migration 0018 adds `workspace_member_emails(workspace)`, a guarded function that returns them only for that workspace's members and only to roles that can see members.
- **Invite links:** only the hash is stored, so the link shows once, when the invite is made or sent again (as in example mode). Sending again cancels the old invite and makes a new one, so the old link stops working at once.
- **Notifications now:** an assignment, an @mention or an internal sign-off request is put in the recipients' lists as soon as the change is saved (the database works out who; the app delivers with the service role, as members can't write each other's lists). Notifications respect each person's in-app setting. Their emails, and the client's sign-off email, go out with the job runner (Inngest) and Resend.
- **Settings:** the screen's seven categories map to the database's notification kinds (enquiry, proposal viewed and decided, gate decided, task assigned or mentioned, payment received, message); email is on or off per category.
- **Audit log:** the database records invoices, payments, settings, branding, invitations and proposal decisions itself. The app records the rest (invite sent again or cancelled, role changed, member removed) as the member, in the same words as example mode; entries the database wrote are put into words from what they store.
- **Errors:** refusals such as "a workspace needs at least one owner" are turned into the form's message after the transaction ends, as a failed statement aborts it.
- **Tests:** 6 web tests against Postgres: invite, refuse a second invite, send again (old link stops), join; cancel, roles, last owner, not removing yourself; one daily update a day; assignment and mention notifications and marking read; settings per person; the audit log in words with its filter, for owners only, and another workspace seeing none of it.

### D-056 Data export on the database
**Status:** Accepted · **Date:** 28 Oct 2026
- **CSV:** the eight lists (leads, clients, projects, tasks, quotes, invoices, payments, team) keep the same columns as example mode; they're built from the same functions the screens use, so a CSV matches what the member sees. Quotes use the totals they were saved with.
- **JSON:** "Download everything" is `exportWorkspace` from packages/db: every table of the workspace, now including invoices, invoice lines, payments and reminders. Access secrets (link token hashes, signing codes) stay out; money stays in minor units, as strings.
- **Who:** only roles with `data.export` (owner, admin). Others see "You don't have access to data export" on the page, and the download links answer 404, like any page that isn't there. The download route checks membership itself, as route handlers don't pass through the workspace layout.
- **Audit:** each download is recorded (the JSON by the database, each CSV by the app).
- **Tests:** 3 web tests against Postgres: every list from real records (with GST totals and a part payment), the JSON with the money tables and no secrets and its audit entry, and nothing for a member.

### D-057 Dashboard, Today and the setup checklist on the database
**Status:** Accepted · **Date:** 28 Oct 2026
- **One snapshot:** the dashboard, Today and the data export read one snapshot of the workspace as the member can see it (leads, clients, projects with their late tasks, tasks, quotes, invoices, members), built from the same functions as the screens. The figures and lists are worked out by the same code as example mode, so both modes agree.
- **Dashboard:** money received this month, pending and overdue (cancelled invoices left out), pipeline value and the 90-day win rate, projects at risk with reasons, team load. Team load links to each person's tasks by their user id.
- **Today:** follow-ups due, the member's own tasks due or late, sign-offs waiting on clients, invoices due today or late.
- **Win rate:** lists don't load each lead's timeline, so a won or lost lead takes its last change as the day it was decided; before this, a long-open lead won recently could fall outside the 90 days.
- **Setup checklist:** its five steps come from the workspace's own records; the first step needs only the services until logos can be stored. Hiding and bringing it back is saved on the workspace (owners and admins). Loading example data into a real workspace isn't offered yet: the banner and "Load example data" show in example mode only, and their actions do nothing outside it.
- **Tests:** 3 web tests against Postgres: the dashboard figures (received, overdue, pipeline, win rate 50%, a project at risk with an overdue task, team load), Today's four groups, and the checklist with hiding and showing.

### D-058 The client portal on the database, with project messages
**Status:** Accepted · **Date:** 28 Oct 2026
- **Signing in:** a client contact signs in with the email the agency invited (the email link or Google, as members do) and lands on `/p/<workspace>`. On their first visit the login is linked to every contact invited with that email, which is when the welcome note shows. Someone signed out, or not a contact of that workspace's clients, sees "Open the link from your email" with a link to sign in; both get the same answer. A contact for more than one client of the same agency sees the first; choosing between them comes later.
- **What they see:** everything runs as the contact, never with the service role, through guarded database functions: their own clients, projects (phases and the client's own sign-offs, with who leads the work, never the budget, tasks or notes), issued invoices (with the totals they were issued with), and the agency's invoice details (name, GSTIN, address, bank). Members' own tables stay closed to them.
- **Messages:** a new `messages` table (migration 0019), one thread per project, append-only. The client's portal contacts and members who can see the project read it; each side can only write as themselves (RLS checks the contact is the signed-in person's own, for that project's client). Up to 4,000 characters. The project page shows the thread on the database too, and the team replies from it.
- **Notifications:** a client's decision goes to the project lead, and a client's message to the project lead and team ("New message from [name] about [project]"), delivered straight away with the service role. The client's own notifications (email) wait for Resend and the job runner.
- **Account:** the contact updates their own name, email and phone (`update_my_contact`), and nobody else's.
- **Payments:** online payment in the portal still says it isn't set up until Razorpay test keys are in; bank transfer details show as before.
- **Tests:** 4 more database tests (messages and who may write them, the team's notification, the agency's details for its clients only, the contact's own details) and 6 web tests against Postgres (sign-in and linking, only their own projects and invoices with nothing internal, invoice totals, asking for changes with the lead told, the thread from both sides with the notification, updating their details).

### D-059 Emails: an outbox in the database, sent by jobs through Resend
**Status:** Accepted · **Date:** 28 Oct 2026
- **Outbox:** every email is first a row in `email_outbox` (migrations 0021 and 0022), written as the service role when an event is delivered. Members and clients have no access to it. Each event and recipient gets one row, so delivering an event twice never sends twice.
- **Sending:** the email job takes each workspace's due rows one at a time (locked, so overlapping runs never send the same email), works out what the email says at that moment (the amount due now, the pay link from `LINK_SIGNING_SECRET`), and hands it to Resend. A row is `sent` only once Resend accepts it. Failures are tried again after 1, 4, 9 and 16 minutes, then left as `failed` with the error. An email with nothing left to say (a reminder for a paid invoice) is `skipped`, never `sent`.
- **When:** straight after the action that queued it (through Inngest when its keys are set; otherwise in the request, once Resend is set up), and every 5 minutes. Invoice reminders are queued at 08:00 India time and marked sent as their email goes. Without `RESEND_API_KEY` and `EMAIL_FROM` the emails wait in the outbox.
- **Who gets what:** members by their notification settings (gate decisions and client messages on by default); clients by the defaults table: sign-off requests, the team's messages (to the client's portal contacts), "Invoice [number] from [workspace]" when an invoice is issued (to the primary contact), reminders, and an invitation when they're invited to the portal.
- **Links and replies:** clients' links go to their portal (or the pay page), members' to the app. Client emails reply to the workspace's first owner, so replies reach the agency, never Agency OS.
- **Cross-workspace reads:** the jobs start from two guarded functions that return workspace ids only (with emails due; all live workspaces), then work as the service role in one workspace at a time.
- **Wording:** subjects follow the defaults table word for word. The short bodies, and the portal invitation ("[agency] invited you to see your projects"), are proposed for the founder to review (open question 21).
- **Not yet:** the member invitation email (the link still shows once on the members page), the daily digest, follow-up and overdue emails, and the client's own notifications in the portal.
- **Tests:** 8 database tests (queueing once, members' settings, both sides of the thread, no access for members, sent only when accepted, retries then failed, no double send when runs overlap, invoice and reminder emails), 6 job tests (portal links and reply-to, the pay link and waiting for the secret, the invitation, reminders once, Resend's answers), 5 template tests, 1 web test that the app's actions queue the right emails.

### D-060 Invitation, overdue and payment emails
**Status:** Accepted · **Date:** 28 Oct 2026
- **Member invitation email:** with `LINK_SIGNING_SECRET` set, an invite link is made from the secret and the invitation's id (like pay links), so the email job can rebuild it while only its hash is stored. Inviting or sending again queues "[name] invited you to [workspace] on Agency OS" with a **Join** button. Before sending, the job checks the invite is still open and the rebuilt link matches; a cancelled, used or expired invite is skipped. Without the secret, links stay random and show once on the members page, as before, and no email is queued.
- **Overdue invoices:** each morning (with the reminders, 08:00 India time) owners and finance are told about invoices that went overdue in the last week: in the app ("Invoice [number] is overdue", with the client and amount due) and by email by their settings. Once per invoice; a missed day catches up.
- **Online payments:** a payment through the pay link (Razorpay's webhook) now emails owners and finance "Payment received: [amount] for [number]", once per payment, as well as the in-app notification it already made.
- **Wording:** subjects from the defaults table; bodies proposed with the others (open question 21).
- **Tests:** 2 job tests (the emailed invite link works and a cancelled one is skipped; overdue once, in the app and by email), 1 database test (the payment email once), 2 template tests, 1 web test (the invite queued on invite and send again), 2 tests for the notification words.

### D-061 A test user in the Supabase dev project
**Status:** Accepted · **Date:** 30 Oct 2026 (open question 19, answered yes)
- **User:** `claude-test@example.com` in the dev project, email confirmed, no password, marked in its metadata as for Claude's browser checks. Sign-in links are made with the admin API when a check needs one; none is stored. It's never created in production.
- **Found while doing it:** the dev database has none of the app's tables yet (migrations 0000 to 0022 haven't been applied), and cloud sessions can't reach Postgres (HTTPS only). So signed-in screens can't be checked against the dev project until the founder adds `DATABASE_URL_DIRECT` as a secret of the GitHub `dev` environment and runs the "Migrate database" workflow (Actions tab, type `migrate`). Checking them from a cloud session also needs Postgres to be reachable from it; otherwise the check runs locally or in CI.

### D-062 The daily digest
**Status:** Accepted · **Date:** 30 Oct 2026
- **When:** at 08:30 on each workspace's own clock (its time zone setting). The job runs every half hour and sends to workspaces in that half hour; one digest per person a day.
- **Who:** owners by default (each can switch it off in Settings, Notifications); anyone else who switches it on; and lead owners with follow-ups due, whose "Follow-up due" email is set to the digest (the default), get those follow-ups.
- **What:** each person's own Today (follow-ups, their tasks due or late, sign-offs waiting on clients, invoices due or late), built by the app as that person, by the same code as the Today page, so it never shows more than they can see. A lead owner who gets it for follow-ups sees only those. A day with nothing in it sends nothing.
- **Email:** "Today at [workspace]", the items in their groups with what's late marked, each linking to its page, and a button to Today. Body wording proposed with the others (open question 21).
- **Failures:** if one person's Today can't be built (for example without `LINK_SIGNING_SECRET`, which the invoice list needs), their digest is skipped and logged; the others still go.
- **Tests:** 4 database tests (the half hour on the workspace's clock, who gets it, switching it off and on, another time zone), 1 web test against Postgres (each person's own Today once, the lead owner only their follow-ups, rendered as the email), 1 template test.

### D-063 Example data in a real workspace, and switching companies in the portal
**Status:** Accepted · **Date:** 30 Oct 2026
- **Load:** owners and admins (`workspace.manage`) can load example data from the setup card or Help: 4 leads (Kite & Co, Lumen Foods, Mitra Clinic, Northwind), the client Acme Labs with the project "Website redesign" (seven phases) and 3 tasks, and a draft invoice. Every record is marked as an example and labelled on screen; the setup checklist still counts only the workspace's own work. Loading twice does nothing.
- **No gaps in numbering:** no example quote is made, and an example invoice is never issued (the app refuses, and the database blocks it too), because a number taken by an example and then removed would leave a gap in the GST series.
- **Remove:** one database function removes the example records for owners and admins, children first, with their timelines and comments. An example record your own records still use (a client on your invoice, a project with your task or daily update) stays, and the result names it, as in example mode. It's recorded in the audit log.
- **Others:** members who can't manage the workspace see the "example data" label without the buttons.
- **Portal companies:** a contact for more than one of an agency's clients sees "Switch company" on the portal home and their companies on Account. Choosing one is checked on the database, as the contact; a client they're not a contact for is never shown.
- **Tests:** 4 database tests (load once and owners only, example invoices never issued, removal keeping what your records use, removing everything and the first real invoice numbered 001), 2 web tests against Postgres (labelled on every list, checklist unaffected, removed in one go), 2 web tests for switching companies.

### D-064 The last screens on the example store, moved to the database
**Status:** Accepted · **Date:** 30 Oct 2026
- **Found:** a sweep for data functions with no database path showed five areas still reading the example store when signed in: the public pay link page, the public enquiry form, the command palette's search, the leads CSV import and export, and the plan page (with the import's limit check). All five now use the database.
- **Pay link:** the page and its PDF read the invoice by the link's hash, then as the service role for that one workspace: the invoice as issued, its payments, the client, and the agency's GSTIN, address and bank details. Any link that opens nothing reads as not found.
- **Enquiry form:** on the database its link is a token (only the hash is stored), made from `LINK_SIGNING_SECRET` and the form's id, so Settings can show the same link again; the workspace's slug no longer opens a form. Each enquiry becomes a Website lead, the owners are told in the app, and now by email too ("New enquiry from [name]", which was missing). Without the secret, Settings says the link isn't ready yet.
- **Search:** the palette indexes what the member can see (leads, clients, projects, invoices, proposals, tasks), from the same snapshot as the dashboard.
- **Leads CSV:** import uses the same row checks as example mode (shared), adds leads as the member into the workspace's own stages, skips duplicates by email or phone and open leads beyond the plan's room, and skips Lost rows (a lost lead needs its reason). Export lists the member's leads, and the route now checks membership itself.
- **Plan page:** the plan and what it has used come from the same counts the database checks before each "add". Changing plans still needs Razorpay.
- **Tests:** 2 web tests for the pay link, 2 for the enquiry form, 4 for search, CSV and the plan page, all against Postgres; 1 template test.

### D-065 Tasks: the calendar view
**Status:** Accepted · **Date:** 30 Oct 2026
- **What:** Tasks has a third view, Calendar, next to Board and Table (PRD E1.7). It shows the tasks with a due date by day for one month: a month grid on wider screens, a list of days on phones. Each day shows up to three tasks and "N more", which opens the table. Late tasks are marked, done ones struck through, and a line says how many tasks have no due date.
- **Link:** `?view=calendar&month=2026-11`, with links to the months either side and "This month"; "Mine" and "Everyone" keep the view. Today is the date in IST, as everywhere else.
- **Why no new data:** it reads the same task list as the board and table, so it works in example mode and on the database alike.

### D-066 Leads: filters that stay, and saved views
**Status:** Accepted · **Date:** 30 Oct 2026
- **What:** The leads board and table filter by source, owner and follow-ups due (PRD E1.1, "filters persist; saved views"). Filters live in the page's link, so a refresh, the Board/Table switch or a shared link keeps them. The form is a plain form, so it works before the page's script loads.
- **Remembered:** the page remembers your last filters in a cookie for that workspace's leads page (180 days, not sent anywhere else) and goes back to them when you open Leads without filters. "Clear filters" shows everything and forgets them. Anything in the link or the cookie that isn't a real source or a sensible owner name is ignored.
- **Saved views:** you can save the current filters under a name (up to 20, names up to 60 characters; saving under a name you use replaces it) and delete them. They're yours alone: a new table, `saved_views` (migrations 0024 and 0025), with RLS so only the member who saved a view reads or changes it, and only while they're in the workspace. In example mode they're kept in the example store.
- **Empty states:** a workspace with no leads still shows "No leads yet"; a filter that matches nothing says so and offers "Clear filters".
- **Tests:** 6 database tests (save, replace by name, name checks, private to the member, never across workspaces, the limit and delete, gone when the member leaves), 1 web test against Postgres, 3 web tests for the filter and the filtered list; a browser script for the whole flow, axe clean on desktop light and phone dark.

### D-067 Proposals: the client asks a question, and decisions are emailed
**Status:** Accepted (the notification row is proposed, open question 22) · **Date:** 30 Oct 2026
- **What:** the proposal's link has "Ask a question" next to Decline while the proposal is open (PRD E1.2). The question goes on the proposal's timeline in the app, and the sender and owners are told in the app and by email. The email quotes the question, and its reply-to is the address the proposal was sent to, so replying from the inbox answers the client.
- **Limits:** up to 2,000 characters; 10 questions an hour per proposal (in the database) and per network (in the app). None once the proposal is signed, declined or expired.
- **Stored:** as an activity on the proposal (no new table), readable by members who can read proposals and never across workspaces; example questions go with the example data.
- **Found on the way:** "Proposal signed or declined" was in the app but never emailed, though its default is email on. It now is ("[Client] signed the proposal" or "declined the proposal", with the reason), and signing, declining and asking now send queued emails straight away.
- **Proposed default:** the notification row isn't in `defaults-and-content.md` §7, so its settings and subject are proposed in open question 22; the settings screen lists it as "Question about a proposal".
- **Tests:** 2 database tests (question on the timeline, notification and email; the limits and closing once decided, with the decision email), 1 job test (the email with reply-to the client, then the decision email), 2 email tests; a browser script for the public page in example mode, axe clean on desktop light and phone dark.

### D-068 Settings: your profile, and sign out of all devices
**Status:** Accepted · **Date:** 30 Oct 2026
- **Found:** members had no way to set their own name (it's what the team, the portal and emails show), so the PRD's "Settings: profile" was missing, as was "sign out of all devices" (E0.1).
- **Your profile:** Settings, Your profile: your name (2 to 80 characters), an optional phone (a 10-digit Indian mobile is saved as +91…, other numbers start with +), and your sign-in email, read only. Saved as you, under RLS on your own row; people outside your workspaces can't read it. In example mode it changes the example owner's name.
- **Sign out of all devices:** after a confirmation, ends every session you have, this one included, through Supabase's global sign-out, then shows "You're signed out on every device" on the sign-in page. Each page load checks the session with Supabase, so other devices are signed out on their next page. Not checked yet against the real Supabase project (needs the dev database and test user); example mode has no sign-in and says so.
- **Tests:** 2 database tests (saving and the team seeing it; never someone else's), 1 web test against Postgres, 1 form test; a browser script in example mode, axe clean on desktop light and phone dark.

### D-069 Speed at 10,000 records: palette search on the database, faster RLS, no 1,000 cap
**Status:** Accepted · **Date:** 31 Oct 2026
- **Measured:** a benchmark seeds a workspace with 10,000 records (4,000 leads, 2,000 clients, 200 projects, 2,800 tasks, 1,000 invoices) on Postgres 16 and times what the screens load (`apps/web/lib/data/db/search.bench.db.test.ts`, run with `BENCH=1`). Before: the palette loaded the whole workspace when it opened, which took 19.7 s and 1.5 MB, and the browser then scored every record on each key. The dashboard, Today and export snapshot took 17.8 s.
- **Found on the way (a bug):** the leads, clients and sales lists asked for at most 1,000 rows, so a workspace past that would have lost records from the board, the dashboard and the data export without a word. They now list everything.
- **Palette:** it now asks the database as you type (after 120 ms), for at most 8 of each kind, in one query run as the member: names, companies, emails, phone digits, GSTINs, contacts, invoice and quote numbers. Older answers are dropped when the words change. Actions and places are filtered in the browser. Example mode searches the example store the same way.
- **Row-level security, same rules, faster:** the busiest tables' policies called a function per row that looked up the member's role again (about 40 µs a row). Migration 0026 makes them compare each row with the set of workspaces where the member has the permission, worked out once per query (`permitted_workspaces`, `my_workspaces`); "own" scopes still check the project per row, only for roles whose scope is "own". The write policies are read policies too (joined with OR), so they changed the same way. A new test puts the old policies back inside a rolled-back transaction and checks that each of 8 people (every role and an outsider) sees exactly the same rows in all 20 tables; it fails if any old rule is changed.
- **No more one-at-a-time loading:** clients, projects (with phases, checklists, gates, members) and invoices (with lines, payments, reminders) load in a fixed number of queries however many there are; subtasks are grouped once instead of searched per task.
- **After:** palette search 30 to 72 ms (worst of 5, for words matching thousands of records, one, or none); leads 153 ms, clients 214 ms, projects 234 ms, tasks 161 ms, invoice list 233 ms; the whole snapshot 0.86 s (was 17.8 s). Measured locally; the live database adds network time.

### D-070 Less JavaScript per page
**Status:** Accepted · **Date:** 31 Oct 2026
- **Why:** the hardening pass found about 280 KB of JavaScript (compressed) on every page (`hardening-2026-10.md`).
- **What changed:** the UI package is marked side-effect free (its CSS aside) and Next optimises imports from it and from the icons, so a page loads only the components it uses. The command palette's code loads when the page is idle or on first Ctrl+K, not with the page; the shortcut listener stays. The workspace components are split into boards (with drag-and-drop), tables, and overview pieces that render on the server, so pages without a board don't load drag-and-drop.
- **Measured** (production build, compressed JavaScript before the page's load event): portal home 271 → 206 KB, Today 276 → 218 KB, invoices 280 → 239 KB, dashboard 267 KB, leads board 286 → 271 KB (it needs drag-and-drop), pay link 135 KB, proposal link 197 KB, sign-in 177 KB. React and Next themselves are about 106 KB of each.

### D-071 Two-factor login with an authenticator app, behind a switch
**Status:** Accepted (switched off until checked against Supabase; recovery is open question 23) · **Date:** 31 Oct 2026
- **What:** Settings, Your profile has "Two-factor login" (PRD E0.1, `security-and-compliance.md`). Setting up shows a QR code and the key from Supabase Auth's multi-factor support (TOTP); it turns on once the person enters a code from their app. Turning it off needs a current code, so a session left open can't. Supabase keeps the secret; the app shows the QR code once and stores nothing.
- **Signing in:** after the email link or Google, anyone with it on is sent to "Enter your code" before any other page. The check reads the session's assurance level (aal1 or aal2) in the proxy, with no extra request to Supabase. The code page has "Sign out" for someone without their phone.
- **Who:** anyone can turn it on for their own account. Requiring it for owners on paid plans (`security-and-compliance.md`) is for after launch.
- **Limits:** 10 code tries per network every 10 minutes, on top of Supabase's own limits.
- **Switched off for now:** `NEXT_PUBLIC_TWO_FACTOR=false` hides the Settings card until it has been tried against the Supabase project (TOTP enabled there). The code check at sign-in is always on, so anyone who has it is always asked.
- **Not checked:** setting up and signing in against real Supabase (needs the dev database and test user). Checked: 6 tests with Supabase's multi-factor calls stood in for (setting up, clearing an unfinished set-up, wrong and right codes, signing in, turning off only after a code), and the Settings card in a browser in example mode (axe clean, desktop light and phone dark).

