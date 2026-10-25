# Progress

Updated by Claude at the end of every working session. The founder can read this page to see where things stand.

**Current phase:** Design system in code (M1 to M3). Research (G0) can run alongside.
**Next gate:** G0 Research (can run alongside M0 to M3).

## Gates

| Gate | Status | Date | Notes |
| --- | --- | --- | --- |
| G0 Research | Not started | | Research plan ready in `../01-research/` |
| G1 System and wireframes | Reference design ready | | Design system v1 published; waiting for M1 to M4 |
| G2 Design approval | Not started | | |
| G3 Beta ready | Not started | | |
| G4 Launch | Not started | | |

## Milestones

| # | Milestone | Status | PR | Notes |
| --- | --- | --- | --- | --- |
| M0 | Repo setup | Done | pushed to `main` | CI green on `main`. Preview deploy waits for Vercel (question 7). |
| M1 | Tokens and theme | In review | feat/m01-tokens | Generator, contrast check (82 of 82 pairs), Geist, Phosphor, light/dark/system switch, token pages in Storybook, story axe checks in CI. |
| M2 | Core components | Not started | | |
| M3 | Patterns | Not started | | |
| M4 | Wireframes and prototype | Not started | | |
| M5 | Accounts and workspaces | Not started | | |
| M6 | App shell and platform | Not started | | |
| M7 | Onboarding | Not started | | |
| M8 | Leads | Not started | | |
| M9 | Clients and conversion | Not started | | |
| M10 | Quotes and proposals | Not started | | |
| M11 | Projects, phases and gates | Not started | | |
| M12 | Tasks and team | Not started | | |
| M13 | Invoices and payments | Not started | | |
| M14 | Client portal | Not started | | |
| M15 | Dashboard and Today | Not started | | |
| M16 | Hardening | Not started | | |

## Session log

Newest first. One short entry per session: what was done, what is next, blockers.

- **25 Oct 2026 (build, M0):** arranged the pack at the repo root; built the monorepo (pnpm, Turborepo), `apps/web`, package skeletons, ESLint, Prettier, Vitest, Playwright with axe, Storybook, CI workflow, `.env.example`. Next: M1 tokens and theme. Blockers: no `main` branch on the remote; Vercel and the other accounts (question 7) are not connected, so no preview deploy yet. CI has not run on GitHub yet.
- **25 Oct 2026 (planning, in the One Stop repo):** research pack, product docs, design system v1 (tokens, Geist, Phosphor, 31 components, 3 example screens), engineering docs and this plan written. Next: the founder uploads the pack to the new repo and starts M0.
