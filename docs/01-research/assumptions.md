# Assumptions and risks

Ranked by risk (how bad if wrong × how unsure we are). Each one has a test and a pass line. Update the "Result" column after research. Gate G0 needs A1 to A6 answered.

| ID | Assumption | Risk | How we test | Passes if | Result |
| --- | --- | --- | --- | --- | --- |
| A1 | Small Indian agencies (2 to 20 people) feel enough pain across leads, delivery and payments to switch to one tool | High | Interviews (pain ranking), survey | At least 60% rank 3 or more stages as "painful" or "very painful" | Open |
| A2 | India-specific money features (GST, LUT, UPI links, WhatsApp reminders) are a strong reason to choose us over tools from abroad | High | Interviews, survey, competitor trials | At least half of Indian respondents name one of these among their top 3 needs | Open |
| A3 | Clients will use a portal instead of WhatsApp for updates, approvals and payments | High | Client interviews, concept test of the portal home | 4 of 6 clients prefer the portal flow for approvals and payments, as long as they get WhatsApp links | Open |
| A4 | Agencies want their process (Playbook) visible on public profiles, and buyers value it | Medium-high | Interviews with owners and buyers, profile concept test | Buyers pick the profile with process shown in at least 2 of 3 comparisons | Open |
| A5 | Agencies will pay ₹1,499 a month or more for the Agency plan; a Solo plan below that works for freelancers | High | Survey (Van Westendorp price questions), interviews | Acceptable price range includes ₹1,499 for agencies; a Solo range is identified | Open |
| A6 | Handoff packages are a real pain for both sides (missing logins and docs, support calls after delivery) | Medium | Interviews with dev agencies and clients | At least half of software-agency owners report post-handoff problems | Open |
| A7 | A free-forever profile and free tools bring enough sign-ups to feed paid plans | Medium | Landing page and waitlist test; free-tool usage after launch | Free-to-paid conversion targets set in `../02-product/metrics.md` are met by month 3 | Open |
| A8 | Owners will start from phase templates rather than a blank project | Medium | Usability test of project creation | 4 of 5 participants choose a template, and finish setup in under 3 minutes | Open |
| A9 | Many Indian SMB clients would prefer the portal in Telugu or Hindi | Medium | Client interviews | At least half say they would switch language | Open |
| A10 | Agencies serving foreign clients need multi-currency and export invoices in the first paid release | Medium | Interviews, survey | At least 30% of Indian agencies have foreign clients and invoice them monthly | Open |
| A11 | Teams will post daily updates and check attendance in the same tool | Low-medium | Interviews with team members | Team members prefer it to current chat updates | Open |
| A12 | Hirers want to post requirement briefs (not only contact profiles) | Low | Hirer interviews | At least half of hirers want to post a brief | Open |

## Product risks to watch

- **Breadth:** the full plan is large. Mitigation: ship the core loop first (`../02-product/prd-mvp.md`) and use it at One Stop before selling.
- **Two-sided marketplace cold start:** profiles need content and reviews before hirers come. Mitigation: profiles fill themselves from the Playbook and portal reviews (deck release R3 comes after R1 and R2).
- **Compliance errors in invoices:** tax mistakes damage trust. Mitigation: a CA review of invoice templates before release; clear "check with your CA" guidance.
- **Payment provider limits:** international collections depend on provider eligibility. Mitigation: support manual payments and multiple providers.
