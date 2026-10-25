# Agency OS: UI/UX rulebook

The rules every Agency OS screen must follow. Built from the founder's notes and a full read of the reference articles (listed at the end). Where articles agreed, the rule appears once.

How the rest of the pack applies them: the design system (`design-system.md`) turns sections 3, 4 and 8 into tokens and components; the PRD (`../02-product/prd-mvp.md`) makes sections 2, 7 and 9 part of every acceptance criterion; the usability plan (`../01-research/usability-testing.md`) and metrics (`../02-product/metrics.md`) cover section 13.

**Goal:** less mental effort, value in the first session, low churn.
**Test every screen with three questions:** Where am I? What matters most here? What do I do next?

## 1. Users and roles

- Research before designing: interviews, analytics, support data, competitor review. Decide from observed behaviour, not assumptions.
- One core purpose for a specific audience: freelancers and agencies.
- Organise around jobs to be done (win a lead, send a proposal, run a project, get paid, hand over), and around real objects (leads, clients, projects, invoices, documents), not the database.
- Design the multi-user case first; the solo freelancer is a simpler subset.
- Role-based views and default dashboards from the first sprint: owner, PM, designer, developer, finance, client, billing owner, viewer. Hide what a role doesn't need.
- Serve the whole lifecycle: guide beginners, give experts shortcuts, re-engage returning users.

## 2. Onboarding and time to value

- First real outcome within about 5 minutes (for example, the first lead captured or the first proposal drafted).
- Short sign-up: few fields, Google sign-in, skippable steps; ask for more information only when it's needed.
- Action checklist and progress bar, sample data, contextual tips that appear when the user reaches that task. No long product tour.
- **Empty states are onboarding:** say what belongs here, why it matters, and give one clear action or a template.
- Keep guiding after setup with checklists and short tours of advanced features.

## 3. Simplicity and hierarchy

- Every screen has one clear purpose. Cut clutter: redundant labels, competing colours, unexplained icons, rarely used menu items.
- Clarity comes from ranking information, not from removing content. Dense screens are fine if every element supports daily work.
- Size, contrast and placement make the primary action obvious (Save, Create, Send); secondary data recedes. Big headings for the key number or message.
- Progressive disclosure: core first, then advanced settings, bulk actions and configuration on request. Sensible defaults.
- Key tasks within a few clicks. Repeat use beats first-impression delight: cut every extra step for daily users.
- Few colours: one or two brand hues plus status colours. One type family, generous whitespace.

## 4. Consistency and design system

- A lightweight system first: colour tokens, type scale, spacing, radius, buttons, inputs, tables, cards, loaders, interaction states, accessibility rules. Grow it as the product grows.
- The same action looks and behaves the same everywhere. Don't move established navigation without a clear benefit.
- One design language across the website, product and mobile; the same flow logic on every device.
- **One premium icon family** (outline, same stroke), used to support headings and actions, always with a text label.
- Modular, reusable components, so new features fit the existing structure.

## 5. Navigation

- Predictable, collapsible sidebar grouped the way users think; labels they already know.
- Always show the current state: where the user is, which workspace or client they're acting in, whether changes saved, and what happens next.
- Command palette (Ctrl/Cmd+K) to search records and run actions; keyboard shortcuts for frequent actions.
- Validate labels and structure with tree testing.

## 6. Dashboards and data

- Show the few metrics that drive decisions, with actionable insights rather than raw data. Clear metric hierarchy, F-pattern layout.
- Drill down from summary to detail without losing context. Filters persist.
- Put actions next to the data they affect.
- Tables show about 5 columns by default; users can add or hide columns, sort, filter, search and save views. Prefer load more or infinite scroll to bare next/previous.
- Readable charts, real labels, consistent number formats (₹, L, K, dates).
- Batch actions, smart defaults, autocomplete, inline editing, saved filters.

## 7. Feedback, errors and states

- Every action gets a response: loading, success, validation, warning, undo. Use subtle micro-interactions.
- Long tasks (AI generation, exports, imports) show status messages saying what is happening, not a bare spinner.
- Design loading, empty, error, warning, partial, no-permission and offline states alongside the happy path.
- Error messages say what went wrong and what to do next. Inline validation. Never show stack traces; use one error format.
- Confirm only destructive or high-impact actions, and scale the confirmation to the consequence; reversible actions get undo instead.
- Notification settings per category, not all or nothing.

## 8. Accessibility

- WCAG 2.1 AA minimum (2.2 as reference): contrast, readable sizes, plain language, semantic HTML.
- Full keyboard use, visible focus, labels on every control, screen reader tested.
- Never rely on colour alone: status colours always carry a text label.
- Alt text, captions, error prevention and easy recovery.
- Let users adjust: text size and a dark mode as standard.

## 9. Mobile and performance

- Mobile-first, responsive; mobile focuses on on-the-go tasks (approve, reply, check status, log time), not a shrunk desktop.
- Aim for mobile and desktop parity on core tasks at launch.
- Speed is UX: set image sizes to avoid layout shift, lazy-load below the fold, keep client-side JavaScript small.

## 10. Trust and security

- Social proof where it helps conversion: testimonials, reviews and case studies, real ones only.
- Show security in the daily UI: permissions, export controls, audit logs, encryption status.
- In-app help: help centre, tutorials and chat support close at hand.

## 11. AI features

- Show what the AI is doing, what it used, and why it suggests something; say when results may be uncertain.
- Users review high-impact AI changes before they apply; they can edit, retry and stop.
- AI augments existing workflows; manual controls stay available.
- Put automation in primary views, not buried in admin settings.

## 12. Pricing and growth

- The pricing page is a conversion surface: plan comparison, usage estimate, self-serve checkout.
- Personalise guidance by role, goals and behaviour.

## 13. Process, testing and measurement

- Process: research, then information architecture, prototype and iterate, visual design, then test with real users (matches our seven phases).
- Test with interactive prototypes, not static screens. About 5 users for qualitative issues; 20 to 50 for numbers.
- Test the critical paths (sign-up, the core value task, payments, forms, error recovery) and edge cases (missing data, failed uploads, slow loads, limited permissions).
- Start with an MVP and add features from feedback. Release behind feature flags; baseline metrics before changes; use A/B tests or cohorts.
- **Track:** activation rate, time to value, onboarding completion, time to first key action, task success, time on task, error rate, navigation directness, feature adoption, retention and churn, conversion, NPS, CSAT, support tickets by area, heatmaps and click tracking, usability test findings.

## Copy rules

- Describe every feature as an Agency OS feature. Never say a feature comes from, copies or replaces another product.
- No made-up metrics, testimonials or claims.
- Short, plain sentences; label things with words users already use.

## Sources read

- f1studioz: SaaS UI/UX guide — https://f1studioz.com/blog/saas-ui-ux-guide/
- Lollypop: SaaS design principles — https://lollypop.design/blog/2025/october/saas-design-principles/
- Brights: SaaS UI/UX best practices — https://brights.io/blog/saas-ui-ux-best-practices
- Nasscom / Divami: Demystifying SaaS design — https://community.nasscom.in/communities/engineering-research-design/demystifying-saas-design-tips-uiux-experts
- DRC Systems: UX design for SaaS platforms — https://www.drcsystems.com/blogs/ux-design-for-saas-platforms-best-practices-to-follow/
- Shubh Digi: UI/UX principles for SaaS — https://www.shubhdigi.in/blog/ui-ux-design-principles-saas
- UXArmy: SaaS UX design guide — https://uxarmy.com/blog/saas-ux-design-guide/
- SaaS UI: SaaS UX design — https://www.saasui.design/blog/saas-ux-design
- The Skins Factory: SaaS UI/UX best practices 2026 — https://www.theskinsfactory.com/uiux-design-blog/saas-ui-ux-design-best-practices-2026
- Fuselab Creative: Designing for SaaS success — https://fuselabcreative.com/designing-for-saas-success-guide/
- Not read (the site blocks automated readers): https://medium.com/@hasiburahman123/guidelines-for-creating-an-effective-saas-user-experience-9a4cee781df1
