# Screen inventory

Every screen to design for R0 and R1, with the states each needs. "All states" means default, loading (skeleton), empty (with one action), error (with a fix), and no permission. Designs are needed for desktop (1440) and phone (390), in light and dark.

Priority: **P1** = needed for the core loop; **P2** = needed for R1 launch.

## R0 Foundation

| # | Screen | Portal | Priority | States and notes |
| --- | --- | --- | --- | --- |
| S01 | Sign up / sign in (Google, email link, phone OTP) | All | P1 | Errors: wrong OTP, expired link, rate limited |
| S02 | Workspace setup (3 short steps, skippable) | Owner | P1 | India defaults vs other countries |
| S03 | Onboarding checklist and sample data | Owner | P1 | Progress, dismissed, sample-data banner |
| S04 | App shell: sidebar, top bar, workspace switcher | All internal | P1 | Collapsed sidebar, phone drawer |
| S05 | Command palette | All internal | P1 | Empty query, no results, recent items |
| S06 | Notifications panel | All | P2 | Empty, unread, settings link |
| S07 | Settings: workspace, branding, members and roles, tax and invoices, plan and billing, notifications, data export, audit log | Owner/Admin | P1–P2 | Plan limit reached, invite pending/expired |
| S08 | Invite acceptance | Member, client | P1 | Expired, already a member |
| S09 | Upgrade / plan limit dialog | Owner | P2 | — |

## R1 Core loop

| # | Screen | Portal | Priority | States and notes |
| --- | --- | --- | --- | --- |
| S10 | Today | Owner, lead, member | P1 | All states; nothing-due state is positive |
| S11 | Owner dashboard | Owner, finance | P1 | First-week empty state guides to the checklist |
| S12 | Leads: pipeline board | Owner | P1 | Drag, column totals, filters, saved views |
| S13 | Leads: table | Owner | P2 | Column picker, bulk actions |
| S14 | Lead record (drawer and full page) | Owner | P1 | Activity log, reminders, lost-reason dialog |
| S15 | New lead (quick form) | Owner | P1 | Validation |
| S16 | CSV import (map columns, preview, result) | Owner | P2 | Partial failures listed |
| S17 | Enquiry form (public hosted page) | Public | P2 | Submitted, spam blocked |
| S18 | Quote builder | Owner | P1 | GST, export, currency; totals |
| S19 | Proposal builder (blocks, template) | Owner | P1 | Autosave, preview, send dialog |
| S20 | Proposal: client view and sign | Client | P1 | Phone-first; signed, declined, expired |
| S21 | Lead → client conversion dialog | Owner | P1 | Creates client, project, advance invoice |
| S22 | Clients list | Owner | P1 | — |
| S23 | Client record (tabs) | Owner | P1 | Portal invite status |
| S24 | Projects list | Owner, lead | P1 | Status, health, due |
| S25 | New project (template picker) | Owner, lead | P1 | Seven-phase default, blank |
| S26 | Project overview | Owner, lead, member | P1 | Health, phases, next gate, budget |
| S27 | Phases and gates | Owner, lead | P1 | Request approval dialog; gate history |
| S28 | Tasks: board, list, calendar | Lead, member | P1 | Filters, quick add |
| S29 | Task detail (drawer) | Lead, member | P1 | Subtasks, comments, files |
| S30 | Files (project) | All | P2 | Upload progress, preview |
| S31 | Messages (project thread) | Internal, client | P1 | Unread, attachments |
| S32 | Invoices list | Owner, finance | P1 | Overdue highlight, filters |
| S33 | Invoice builder | Owner, finance | P1 | Tax types, currency, numbering, preview |
| S34 | Invoice view (PDF style) and payment page | Client | P1 | Paid, partly paid, overdue, failed payment |
| S35 | Record manual payment (FIRA/FIRC attach) | Finance | P2 | — |
| S36 | Team members and daily updates | Owner, lead | P2 | — |
| S37 | My day / daily update form | Member (phone) | P2 | — |
| S38 | Client portal: home | Client (phone) | P1 | Needs you, progress, dues; first-visit welcome |
| S39 | Client portal: project and gate approval | Client | P1 | Approve, request changes |
| S40 | Client portal: invoices and pay | Client | P1 | UPI, card, net banking; success |
| S41 | Client portal: messages and files | Client | P1 | — |
| S42 | Client portal: account (password, language later) | Client | P2 | — |

## Shared patterns used across screens

Data table · Kanban board · Record header · Drawer · Activity feed · Phase stepper and gate card · Builders (proposal, quote, invoice) · Metric card · Empty state · Checklist · Command palette · Toasts with undo · Confirmation dialog (destructive only). Specs are in `../03-design/design-system.md`.
