# Usability testing plan

We test before each design gate and again in beta, with interactive prototypes, never static pictures.

## Rounds

| Round | When | What | Who (5 per segment) | Method |
| --- | --- | --- | --- | --- |
| R0 Tree test | Before wireframes are final (G1) | Sidebar labels and portal structure | 40+ agency users, unmoderated | Tree test |
| R1 Wireframe test | After wireframes | Core flows on clickable wireframes | Agency owners (India), freelancers, clients | Moderated, remote |
| R2 Hi-fi prototype | Before development approval (G2) | Full MVP flows, light and dark, phone and desktop | Owners (India + intl), clients (India + intl), team member | Moderated, remote and in person |
| R3 Beta | In beta (G3) | Real use with real data | 5 to 10 beta agencies | Session replays, interviews, surveys |

## Tasks for R1 and R2

| # | Task (said to the participant) | Persona | Success | Target time |
| --- | --- | --- | --- | --- |
| T1 | "Sign up and set up your workspace with your logo and services." | Owner, freelancer | Workspace ready, first lead or sample project visible | Under 5 min |
| T2 | "A new enquiry came from Instagram. Add it and set a follow-up for Friday." | Owner | Lead with source and reminder | Under 1 min |
| T3 | "Send this lead a quote for a 5-page website with GST." | Owner (India) | Correct GST quote sent | Under 4 min |
| T4 | "The client accepted. Make them a client and invite them to the portal." | Owner | Client created from lead, invite sent | Under 1 min |
| T5 | "Start the project using your usual process." | Owner, project lead | Project from a template with phases and gates | Under 3 min |
| T6 | "Ask the client to approve the designs." | Project lead | Gate approval requested | Under 1 min |
| T7 | (Client) "You got a link on WhatsApp. Find what needs you and approve the design." | Client (India, phone) | Approval done | Under 2 min |
| T8 | (Client) "Pay the advance." | Client | Payment page reached; method chosen | Under 1 min |
| T9 | "Bill your US client US$2,000 for the first milestone as an export invoice." | Owner (India) | Export invoice under LUT in USD | Under 4 min |
| T10 | "How much money is overdue, and which project is at risk?" | Owner | Correct answers from the dashboard | Under 30 s |
| T11 | "Hand over the finished project." | Project lead | Handoff checklist and package sent | Under 5 min |
| T12 | (Team member) "Post today's update and log 2 hours." | Team member (phone) | Done | Under 1 min |

## What we measure

- **Task success:** complete, complete with help, or failed.
- **Time on task** against the targets above.
- **Errors and wrong paths;** first-click accuracy.
- **SEQ** (a single ease question, 1 to 7) after each task.
- **SUS** at the end of R2 and R3 (target 75 or more).
- **Issues** logged with severity: blocker (fix before the gate), major, minor or cosmetic.

## Pass criteria for the gates

- **G1 (wireframes):** tree test first-click success of 80% or more on primary labels.
- **G2 (design approval):** 80% or more task success on T1 to T12; no blocker issues; SEQ averages 5.5 or more; light and dark, phone and desktop all tested.
- **G3 (beta):** activation (first proposal or first invoice sent) within 7 days for 60% or more of beta workspaces; SUS 75 or more.

## Setup

- **Prototype:** Figma (wireframes and hi-fi), or the running app for R3.
- **Devices:** a mid-range Android phone on a throttled network for Indian client tasks; desktop Chrome and Safari; an iPhone for international clients.
- **Accessibility:** include at least one participant who uses a screen reader or keyboard only in R2, plus an automated axe check of every screen.
- **Recording:** with consent, kept 90 days; findings written in the insights template (`synthesis.md`).
