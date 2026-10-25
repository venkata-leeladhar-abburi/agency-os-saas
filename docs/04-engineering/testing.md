# Testing

Tests prove the product works before anyone sees it. CI runs everything below on every pull request; a red check blocks the merge.

| Layer | Tool | What | When |
| --- | --- | --- | --- |
| Unit | Vitest | `packages/core` (start from the worked cases in `tax-test-cases.md`): money, tax (GST intra-state, inter-state, export with and without LUT, unregistered supplier, rounding, round-off), GSTIN validation, invoice numbering and financial year, amount in words (Indian and international), permissions, date and currency formatting for en-IN, en-US, en-GB | Every PR; 100% line coverage for `core/tax` and `core/money` |
| Component | Vitest + Testing Library | `packages/ui` components: states, keyboard behaviour, ARIA | Every PR |
| Visual | Storybook + Playwright screenshots | Each story in light and dark compared with the approved baseline; at M2 and M3 also compared by eye with `design/screens/` | Every PR touching `ui` |
| Database | Vitest against a test Postgres (Supabase CLI locally, or a dedicated test project) | RLS: a member of workspace A cannot read or write workspace B for every table; portal contacts see only their client; roles get exactly their permissions; audit log is insert-only | Every PR touching `db` |
| End to end | Playwright | Critical paths below, on desktop (1440px) and phone (390px, Android Chrome emulation) | Every PR (smoke), nightly (full) |
| Accessibility | `@axe-core/playwright` | No serious or critical violations on every e2e page and Storybook story | Every PR |
| Performance | Lighthouse CI | Portal home, leads board, invoice page: LCP < 2.5s (mobile, simulated 4G), CLS < 0.1, JS budget | Every PR to main |
| Tokens | Node script in `packages/tokens` | Every text pair 4.5:1, controls and focus 3:1, both themes; generated `globals.css` matches `tokens.json` | Every PR touching tokens |
| Security | CodeQL, `pnpm audit`, secret scanning; ZAP baseline before gates | | Continuous and at G3, G4 |

## Critical paths (e2e)

These cover the R1 parts of the usability tasks in `../01-research/usability-testing.md` (T1 to T10, and the daily update from T12; handoff and time logging arrive in R4 and R5):

1. Sign up with email magic link, create a workspace (India), skip optional steps.
2. Load sample data, see it labelled "Example", remove it in one click.
3. Add a lead, move it across stages, add a note and a follow-up; it appears in Today.
4. Create a quote with GST and a proposal; send it; open the public link; accept and sign with an email code.
5. Convert the lead to a client and a project from the seven-phase template.
6. Request approval on the Design gate; the client approves in the portal on a phone.
7. Create and issue a tax invoice (intra-state) and an export invoice under LUT in USD; numbers are consecutive.
8. Pay through a Razorpay test payment link; the webhook marks the invoice paid; the dashboard updates.
9. Record a manual bank payment with a FIRA attachment.
10. Invite a member as Project lead; they see only what the role allows.
11. Use the command palette to jump to an invoice and create a lead from the keyboard only.
12. Export all workspace data.
13. Post a daily update from a phone; the project lead sees it.

## Test data

- Factories in `packages/db/test/factories.ts`; never real people or companies outside the example names already used in the design reference.
- Razorpay in test mode; webhooks replayed from recorded fixtures (signed with a test secret).
- Email captured by a test transport (no real sends in CI).

## Definition of done (every milestone)

- PRD acceptance criteria met and listed in the PR.
- Unit, component, RLS and e2e tests written and green.
- axe clean; accessibility checklist ticked.
- Light and dark, phone and desktop screenshots attached.
- No new lint or type errors; no `TODO` without an issue link.
- `../00-plan/progress.md` updated.
