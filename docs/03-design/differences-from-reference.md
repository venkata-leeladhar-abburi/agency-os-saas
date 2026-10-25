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

Raw scale steps used by components, as in the reference bundle: `red-700` (destructive hover), `lime-400` (highlight hover), the avatar tints (`*-100` fill with `*-800` text, `lime-200` with `lime-900`), the progress tones (`green-600`, `red-600`, `lime-500`) and the dialog overlay (`neutral-975` at 55%). They come from `tokens.json`; no colour is written in code.
