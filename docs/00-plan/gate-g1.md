# Gate G1: design system and wireframes

**Status:** approved by the founder on 25 Oct 2026 (recorded in `decisions.md`) · **Prepared:** 25 Oct 2026

## Links
- **Design system in code (Storybook):** download the `storybook` artifact from the latest CI run on `main` (Actions → CI → run → Artifacts), unzip, open `storybook-static/index.html`. Or run `pnpm --filter @agency-os/ui storybook`. The live Vercel link comes when Vercel is connected (open question 7).
- **Wireframes:** `pnpm dev`, then http://localhost:3000/prototype. Every R0 and R1 screen (S01 to S42), with states, light and dark, phone and desktop. The CI artifact `prototype-screenshots` has all 168 screenshots.
- **Reference:** the Design System page (open question 0) and `design/showcase.html`.

## What is in this gate
| Part | Where | Status |
| --- | --- | --- |
| Tokens, theme, contrast check | `packages/tokens`, M1 ([#1](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/1)) | Done |
| 22 core components, every state | `packages/ui/src/components`, M2 ([#2](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/2)) | Done |
| 13 patterns and the three reference screens | `packages/ui/src/patterns`, M3 ([#3](https://github.com/venkata-leeladhar-abburi/agency-os-saas/pull/3)) | Done |
| Wireframes of all 42 R0/R1 screens | `apps/web/app/prototype`, M4 | In this PR |
| Tree test script | `docs/01-research/tree-test.md` | Ready to run |
| Wireframe test script (round R1) | `docs/01-research/wireframe-test-script.md` | Ready to run |

## Screenshots
Desktop light and phone dark for every screen in `docs/screenshots/m04/`; components and patterns in `docs/screenshots/m01` to `m03`. A few to start with:

| | Desktop, light | Phone, dark |
| --- | --- | --- |
| S11 Owner dashboard | `m04/s11-dashboard-light-desktop.png` | `m04/s11-dashboard-dark-phone.png` |
| S12 Leads board | `m04/s12-leads-board-light-desktop.png` | `m04/s12-leads-board-dark-phone.png` |
| S33 Invoice builder | `m04/s33-invoice-builder-light-desktop.png` | `m04/s33-invoice-builder-dark-phone.png` |
| S38 Portal home | `m04/s38-portal-home-light-desktop.png` | `m04/s38-portal-home-dark-phone.png` |

## Pass lines
| Pass line (build plan) | Result |
| --- | --- |
| Design system in code matches the approved reference | Rebuilt dashboard, leads and portal screens match; differences listed in `docs/03-design/differences-from-reference.md` |
| Wireframes of every MVP screen | 42 of 42, each with its states (default, loading, empty, error, no access, plus screen-specific ones) |
| Every component has all states | 40 stories; 82 of 82 Storybook checks pass (axe, light and dark, plus keyboard interaction tests) |
| Contrast check green | 82 of 82 pairs pass in both themes |
| Wireframes accessible and phone-ready | 42 of 42 screens: no serious axe violations in any state, light and dark; nothing wider than a 390px phone |
| **Tree test first-click success ≥ 80%** | **Not run yet.** Needs participants; script ready. Founder runs it or waives it in writing. |

## What changed since design system v1
- Small type sizes now follow the spec's type scale (button `lg` 14px, card titles 16px, dialog titles 20px).
- Project and client tabs are links (each tab is its own page, as in the URL structure).
- The top bar's **New** is primary only on pages without their own primary action, so each page keeps one primary button.
- Pipeline totals are computed from the cards shown.
- Lead cards have a keyboard move handle.

## Decisions for the founder
1. **Approve G1**, or list changes.
2. **Tree test:** run it (about 40 agency and 15 client participants) or waive it in writing. Claude can't recruit participants.
3. **Research (G0):** run the interviews and survey, or waive G0. The hi-fi prototype for G2 can't start until G0 is passed or waived.
4. **Labels:** keep "Sales docs" for quotes and proposals, or use "Quotes and proposals" (the tree test checks it).
5. **Playbook** stays out of the R1 navigation (it's R2). The reference screens showed it.
6. **Vercel:** connect it so reviews use a link instead of downloads (open question 7).
