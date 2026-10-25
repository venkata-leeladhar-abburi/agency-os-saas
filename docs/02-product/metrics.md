# Metrics and analytics plan

We measure from day one, so every design change can be judged (rulebook section 13). Targets are first guesses to revisit after beta; none are claims about results.

## North star

**Paid invoices per active workspace per month.** Money flowing through Agency OS means the agency runs its business on it.

## Funnel

| Stage | Definition | First target (revisit after beta) |
| --- | --- | --- |
| Sign-up | Account created | — |
| Setup | Workspace with name and logo | 70% of sign-ups |
| **Activation** | First proposal **or** first invoice sent within 7 days | 40% of sign-ups |
| Client engaged | A client opens the portal | 60% of activated workspaces |
| Habit | Workspace active in 3 of the last 4 weeks | 50% of activated workspaces at month 2 |
| Paid | On a paid plan | Set after the pricing research (A5) |
| Retained | Paid workspace still active at month 3 | 80% |

## UX health metrics

Task success and time on task (from usability tests), time to value (sign-up → first proposal sent), feature adoption per release, error rate (client-side errors and failed actions), support tickets by feature area, NPS (quarterly), CSAT after support, SUS in test rounds.

## Event tracking (PostHog)

Name events `object_action`; snake_case properties; never send personal data (no names, emails, phones or amounts in properties, only IDs and bands).

| Event | Key properties |
| --- | --- |
| `workspace_created` | country, base_currency, plan, sign_up_method |
| `onboarding_step_completed` | step |
| `sample_data_loaded` / `sample_data_removed` | — |
| `lead_created` | source, via (form, manual, import) |
| `lead_stage_changed` | from, to |
| `lead_converted` | days_since_created |
| `quote_sent`, `proposal_sent`, `proposal_viewed`, `proposal_signed` | template_id, currency |
| `client_invited`, `portal_first_opened` | channel (email, whatsapp_link) |
| `project_created` | from_template (bool), template_id |
| `gate_approval_requested`, `gate_approved`, `gate_changes_requested` | hours_to_decision |
| `task_created`, `task_completed` | view |
| `invoice_created`, `invoice_sent` | type (gst, no_gst, export_lut, proforma), currency |
| `payment_received` | method, partial (bool) |
| `command_palette_used` | action_type |
| `daily_update_posted` | — |
| `feedback_submitted` | screen |

## Dashboards

1. Activation funnel by week and by country (India vs international).
2. Core loop: lead → proposal → signed → project → invoice → paid, with times between steps.
3. Client portal: opens, approvals, payments through the portal.
4. Feature adoption per release.
5. Quality: errors, slow screens, support tickets.
