# Agency OS: rules for every Claude Code session

Agency OS is a SaaS for agencies and freelancers: get found, win the work, deliver, get paid, hand over. India first (GST, UPI, WhatsApp, ₹), built to work as well for international agencies and clients. Built by One Stop Solutions.

## Before you start any work

1. Read `docs/00-plan/progress.md` (where we are) and `docs/00-plan/build-plan.md` (milestones, gates, how to work).
2. Check `docs/00-plan/open-questions.md` for new answers from the founder.
3. Read the docs for the milestone you are on (the build plan names them).

## Stack (see `docs/04-engineering/architecture.md`)

Next.js App Router + TypeScript · pnpm + Turborepo · shadcn/ui (Radix) + Tailwind CSS v4 · Supabase (Postgres with RLS, Auth, Storage, Realtime; Mumbai region) · Drizzle · Inngest · Resend + React Email · Razorpay · next-intl · PostHog · Sentry · Vitest, Playwright, Storybook, axe.

## Design: non-negotiable

- **The design system is the visual target.** Reference: `design/showcase.html` (open in a browser), `design/screens/*.png`, `design/system/` (tokens, components, brand book), spec in `docs/03-design/design-system.md`. Live page: open question 0 in `docs/00-plan/open-questions.md`.
- **Tokens only.** Colours, type, radius, shadows and sizes come from `tokens/tokens.json` via `globals.css`. No hex, rgb or arbitrary colour values in components. Tailwind's default palette is removed on purpose.
- **Geist and Geist Mono only** (from the `geist` package). **Phosphor icons only** (`@phosphor-icons/react`), regular weight; fill only for selected navigation; duotone only for empty states. Icons always support a text label.
- **The UX rulebook** (`docs/03-design/ux-principles.md`) applies to every screen: one clear purpose, one primary action, every state designed (loading, empty, error, no access), keyboard and phone ready, WCAG 2.1 AA (`docs/03-design/accessibility-checklist.md`).
- **Copy** follows `docs/03-design/content-style.md`: sentence case, verbs on buttons, errors that say how to fix, Indian formats by default (₹4,86,000, ₹4.86 L, 25 Oct 2026).

## Engineering: non-negotiable

- Every tenant table has `workspace_id` and RLS. Database access only through `withUser()` (or `withService(workspaceId)` in jobs and webhooks). Cross-tenant tests must pass.
- Money in integer minor units with a currency code; tax and money logic only in `packages/core`, fully unit-tested.
- Secrets never in the repo or the chat. Use the env var names in `docs/04-engineering/environments-and-deploy.md`. If a key is missing, say which variable is needed and continue with the parts that don't need it; never fake a result.
- Each milestone meets the definition of done in `docs/04-engineering/testing.md`.
- Follow `docs/04-engineering/conventions.md` (naming, Conventional Commits, PR contents).

## Built-in content

Templates, defaults, empty states, notification copy and plan limits come from `docs/02-product/defaults-and-content.md`. Tax and money tests start from `docs/04-engineering/tax-test-cases.md`. Don't invent other defaults; propose them to the founder.

## Content rules

- Describe every feature as an Agency OS feature. Never say a feature comes from, copies or replaces another product.
- Never invent research findings, metrics, testimonials, reviews, customer names or logos. Sample data is clearly labelled "Example".
- No emoji in the interface; no exclamation marks.

## Gates and the founder

- The founder approves gates G0 to G4 (`docs/00-plan/build-plan.md`). Do not start work past a gate until it is approved. Record approvals in `docs/00-plan/decisions.md`.
- Ask the founder about money, accounts, legal, pricing, brand, scope and conflicts between docs; batch questions with a recommended default; keep working on other parts meanwhile. Decide reversible technical details yourself and record them.
- Production deploys only after G3.

## End of every session

Update `docs/00-plan/progress.md` (done, next, blockers), add decisions to `docs/00-plan/decisions.md`, push the branch and open or update the pull request with screenshots (light and dark, phone and desktop) and test results.
