# Inside Access — data dictionary

Snapshot: 24 October 2026, Europe/Amsterdam. Schema version 1.

JSON preserves typed values. Empty CSV cells represent JSON nulls unless the field intentionally holds an empty note. CSV arrays use a space-pipe-space separator; JSON preserves arrays. Text beginning with spreadsheet-formula triggers is escaped with an apostrophe.

| Fields | Meaning |
| --- | --- |
| opportunity_id | Stable key. City prefix is a discovery grouping, not a precise set-address guarantee. |
| title, city, category, record_type | Specific experience and classification. Generic platforms are sources, not events. |
| event_start_date, event_end_date | ISO local dates. Unknown exact filming days remain null. |
| date_precision | Day, range, selected dates, recurring series or month only. Read before interpreting dates. |
| event_month | Published YYYY-MM window; not a shooting-day claim. |
| event_time_local, timezone | Published local time and IANA zone. Blank time does not mean midnight. |
| date_notes | Selected dates, recurrence, derived next date and calendar limitations. |
| venue, actual_location, geography_precision | Actual event/shoot locality. Agency office address is not a filming location. |
| description, why_special | Factual experience and specific public-access benefit. |
| access_method, access_instructions | Exact ticket, RSVP, audience draw, casting or walk-in route. |
| eligibility, minimum_age | Published age, skill, work and accompaniment conditions. Null age means unreported. |
| cost_direction, currency | Pay to attend, Free or Paid participation; EUR or GBP, without conversion. |
| price_amount, price_max, price_notes | Advertised standard price/range or explained from-price. Null means unknown, not free. Fees are included only where explicitly stated. |
| compensation_amount, compensation_notes | Published pay or allowance, separate from admission price. Null may mean an unpublished rate. |
| application_deadline | Published deadline only; no invented or copied event-date deadline. |
| deadline_status, deadline_notes | No deadline published or no application applicable, with an explanation. |
| availability_status | Source-advertised status or read-only booking-form observation. |
| inventory_status | No live checkout inventory or application outcome is certified in this snapshot. |
| organizer | Original organizer, venue or allocation provider. Film cast lists do not confirm attendance. |
| booking_url | Official form/event booking page, linked authorized seller or entry information when no booking is required. |
| source_url, additional_source_urls | Main evidence and corroborating date, price, eligibility or seller pages. |
| source_type, evidence_note | Provenance and a short paraphrase of the facts checked. |
| verification_status | Verified for selected rows. Unresolved candidates are held separately. |
| verification_confidence | High: primary event/access detail. Medium: core route/occurrence established with an explicit retrieval or precision limitation. Not a numeric probability. |
| last_verified, verification_limits | Date of research, and what was not established. Not the source’s publication date. |
| restrictions, risk_flag | Specific limitations and observed warnings. Absence of a warning is not a security certification. |
| parent_event_id | Relationship for distinct access products within one festival/production. |
| seed_id | Original CSV identifier when retained or replaced; null for a new lead. |
| next_check | Recommended follow-up date; no scheduled automation was created. |
| feed_eligible | Eligibility for the local draft feed, not permission to publish. |
| approval_status, published | Awaiting approval and false for every selected row. |

## Separate tables

**Pending review:** unresolved candidates, known or claimed dates, sources, missing confirmation and the action required for promotion. Excluded from the selected feed.

**Unsuitable:** expired, sold-out, outside-city or suspicious-provenance records. A legitimate opportunity can be unsuitable for this scope. A paywall alone is not proof of fraud.

**Watchlist:** discovery sources, city scope, proposed checks and promotion rules. General registration and interest lists remain sources until a specific opening is documented. Frequencies are recommendations.

**Seed audit:** one disposition for each of the supplied CSV’s 30 rows. Replacement differs from retention; valid reserve differs from unsuitable.

## Feed and expiry

Promote a specific verified opportunity with an established public access route and no unresolved material contradiction. Missing unpublished prices/deadlines remain null with explanations.

At refresh, use the actual local date and re-evaluate status. Exclude expired, cancelled, closed and sold-out records. A month-only call supplies a discovery window, not exact filming days. Recurring shows require offered-date checks.

The snapshot has stable IDs and separate event/source tables. It contains no applicant profiles, private contact details, credentials or submitted applications.
