# Accessibility checklist

WCAG 2.1 AA is the floor (2.2 as the reference). Every pull request that changes UI goes through this list; the automated parts run in CI (`../04-engineering/testing.md`).

## Automated (CI blocks the merge)

- [ ] axe-core finds no serious or critical issue on every page and Storybook story touched (`@axe-core/playwright`).
- [ ] The token contrast script passes (all text pairs 4.5:1, controls and focus 3:1, both themes).
- [ ] ESLint `jsx-a11y` passes.
- [ ] No colour value outside the tokens (lint rule and the Tailwind palette reset).

## Manual (the author ticks these in the PR description)

**Keyboard**
- [ ] Every action works with the keyboard alone, in a sensible order.
- [ ] Focus is always visible (2px `ring`, 2px offset) and never trapped, except inside an open dialog or sheet, which returns focus to its trigger on close.
- [ ] Shortcuts never fire while typing in a field. Ctrl/Cmd+K opens the command palette everywhere.
- [ ] Drag and drop (pipeline, tasks) has a keyboard and menu alternative ("Move to…").

**Screen readers**
- [ ] Every control has a visible label or an `aria-label`; icon-only buttons have both `aria-label` and a tooltip.
- [ ] Headings form an outline (one `h1` per page).
- [ ] Status changes are announced (toasts and form errors use live regions; Radix and sonner do this when used as documented).
- [ ] Tables use real table markup with header cells; sortable headers expose their sort state.
- [ ] Images and charts have text alternatives; a chart's key number is also written out.

**Visual**
- [ ] Status is never colour alone: a word or icon goes with it.
- [ ] Works at 200% browser zoom and with 320px width without losing content or functions.
- [ ] Text spacing can be increased (WCAG 1.4.12) without clipping.
- [ ] Checked in light and dark.
- [ ] Reduced motion: no animation beyond fades.

**Forms**
- [ ] Errors appear next to the field, say how to fix it, and are linked with `aria-describedby`.
- [ ] Required and optional are clear; nothing relies on placeholder text.
- [ ] Autocomplete attributes set (name, email, tel, organisation, address).
- [ ] Destructive actions confirm; others offer Undo.

**Touch and phones (always for the client portal)**
- [ ] Targets at least 44 × 44px with 8px between them.
- [ ] Body text 16px on phones in the portal.
- [ ] No hover-only actions.

**Language**
- [ ] `lang` is set on the document; content in Hindi or Telugu typed by users renders through the Noto fallbacks.
- [ ] Copy follows `content-style.md`.

## Testing with people

Usability rounds (`../01-research/usability-testing.md`) include at least one participant who uses a screen reader or magnification before launch (gate G3), and one participant on a low-cost Android phone.
