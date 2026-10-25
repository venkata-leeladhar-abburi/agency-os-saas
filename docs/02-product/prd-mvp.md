# PRD: R0 foundation and R1 core loop (MVP)

**Goal:** an agency can take a lead to a paid, delivered milestone in Agency OS, and its client can follow, approve and pay from a phone. One Stop Solutions runs its own projects on it before anyone else does.

**Out of scope for the MVP:** marketplace, public profiles, the full Playbook library (R2), document studio beyond proposals and quotes (R4), time tracking and HR (R4), handoff package (R5), AI drafts (R6), native apps (R7).

Every story follows the UX rulebook (`../03-design/ux-principles.md`): each screen has empty, loading, error and no-permission states; there is one primary action; destructive actions need confirmation and everything else gets undo; it works with a keyboard and on a phone. These are part of every acceptance criterion and aren't repeated below.

---

## R0 Foundation

### E0.1 Accounts and sign-in
- As a new user, I can sign up with Google, an email magic link, or a phone number with OTP (India).
  - **AC:**
    - Sign-up takes no more than 2 screens before the workspace setup.
    - Phone OTP works for +91 numbers; OTP expires in 10 minutes; at most 5 attempts.
    - Sessions last 30 days, with sign-out of all devices from settings.
- As an owner, I can turn on two-factor login (authenticator app).

### E0.2 Workspaces, roles and invitations
- As a new user, I set up a workspace: name, logo, services, country, base currency, GST details (optional), time zone.
  - **AC:**
    - Country India sets defaults to INR, en-IN number format and IST.
    - Other countries set their currency and locale.
    - Every step except the name can be skipped.
- As an owner, I invite members by email or phone with a role: Owner, Admin, Project lead, Member, Finance or HR (permissions in `information-architecture.md`).
  - **AC:**
    - Invites expire in 7 days and can be resent or revoked.
    - Plan limits (members, clients) are enforced with a clear upgrade message.
- One person can belong to several workspaces and switch between them.

### E0.3 App shell
- A collapsible sidebar per role, a top bar with the workspace switcher, search (Ctrl/Cmd+K), "New" and notifications, plus the user menu.
- **Command palette:** search leads, clients, projects and invoices; run actions (new lead, new invoice, go to…).
  - **AC:** results in under 300 ms for up to 10,000 records; keyboard only.
- **Notifications:** an in-app list and email; per-category settings.
- **Settings:** workspace profile, branding (logo, brand colour for the client portal), members, billing and plan, tax and invoice settings, notifications, data export, audit log.

### E0.4 Onboarding checklist
- Default content for every epic (templates, stages, empty states, notifications, limits) is in `defaults-and-content.md`.
- A new workspace sees a checklist: add your logo, add a lead, send a quote, invite a client, create an invoice. Optionally load sample data, clearly marked "Example", that can be removed in one click.
  - **AC:** the checklist shows progress; it can be dismissed; it comes back from the Help menu.

### E0.5 Platform basics
- An audit log of important actions (who, what, when, from where).
- Data export (CSV and JSON of all records) at any time.
- Plans and limits: Free, Agency Starter and Growth for now. Payment of the Agency OS subscription itself is through Razorpay subscriptions (INR); USD billing comes later.

---

## R1 Core loop

### E1.1 Leads
- As an owner, I see leads in a Kanban pipeline with my own stages (default: New, Contacted, Proposal, Won, Lost) and in a table view.
  - **AC:**
    - Drag between stages.
    - Each card shows name, company, value, source and owner.
    - Column totals show the count and value.
    - Filters persist; saved views.
- I add a lead in under a minute: name, company, phone or email, source (Referral, Instagram, LinkedIn, Website, Marketplace, Ads, IndiaMART, Other), value, service and notes.
- **Activity log** per lead (calls, notes, stage moves, emails sent) and follow-up reminders with a due date, shown in Today.
- **Lost reasons** are required when a lead is moved to Lost.
- **CSV import** with column mapping, and export.
- A public **enquiry form link** (a hosted page) that creates leads with the source "Website". The embeddable widget comes later.

### E1.2 Quotes and proposals
- As an owner, I create a **quote** from a lead with line items (service, description, quantity, rate, tax), discount and total, in the client's currency.
- I create a **proposal** from blocks (cover, about us, scope in and out, timeline, pricing table from the quote, terms, signature) using a template.
- I send it as a link (email, with WhatsApp share) and see when it's opened.
- The client reads it online on any device, accepts and signs (embedded e-signature) or asks a question.
  - **AC:**
    - Signing records name, email or phone verification, time and IP in an audit trail, attached as a PDF.
    - The signed PDF is stored.
- Statuses: Draft, Sent, Viewed, Accepted or Signed, Declined, Expired.

### E1.3 Lead to client
- One click on a won or signed lead creates the client record (data carried over) and offers to create the project and the advance invoice.
  - **AC:** no field the user already entered is asked for again.

### E1.4 Clients
- A client record with company, contacts, GSTIN (optional), billing address, country, currency, time zone, preferred channel, notes, and tabs for projects, invoices, files and activity.
- **Portal invite:** a magic link by email, with a WhatsApp share. The client can set a password later.

### E1.5 Client portal (mobile-first)
- **Home:** progress per project, a "Needs you" list (approvals, questionnaires, payments due), the latest updates, dues.
- **Project:** phases and milestones with status, updates feed, files, approvals.
- **Approvals:** approve or comment on a gate. The decision and comment are recorded with time.
- **Invoices:** view, pay (Razorpay: UPI, cards, net banking), download a PDF.
- **Messages:** a thread per project with the agency (text and files), with email notifications.
- **Branding:** agency logo and brand colour; "Powered by Agency OS" on the free plan.
- **Acceptance criteria:**
  - Works on a mid-range Android phone over a 3G connection: the first screen is usable within 3 seconds.
  - Tap targets are at least 44 px.
  - Plain language.
  - No forced password on the first visit.

### E1.6 Projects and phases
- Create a project from a **phase template**. The default is our seven phases (Connect, Discover, Define, Design, Build, Launch, Grow), each with gates and a starter checklist; or start from blank.
- Project fields: client, type (one-off or retainer), budget, start and due dates, lead, members.
- **Phases and gates:** each gate has an approver (client or internal) and a status (Not started, Waiting, Approved, Changes requested).
- **Request approval:** the project lead sends a gate for approval with a message and files. The client approves in the portal.

### E1.7 Tasks
- Tasks with title, description, assignee, due date, priority, phase, subtasks, comments and attachments.
- Views: **Board, List, Calendar.** Gantt, whiteboard and goals come in R4.
- **My tasks** for each member; Today combines tasks, follow-ups, meetings and dues.

### E1.8 Invoices and payments
- Create an invoice from a quote, a milestone, or blank.
- Types:
  - **tax invoice (GST)**, with CGST + SGST or IGST worked out from the supplier and client state codes
  - **bill of supply / no GST**, for unregistered freelancers
  - **export of services under LUT** (0% IGST, LUT number and date, currency and exchange rate)
  - **proforma or advance**
- Any currency per invoice; amounts stored in minor units with the currency code.
- Invoice numbering per financial year (configurable prefix, for example OSS/26-27/001).
- A Razorpay payment link on each invoice; partial payments; webhooks mark it paid.
- Manual payments (bank transfer, Wise, PayPal, cash) can be recorded, with an optional FIRA/FIRC attachment.
- Automatic reminders before and after the due date (email; WhatsApp share).
- A PDF in the agency's branding.
- **Acceptance criteria:**
  - The tax logic is covered by unit tests for intra-state, inter-state, export and unregistered cases.
  - A chartered accountant reviews the invoice template before launch (blocking item).

### E1.9 Owner dashboard and Today
- **Dashboard:**
  - revenue this month (paid), pending, overdue
  - pipeline value and win rate (last 90 days)
  - projects at risk (overdue gates or tasks)
  - team load (open tasks per member)
- **Today:** follow-ups due, tasks due, gates waiting, invoices due, meetings (later, with Google Calendar).
- **Acceptance criteria:**
  - Each number links to the list behind it.
  - Clear empty states.
  - Currency shown in the base currency, converted at the invoice-date rate.

### E1.10 Team (basic)
- Members list with role, projects and open tasks.
- Daily update: a short form (done, next, blockers) that the project lead sees.

---

## Non-functional requirements (all releases)

- **Performance:**
  - Core screens interactive in under 2.5 s (LCP) on a mid-range phone over 4G.
  - API p95 under 300 ms for reads.
- **Accessibility:** WCAG 2.1 AA; axe checks in CI; keyboard-complete flows.
- **Security:**
  - Tenant isolation (row-level security) with tests.
  - Encrypted secrets.
  - Audit log.
  - OWASP ASVS level 1 as the baseline.
- **Privacy:** DPDP and GDPR basics (notice, consent for marketing, export, deletion).
- **Reliability:**
  - Daily backups.
  - Error tracking.
  - Status page later.
- **Localisation:**
  - en-IN default, en-US and en-GB.
  - All strings go through i18n.
  - Dates show a written month.
- **Browser support:** the last 2 versions of Chrome, Edge, Safari and Firefox; Android Chrome; iOS Safari.
