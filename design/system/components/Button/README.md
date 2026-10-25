# Button

Buttons start an action. **One `primary` per view** for the main thing the page is for; `secondary` (outlined) for other actions; `ghost` in toolbars, tables and cards; `soft` for low-emphasis fills; `destructive` only inside a confirmation dialog; `highlight` (lime) for rare celebratory actions; `link` inline in text.

- **Props:** `variant`, `size` (`sm` 32, `md` 36, `lg` 40, `xl` 44 for phones), `icon` and `iconRight` (Phosphor names), `loading`, `block`, `kbd` (shortcut hint), `as="a"` with `href`.
- **Labels** start with a verb in sentence case: "Send proposal", "Record payment". Never "Submit" or "OK".
- **Loading** keeps the label and swaps the icon for a spinner; the button is disabled and `aria-busy`.
- **Don't** put two primary buttons side by side, or use red for anything that isn't destructive.
