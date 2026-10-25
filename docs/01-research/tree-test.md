# Tree test (round R0, before G1)

Checks that people find things in the sidebar and the client portal on the first click, before the wireframes are approved. G1 pass line: **first-click success of 80% or more on the primary labels** (`usability-testing.md`).

## Who and how
- **Agency side:** 40 or more people who run or work in an agency or freelance (owners, project leads, designers, developers, finance). India first, with some international.
- **Client side:** 15 or more people who have hired an agency or freelancer.
- **Method:** unmoderated, in any tree-testing tool (paste the trees below as text). No visual design: labels only. Randomise task order. About 10 minutes.
- **Record:** first click, final answer, time, and "How sure were you?" (1 to 7) per task. Put the results in `synthesis.md` (tree test section) and tell Claude the numbers; Claude adds them to the G1 summary.

## Tree A: agency app (owner)

```
Today
Dashboard
Sell
  Leads
  Clients
  Sales docs
    Quotes
    Proposals
Deliver
  Projects
    [a project] → Overview · Phases and gates · Tasks · Files · Messages · Invoices
  Tasks
Money
  Invoices
  Payments
Agency
  Team
  Settings
    Workspace · Branding · Members and roles · Tax and invoices · Plan and billing · Notifications · Data export · Audit log
Help
```

## Tree B: client portal

```
Home
Project
  Phases · Approvals · Files · Updates
Payments
  Invoices · Pay
Messages
Account
```

## Tasks (agency, tree A)

| # | Task as read to the participant | Correct first click | Also correct |
| --- | --- | --- | --- |
| 1 | A new enquiry came in from Instagram. Where do you add it? | Sell › Leads | — |
| 2 | How much money is overdue right now? | Dashboard | Money › Invoices |
| 3 | Send a lead a quote for a five-page website. | Sell › Sales docs › Quotes | Sell › Leads |
| 4 | What do you need to do today? | Today | — |
| 5 | Ask your client to approve the homepage design. | Deliver › Projects › [project] › Phases and gates | — |
| 6 | Which tasks does Ananya have this week? | Deliver › Tasks | Agency › Team |
| 7 | A US client paid you by bank transfer. Record it. | Money › Payments | Money › Invoices |
| 8 | Change the GST rate used on new invoices. | Agency › Settings › Tax and invoices | — |
| 9 | Find the phone number of one of your clients. | Sell › Clients | — |
| 10 | Invite a new designer to work with you in Agency OS. | Agency › Settings › Members and roles | Agency › Team |

## Tasks (client, tree B)

| # | Task | Correct first click | Also correct |
| --- | --- | --- | --- |
| 11 | Your agency asked you to approve a design. Do it. | Home | Project › Approvals |
| 12 | Pay the advance for your project. | Payments | Home |
| 13 | Download the invoice you paid last month. | Payments | — |
| 14 | Ask your agency a question about the timeline. | Messages | — |

## Reading the results
- **Pass:** 80% or more correct first clicks across tasks 1 to 10, and across 11 to 14.
- **Below 70% on one task:** rename or move that label, retest it with 10 to 15 people.
- **Labels Claude is least sure about:** "Sales docs" (task 3) and "Payments" next to "Invoices" (task 7). If either fails, the alternatives are "Quotes and proposals" and putting payments inside Invoices.
