# Usability round R2 script (before G2)

Moderated sessions on the hi-fi prototype, remote or in person, 45 minutes each. G2 pass lines: **80% or more task success on T1 to T10, no blocker issues, SEQ average 5.5 or more**, light and dark, phone and desktop all tested. Run the tree test (`tree-test.md`) in the same period; it moved here from G1.

## Who
- 5 agency owners in India, 2 outside India, 2 freelancers
- 3 clients in India (two on a mid-range Android phone on a throttled network), 2 international clients (one on an iPhone)
- 1 team member (phone)
- At least one participant who uses a screen reader or the keyboard only

## Setup
- Open http://localhost:3000/prototype (`pnpm dev`) or the Vercel preview. Add `?chrome=0` to hide the prototype controls.
- Half of the sessions in dark mode (device setting), half in light.
- Record with consent; note first clicks, wrong paths, hesitations over 5 seconds and words that confused people.

## Tasks
Every task starts on the screen named and can be clicked through in the prototype (checked by `apps/web/e2e/flows.spec.ts`).

| # | Say to the participant | Start | Success | Target |
| --- | --- | --- | --- | --- |
| T1 | Sign up and set up your workspace with your logo and services. | S01 | reaches the checklist (S03) | 5 min |
| T2 | A new enquiry came from Instagram. Add it and set a follow-up for Friday. | S12 | adds the lead with source and follow-up | 1 min |
| T3 | Send this lead a quote for a 5-page website with GST. | S12 (open Northwind) | Save and send on a GST quote | 4 min |
| T4 | The client accepted. Make them a client and invite them to the portal. | S14 | Create client with the invite ticked | 1 min |
| T5 | Start the project using your usual process. | S24 | Seven phases, Create project | 3 min |
| T6 | Ask the client to approve the designs. | S26 | Request approval sent | 1 min |
| T7 | (Client, phone) You got a link on WhatsApp. Find what needs you and approve the design. | S38 | Approve | 2 min |
| T8 | (Client, phone) Pay the advance. | S38 | payment method chosen, Pay | 1 min |
| T9 | Bill your US client US$2,000 for the first milestone as an export invoice. | S32 | Export under LUT in USD | 4 min |
| T10 | How much money is overdue, and which project is at risk? | S11 | ₹38,500 and Acme Labs | 30 s |
| T12 | (Team member, phone) Post today's update. | S37 | Post update | 1 min |

T11 (handoff) is R5 and not tested in this round.

After each task ask the SEQ: "How easy was that, from 1 (very hard) to 7 (very easy)?" At the end, give the SUS questionnaire.

## Severity
- **Blocker:** the participant can't finish the task. Fix before asking for G2.
- **Major:** finishes with help or after a wrong path. Fix before G2 if more than one person hit it.
- **Minor / cosmetic:** log it, fix during the build.

## Results
Write them in `synthesis.md` (R2 section): per task success, time and SEQ; issues with severity; tree-test numbers. Tell Claude the numbers; Claude fixes the blockers and majors, then updates `gate-g2.md`.
