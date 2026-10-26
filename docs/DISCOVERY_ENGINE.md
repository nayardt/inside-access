# v0.6 automated discovery engine

## Implemented source and permission boundary

One reliable, documented source from the 22-source watchlist is implemented: **W-001 — Ville de Paris / Que Faire à Paris**, using its public Explore API 2.1 under ODbL. The source's original watchlist record/URL is preserved. The live connector uses `opendata.paris.fr` and retains source attribution and the license URL. The API schema and a live read/ID recheck were tested.

The API is a participatory calendar. A listing is evidence that its contributor published event information, not proof of original-organizer access or a reservation. All candidates enter as pending/unpublished. Public ODbL-derived reuse requires an appropriate attribution/license policy before launch.

## Bounded checks

Each check reads at most 40 recently updated Paris records, plus up to 20 known source IDs selected by oldest last-check time. All requests go to a fixed documented API host, with selected fields, timeouts, a 2 MB response cap and at most one retry per request. There is no browser automation, paywall access, arbitrary URL fetching or paid AI work.

The feed supplies `updated_at`, but no trustworthy publication/creation timestamp. The system records **first discovery** separately and leaves source publication time null. The 40-record window can miss events in a busy period; the system records this coverage limit rather than claiming a complete backfill or incremental cursor.

## Normalization and detection

- Deterministic relevance rules prioritize previews, filmmaker conversations, casting, fashion, pop-ups and unusual cultural access. Ordinary events are not inflated into active opportunities. These rules may miss a worthwhile event; they are not AI verification.
- Stable source IDs, linked snapshots and normalized content hashes prevent exact re-ingestion duplicates. Near matches still need human review; distinct dates/access products remain distinct.
- Hashes exclude observation timestamps and irrelevant HTML formatting. Meaningful date, access, eligibility, price, title, description and lifecycle changes create a **private proposed change**, not an automatic editorial overwrite.
- Explicit cancellation prefixes and explicit closed/sold-out access text are detected conservatively. Date/deadline maintenance identifies expired or closed records. A source ID missing in two successful rechecks triggers withholding and a missing-source flag; disappearance alone is not called cancellation.
- Unknown prices, deadlines and source publication times stay unknown. Eligibility and organizer text are copied only when supplied. Contact email/phone fields and HTML are excluded from the normalized record.
- Missing facts and contradictory date/time fields are flagged. A primary-source verification action must record the evidence/date before a pending record can become verified. Conflicts block approval until that review is recorded.

## Operator work

The administrator enables a permitted connector once after a terms acknowledgement. Daily local checks then run while the app is open, with an immediate manual check available. No repeated typed review note is required. New items appear under the discovered queue; changes appear in Source changes and can be applied as unverified drafts without retyping.

Unchanged records require no review. Important decisions remain explicit: verify access, resolve conflicting evidence, approve, publish, reject, or explain a warning override. Applying a change does not verify, approve or publish it. Editorial copy is retained until a proposed change is applied. Material source changes revoke old verification/approval and publication immediately.

## Reliability and access

Source claims use five-minute leases to prevent overlapping runs. Due times respect the source interval (daily by default). Failures are recorded with bounded retry backoff. Source runs and audit history retain actor/system context, evidence and diffs. App roles cannot call service ingestion/maintenance; only authorized administrators can resolve changes.

Local discovery shares the application's database connection. Separate CLI checks require the app to be stopped; an exclusive lock prevents accidental concurrent opening. The GitHub workflow remains disabled until its explicit repository variable/secrets and permitted source are configured. Neither scheduler automatically approves or publishes.

## Remaining limits

Only Paris is connected; London and Amsterdam sources remain watchlist items. Cancellation detection is based on explicit text in the documented data, not a complete organizer status API. No complete catalogue coverage, near-duplicate semantic matching, primary-organizer verification or live seat inventory is claimed. Hosting, Supabase Auth/PostgREST and GitHub-runner execution remain untested without those accounts. More connectors should be permission-reviewed individually.

## v0.6.1 exception review

The Source changes queue defaults to pending items. Open listing takes you directly to the existing editor, including for missing-source checks. Apply retains the unverified-draft requirement. Dismiss requires a reason of at least 10 characters and changes only the proposal; it does not clear quality flags, verify evidence, approve or publish the listing. Use the status filter to revisit applied/dismissed decisions or export that view. Actor, timestamp, source evidence, opportunity/change/run IDs and field diffs are recorded automatically for new decisions. Existing audit rows remain intact.

## v0.6.2 activation and operational status

The admin overview now contains a one-time reviewed activation action and Run discovery. Database-only `admin_discovery_status` is administrator-gated and exposes timestamps, enabled/ready/error counts, pending candidates and latest source-run details. Individual source runs retain coverage, connector key and retrieval timestamp. Unsupported enabled connectors are reported as unavailable, with skip counts. Manual errors remain visible across status refresh. The source table uses last_checked_at for actual retrieval time, not last_verified.

`npm run discover:validate` executes the real login/save-source/manual-run/status/queue/public-feed HTTP routes against a fresh disk-backed proof database and official public source. It records both fresh live reads and a separately labelled exact replay of captured live observations. Its report/log do not include synthetic fixture findings or real credentials. See `CONNECTOR_STATUS.md`, `QA_REPORT.md`, `MACOS_UPGRADE.md` and `SCHEDULING.md`.
