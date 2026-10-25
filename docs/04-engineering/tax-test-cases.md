# Tax and money test cases

Worked examples for `packages/core` unit tests, with exact expected values. The chartered accountant reviews this page together with the invoice template before G3 (open question 10); update the expectations if the CA asks for a different rule.

Rules used (from `data-model.md`): tax per line per head, each rounded half-up to the paisa; optional round-off to the nearest rupee on the total; amounts in minor units.

Supplier for every case: registered in **Andhra Pradesh (state code 37)**, GSTIN `37ABCDE1234F1ZZ` (test value with a valid checksum).

## A. Intra-state tax invoice
Client GSTIN `37…` (Andhra Pradesh). Items at 18%:

| Item | Qty | Rate | Taxable |
| --- | --- | --- | --- |
| Website design and build (SAC 998314) | 1 | 35,000.00 | 35,000.00 |
| CMS setup and training (SAC 998314) | 1 | 5,000.00 | 5,000.00 |

Expected: subtotal ₹40,000.00 · CGST 9% ₹3,600.00 · SGST 9% ₹3,600.00 · IGST ₹0 · total **₹47,200.00** · words "Rupees Forty Seven Thousand Two Hundred Only" · minor units: total `4720000`.

## B. Inter-state tax invoice
Same items, client GSTIN `29ABCDE1234F1ZW` (Karnataka). Expected: CGST 0 · SGST 0 · IGST 18% ₹7,200.00 · total **₹47,200.00**.

## C. Place of supply without a client GSTIN
Unregistered client in Tamil Nadu (billing address state code 33). Expected: inter-state, IGST 18%.

## D. Export of services under LUT
Client in the US, currency USD, workspace LUT ARN set and valid on the invoice date, exchange rate 84.20. Item: Design sprint (5 days), qty 1, US$2,000.00.

Expected: IGST 0% ₹0 · total **US$2,000.00** (`200000` cents) · INR equivalent ₹1,68,400.00 (`16840000` paise) at 84.20 · the LUT sentence printed · words "US Dollars Two Thousand Only".

## E. Export without a LUT
Same as D, no valid LUT on the invoice date. Expected: IGST 18% = US$360.00 · total US$2,360.00 · warning in the editor: "No valid LUT for this date. IGST is charged." (CA to confirm how the INR tax amount is shown.)

## F. Supplier not registered
Workspace has no GSTIN. Expected: document type "Bill of supply" · no tax lines · total = subtotal · no GSTIN fields printed for the supplier.

## G. Rounding per line
Intra-state, 18%:

| Item | Qty | Rate | Taxable | CGST 9% | SGST 9% |
| --- | --- | --- | --- | --- | --- |
| Line 1 | 3 | 333.33 | 999.99 | 90.00 | 90.00 |
| Line 2 | 1.5 | 1,234.57 | 1,851.86 (1,851.855 rounded half-up) | 166.67 | 166.67 |

Expected: subtotal ₹2,851.85 · CGST ₹256.67 · SGST ₹256.67 · total ₹3,365.19 · with round-off on: round-off −₹0.19, total **₹3,365.00**.

Same items inter-state: IGST per line 180.00 and 333.33 → IGST ₹513.33 · total ₹3,365.18. (Per-head rounding makes intra-state one paisa higher here; this is expected. Keep the test so any change in rule is deliberate.)

## H. Discount before tax
Inter-state, one item ₹50,000.00 with a ₹5,000.00 discount. Expected: taxable ₹45,000.00 · IGST ₹8,100.00 · total ₹53,100.00.

## I. Partial payments
Total ₹47,200.00; payment of ₹20,000.00. Expected: status `partially_paid` · amount due ₹27,200.00. A second payment of ₹27,200.00 → status `paid`; reminders cancelled. An extra payment above the amount due is rejected with "This is more than the amount due (₹27,200.00)."

## J. Numbering and financial year
Prefix `OSS`. Issue on 31 Mar 2027 → `OSS/26-27/<next>`; issue on 1 Apr 2027 → `OSS/27-28/001`. Two invoices issued at the same moment get consecutive numbers (row lock). A prefix that would make the number longer than 16 characters is rejected in Settings. Drafts have no number.

## K. GSTIN validation
| Input | Expected |
| --- | --- |
| `37ABCDE1234F1ZZ` | Valid (state 37) |
| `29ABCDE1234F1ZW` | Valid (state 29) |
| `27AAPFU0939F1ZV` | Valid (the widely published sample) |
| `37ABCDE1234F1ZA` | Invalid: "This GSTIN's last character doesn't match. Check for a typo." |
| `37ABCDE1234F1Z` | Invalid: "A GSTIN has 15 characters. This one has 14." |
| `99ABCDE1234F1Z…` | Invalid state code |
| lower case input | Accepted and upper-cased |

Checksum: map `0-9A-Z` to 0–35; for the first 14 characters multiply by 1, 2, 1, 2 … from the left; add `product div 36 + product mod 36`; check character = `(36 − sum mod 36) mod 36`.

## L. Money formatting
| Minor units, currency | `formatMoney` | Compact |
| --- | --- | --- |
| `48600000`, INR | ₹4,86,000.00 (₹4,86,000 when `decimals: 0`) | ₹4.86 L |
| `12400000000`, INR | ₹12,40,00,000.00 | ₹12.4 Cr |
| `48600000`, USD | $486,000.00 | $486K |
| `123456789`, INR words | "Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven and Eighty Nine Paise Only" | — |

## M. Dates
`formatDate('2026-10-25', 'en-IN')` → "25 Oct 2026"; `en-US` → "Oct 25, 2026"; never numeric-only dates in the UI.
