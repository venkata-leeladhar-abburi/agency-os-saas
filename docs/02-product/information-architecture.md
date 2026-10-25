# Information architecture

Navigation follows how each role works (rulebook: design for roles and mental models). Labels use everyday words. Validate them with the tree test in `../01-research/usability-testing.md` before wireframes are approved.

## Core objects

`Workspace` → `Member` (with role) · `Lead` → `Client` (with `Contacts`) → `Project` → `Phase` → `Gate` · `Task` · `Quote` · `Proposal` · `Invoice` → `Payment` · `File` · `Message thread` · `Playbook item` (R2) · `Document` (R4) · `Handoff` (R5) · `Review` (R3)

One record flows forward: Lead → Client → Project → Invoice → Handoff → Review → next Lead.

## Agency owner and admin (desktop-first)

```
Today                    follow-ups, tasks, gates waiting, dues, meetings
Dashboard                revenue, pending, overdue, pipeline, at-risk, team load
Leads                    pipeline (board) · table · sources · lost reasons
Clients                  list · client record (projects, invoices, files, activity)
Projects                 list · project (overview, phases & gates, tasks, files, messages, invoices)
Tasks                    my tasks · all tasks (board, list, calendar)
Sales docs               quotes · proposals                     (R4: Documents studio)
Finance                  invoices · payments · (R4: expenses, payouts, retainers)
Team                     members · daily updates · (R4: attendance, leave, payslips)
Playbook (R2)            process · prompts · tools · templates · learnings
Profile (R3)             public profile · reviews · badge
Settings                 workspace · branding · members & roles · tax & invoices · plan & billing · notifications · data export · audit log
```

The top bar holds the workspace switcher, Search (Ctrl/Cmd+K), + New (lead, client, project, task, quote, invoice), notifications and the user menu.

## Project lead

Today · My projects · Tasks · Approvals (gates waiting) · Messages · Playbook (R2) · Settings (personal)

## Team member (mobile-friendly)

My day (tasks, daily update, R4 check-in) · My tasks · Projects (assigned) · Messages · Playbook (R2) · Me (R4: leave, payslips, earnings)

## Finance

Dashboard (money) · Invoices · Payments · Clients (read) · Settings (tax and invoices)

## HR (R4)

People · Attendance · Leave approvals · Payslips · Contractor payouts · Holiday calendar · Records

## Client portal (mobile-first, bottom tabs on phones)

Home (Needs you, progress, dues, updates) · Projects · Approvals · Invoices · Messages · Files · (R5: Handoff) · Account

## Solo workspace (R3)

Today · Leads · Clients · Projects · Money (invoices, payments, expenses) · Playbook · Profile · Settings. There are no team layers, and the workspace can upgrade to Agency without losing data.

## Public site and marketplace (R3)

`/` marketing · `/find` marketplace (service, city, budget, rating, verified only, stack and process) · `/a/[agency]` profile · `/a/[agency]/how-we-work` · `/tools/*` free tools · `/hire` hirer sign-up

## Hirer account (R3)

Saved agencies · Enquiries (inbox) · Account. The same login becomes their client portal once they sign.

## Super admin (internal)

Platform metrics (MRR, workspaces, activation) · Workspaces · Plans and pricing · Announcements · Marketplace moderation (R3) · Feature flags

## URL structure (app)

```
app.agencyos.<domain>/[workspace]/today
/[workspace]/leads            /[workspace]/leads/[id]
/[workspace]/clients/[id]     /[workspace]/projects/[id]/(overview|phases|tasks|files|messages|invoices)
/[workspace]/invoices/[id]    /[workspace]/settings/(…)
portal.<domain>/[workspace]/… (or the agency's custom domain in R5)
```

## Roles and permissions (R0/R1)

V = view, E = create/edit, D = delete, A = approve, — = no access. "Own" = records assigned to them.

| Area | Owner | Admin | Project lead | Member | Finance | HR | Client |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Workspace settings, billing, plan | E/D | E | — | — | — | — | — |
| Members and roles | E/D | E | V | V | V | E (R4) | — |
| Leads | E/D | E/D | V | — | V | — | — |
| Quotes and proposals | E/D | E/D | V | — | V | — | V own, A (sign) |
| Clients | E/D | E/D | V own | V own | V | — | V self |
| Projects | E/D | E/D | E own | V own | V | — | V own |
| Gates | E, A | E, A | E own, request | V | V | — | A own |
| Tasks | E/D | E/D | E own projects | E own | — | — | — |
| Invoices and payments | E/D | E | V own projects | — | E/D | — | V own, pay |
| Files | E/D | E/D | E own projects | E own projects | V | — | V/E shared |
| Messages | E | E | E own projects | E own projects | — | — | E own |
| Dashboard (money) | V | V | — | — | V | — | — |
| Audit log, data export | V/E | V | — | — | — | — | — |

Rules:
- Permissions are checked on the server and in the database (row-level security), never only in the UI.
- The UI hides what a role can't use, and shows a "no access" state for deep links.
- Client users only ever see their own client record, projects, files, invoices and messages.
