# Research plan

**Owner:** One Stop Solutions (UX research)
**Status:** Desk research done (October 2026). Primary research (interviews, survey, tests) is ready to run.
**Why:** to learn which parts of the Agency OS journey hurt most for Indian and international agencies, freelancers and their clients, and to check our riskiest assumptions before the MVP scope is locked (gate G0 in `../00-plan/build-plan.md`).

## 1. Objectives

1. Understand how agencies and freelancers in India and abroad find work, sell, deliver, get paid and hand over today, and where it breaks.
2. Understand what clients (Indian SMB owners and international founders) need to trust, follow and pay an agency.
3. Rank the ten journey stages by pain and by willingness to pay, so the build order is based on evidence.
4. Test the riskiest assumptions in `assumptions.md`.
5. Validate the information architecture (sidebar labels, portals) and the first key flows with real users.

## 2. Research questions

| Area | Questions |
| --- | --- |
| Finding work | Where do leads come from (referrals, Instagram, LinkedIn, IndiaMART, directories, marketplaces)? What makes a buyer trust an unknown agency? Would a profile that shows process and toolkit change their decision? |
| Leads and selling | How are leads tracked today? How long from enquiry to proposal? What tools make quotes and proposals? Why are deals lost? |
| Onboarding | What happens between "yes" and kickoff? What do clients have to send (assets, logins, content), and how? |
| Delivery | How are projects planned and tracked? How do clients see progress and approve work? Where do scope changes come from, and how are they priced? |
| Money | How are invoices made (GST, export, currency)? How do clients pay (UPI, bank transfer, card, PayPal, Wise)? How long do payments take, and how much chasing is involved? |
| Handoff | What gets handed over at the end (code, logins, docs, files)? What goes wrong after handoff? |
| Team | How do owners know who is doing what, and how loaded the team is? How are attendance, leave and payouts handled? |
| Process knowledge | Is the agency's way of working written down anywhere? Is it reused between projects? |
| Tools and spend | Which tools are used today, and what do they cost? What would make someone switch? |
| International | How do Indian agencies serve foreign clients (time zones, contracts, currency, compliance)? What do foreign clients worry about when hiring from India? |

## 3. Methods

| Method | Who | Size | Output | When |
| --- | --- | --- | --- | --- |
| Desk research (done) | Competitors, regulation, payment rails | 15+ sources | `desk-research.md`, `competitive-analysis.md`, `india-and-international.md` | Done |
| In-depth interviews (45 to 60 min, remote) | Segments below | 26 | Interview notes, journey maps, insights | Weeks 2 and 3 |
| Survey | Agencies and freelancers in India and abroad | 150+ (aim for 100 India, 50+ international) | Ranked pains, tools, spend, willingness to pay | Weeks 1 to 3 |
| Tool walkthroughs (contextual) | 4 agencies share their screen while running a real week | 4 | Workarounds, real artefacts | Week 3 |
| Tree test (unmoderated) | Agency users | 40+ | Validated sidebar labels | Week 5 |
| Usability tests (moderated) | Each key segment | 5 per round | Task success, issues | Before each design gate |
| Our own use ("dogfooding") | One Stop Solutions team | Ongoing | Friction log | From the first build |

### Interview segments (26 total)

| Segment | India | International |
| --- | --- | --- |
| Agency owner (2 to 50 people) | 6 | 4 (UK, UAE, US, AU or EU) |
| Solo freelancer (design, dev, marketing) | 5 | 2 |
| Team member or project lead | 3 | 0 |
| Client: SMB owner | 4 | 0 |
| Client: startup founder or marketing lead | 0 | 2 |

Mix of cities (metro and tier-2, such as Hyderabad, Bengaluru, Vijayawada, Pune, Kochi), of company sizes, and of first-time and experienced users.

## 4. Recruiting

- **Channels:** One Stop's network and past clients, LinkedIn, Behance and Dribbble creators, Instagram studios, freelancer and founder communities, Indian design and developer communities, and directory listings (Clutch, GoodFirms).
- **Screener:** see `survey.md` (part A). Exclude people working at competing products.
- **Incentive (suggested):** ₹1,000 voucher in India, US$40 (or local equivalent) abroad, sent within 7 days.
- **Scheduling:** offer IST evening slots for Indian freelancers. For UK and EU participants use 14:00 to 18:00 IST; for the US, 19:30 to 22:30 IST.

## 5. Ethics and data

- **Consent:** written consent before recording, in plain language, covering purpose, recording, storage, retention and the right to withdraw. Follow India's DPDP Act 2023 for Indian participants and GDPR for UK and EU participants.
- **Storage:** recordings and notes in one restricted folder; personal details kept separate from notes; quotes anonymised in reports.
- **Retention:** delete raw recordings 90 days after synthesis and keep anonymised notes only.
- **Language:** run interviews in English, Telugu or Hindi as the participant prefers; translate notes into English.

## 6. Timeline (5 weeks)

| Week | Work |
| --- | --- |
| 1 | Finalise guides, recruit, launch survey |
| 2 to 3 | Interviews and tool walkthroughs |
| 4 | Synthesis: affinity map, journeys, personas updated, assumptions scored |
| 5 | Tree test, concept test of the IA, and the readout with build-order recommendations (gate G0) |

## 7. Deliverables

- Updated personas and journey maps (replacing the proto-personas).
- Insights report: top 10 insights, each with evidence, confidence and the product decision it drives.
- Ranked stage pain and willingness to pay.
- Assumptions log with results.
- Recommended MVP scope changes, fed into `../02-product/prd-mvp.md`.

## 8. Success criteria for the research

- Every MVP epic is traced to at least one validated insight or assumption.
- The riskiest assumptions (A1 to A6 in `assumptions.md`) each have a clear pass or fail.
- Sidebar labels reach at least 80% first-click success in the tree test.

## How the reference articles shape this plan

The founder's reference articles stress researching users before designing, studying roles, testing with interactive prototypes, using about 5 users for qualitative rounds and 20 to 50 for numbers, tree testing navigation, and tracking task success and time to value. This plan applies each of those. The full rulebook is `../03-design/ux-principles.md`.
