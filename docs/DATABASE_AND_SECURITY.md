# Database and security — v0.6

## Model

| Table | Purpose |
| --- | --- |
| `public.opportunities` | 48 stable imported identities; later discovered candidates in the same review model |
| `public.sources` | All 22 discovery sources, original metadata, legal review and monitoring controls |
| `public.verification_checks` | Initial source-check dates, unknown exact check times, and later verification edits |
| `public.audit_history` | App-level append-only change history with actor, note, before/after and time |
| `public.discovery_runs` | Monitoring results and errors |
| `public.source_snapshots` | Latest observed hash/payload per source record |
| `private.admins` | Explicit Supabase Auth UUID allowlist; no app-managed self-promotion |
| `private.import_batches` | Import fingerprint, original metadata and all 30 seed dispositions |
| `private.app_migrations` | CLI migration ledger |

Supabase owns `auth.users`. The local-only bootstrap creates compatible development roles/Auth identity tables plus salted scrypt password hashes and hashed opaque sessions in a non-public `local_auth` schema. Never apply `server/local-bootstrap.sql` to Supabase.

Selected, pending and unsuitable records preserve their external IDs (`IA-*`, `P-*`, `U-*`). Discovery IDs derive from source ID plus the source's stable record ID. Content-based unique fingerprints and source/external-ID uniqueness prevent exact duplicates. Related festival products retain the original `parent_event_id` even when the umbrella is not itself an opportunity. No fake parent row is created.

Verification evidence stores its original date separately from the actual ingestion timestamp. Unknown exact verification times remain null.

## Independent state dimensions

- `origin_group`: immutable import provenance (`selected`, `pending`, `unsuitable`, `discovered`). This is not a current approval decision.
- `verification_status`: `verified`, `pending`, `unverified`. Original source labels survive in `raw_record`.
- `lifecycle_status`: `active`, `expired`, `sold_out`, `rejected`, `closed`, `cancelled`.
- `approval_status`: `pending`, `approved`, `rejected`.
- `published`: false until an authorized, separate publication action.

All 30 selected and 6 pending imports have pending approval. The 12 unsuitable imports have rejected approval/lifecycle. All 48 are unpublished. `feed_eligible=true` on selected imports means potentially suitable for editorial review, not publication permission.

## Publication boundary

Base-table SELECT is granted only to `authenticated`, with RLS permitting administrator membership only. Anonymous users have no base-table grants. Nonadmin Auth users see no private rows. Browser roles have no direct writes.

`list_public_opportunities` is the only anonymous data route. It uses an explicit safe projection and checks publication, editorial approval, source verification, feed eligibility, lifecycle, event date/deadline and a 30-day verification freshness window. It omits raw imports, review notes, fingerprints and administrative identities. SQL tests cover independent date expiry even when the stored publication flag remains true.

Unknown dates cannot pass publication readiness. Month-only windows use their final calendar day for expiry, never an invented filming day. Date comparisons use each event's IANA timezone. Missing prices/pay/deadlines remain null. An unpublished price does not become zero; free access requires an explicit source assertion.

`review_opportunity`, `save_opportunity`, `save_source` and `admin_overview` check membership inside PostgreSQL. Security-definer functions use an empty search path and schema-qualified object names. Review calls require an expected revision; only rejection and verification-warning overrides require a reason; mismatched revisions prevent lost updates. Material edits revoke previous approval/publication. Triggered audit records cannot be modified through app roles. Database owners remain privileged; this is not a cryptographically immutable audit ledger.

## Validation and imports

The importer validates IDs, typed date fields, safe HTTPS links, numeric fields and source counts before transactional import. PostgreSQL additionally checks valid states, date ranges/precision, non-negative prices/pay, price bounds, currency when amounts exist, source URLs, URL arrays and publication consistency. Empty unpublished source values remain null or retain their original empty-note text in `raw_record`.

Imports use stable IDs with conflict-safe inserts. Re-importing does not overwrite admin corrections, review decisions or history. Unexpected different-ID fingerprint collisions roll back the batch. To update research evidence, use an explicit review/edit workflow rather than overwriting current records through a seed re-import.

## Discovery boundary

Only the service role can execute ingestion. The ingestion function never approves/publishes. Source changes invalidate previous verification and unpublish linked candidates. Snapshots, candidate raw data and audit diffs retain provenance. Duplicate source observations are no-ops except last-seen time. Similar but nonidentical products still need human duplicate review; fuzzy matching is not claimed.

The connector reads a fixed documented municipal API, at most 40 recent records plus 20 rotating tracked IDs per check, with at most one retry per request, with timeouts and a 2 MB response cap. It does not fetch arbitrary source URLs or use browser automation. It strips HTML and excludes contact email/phone fields. ODbL attribution/license travel with each candidate. API contribution is not primary-organizer verification.

## Local authentication

Local passwords use salted scrypt hashes. Session cookies are HttpOnly, SameSite Strict, eight-hour expiry, and Secure over HTTPS. Only hashed opaque session tokens are stored. Failed login attempts are bounded; cross-origin browser writes are rejected. Local development is single-process and is not a publicly hardened hosting stack.

The hosted frontend uses Supabase password login, token refresh and API authorization. Secrets/database URLs are server-only; only the public URL and publishable key enter the frontend build. Keep source imports and snapshots outside the Pages `dist/` directory.


## v0.6 additions

Migrations 004 and 005 are append-only upgrades. The original migration files are unchanged. An exclusive local database lock prevents simultaneous app/CLI processes. Before upgrading an existing disk-backed database, the migrator writes a private compressed backup; the upgrade tests restore it and verify retained accounts, sessions, edited fields, history and publication decisions.

Audit history now includes the administrator email/UUID, verification state, evidence URLs, a machine-generated field diff and operation context. A normal approval/save does not require text. Warning overrides require explicit acknowledgement and a reason; hard eligibility/verification/date/conflict blockers cannot be bypassed. Overriding warning confidence does not change the source verification status. All state checks are repeated in PostgreSQL.

Discovery adds first-discovery/source-update timestamps, explicit unknown publication time, quality flags, linked snapshots, five-minute source leases, due times, error backoff and a private `discovery_changes` table. Material changes revoke verification/approval/publication while retaining editorial copy. Administrators apply proposed fields as unverified drafts or dismiss changes with an explicit reason through the authorized RPC. The worker never approves or publishes. Missing source IDs are flagged after repeated successful ID rechecks and are not called cancelled without evidence.

The isolated visual fixture entry is disabled by default and is not included in the production build. Its same-origin framing exception is restricted to that synthetic test document when the explicit visual-QA environment flag is enabled; normal application pages retain framing protection.

## v0.6.1 audit upgrade

Apply additive migration 006 after the original five migrations. New discovery-change audit rows use change_id as entity_id and include the associated opportunity/source/run IDs, source URL and current verification status. Earlier rows remain unchanged and retain the previous listing-based entity ID. Existing RLS, administrator-only RPCs, optimistic revisions and reason checks are retained. Status filters use bound SQL values locally and Supabase equality filters in hosted mode.

## v0.6.2 operational status

Additive migration 007 exposes admin_discovery_status only to authenticated administrators; anonymous callers, nonadmins and worker roles cannot read this operational snapshot. Source activation uses the existing authenticated save_source RPC and its source-review validation/audit trigger. The manual route still requires a real session/admin membership. Existing ingestion/publication permissions are unchanged.

## v0.6.3 image controls

Migration 008 adds admin-only image/check tables, a service-only bounded metadata cache/ingestion API, stable IDs and independent rights/verification/display approval. No direct authenticated writes are granted. Authenticated admin RPCs enforce optimistic revisions, required rejection reasons, rights evidence, attribution, event match, dimensions and direct-embedding permission. Automatic ingestion cannot approve images. Anonymous access is limited to the approved-image projection of an independently approved/published/current opportunity. Old public projection permissions are revoked; all prior opportunity gates are preserved. Changed image content or event context invalidates image clearance. All image actions append identity/evidence/diffs to audit history. Local/Vite paths deny private image enrichment metadata; production hosting must expose only dist. See IMAGE_ENRICHMENT.md.
