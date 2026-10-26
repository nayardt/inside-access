# Inside Access — v0.4 ingestion & QA handoff

**Built:** 24 October 2026. **Data snapshot:** 24 October 2026. **Release:** private, offline review demo — not published.

## Import checks

- Selected: **30** opportunity records; **30** unique IDs.
- Amsterdam **9** · London **12** · Paris **9**.
- Confidence: High **23**, Medium **7**.
- Free routes **7**, public-paid entry **20**, paid participation **3**.
- Separate: **6** pending, **12** unsuitable, **22** discovery sources. None automatically promoted to the selected feed.
- Every selected record has an HTTPS source URL and booking/application URL, an organizer, explicit eligibility and verified/access labels.
- No event end date preceded the snapshot day; there were no duplicate opportunity IDs.
- All selected records show `approval_status=Awaiting approval`, `published=false`, and `inventory_status=Live seat inventory not verified`.

## Product decisions in v0.4

- Import **only the 30 selected** to the discovery feed. Preserve the 6 pending outside user-facing discovery.
- Preserve original availability language instead of converting `on sale advertised` into `available now`.
- Display **month-only** casting calls as a month, not an invented filming date.
- Represent fees distinctly: zero/free, stated ticket price, paid participation allowance and unknown amount.
- Keep specific screenings with guests distinct from regular screenings of the same film.
- When opened after an event ends, hide that listing by default but allow users to include ended records.
- Saved events and alert preferences run locally in the browser. **No email/push sending, live discovery, user registration or publication** is active.

## Recheck first (medium-confidence)

- **IA-AMS-005 — Amsterdam Light Festival — Edition 15**: Festival and access routes confirmed. The ticket page did not expose product inventory or prices, so no currently bookable boat is claimed.
- **IA-AMS-007 — Eva — live studio audience**: Published event and access conditions checked. No ticket purchase, reservation or application submitted.
- **IA-AMS-009 — IDFA DocLab: Shared Realities — interactive exhibition**: Older general ticket-sales guidance says pay what you want. The specific current exhibition page says free; this record follows the event-specific page.
- **IA-LON-009 — Have I Got News for You — studio audience**: Published event and access conditions checked. No ticket purchase, reservation or application submitted.
- **IA-LON-010 — Fashion students and dressmakers — feature-film background casting**: Published event and access conditions checked. No ticket purchase, reservation or application submitted.
- **IA-LON-011 — Hunger Games: Sunrise on the Reaping — red-carpet fan pens**: Provider’s application and conditions verified. Individual guests and event-studio attribution were not independently confirmed; an unexplained Netflix label on the page is not used as organizer evidence.
- **IA-PAR-005 — Nona Source — La Grande Braderie**: Eventbrite returned a rate-limit error. Event and official registration link verified, but slot availability and final form conditions could not be read.

## External spot checks (24 October 2026)

- **IDFA, `IA-AMS-003`**: primary festival page specifically lists the **15 November 2026** public *14th* screening with **Ava DuVernay talk at Carré**. Other screenings are separate sessions. Official source: https://festival.idfa.nl/en/film/ec589c48-fff7-44e9-a4a0-60b70b593149/14th/ . Inventory text was not obtainable; no checkout confirmation.
- **Blue Circle Casting, `IA-AMS-006`**: the direct apply URL redirects to the casting provider's optional login flow; it does not establish that this call will remain open without rechecking the underlying role details. Source: https://bluecirclecasting.nl/rollen/haantjes/aanmelden .
- **ApplauseStore, `IA-LON-011`**: automated review could not retrieve the original booking URL on this attempt. Keep `Medium` and recheck prior to a public release.

## Next engineering step

1. Create PostgreSQL/Supabase tables for `sources`, `opportunities`, `verification_checks`, `candidate_queue`, `users`, `saved_opportunities`, `alert_rules`, and `notification_events`. Maintain source snapshots and review provenance.
2. Build importer from the supplied typed JSON and validate with a JSON schema. Link related records with `parent_event_id`, and retain original `opportunity_id` as stable external ID.
3. Add a review admin interface and explicit `approved_at`, `approved_by`, `published_at` fields. Do not auto-publish from AI or scraping.
4. Connect permitted feeds and monitor changes with retry/backoff, legal/robots compliance, diff logs and source attribution.
5. Send alerts only when user opt-in exists and the event is verified, approved, fresh and not expired. Never promise a reservation.

**No background monitors, notifications, third-party integrations or publishing actions were initiated.**
