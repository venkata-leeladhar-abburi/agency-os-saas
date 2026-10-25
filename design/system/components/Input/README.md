# Input

Single-line text with a label above. Props: `label`, `hint`, `error`, `required`, `optional`, `prefix` and `suffix` (₹, %, .com), `icon`, `size="xl"` for phones, plus every native input prop.

- **Label every field;** placeholders are examples, not labels.
- **Validate on blur and on submit,** not on every keystroke. The error says how to fix it: "A GSTIN has 15 characters."
- **Use `inputMode`** (numeric, tel, email) so phones show the right keyboard. Money fields take `prefix="₹"` or the client's currency symbol.
- **Borders are `input`** (3:1 on card); focus is the violet `ring` with a soft halo.
