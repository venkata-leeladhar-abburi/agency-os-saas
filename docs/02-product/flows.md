# Agency OS: product flows

Taken from the Agency OS pitch deck. Everything here is built new in this repository; the release each part ships in is set in `roadmap.md`.

## The shape of the product

Three layers on one Playbook:

1. **Get found**: public profile, marketplace, free tools.
2. **Grow**: leads, proposals, lead to client.
3. **Deliver and run**: projects, client portal, finance, handoff.

**The Playbook** (how the agency works, written once) sits under all three. It feeds templates, checklists, prompts and documents into every stage.

## Nine portals (who sees what)

| Portal | Who | Plan | Main sections |
| --- | --- | --- | --- |
| Public site & marketplace | Anyone, no login | Free | Marketplace, public profile, free tools |
| Agency owner | Owner, director, admin | Agency | Dashboard, Leads, Clients, Projects, Documents, Finance, Team, Across the agency, Settings |
| Hirer account | People who need work done | Free | Account |
| Solo workspace | Freelancers working alone | Solo | Home, Sell, Work, Money, Know & grow |
| Client portal | The agency's client | Every plan | Home, Project, Money & paperwork, Talk, Finish |
| Project lead | Runs one or more projects | Agency | Run, Deliver |
| Team member | Designers and developers | Agency | My day, Me, Tools |
| HR | HR and operations | Agency | People, Pay, Records |
| Super admin | The Agency OS team | Internal | Platform, Growth |

## The main journey: ten stages, enquiry to repeat client

Each stage lists what the agency, the team and the client do, its Playbook inputs, and its exit.

### 1. Get found
- **Agency:** free public profile with portfolio and case studies; a "How we work" page built from the Playbook; verified reviews and a badge for their own site; marketplace listing by service and city.
- **Team:** skills and availability on the profile.
- **Client:** browses by service, city, budget and rating; compares process and toolkit, not only price; signs up with Google or phone OTP; requests a quote in two steps.
- **Playbook:** public process, public toolkit, case studies.
- **Exit:** an enquiry lands in the pipeline.

### 2. Capture leads
- **Agency:** Kanban pipeline with custom stages; a source on every lead (marketplace, Instagram, referral, ads); website enquiry form embed; Meta, Google Ads and IndiaMART sync; CSV import and export; follow-up reminders.
- **Team:** leads assigned to a sales owner; activity log (calls, notes, stage moves).
- **Client:** quick reply with a call-booking link.
- **Playbook:** outreach templates, discovery-call script.
- **Exit:** a qualified lead with full history.

### 3. Win the work
- **Agency:** discovery call booking with a Google Meet link; itemised quotation; proposal with scope, timeline and terms; AI first draft; win rate, pipeline value and lost reasons.
- **Team:** developers add effort estimates to the quote.
- **Client:** reads the proposal online and signs digitally.
- **Playbook:** pricing sheet, proposal templates, case studies.
- **Exit:** signed proposal, converted to a client in one click.

### 4. Onboard
- **Agency:** client record prefilled from the lead; branded portal invite; contract, NDA and SOW from templates; advance invoice with a Razorpay link; kickoff meeting with agenda.
- **Team:** project lead assigned at kickoff.
- **Client:** sets a password and lands on one welcome page; answers the intake questionnaire; uploads brand assets, content and logins; pays the advance.
- **Playbook:** onboarding checklist, questionnaires, welcome kit.
- **Exit:** client set up, advance paid.

### 5. Plan
- **Agency:** project created from a Playbook phase template; PRD drafted from intake answers; milestones with client approval gates; budget, deadline, one-off or retainer.
- **Team:** lead breaks phases into tasks; architecture and user flows on Figma or Miro boards.
- **Client:** approves the PRD and timeline in the portal.
- **Playbook:** phase templates, PRD template, architecture boards.
- **Exit:** approved PRD, timeline and team.

### 6. Build and delegate
- **Agency:** who did what, workload per person; team payouts tracked per project.
- **Team:** six views (Kanban, List, Calendar, Gantt, Whiteboard, Goals); tasks, subtasks and delegation; daily updates and attendance; time logs per task; leave and payslips in the same app.
- **Client:** watches progress without asking.
- **Playbook:** saved prompts, components, tools library, SOPs.
- **Exit:** work done, tracked to the person.

### 7. Review and talk
- **Agency:** updates feed visible in the portal; weekly status report, auto-drafted; change requests turned into quotes.
- **Team:** internal team chat; QA checklist before each gate.
- **Client:** approves or comments at each phase gate; chat thread with the agency; shared calendar of meetings and milestones; raises change requests.
- **Playbook:** QA checklists, review checklists.
- **Exit:** client sign-off at every gate.

### 8. Get paid
- **Agency:** milestone and retainer invoices; GST-ready and export invoices; multi-currency; auto-reminders and auto-invoicing; expenses and money in account; profit per project.
- **Team:** contractors see what they've earned.
- **Client:** pays inside the portal; downloads every invoice.
- **Playbook:** payment-terms clauses, invoice templates.
- **Exit:** paid in full, profit known.

### 9. Hand off
- **Agency:** GitHub repo link and release tag; stack sheet from pasted text or package.json; live, staging and admin URLs; docs, Figma files and walkthrough videos; credentials through a reveal-once vault; warranty period and support contact.
- **Team:** lead completes the handoff checklist.
- **Client:** one handoff page in the portal; signs the acceptance certificate; settles the final invoice.
- **Playbook:** handoff checklist, docs templates.
- **Exit:** delivery accepted.

### 10. Grow from it
- **Agency:** verified review requested on completion; case study drafted to the profile with consent; maintenance retainer offer; retro saved to the Playbook.
- **Team:** lessons logged per project.
- **Client:** leaves a verified review; refers someone, who lands as a lead; continues on a retainer.
- **Playbook:** learnings, updated templates.
- **Exit:** the next lead, and a stronger profile. The loop returns to stage 2.

## Cross-cutting modules

- **Document engine:**
  - brand kit, merge fields and a clause library
  - blocks: pricing tables, timelines, scope in and out
  - version history and inline client comments
  - e-signature with an audit trail
  - PDF export and share links with view tracking
  - an approvals log and AI first drafts
- **Document set:** proposal, quotation, mutual NDA, MSA, SOW, kickoff deck, PRD, change request, weekly status report, tax and export invoices, acceptance certificate.
- **Handoff package:** code, stack, live URLs, docs, walkthroughs, design, access vault, support, sign-off.
- **International work:** USD, EUR, GBP, AED and AUD invoices; LUT export invoices; FIRA/FIRC records; exchange rate on the invoice date; DPA for EU and UK clients; IP transfer on full payment; governing law per client; time-zone tools.
- **Playbook / knowledge base:** process phases, SOPs, prompts, tools, templates and learnings, reused at every stage.

## Core user flows to design first (by daily use)

1. Sign up and set up a workspace: role, services, logo, then the first lead or a sample project. This is the activation path.
2. Lead: capture, then qualify, then book a call, then quote or proposal, then sign, then convert to a client.
3. Client onboarding in the portal: invite, welcome, intake, uploads, pay the advance.
4. Project: create from a template, then the PRD and its approval, then tasks and views, then daily updates.
5. Phase gate review: submit, then the client approves or comments, then a change request becomes a quote.
6. Invoice: create, then send, then remind, then paid, then profit per project.
7. Handoff: checklist, package page, acceptance signature, final invoice.
8. Owner dashboard and the command palette, connecting all of the above.
