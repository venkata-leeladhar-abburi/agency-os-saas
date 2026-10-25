# Desk research findings

Reviewed on 25 October 2026 from public product and reference pages. Vendor numbers are each vendor's own claims, and we have not verified them. Everything here is evidence for hypotheses, not a substitute for talking to users (see `research-plan.md`).

## Summary: what the market looks like

The tools around an agency's work fall into five groups. Each group covers part of the Agency OS journey, and none we reviewed covers all of it for Indian agencies serving both Indian and foreign clients.

| Group | Examples reviewed | What they cover | What they leave out (on the pages we reviewed) |
| --- | --- | --- | --- |
| Client-flow tools for small service businesses | HoneyBook, Dubsado, Bonsai, Plutio | Lead forms, proposals, contracts, invoices, scheduling, client portal, automations | Marketplace and discovery, team portals, India tax (GST, LUT), handoff packages. HoneyBook lists only the US, Canada, UK and Australia. |
| Agency operations / PSA | Productive, Teamwork.com | Projects, resourcing, time, budgets, profitability, invoicing | Getting found, client-facing sales, India-specific money. Priced per user in EUR or USD, and built for larger firms. |
| Client portals | Assembly (formerly Copilot) | Branded portal: messaging, files, contracts, payments, intake, AI-built apps | Delivery process, playbook, marketplace. |
| Indian invoicing and accounting | Refrens, Zoho Invoice | GST invoices, e-invoices, e-way bills, GSTR reports, payments, client portal for invoices | Delivery, client experience, process. Accounting-first, not agency-first. |
| Discovery and marketplaces | Clutch, Contra | Directory and network: search by service and location, verified reviews, project briefs, portfolios | Workflow after the lead arrives. Profiles show reviews and price, not how the agency works. |
| Building blocks | DocuSeal (e-sign), Razorpay Payment Links | Open-source e-signature with API and embedding; UPI and card links shared on WhatsApp, about 100 currencies, partial payments | Not products for agencies; we use them as parts. |

## Findings

**F1. Lead-to-payment in one flow is now table stakes abroad.**
HoneyBook sells "proposals, contracts, invoices, payments" sent in one workflow. Dubsado combines proposal, contract and invoice into one send. Bonsai and Plutio pitch replacing a stack of tools.
*Implication:* Agency OS must match this baseline (quote → proposal → sign → invoice → pay) before its differentiators count.

**F2. The leading client-flow tools don't serve India.**
HoneyBook is listed only for the US, Canada, UK and Australia, with India on a waitlist. Bonsai's page points to a US focus (FDIC and US banking notes, QuickBooks and Xero). Plutio claims local taxes and multiple currencies but nothing India-specific.
*Implication:* an India-first product with GST, LUT export invoices, UPI and WhatsApp has open space. Prove it in interviews (assumption A2).

**F3. Indian tools are built around accounting, not client delivery.**
Refrens covers GST invoices, e-invoicing, e-way bills and GSTR reports, and captures bills via WhatsApp. Zoho Invoice gives free invoicing with a client portal. Neither presents proposals-to-handoff delivery or a process-led client experience.
*Implication:* don't compete on accounting. Connect to accounting (export data, later Tally and Zoho Books sync) and own delivery and the client experience.

**F4. Agency operations tools are heavy and priced per user in foreign currency.**
Teamwork.com lists €9.99 and €24.99 per user per month (billed yearly). Productive targets agencies, consultancies and IT firms, citing a 100+ person customer.
*Implication:* a flat INR price per workspace (the deck's Agency Starter at ₹1,499 a month for up to 5 members) is a real difference for 2 to 20 person Indian agencies. Test willingness to pay (A5).

**F5. Directories bring leads but stop there.**
Clutch: search by service, then location; filters for budget and industry; "verified" reviews; buyers submit a brief and get quotes; paid "Get Verified" and "Advertise" options. Contra pitches itself as commission-free, with portfolios, job posts and hand-picked "verified" studios.
*Implication:* "zero commission" and verified reviews are expected. Our edge is showing how an agency works (process and toolkit from the Playbook) on the profile, and sending enquiries straight into a pipeline.

**F6. AI is everywhere, as assistants and MCP connectors.**
HoneyBook AI (drafts, recaps, notetaker), Bonsai MCP, Teamwork AI agents and MCP, Productive Agents, Refrens MCP, Assembly's AI app builder.
*Implication:* plan AI first drafts (quotes, proposals, PRDs, status reports) and an MCP connector in the roadmap. Follow the AI rules in the rulebook: show what the AI did and let the user review it.

**F7. The basic plan is a trial, not a free plan.**
HoneyBook (30 days), Bonsai (7), Plutio (7), Productive and Teamwork (14) offer trials. Assembly and Zoho Invoice offer free plans. Contra is free to join.
*Implication:* the deck's "free forever" profile, marketplace listing and free tools is a strong top of funnel, as long as the free plan has clear limits (open question Q1).

**F8. Handoff isn't presented as a product feature.**
None of the pages reviewed shows a handoff package (repo, stack sheet, URLs, credentials vault, acceptance certificate).
*Implication:* a likely differentiator for software and web agencies. Validate that clients and agencies feel this pain (A6).

**F9. Payment rails in India suit the product.**
Razorpay Payment Links take UPI and cards, can be shared by SMS, email or WhatsApp, support about 100 currencies with conversion, and allow instalments and advances, with webhooks and an API.
*Implication:* invoices can carry a payment link from day one, including advances and milestone payments.

**F10. E-signature can be owned, not rented.**
DocuSeal is open source and self-hostable, with an API, embedding and webhooks, and states ESIGN, UETA and eIDAS compliance.
*Implication:* embed e-sign inside the portal and keep documents in our own storage. For Indian enforceability of specific document types, get legal advice (see `india-and-international.md`).

## Regulation and compliance found

- **GST e-invoicing:** applies to registered businesses above ₹5 crore annual turnover (from 1 August 2023) for B2B supplies and exports, with an IRN and QR code from the Invoice Registration Portal. Most of our target agencies are below this, but larger ones will need it (later integration). Source: ClearTax.
- **Export of services:** agencies can issue zero-rated export invoices without paying IGST by filing a Letter of Undertaking (LUT, form GST RFD-11) each financial year, and the invoice states that the supply is under LUT. Confirm the exact invoice wording with a chartered accountant before shipping.
- **India data protection:** the Digital Personal Data Protection Act, 2023 (assented 11 August 2023). The DPDP Rules, 2025 phase in, with remaining provisions from 13 May 2027. Plan for notice and consent, data-principal rights (access, correction, erasure, grievance), breach reporting, and extra care with children's data. Notice text may be needed in Indian languages. Source: Wikipedia summary; confirm with counsel.
- **UK and EU clients:** GDPR applies to their personal data. The deck already plans a data processing addendum for EU and UK clients.
- **Accessibility:** the European Accessibility Act applies from 28 June 2025 to services including websites, mobile apps and e-commerce, with EN 301 549 as the harmonised standard. Microenterprises are exempt. Building to WCAG 2.1 AA (our rule) keeps us ready.

## Sources (accessed 25 October 2026)

- HoneyBook — https://www.honeybook.com
- Bonsai — https://www.hellobonsai.com
- Dubsado — https://www.dubsado.com
- Plutio — https://www.plutio.com
- Productive — https://productive.io
- Teamwork.com — https://www.teamwork.com
- Assembly — https://assembly.com
- Refrens — https://www.refrens.com
- Zoho Invoice — https://www.zoho.com/invoice/
- Clutch — https://clutch.co
- Contra — https://contra.com
- DocuSeal — https://www.docuseal.com
- Razorpay Payment Links — https://razorpay.com/payment-links/
- GST e-invoicing — https://cleartax.in/s/e-invoicing-gst
- DPDP Act — https://en.wikipedia.org/wiki/Digital_Personal_Data_Protection_Act,_2023
- European Accessibility Act — https://en.wikipedia.org/wiki/European_Accessibility_Act
- Reference articles on SaaS UX and design systems — see `../03-design/ux-principles.md` and `../03-design/design-system.md`
