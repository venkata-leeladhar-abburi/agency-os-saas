# Gate G3: beta ready

**Status:** draft, not ready to approve · **Prepared:** 30 Oct 2026 · **Pull request:** [#14](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/14)

G3 opens the beta to One Stop and then 5 to 10 agencies. This page collects what the founder checks: the pass lines from `build-plan.md`, every PRD acceptance criterion with where it stands, release notes, and known issues. It's kept up to date until the founder approves.

## Pass lines

| Pass line (`build-plan.md`) | Where it stands |
| --- | --- |
| R0 and R1 built | Built and on the database, except the items under "Not built yet" below. Every screen reads and writes Postgres when signed in (D-050 to D-058, D-063 to D-068). |
| One Stop has run real work on it for 2 weeks | **Not started.** Needs a deployed environment and the keys in "Waiting on the founder". |
| A chartered accountant has reviewed invoices | **Not started.** Blocking (open question 10). |
| Legal documents ready | **Not started.** Blocking (open question 11): terms, privacy policy, DPA, click-to-sign. |
| Security review done | **Part 1 done** (`../04-engineering/hardening-2026-10.md`). Still to do: the OWASP ZAP baseline on the preview, the RLS review against the live database, two-factor login. |
| All PRD acceptance criteria | Most met; see the table below. |
| CI green | Green on the current head. |
| Performance budgets met | Met locally with 4G throttling (LCP 1.8 to 2.1 s); Lighthouse CI on the Vercel preview waits for Vercel (open question 7). |
| No open critical or high findings | None open. CodeQL clean. |

## PRD acceptance criteria

Status: **Met** (built and tested), **Partly** (what's missing is named), **Waits** (built, needs a key or access to switch on), **Not built**.

| Epic | Criterion | Status |
| --- | --- | --- |
| E0.1 Sign-in | Sign-up in no more than 2 screens before setup | Met (email link or Google, then setup) |
| | Phone OTP for +91, 10-minute expiry, 5 tries | Waits: behind a flag until an SMS provider is chosen (question 12) |
| | 30-day sessions, sign out of all devices from settings | Met in code (D-068); the global sign-out is checked once the dev project is reachable |
| | Two-factor login (authenticator app) for owners | Not built |
| E0.2 Workspaces | India defaults INR, en-IN and IST; other countries their own; every step but the name can be skipped | Met |
| | Invites expire in 7 days, can be resent or revoked | Met; the invitation email waits for Resend |
| | Plan limits enforced with a clear upgrade message | Met (members, portal clients, open leads, quotes, proposals, invoices) |
| | One person in several workspaces, switching between them | Met |
| E0.3 App shell | Command palette: leads, clients, projects, invoices; actions; under 300 ms for 10,000 records; keyboard only | Partly: on the database (D-064); not yet timed against 10,000 records |
| | Notifications in the app and by email, per-category settings | Met in the app; emails wait for Resend and Inngest |
| | Settings: profile, branding, members, billing, tax and invoices, notifications, export, audit log | Partly: profile added (D-068); logo upload waits for Storage; subscribing waits for Razorpay |
| E0.4 Onboarding | Checklist shows progress, can be dismissed, comes back from Help; example data labelled and removable in one click | Met (D-057, D-063) |
| E0.5 Platform | Audit log; data export (CSV, JSON); plans and limits | Met; paying for a plan waits for Razorpay |
| E1.1 Leads | Drag between stages; cards show name, company, value, source, owner; column totals | Met |
| | Filters persist; saved views | Met (D-066): source, owner and follow-ups due, remembered per workspace; saved views per member |
| | Activity log, follow-ups in Today, lost reasons required | Met |
| | CSV import with mapping, and export | Met (on the database, D-064) |
| | Public enquiry form | Met (on the database, D-064); its link needs `LINK_SIGNING_SECRET` |
| E1.2 Quotes and proposals | Quote with lines, discount, total in the client's currency; proposal from blocks and the template | Met |
| | Sent as a link, opens recorded | Met; the email waits for Resend; WhatsApp share works |
| | Signing records name, email verification, time and IP; signed PDF | Partly: the record and the PDF are made; storing the PDF waits for Storage; the code email waits for Resend |
| | The client can ask a question | Met (D-067); the notification row is proposed (question 22) |
| | Statuses Draft, Sent, Viewed, Signed, Declined, Expired | Met |
| E1.3 Lead to client | One click, nothing asked again; offers the project and advance invoice | Met |
| E1.4 Clients | Record with contacts, GSTIN, address, country, currency, notes; projects, invoices, activity tabs | Partly: the files tab waits for Storage |
| | Portal invite by magic link, with WhatsApp share | Met; the invitation email waits for Resend; "set a password later" not built |
| E1.5 Client portal | Usable within 3 s on a mid-range phone over 3G; 44 px targets; plain language; no forced password | Met for targets, language and no password; LCP 1.8 s on 4G locally, a 3G check on a real phone is part of the beta round |
| | Home, projects, approvals, invoices, messages, branding | Met; paying online waits for Razorpay; files in messages wait for Storage |
| E1.6 Projects | Seven-phase template or blank; gates with approver and status; request approval with message | Met; files on a request wait for Storage |
| E1.7 Tasks | Title, description, assignee, due date, priority, phase, subtasks, comments | Met; attachments wait for Storage |
| | Board, List, Calendar views; My tasks | Met (Calendar: D-065) |
| E1.8 Invoices | Tax invoice, bill of supply, export under LUT, proforma; any currency; numbering per financial year | Met; tax logic covered by unit tests (`../04-engineering/tax-test-cases.md`) |
| | Razorpay link, partial payments, webhook marks paid | Partly: partial payments and the webhook are built and tested; the link waits for Razorpay keys |
| | Manual payments with an optional FIRA/FIRC attachment | Partly: payments yes; the attachment waits for Storage |
| | Reminders before and after the due date | Met; sending waits for Resend and Inngest |
| | PDF in the agency's branding | Met; the logo waits for Storage |
| | A chartered accountant reviews the invoice template | **Not started (blocking)** |
| E1.9 Dashboard and Today | Each number links to its list; clear empty states; base currency at the invoice-date rate | Met |
| E1.10 Team | Members with role, projects, open tasks; daily updates the lead sees | Met |

## Release notes (what the beta gets)

- **Get found and win the work:** a leads board and table with your own stages, filters that stay and saved views, follow-ups in Today, lost reasons, CSV import and export, a public enquiry form, quotes with GST worked out by state, proposals from a template with a link the client opens, signs with an emailed code, asks a question, or declines.
- **Deliver:** projects from the seven-phase template, sign-offs the client approves in their portal, tasks on a board, a table or a calendar, with subtasks, comments and @mentions, daily updates, and a team page.
- **Get paid:** tax invoices, bills of supply, exports under LUT and proformas, numbered per financial year with no gaps; payments, part payments and a pay link; reminders before and after the due date; PDFs.
- **The client portal:** projects, approvals, invoices and messages on a phone, in the agency's colours, with no password.
- **Running the agency:** a dashboard with money, pipeline, win rate, projects at risk and team load; Today; notifications in the app and by email; a daily digest; members and roles; plans and limits; the audit log; data export.

## Known issues and what's next

**Waiting on the founder** (`open-questions.md`):
- **Keys:** `LINK_SIGNING_SECRET` (question 17), Resend, Inngest, Razorpay test keys, Supabase Storage, Vercel, PostHog, Sentry, Upstash (question 7).
- **Dev database:** apply the migrations to the dev database: `DATABASE_URL_DIRECT` in the GitHub `dev` environment, then the "Migrate database" workflow. Until then no signed-in screen has been checked in a browser.
- **Reviewers:** a chartered accountant (question 10) and a lawyer (question 11).
- **Beta:** the beta agencies (question 15), the product name and domain (question 2).
- **Wording to approve:** the signing code email (question 20), the other email bodies (question 21) and the proposal question notification (question 22).

**Not built yet:** two-factor login. It's built next, once a signed-in browser check against the Supabase dev project is possible, since it changes how every sign-in works.

**Known limits:**
- Logos, files and stored PDFs need Storage.
- Online payment needs Razorpay.
- The palette hasn't been timed at 10,000 records.
- About 280 KB of JavaScript per page is worth trimming before launch (`hardening-2026-10.md`).
- The usability round with a screen reader or magnifier user and a low-cost Android phone is still to be run with people.
