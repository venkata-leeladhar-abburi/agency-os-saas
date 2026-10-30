# Open questions for the founder

Claude adds questions here and asks them in one batch. The founder answers inline (write the answer under the question). Each question has a default that Claude uses if there is no answer by the time the work needs it; defaults are reversible unless marked **blocking**.

| # | Question | Needed by | Default if no answer |
| --- | --- | --- | --- |
| 0 | **Design system page:** the Agency OS Design System lives at https://claude.ai/artifact/CxZxGVUSE1JmKQB5bPEnvQ (private to the founder). Share it with anyone who should review it, from the page's Share menu. | G1 | `design/showcase.html` and `design/screens/` are the offline copy |
| 1 | **Research:** will you run the interviews and survey in `../01-research/research-plan.md` before G0, or waive G0 and build on the documented hypotheses? | G0 | Build M0 to M3 (they don't depend on research); wait at G1 for your call |
| 2 | **Name and domain:** is "Agency OS" the final product name? Which domain will the product use? | M16 | Vercel URLs until decided |
| 3 | **Fonts:** Geist and Geist Mono (free) are chosen. Do you want a paid display face for marketing headlines? If yes, send the font files and the web licence. | G1 | Geist everywhere |
| 4 | **Logo:** the One Stop glyph plus the "Agency OS" wordmark is used for now. Do you want a dedicated Agency OS logo? | G2 | Keep the current lockup |
| 6 | **Q4 to Q6 from the deck:** how hirers reach agencies, what earns the verified badge, mobile app or mobile web first | R3 planning | Mobile web first (the portal is phone-first); R3 questions wait for research |
| 7 | **Accounts:** please create GitHub (repo), Vercel, Supabase (two projects, Mumbai), Inngest, Resend, PostHog, Sentry and Upstash, and add the keys as described in `../04-engineering/environments-and-deploy.md` | M0 (GitHub, Vercel), M5 (Supabase), later others | Claude builds with local or mock services where possible and lists what is waiting |
| 8 | **Razorpay:** create a Razorpay account (test keys now, KYC and live keys before G3) for Agency OS subscriptions | M6 test, G3 live | Test mode only |
| 9 | **International billing:** should overseas agencies pay their Agency OS subscription in USD (Razorpay international or another provider)? | After G4 | INR only at launch |
| 10 | **Chartered accountant (blocking for G3):** who will review the GST invoice template, the export-under-LUT wording and the exchange-rate source? | M13 | None: G3 cannot pass without it |
| 11 | **Lawyer (blocking for G3):** terms, privacy policy, DPA, and whether click-to-sign proposals are enough for Indian and international clients | M16 | None: G3 cannot pass without it |
| 12 | **SMS for phone sign-in:** which SMS provider, and will you complete DLT registration? | M5 (optional) | Phone OTP stays off; Google and email work |
| 13 | **Pull requests:** do you want to review every PR, or may Claude merge its own PRs when CI is green (gate milestones always wait for you)? | M0 | Claude opens PRs and merges non-gate PRs when CI is green |
| 14 | **Support and sender email:** which address do clients and users reply to, and which domain sends emails? | M6 | Replies go to the agency member who sent the message; sender set when the domain is ready |
| 15 | **Beta agencies:** which 5 to 10 agencies (India and abroad) will join the beta after One Stop? | G3 | Claude prepares an invite page and onboarding email; you pick the agencies |
| 16 | **Analytics region:** PostHog US or EU cloud? | M6 | EU cloud |
| 17 | **Pay link secret:** add `LINK_SIGNING_SECRET` (32+ random characters, `openssl rand -hex 32`) to the dev and later production environments. Changing it later breaks pay links already sent. | M13 | Issuing invoices on the database stops with a clear error until it's set; example mode doesn't need it |
| 18 | **Sign-in email template:** in Supabase, Authentication, Email templates, change the magic link to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` (the app's redirect already ends in `/auth/callback?next=…`), so a link opened on another phone or laptop still signs in | M5 | The default link works only in the browser that asked for it |
| 20 | **Signing code email:** the wording isn't in the content docs. Proposed (D-054): subject “482915 is your code to sign with One Stop Solutions”; body “Use this code to sign “Proposal for …”: 482915. It works for 10 minutes. If you didn’t ask to sign, you can ignore this email.” Keep, or change? | M10 | The proposed wording |
| 21 | **Email wording:** the defaults give the subjects but not the bodies. Proposed (D-059): one or two plain sentences saying what happened and a button, for example "Ravi Kumar asked you to approve “Homepage design” for Website." with **Review and approve**. The portal invitation isn't in the defaults: subject "One Stop Solutions invited you to see your projects", body "… invited you to see your projects with them. Approve work, pay invoices and message the team in one place. Sign in with this email address. No password needed." Keep, or change? | G3 | The proposed wording |
| 22 | **Question on a proposal:** the PRD says the client can ask a question, but the notification defaults (`defaults-and-content.md` §7) have no row for it. Built with a proposed row (D-067): "Question about a proposal", to the sender and owners, in the app on, email on, subject "[Client] asked about your proposal"; the email quotes the question, and replying to it reaches the client. Add the row as proposed, or change it? | G3 | The proposed row |

## Answered

Move answered questions here with the date and the answer, and add a decision to `decisions.md` when the answer changes the plan.

- **19 Test sign-in** (30 Oct 2026): yes. Claude created `claude-test@example.com` in the Supabase dev project (confirmed, no password; sign-in links are generated with the service key when a check needs one). Recorded as D-061.
- **13 Pull requests** (25 Oct 2026): Claude merges its own PRs when CI is green; gate milestones wait for the founder. Recorded as D-021.
- **5 Pricing and Free plan** (26 Oct 2026): the proposed limits stand (Free: 1 member, 1 client with a portal, 25 open leads, 3 quotes, proposals and invoices a month; Starter ₹1,499, Growth ₹3,499; Solo hidden until research). Recorded as D-040.
- **17 Message notifications** (26 Oct 2026): both sides get them in the app and by email. Team: in-app and email. Client: in the portal and by email. Recorded as D-040.
- **18** was a reminder about question 5; answered with it.

