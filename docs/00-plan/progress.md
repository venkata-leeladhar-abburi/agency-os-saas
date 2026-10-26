# Progress

Updated by Claude at the end of every working session. The founder can read this page to see where things stand.

**Current phase:** Build (M5 onward). G2 approved 26 Oct 2026.
**Next gate:** G3 Beta ready.

## Gates

| Gate | Status | Date | Notes |
| --- | --- | --- | --- |
| G0 Research | Waived | 25 Oct 2026 | Founder waived in writing; round R2 before G2 is the check. |
| G1 System and wireframes | Approved | 25 Oct 2026 | Summary in `gate-g1.md`. Tree test moves to before G2 (runs with round R2). |
| G2 Design approval | Approved | 26 Oct 2026 | R2 and the tree test move to before G3. |
| G3 Beta ready | Not started | | |
| G4 Launch | Not started | | |

## Milestones

| # | Milestone | Status | PR | Notes |
| --- | --- | --- | --- | --- |
| M0 | Repo setup | Done | pushed to `main` | CI green on `main`. Preview deploy waits for Vercel (question 7). |
| M1 | Tokens and theme | Done | [#1](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/1) | Generator, contrast check (82 of 82 pairs), Geist, Phosphor, light/dark/system switch, token pages in Storybook, story axe checks in CI. |
| M2 | Core components | Done | [#2](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/2) | 22 components with every state in Storybook; 39 component tests; 54 story axe checks (27 stories, light and dark). |
| M3 | Patterns | Done | [#3](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/3) | 13 patterns, the three reference screens rebuilt, core money and tax helpers (43 tests, 100% coverage), 56 component tests, 82 story checks. |
| M4 | Wireframes and prototype | Done (G1, G2 approved) | [#4](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/4), [#5](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/5) | 42 screens, wireframes then hi-fi, with clickable task flows. R2 and the tree test run before G3. |
| M5 | Accounts and workspaces | In progress | [#6](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/6) (part 1) | Part 1 (data layer): schema, RLS, roles, invitations, audit log, 21 database tests incl. cross-tenant. Part 2 (sign-in, setup, invites UI, switcher) needs the Supabase dev project. |
| M6 | App shell and platform | In progress | [#7](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/7) (part 1) | Part 1 (no keys needed): plans and limits, notifications and settings, audit log reader, data export, Razorpay subscription webhook, health check with the database. Part 2 (settings screens, palette search, subscribing) needs sign-in (M5 part 2) and Razorpay test keys. |
| M7 | Onboarding | Not started | | |
| M8 | Leads | In progress | [#8](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/8) (part 1) | Part 1 (data layer): stages, leads, timeline, follow-ups, board totals, filters, CSV import and export, enquiry form, 23 database tests. Part 2 (screens) needs sign-in. |
| M9 | Clients and conversion | In progress | [#9](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/9) (part 1) | Part 1 (data layer): clients, contacts, GSTIN, lead to client, portal access by verified email, 16 database tests. Part 2 (screens, sending the portal link) needs sign-in. |
| M10 | Quotes and proposals | In progress | [#10](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/10) (part 1) | Part 1 (data layer): numbering, GST totals, proposals from the template, the public link with views, email-code signing with an unchangeable record, decline and expiry, plan limits; 15 database tests. Part 2 (editor, public page, PDFs, emails) needs sign-in, Storage and Resend. |
| M11 | Projects, phases and gates | In progress | | Part 1 (data layer): templates, projects, team access, checklist progress, phase order, gate requests and decisions (client and internal) that can't be bypassed, portal view, saved templates; 17 database tests. Part 2 (screens) needs sign-in. |
| M12 | Tasks and team | Not started | | |
| M13 | Invoices and payments | Not started | | |
| M14 | Client portal | Not started | | |
| M15 | Dashboard and Today | Not started | | |
| M16 | Hardening | Not started | | |

## Session log

Newest first. One short entry per session: what was done, what is next, blockers.

- **25 Oct 2026 (build, M4 hi-fi):** G1 approved and merged; G0 waived in writing. Hi-fi of all 42 screens with clickable task flows (T1 to T10, T12), 58 e2e tests and 82 Storybook checks green. **Stopped at G2.** Needs from the founder: run round R2 and the tree test (script ready), approve G2, Supabase dev project and Vercel for M5.

- **25 Oct 2026 (build, M1 to M4):** M1 tokens and theme, M2 core components and M3 patterns merged (CI green). Core money and tax helpers done early (all worked cases, 100% coverage). M4 wireframes of all 42 R0/R1 screens at `/prototype`, every state checked with axe in light and dark. **Stopped at G1; G1 approved the same day.** Next: hi-fi prototype after the founder approves G1 and passes or waives G0. Needs from the founder: G1 approval, the tree test (or a written waiver), the G0 decision, Vercel (preview links), set `main` as the default branch.

- **25 Oct 2026 (build, M0):** arranged the pack at the repo root; built the monorepo (pnpm, Turborepo), `apps/web`, package skeletons, ESLint, Prettier, Vitest, Playwright with axe, Storybook, CI workflow, `.env.example`. Next: M1 tokens and theme. Blockers: no `main` branch on the remote; Vercel and the other accounts (question 7) are not connected, so no preview deploy yet. CI has not run on GitHub yet.
- **25 Oct 2026 (planning, in the One Stop repo):** research pack, product docs, design system v1 (tokens, Geist, Phosphor, 31 components, 3 example screens), engineering docs and this plan written. Next: the founder uploads the pack to the new repo and starts M0.
