# Defaults and built-in content

What a new workspace gets out of the box, and the words the product uses at key moments. Build these exactly; agencies can edit everything in Settings or in the Playbook (R2). Copy follows `../03-design/content-style.md`. Items marked **(founder)** need the founder's decision; the value shown is the proposed default.

## 1. Phase template: "Seven phases" (the default)

The process One Stop Solutions runs, written so any agency can use it. Gates are where the client (or a lead) signs off; work after a gate starts only when it is approved.

| # | Phase | Shown to the client as | Starter checklist (internal tasks) | Deliverables | Gate (approver) |
| --- | --- | --- | --- | --- | --- |
| 0 | **Connect** | "We learn your business and agree the plan." | Research the lead (site, socials, reviews, 3 competitors) · Send the questionnaire before the call · Run the discovery call and take notes · Send the recap within 24 hours · Draft the proposal (problem, goals, scope, timeline, price) · Walk the client through it · Book the kickoff | Call recap · Proposal | **Proposal accepted** (client; done by signing the proposal) |
| 1 | **Discover** | "We study your market, competitors and customers." | Kickoff: goals, metrics, people, limits · Collect access (analytics, hosting, domain, socials) · Desk research · Competitor analysis · Interview 3 to 5 customers · UX audit if a product exists · Summarise insights | Competitor analysis · Customer insights · UX audit | — |
| 2 | **Define** | "Research becomes a plan you approve before design." | Personas · User flows · Sitemap and scope (must, should, could) · Strategy brief or PRD · Present and log changes | Personas · User flows · Strategy brief or PRD · Scope | **Strategy and scope sign-off** (client) |
| 3 | **Design** | "Every screen designed, for phone and desktop." | Show 2 to 3 directions · Brand system if in scope · Wireframes for key pages · Hi-fi design, desktop and phone · Copy · Contrast and tap-target checks · Clickable prototype · Test with 3 to 5 users · Design handoff | Wireframes · Designs and prototype · Design system | **Design sign-off** (client) |
| 4 | **Build** | "We build, test and show you progress every week." | Architecture and repo set up · Staging environment · Weekly demo on staging · Code review on every change · Integrations (payments, email, analytics) · Security checklist · QA on browsers and phones, accessibility, performance · Client tests on staging | Staging link · Weekly updates · QA report · Technical docs | **Acceptance testing sign-off** (client) |
| 5 | **Launch** | "We go live and hand everything over to you." | Pre-launch checklist · Deploy; check SSL and DNS · Redirects for redesigns · Search Console and analytics · Move accounts into the client's name · Record a training walkthrough · Send the handover · Book a check-in in two weeks | Live product · Handover kit · Training video | **Handover accepted** (client) |
| 6 | **Grow** | "Ongoing care, reports and improvements." | Monthly report · Updates, backups, monitoring · Quarterly review and plan | Monthly report · Support channel | — (ongoing) |

Rules:
- Phases can be skipped per project (shown dashed and struck through, as in the design reference); a skipped gate is recorded in the activity log.
- The project's progress percentage = done checklist items ÷ all checklist items in non-skipped phases.
- Also offer **Blank** (one phase, no gate). Agencies save their own templates from any project.
- The phase names and the client-facing lines are what the portal shows; internal checklist items are never shown to clients.

## 2. Leads

- **Stages:** New, Contacted, Proposal, Won, Lost (Won and Lost are fixed kinds; others can be renamed, added and reordered).
- **Sources:** Referral, Instagram, LinkedIn, Website, Marketplace, Ads, IndiaMART, WhatsApp, Other.
- **Lost reasons (required when moving to Lost):** Price, Timing, Chose another provider, No reply, Not a fit, Budget cut, Other (with a note).
- **Services (editable list, used on leads, quotes and the enquiry form):** Website, Landing page, Brand identity, UI/UX design, Mobile app, Web app or SaaS, Online store, ERP or internal tool, SEO, Ads, Automation, Maintenance.
- **Follow-up default:** a new lead gets a follow-up due the next working day at 11:00 in the workspace time zone.
- **Enquiry form fields:** name, email or phone (one required), company (optional), service, budget range (optional), message, consent tick for being contacted.

## 3. Proposal template: "Standard proposal"

Blocks in order, each editable. Text in brackets is filled from the lead, quote or workspace.

1. **Cover:** [Workspace logo] · "Proposal for [Client company]" · [Date] · Prepared by [member name].
2. **About us:** placeholder: "Write two or three sentences about your studio and the work you're proudest of." (filled from the workspace profile if present).
3. **Your goals:** placeholder bullets: "What you want to achieve", "Who it is for", "How we'll know it worked".
4. **Scope:** two lists, "Included" and "Not included", seeded from the quote's line items.
5. **Phases and timeline:** the phase template's phases with dates, and the gates marked "Your sign-off".
6. **Price:** the quote table (items, tax, total) with the amount in words for INR.
7. **Payment terms:** default **(founder)**: "50% advance to start, 50% before launch. Invoices are due within 7 days." Editable per proposal.
8. **Terms:** placeholder: "Add your terms here (ownership, revisions, timelines, cancellation). Agency OS does not provide legal advice." Agencies paste their own; the Playbook (R2) stores reusable clauses.
9. **Accept and sign:** name, signature, verification code, "Accept proposal" button.

Statuses and what the agency sees: Draft → Sent → Viewed (with count and last opened) → Signed or Declined → Expired (default validity 14 days).

## 4. Quotes and invoices

- **Payment terms:** due in 7 days (editable: on receipt, 7, 15, 30 days).
- **Numbering:** prefix from the workspace's initials (editable), format `PREFIX/YY-YY/NNN`, e.g. `OSS/26-27/001`; restarts each 1 April.
- **Default tax rate:** 18% GST. **Common SAC codes (verify with the CA before launch):** 998314 IT design and development, 998313 IT consulting and support, 998315 hosting and IT infrastructure, 998361 advertising services, 998391 specialty design services. Agencies can add their own.
- **Invoice footer default:** "Thank you for your business." plus bank details from Settings (account name, number, IFSC; SWIFT for foreign clients).
- **Reminders (on by default):** 3 days before due, on the due date, 3 and 7 days after due. Email, with a WhatsApp share button for the agency.
- **Export invoice text (CA to confirm):** "Supply meant for export under LUT (ARN [number], dated [date]) without payment of IGST."

## 5. Onboarding checklist

Shown on Today and the dashboard until done or dismissed (it comes back from Help).

| Step | Title | Hint | Button |
| --- | --- | --- | --- |
| 1 | Add your logo and services | Clients see them on proposals, invoices and the portal. | Open settings |
| 2 | Add your first lead | Or load example data to look around. | Add lead |
| 3 | Send a quote | GST is added for you. | Create quote |
| 4 | Invite a client to the portal | They can approve work and pay from their phone. | Invite client |
| 5 | Create an invoice | With a UPI and card payment link. | Create invoice |

The example-data banner: "You're looking at example data. Remove it" (removes only example records).

## 6. Empty states

| Screen | Title | Text | Action |
| --- | --- | --- | --- |
| Leads | No leads yet | Add your first lead, share your enquiry form, or import a CSV. | Add lead |
| Clients | No clients yet | Clients appear here when you win a lead, or add one directly. | Add client |
| Projects | No projects yet | Start one from the seven-phase template or a blank project. | New project |
| Tasks (mine) | Nothing due | Tasks assigned to you show up here. | — |
| Invoices | No invoices yet | Create an invoice with GST and a payment link. | Create invoice |
| Today | You're all caught up | Follow-ups, tasks, approvals and dues for today appear here. | — |
| Dashboard (first week) | Your numbers start here | Send your first quote or invoice and this page fills in. | Finish setting up |
| Portal home (client) | Nothing needs you right now | We'll let you know when there's something to approve or pay. | — |
| Search, no results | No matches for "[term]" | Check the spelling or search by client, invoice number or phone. | — |

## 7. Notifications

Default channels; each member changes them per category in Settings → Notifications.

| Event | Who | In-app | Email | Email subject |
| --- | --- | --- | --- | --- |
| New lead from the enquiry form | Lead owner (else owners) | On | On | New enquiry from [name] |
| Follow-up due | Lead owner | On | Daily digest | Follow-ups due today |
| Proposal viewed | Sender | On | Off | [Client] viewed your proposal |
| Proposal signed or declined | Sender, owners | On | On | [Client] signed the proposal |
| Gate approval requested | Approver (client) | Portal | On | Approve [gate title] |
| Gate approved or changes requested | Project lead | On | On | [Client] approved [gate title] |
| Task assigned or mentioned | Member | On | Off | — |
| New message in a project | The other side: project team, or the client's contacts | On (the client: portal) | On | New message from [name] about [project] |
| Invoice sent | Client contact | Portal | On | Invoice [number] from [workspace] |
| Invoice reminder | Client contact | — | On | Invoice [number] is due on [date] |
| Payment received | Owners, finance, project lead | On | On | Payment received: [amount] for [number] |
| Invoice overdue | Owners, finance | On | On | Invoice [number] is overdue |
| Member invited | Invitee | — | On | [Name] invited you to [workspace] on Agency OS |
| Daily digest | Owners | — | On (08:30 local) | Today at [workspace] |

## 8. Plans and limits

Confirmed by the founder on 26 Oct 2026 (open question 5, D-040) and enforced since M6:

| Plan | Members | Active clients with portal | Open leads | Quotes, proposals, invoices | Branding |
| --- | --- | --- | --- | --- | --- |
| Free | 1 | 1 | 25 | 3 of each per month | "Powered by Agency OS" on the portal |
| Solo (price open) | 1 | Unlimited | Unlimited | Unlimited | Own branding |
| Agency Starter ₹1,499/mo | 5 | 10 | Unlimited | Unlimited | Own branding |
| Agency Growth ₹3,499/mo | 20 | Unlimited | Unlimited | Unlimited | Own branding |
| Agency Enterprise ₹7,999/mo | Unlimited | Unlimited | Unlimited | Unlimited | Own branding, multi-branch (later) |

Why Free includes a few quotes and invoices: activation is measured as "first proposal or invoice sent within 7 days", so Free users must be able to reach it. The brief lists Free as "starter pipeline, one active client with a portal" without saying whether quotes and invoices are included; this table fills that gap and needs the founder's confirmation. Upgrade prompts appear at the limit, never before, and never block viewing or exporting existing data.

## 9. Marketing pages for R0

Minimal: one landing page (what it does, the three portals, the core loop lead → proposal → project → invoice → handoff, pricing, FAQ, sign-up), a pricing page, and legal pages (terms, privacy, DPA, sub-processors, refund policy) once the lawyer provides text. Copy is adapted from the Agency OS pitch deck without investor material or market-size numbers, and with no testimonials until real ones exist.
