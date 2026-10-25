# Code conventions

## Language and tooling

- TypeScript everywhere, `strict` on, no `any` without a comment saying why.
- pnpm workspaces + Turborepo. Node LTS (pin in `.nvmrc` and `engines`).
- ESLint (typescript-eslint, react-hooks, jsx-a11y, import order) and Prettier. Run on commit (lint-staged) and in CI.
- Commands every package supports: `lint`, `typecheck`, `test`; apps also `dev`, `build`, `e2e`. Root `pnpm check` runs lint, typecheck and unit tests across the repo.

## Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Files and folders | kebab-case | `pipeline-board.tsx`, `invoice-summary/` |
| React components | PascalCase | `PipelineBoard` |
| Functions, variables | camelCase | `formatMoney`, `amountMinor` |
| Database | snake_case, plural tables | `invoice_items.amount_minor` |
| Server actions | verb + object | `createLead`, `issueInvoice`, `approveGate` |
| Events (Inngest, PostHog) | `object_action` | `invoice_sent`, `gate_approved` |
| Permissions | `object.action` | `invoices.issue`, `leads.read` |
| Env vars | SCREAMING_SNAKE | `RAZORPAY_WEBHOOK_SECRET` |

## UI rules (enforced in review and by lint where possible)

- Only components from `packages/ui` in apps. Need something new? Add it to `packages/ui` with a Storybook story first.
- Only token utilities (`bg-card`, `text-muted-foreground`, `border-input`, `rounded-lg`, `shadow-md`, `text-title-lg`). No hex, rgb, arbitrary colour values or inline styles for colour; Tailwind's default palette is removed so they fail.
- Icons only from `@phosphor-icons/react`, imported per icon (`import { Receipt } from '@phosphor-icons/react/dist/ssr'` in server components). Regular weight by default; fill only for selected navigation; duotone only for empty states.
- Every string through `next-intl` (`t('leads.empty.title')`); copy follows `../03-design/content-style.md`.
- Money only through `formatMoney(minor, currency, opts)`; dates through `formatDate`; never `toFixed` on money.
- Every page has loading (`loading.tsx` with skeletons), error (`error.tsx`), empty and no-access states.
- One primary button per view.

## Server code

- Database access only through `withUser()` (RLS) or, in jobs and webhooks, `withService(workspaceId)`, which forces a workspace filter.
- Domain rules in `packages/core` (pure functions); server actions orchestrate, they don't calculate tax.
- Errors: throw typed `AppError(code, message)` inside services; actions convert them to results. Never show stack traces to users.
- Migrations: Drizzle Kit generates SQL; RLS policies and functions live in hand-written SQL migrations next to them. Migrations are forward-only; a destructive change ships in two releases (add, backfill, then remove).

## Git and pull requests

- Default branch `main`, always deployable. Work on `feat/m08-leads`, `fix/invoice-rounding` style branches.
- Conventional Commits (`feat(leads): add CSV import`, `fix(tax): round IGST per line`).
- One milestone (or a slice of one) per PR. The PR description lists: the PRD stories covered, screenshots (light and dark, phone and desktop) for UI, test evidence, the accessibility checklist, and any decision made.
- CI must be green before merge: lint, typecheck, unit, RLS tests, e2e smoke, axe, build.
- Never commit secrets, real client data, or generated files that the build recreates.

## Documentation

- Decisions go to `docs/00-plan/decisions.md` as short ADRs (context, decision, consequences).
- Progress goes to `docs/00-plan/progress.md` at the end of every working session.
- Each package has a README with its purpose and commands.
