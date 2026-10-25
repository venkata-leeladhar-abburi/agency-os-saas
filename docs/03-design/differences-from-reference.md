# Differences from the reference design

The G1 material lists every place where the coded design system differs from `design/` (the reference bundle and screenshots), and why. Small differences are made on purpose so that the code follows `docs/03-design/design-system.md` (the spec) and the token type scale exactly; the reference bundle used a few in-between sizes.

| Component | Reference bundle | In code | Why |
| --- | --- | --- | --- |
| Button `lg` | 15px label | 14px (`body-medium`) | No 15px style in the type scale. |
| Kbd | 11px | 12px (`mono-sm`) | Nearest type style; still fits a 20px key. |
| Card title | 15 / 22 | 16 / 24 (`title-sm`) | The spec says card titles use `title-sm`. |
| Dialog and empty-state title | 18 / 26 | 20 / 28 (`title-md`) | The spec says dialogs and sections use `title-md`. |
| Select | Native select | Native select | Same. A searchable combobox for long lists comes with the screens that need it. |
| Dropdown menu | Not in the bundle | Non-modal menu (shadcn base) | Keeps the page readable to screen readers while a menu is open. |
| Theme toggle | Not in the bundle | Segmented with Light, Dark, System | Needed for the light/dark switch from M1. |
| Lead card | Whole card draggable | Whole card drags with a pointer; a move handle (visible on hover, focus and phones) drags with the keyboard; the name opens the lead | A focusable card can't also contain the name button, so keyboard moves use the handle. |
| Pipeline totals | ₹2.95 L, ₹2.7 L in the dashboard and leads screens | ₹2.3 L, ₹1.7 L | Computed from the example cards shown; the reference numbers didn't add up. |
| Avatar tints | Teal for KR | Tint picked from the name hash | Stable per person, as the spec asks; the exact colour per example name differs. |
| Client portal, Latest | Overline label | Card title | One heading style for cards on the portal. |
| Screen titles | 28px in the showcase | `title-xl` (32px) greeting, `title-lg` (24px) page titles | The spec's type scale. |

Raw scale steps used by components, as in the reference bundle: `red-700` (destructive hover), `lime-400` (highlight hover), the avatar tints (`*-100` fill with `*-800` text, `lime-200` with `lime-900`), the progress tones (`green-600`, `red-600`, `lime-500`) and the dialog overlay (`neutral-975` at 55%). They come from `tokens.json`; no colour is written in code.

## Wireframe-level decisions (M4)

- **Top bar New:** primary only on pages without their own primary action (Today, Dashboard); elsewhere secondary, so a page never has two primary buttons. The reference screens had no other primary on the page.
- **Record tabs:** links (each tab is its own page, as in the URL structure), not ARIA tabs.
- **Navigation:** Playbook left out of R1 (it's R2). "Sales docs" holds quotes and proposals; the tree test checks the label.
