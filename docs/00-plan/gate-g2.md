# Gate G2: design approval

**Status:** the prototype is ready; usability round R2 not run yet · **Prepared:** 25 Oct 2026 · Reply "Approve G2" after R2, or list changes.

## Links
- **Prototype:** `pnpm dev`, then http://localhost:3000/prototype (the Vercel preview link once Vercel is connected). All 42 R0/R1 screens, fully designed with example data, light and dark, phone and desktop, every state.
- **Screenshots:** `docs/screenshots/m04-hifi/` (desktop light and phone dark of every screen); the `prototype-screenshots` CI artifact has all 168.
- **Storybook:** the `storybook` CI artifact.
- **Test script:** `docs/01-research/usability-r2-script.md`; tree test: `docs/01-research/tree-test.md`.

## What changed since G1
- Every grey box is replaced by the designed content: real boards, tables, records, the proposal document, the quote and invoice maths from `packages/core`, message threads, files, daily updates, calendars.
- Buttons move between screens, so usability tasks T1 to T10 and T12 can be clicked through end to end.
- Fixes found on the way: tabs no longer push phone layouts wider than the screen; prototype controls never cover the last button; loading buttons stay buttons.

## Pass lines
| Pass line | Result |
| --- | --- |
| Hi-fi prototype of every MVP screen, light and dark, phone and desktop | 42 of 42; 168 screenshots |
| Every screen accessible | All screens in every state: no serious axe violations, light and dark; nothing wider than a 390px phone (58 e2e tests) |
| Tasks can be completed in the prototype | T1 to T10 and T12 click through (automated) |
| **≥ 80% task success on T1 to T10 with real users; no blockers; SEQ ≥ 5.5** | **Not run yet.** Needs participants (G0 was waived, so this round is the real check). |
| Tree test ≥ 80% first-click success | **Not run yet** (moved from G1) |

## Decisions for the founder
1. **Run round R2** (about 15 sessions) and the tree test, or decide to approve G2 without them.
2. **Approve G2**, or list changes. After G2 the real build starts (M5 to M16).
3. **Accounts for the build:** a Supabase dev project in the Mumbai region (M5), with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` added as environment secrets; Vercel for previews.
