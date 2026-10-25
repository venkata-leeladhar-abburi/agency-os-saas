# Designing for Indian and international users

Agency OS is India-first and must work just as well for international agencies and for Indian agencies serving foreign clients. This file lists the differences that change the design. Every row is a requirement or a hypothesis to check in interviews. Items marked **(verify)** need a chartered accountant or lawyer before release.

## The four combinations we serve

| Agency | Client | Example | What matters most |
| --- | --- | --- | --- |
| India | India | Hyderabad studio building an ERP for a Dharmavaram saree business | GST invoices, UPI, WhatsApp updates, Telugu or Hindi-speaking owners, mobile-first approvals |
| India | Abroad | Bengaluru freelancer designing for a US startup | Export invoice under LUT, USD payments, FIRA records, time zones, NDA and IP terms, trust |
| Abroad | Abroad | London agency with UK and EU clients | GDPR and DPA, VAT on invoices, Stripe or card payments, Slack, polished client portal |
| Abroad | India | Dubai agency with Indian clients | INR quotes, UPI links, GST status of the client |

## Money

| Topic | India | International | Design decision |
| --- | --- | --- | --- |
| Currency | INR (₹) | USD, GBP, EUR, AED, AUD and more | Every amount stores minor units and a currency code. The workspace has a base currency; each client and invoice has its own. |
| Number format | Lakh and crore grouping: ₹12,40,000 and "₹12.4 L" | 1,240,000 and "1.24M" | Format with `Intl.NumberFormat` per the workspace locale (en-IN or en-US/en-GB). Compact values use L/Cr in India and K/M elsewhere. Always use tabular figures. |
| Tax | GST: 18% on most services; CGST + SGST within a state, IGST between states; GSTIN on both sides; SAC code per service **(verify rates and codes)** | VAT or sales tax by country; reverse charge for B2B in the EU and UK | A tax engine with presets: India GST (intra-state or inter-state from state codes), export under LUT (0%), and a custom tax for other countries. |
| Registration | Many freelancers fall below the GST registration threshold and invoice without GST | Varies | Support "not registered for GST" invoices; no GSTIN field required. |
| Export invoices | Zero-rated under LUT (form GST RFD-11, filed each financial year); the invoice states the supply is under LUT **(verify wording)** | Not applicable | An "export of services" invoice type with the LUT number and date, currency and exchange rate. |
| Proof of foreign payment | FIRA or FIRC per inward remittance | Not applicable | Attach FIRA/FIRC to each payment record. |
| E-invoicing | Required above ₹5 crore turnover (IRN and QR) | Varies (PEPPOL in some EU countries) | Later: an integration through a GST Suvidha provider. Keep the invoice data model compatible. |
| Payment methods | UPI first, then net banking, cards, bank transfer (NEFT/RTGS/IMPS) | Cards, ACH/SEPA, bank transfer, PayPal, Wise | India: Razorpay (UPI, cards, payment links, international currencies). International: Razorpay International or Stripe where the agency's entity is eligible **(verify Stripe's availability for Indian businesses)**; also record manual payments (bank, Wise, PayPal). |
| Payment behaviour | Advances are common (often 30 to 50%); payment reminders by WhatsApp | Card-on-file, net-15 or net-30 terms | Milestone and advance invoices; reminders by email and WhatsApp; partial payments. |
| Pricing of Agency OS | Flat INR, GST-inclusive display for Indian buyers; annual discount; UPI autopay | USD price; card billing; tax by country | Two price books (INR and USD); show tax rules per region. |

## Communication and time

| Topic | India | International | Design decision |
| --- | --- | --- | --- |
| Main channel | WhatsApp for clients and teams; phone calls | Email, Slack, Teams; scheduled calls | Notifications by email + WhatsApp (via the WhatsApp Business API) + in-app; each client chooses a preferred channel (the deck's international mode). |
| Meetings | Google Meet, phone | Google Meet, Zoom, Teams | Google Calendar and Meet first; Zoom and Teams later. |
| Time zones | IST only for most clients | Many zones | Store UTC. Show both time zones on meetings and deadlines for foreign clients; an overlap-hours finder; the client's local time in the client header. |
| Working days and holidays | Indian holidays vary by state | Country holidays | A holiday calendar per workspace and per client country. |
| Dates | 25 Oct 2026 (day-month); avoid 10/25 | US: Oct 25, 2026; UK: 25 Oct 2026 | Use a written month in the UI (25 Oct 2026) to avoid day/month confusion everywhere. |

## Language and literacy

- UI language at launch: English (en-IN and en-US/en-GB spelling variants for templates). Plan i18n from day one (`next-intl`, no hard-coded strings) so Hindi and Telugu can follow for the client portal, where many Indian SMB owners would prefer them (hypothesis A9).
- **User content can be in any script:** client names, addresses and notes in Telugu, Hindi or Tamil must render. Add Noto Sans fallbacks for Devanagari, Telugu and Tamil.
- Plain words over jargon in the client portal: "Approve this design", not "Sign off milestone gate 3".
- DPDP may require privacy notices in Indian languages **(verify)**.

## Devices and networks

- India: Android-first. Mid-range phones, sometimes slow or patchy mobile data. Clients often approve and pay from a phone. Performance budgets apply: fast first load, small JavaScript, skeleton screens, images sized correctly, drafts that survive a lost connection.
- International clients: more desktop and iPhone use; expect a polished web portal.
- The client portal and team "My day" are designed mobile-first; owner analytics and builders are desktop-first and still usable on a phone.

## Sign-up and identity

- India: Google sign-in and phone OTP (the deck's plan); email magic link as a fallback.
- International: Google, Microsoft and email; SSO (SAML) on the enterprise plan later.
- Two-factor login for owners, and optionally for clients (international mode).

## Trust signals

| India | International |
| --- | --- |
| GSTIN shown on the profile and invoices; verified reviews; real past clients; WhatsApp contact; city | Verified reviews, case studies, process transparency, contracts with IP and NDA, security posture, response-time SLA |

Our "verified" badge (open question Q5) could combine a reviewed portal project with business proof (GST registration, company registration or ID check).

## Legal and contracts **(verify all with counsel)**

- India: electronic signatures are generally valid under the IT Act, 2000 for commercial contracts, but some document types are excluded and stamp duty may apply to some agreements. Keep a signed audit trail (IP, time, email or phone verification).
- International: ESIGN/UETA (US) and eIDAS (EU); DocuSeal states compliance with all three.
- Governing law chosen per client; IP transfers on full payment; mutual NDA before discovery; MSA + SOW for long engagements (all from the deck's premium list).

## Privacy and data

- DPDP Act 2023 (India) and GDPR (UK and EU): consent notices, data access and export, deletion, breach notification, and data processing agreements with sub-processors.
- Data location: start with a single region near India (for example Mumbai) and document sub-processors. EU data residency is an enterprise add-on later.
- Never ask for more personal data than needed; client logins and credentials only in the reveal-once vault.

## Accessibility

WCAG 2.1 AA everywhere, which also meets the European Accessibility Act direction (EN 301 549) for EU customers.
