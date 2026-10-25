# Design process and approvals

How screens go from idea to approved design to code. It follows the rulebook's process (research, information architecture, prototype and iterate, visual design, test with real users) and the gates in `../00-plan/build-plan.md`.

## Where design lives

Design is **code-first**: the design system is real components, and prototypes are real screens with example data. That keeps one source of truth and lets the founder click through everything on a phone. Figma is optional; if the founder wants Figma files, ask before starting and keep tokens in sync as Figma variables with the same names.

| Stage | Where | Who approves |
| --- | --- | --- |
| Design system | Design System page on claude.ai, `design/showcase.html`, then Storybook (`packages/ui`) | Founder at G1 |
| Wireframes | `/prototype` routes in the app, grey boxes and real labels, behind a feature flag | Founder at G1 |
| Hi-fi prototype | The same `/prototype` routes, fully styled, example data, light and dark, phone and desktop | Founder at G2, after usability round R2 |
| Production screens | The app, with real data | Acceptance criteria in the PRD; founder at G3 |

## Steps for each screen or flow

1. **Brief.** Link the PRD story, the screen ID from `../02-product/screen-inventory.md`, the persona and the job. Note the primary action.
2. **Wireframe.** Layout and hierarchy only: what matters most, where the primary action sits, the empty, loading, error and no-access states. Use the IA labels.
3. **Review against the rulebook.** The three questions (Where am I? What matters most here? What do I do next?) and the checklists in `ux-principles.md` and `accessibility-checklist.md`.
4. **Hi-fi.** Only design-system components and tokens. If something new is needed, add it to the system first (see `design-system.md`, Governance).
5. **States.** Every state designed: loading (skeleton), empty (one action), error (what to do next), no access, partial data, long names and big numbers (₹1,24,00,000), Indian and international formats.
6. **Responsive.** Desktop and phone. The client portal is designed phone-first.
7. **Screenshot set.** Light and dark, phone (390px) and desktop (1440px), saved with the PR.
8. **Test.** With users at the round the build plan names; fix blockers before asking for approval.

## How the founder approves

At each gate, Claude posts one message with:
- links (Vercel preview, Storybook, the design system page),
- the screenshot set,
- what changed since the last gate and why,
- test results against the gate's pass lines,
- the decisions the founder needs to make.

The founder replies "Approve G1" (or G2, G3, G4), or lists changes. Approval is recorded in `../00-plan/decisions.md` with the date. Nothing past a gate is built until it is approved.

## Changes after approval

Small changes (copy, spacing, a missing state) are made directly and noted in the PR. Changes to flows, navigation or the design system after G2 go back to the founder with screenshots before they are built.
