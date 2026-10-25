# Content style

How Agency OS talks. Applies to every string in the app, the client portal, emails, PDFs and help text. The brand book in the design system (`design/system/README.md`) has the short version.

## Voice

Calm, plain and useful, like a capable studio manager. Never cute, never pushy.

- **Plain English with the words agencies and clients already use:** lead, client, proposal, quote, invoice, approval, handoff, milestone. Not record, entity, workflow, instance, object.
- **Speak to the person as "you".** The product does not say "I" or "we". In the client portal, the agency speaks: "Your designer shared the homepage."
- **Short sentences.** One idea each. No exclamation marks. No emoji in the interface.
- **Describe every feature as an Agency OS feature.** Never say a feature comes from, copies or replaces another product.
- **No made-up numbers, testimonials, reviews or claims,** in the product, on the website, in sample data or in emails. Sample data is labelled "Example".

## Mechanics

| Rule | Do | Don't |
| --- | --- | --- |
| Sentence case for everything (buttons, titles, menus, tabs) | Send proposal · Projects at risk | Send Proposal · PROJECTS AT RISK |
| Buttons start with a verb and say exactly what happens | Approve design · Record payment · Create invoice | OK · Submit · Yes |
| Confirmations repeat the action and the object | Delete "Kite & Co"? This removes the lead and its notes. · Delete lead | Are you sure? · Yes / No |
| Toasts confirm in the past tense and offer Undo | Lead moved to Proposal. Undo | Success! |
| Errors say what happened and how to fix it, without apology | That GSTIN has 14 characters. It needs 15. | Oops! Something went wrong. Invalid input. |
| Empty screens explain and offer one action | No leads yet. Add your first lead or import a CSV. | No data |
| Long tasks say what is happening | Creating the PDF… · Importing 240 leads (120 done) | Loading… |
| Labels above fields, hints below, "Optional" on optional fields | Website (Optional) | Website* with a legend |
| Placeholders show an example, never the label | e.g. Kite & Co | Enter client name |

## Numbers, money and dates

| Thing | India (default, en-IN) | International |
| --- | --- | --- |
| Money | ₹4,86,000 · compact ₹4.86 L · ₹1.2 Cr | $486,000 · compact $486K · $1.2M · €, £, AED in their locales |
| Money on invoices | Two decimals: ₹47,200.00, plus the total in words ("Rupees Forty Seven Thousand Two Hundred Only") | Two decimals in the invoice currency; base-currency equivalent and exchange rate shown |
| Dates | 25 Oct 2026 (written month, never 25/10 or 10/25) | 25 Oct 2026 (en-GB) or Oct 25, 2026 (en-US), by locale |
| Times | 10:30 am IST; both zones for foreign clients: "10:30 am IST · 6:00 am London" | Local time first |
| Relative time | 2 h ago, yesterday, Mon (then the date after a week) | Same |
| Invoice numbers | `OSS/26-27/014` in Geist Mono, per financial year (April to March) | Same format |
| Phone | +91 90149 52056 | E.164 with spaces |
| Percentages | 38% (no space) | Same |

Code: always format through the shared helpers in `packages/core` (`formatMoney`, `formatDate`, `rupeesInWords`); never build strings by hand.

## Client portal copy

Clients may be busy business owners reading on a phone, in their second or third language.

- Extra simple words: "Approve this design" (not "phase gate"), "Pay ₹47,200" (not "settle invoice"), "Ask for changes" (not "request revision").
- Say what happens next: "After you approve, Ananya starts building the pages."
- Every "Needs you" item has a verb, an amount or a date, and who it is from.
- Strings must translate cleanly: avoid idioms, puns and sentence fragments that depend on English word order. Hindi and Telugu translations come after launch; all strings go through `next-intl` from day one.

## Glossary (use these words)

| Use | Not | Meaning |
| --- | --- | --- |
| Lead | Prospect, opportunity, deal | Someone who might hire you |
| Client | Customer, account | Someone who has hired you |
| Proposal | Pitch, offer | The document that wins the work (scope, timeline, price, signature) |
| Quote | Estimate (in the UI) | Priced line items; a proposal can include a quote |
| Project | Job, engagement | Work for a client, made of phases |
| Phase | Stage (stage is for leads) | Connect, Discover, Define, Design, Build, Launch, Grow |
| Approval | Gate (in the portal) | A sign-off the client or a lead gives. "Gate" is fine inside the agency app. |
| Invoice | Bill | A request for payment (tax invoice, bill of supply, export invoice, proforma) |
| Payment | Transaction | Money received against an invoice |
| Handoff | Delivery package | Everything the client receives at the end |
| Workspace | Organisation, tenant | An agency or freelancer's Agency OS account |
| Member | User, seat (in the UI) | A person in a workspace |

## Emails and notifications

- Subject = the action and the object: "Kite & Co viewed your proposal", "Approve the homepage design", "Invoice OSS/26-27/014 is due on 2 Nov".
- One message, one button. The button repeats the subject's verb.
- Footer: workspace name and a link to notification settings. No marketing in transactional emails.
