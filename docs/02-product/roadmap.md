# Roadmap

Follows the deck's build order ("we run our own agency on it first, then fill the gaps we found, then build the parts nobody else has"), adjusted for building from scratch: R0 and R1 include the base that every later release needs. Each release ends at a gate (see `../00-plan/build-plan.md`).

| Release | Theme | Contents | Why now |
| --- | --- | --- | --- |
| **R0** | Foundation | Monorepo, design system in code, auth (Google, email magic link, phone OTP), workspaces and roles, app shell (sidebar, command palette, notifications, settings), plans and limits, audit log, data export | Everything else stands on it |
| **R1** | Core loop (MVP) | Leads pipeline and sources; quotes and proposals with e-sign; lead to client in one click; clients; client portal (home, project, files, approvals, invoices, messages); projects from phase templates with gates; tasks (board, list, calendar); team members; invoices with GST and export-under-LUT, any currency, Razorpay payment links and reminders; owner dashboard and Today; email and in-app notifications, WhatsApp share links | One Stop runs its own projects on it; proves the loop from lead to paid |
| **R2** | Playbook | All nine item types (process and SOPs, prompts, tools, saved websites, components, templates, checklists, boards, learnings); visibility (private, team, client, public); phase templates become projects; Figma and Miro boards on projects; Google Calendar and Meet | Our edge, and the content that makes profiles worth visiting |
| **R3** | Get found | Public profiles and "How we work" pages; verified reviews and badge; free tools (invoice, GST and rate calculators, time-zone converter, templates, PRD and SOW generator, estimate calculator); hirer sign-up and marketplace; Solo plan | Profiles need Playbook content and portal reviews before hirers arrive |
| **R4** | Deliver+ | Document studio (PRD, SOW, NDA, MSA, change request, status report); change requests that become quotes; time tracking and payouts; expenses; retainers and MRR; attendance, leave, payslips (HR portal); six project views (adds Gantt, whiteboard, goals) | Deepens daily use once teams are inside |
| **R5** | Premium and handoff | Handoff package and reveal-once vault; acceptance certificate; full international client mode (dual time zones, overlap finder, holiday calendars, preferred channel, SLA, DPA); weekly status reports; portal on the agency's own domain; FIRA/FIRC records | What justifies agency pricing |
| **R6** | Scale | AI first drafts (quote, proposal, PRD, status report); installable web app (PWA); Meta, Google Ads and IndiaMART lead sync; requirement briefs from hirers; MCP connector; WhatsApp Business notifications | Growth features once the core loop works |
| **R7** | Mobile apps | Native Android first, then iOS: push, offline drafts, camera capture, widgets, biometric login | Leads, approvals, payments and check-ins happen away from a desk |

## Changes from the deck, and why

- **The Playbook's first part moves into R1** (founder, 31 Oct 2026, D-072): the knowledge base with folders, the nine item kinds, visibility (private, team or chosen roles, clients) and client guides in the portal. Public items, phase templates as projects and embedded boards stay in R2 and R3.

- **GST invoices move into R1** (deck question Q3). Indian clients expect GST-ready invoices from the first invoice, and fixing tax later means migrating data. Basic export invoices under LUT and per-invoice currency come with it, because the tax engine handles both at little extra cost (research assumption A10). Full international mode stays in R5.
- **Team basics move into R1** (members and roles), because a project needs people. HR features stay in R4.
- **The client portal is in R1,** not later, because it is the moment that sells the product to clients (assumption A3).

Each change is recorded in `../00-plan/decisions.md` and can be reversed by the founder at gate G0.
