# From research to decisions

How findings turn into product decisions, so research changes what we build.

## Steps after interviews

1. **Debrief within 24 hours:** the note-taking template from `interview-guides.md`, with quotes and timestamps.
2. **Code the notes:** tag each observation with a stage (1 to 10), a persona, a region (India or international) and a type (pain, workaround, goal, quote, surprise).
3. **Affinity map:** cluster the tags into themes, in FigJam or a whiteboard.
4. **Write insights:** use the template below. Rate evidence strength by how many participants and segments support each one.
5. **Score assumptions:** update `assumptions.md` (supports, contradicts or unclear).
6. **Update the artefacts:** replace proto-personas with real personas, update journey maps, and rank stages by pain and willingness to pay.
7. **Decision meeting (gate G0):** each insight gets a decision (build now, later, never, or research more), and the PRD and build plan are updated.

## Insight template

```
Insight: <one sentence: what's true about users>
Evidence: <n participants, segments, quotes with IDs, survey numbers>
Strength: strong / medium / weak
So what: <the product decision this drives>
Affects: <stage, persona, PRD epic or design component>
```

## Repository

- One folder per study (plan, recordings link, notes, synthesis, readout).
- Anonymised insights in a searchable table (Notion or this repo's `docs/01-research/insights/`).
- Keep raw recordings 90 days, then delete them; insights stay.

## After launch: continuous research

- Product analytics events (see `../02-product/metrics.md`) and session replays (with consent and masking).
- An in-app feedback button on every screen ("Something wrong or missing?").
- Monthly: 3 to 5 customer calls, NPS and CSAT pulses, and a review of support tickets by feature area.
- Quarterly: a research readout that feeds the roadmap.
