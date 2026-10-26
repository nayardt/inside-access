# Complexity audit and architecture decision — 26 October 2026

## Evidence and scope

Inspected the actual React/TypeScript UI/API adapters, Express local auth/API, eight PostgreSQL migrations/RLS/RPCs, PGlite persistence, discovery connector/runner, image worker, updater/restore scripts, workflows and documentation before editing. Backed up the v0.6.3 code and complete workspace database, then restored every stored table and compared every JSON row in sorted order. Development proceeded in a separate checkout and restored database copy. The owner's Mac database was not accessed or overwritten.

## Findings and changes

| Complexity/risk | Incremental resolution |
| --- | --- |
| Seven peer admin sections and a statistics-first home screen | Three primary areas; Inbox opens with decision queues, Listings is the single database, System holds operational tools |
| Review required navigating through editing fields | Listing opens directly in Publication review; Core/Dates/Access/Evidence/Images remain available |
| Research IDs and specialized filters exposed routinely | Advanced research fields and More filters collapse without deleting their values |
| Source monitoring duplicated on several pages | The shared DiscoveryOperations component is retained, shown under System/source tools rather than above the Inbox |
| Command-line-only full backups and unreported health | Authenticated browser creation/download/status plus daily local snapshots with restored-archive checks and visible failure; creator/time/hash metadata retained |
| Repeated manual starts | Double-click Mac launcher supplied; managed hosting remains the path to remove the Mac uptime dependency |
| Two SQL/auth transports (local and Supabase) | Retained for compatibility; deleting one now would break a running installation or the managed option. One PostgreSQL schema and review policy remain authoritative |
| Monolithic admin rendering and duplicated filtering adapters | New Inbox/System components isolate founder operations; existing editor and security RPCs are reused. Filtering parity remains tested; full transport removal is deferred until a managed migration is approved |
| Many historical documents and snapshots | One operator guide plus current QA/recovery/architecture docs; prior reports preserved under archive. Research snapshots remain private and unchanged |
| No source-of-truth code in connected repository | Repository nayardt/inside-access was confirmed private and initially contained only a short README. Populate it with tested source; never commit .env, credentials, working databases, downloaded images or personal backup files |

Routine record notes remain optional; automatic audit identity/time/evidence/diffs, required rejection/override reasons and separate Approve/Publish are preserved. No SQL migration is needed. No source connector, data field, image permission or publication gate is replaced.

## Managed architecture comparison

| Option | Maintenance and compatibility | Decision |
| --- | --- | --- |
| Current local PostgreSQL/PGlite + browser app | No hosting subscription; Mac must run, disk backups need a separate copy; compatible now | Keep until an approved managed cutover; simplify its daily operation now |
| Cloudflare Pages + Supabase PostgreSQL/Auth + private GitHub Actions | Reuses PostgreSQL policies/functions, frontend cloud adapter and functioning Node discovery; no server to patch. Free tiers have limits/pausing and no managed backup SLA | Recommended validation target; private staging/account configuration and data/Auth migration still required |
| Workers + D1 + separate auth | D1 uses SQLite, while this app depends on PostgreSQL RLS, security-definer PL/pgSQL, JSONB and Auth UUID/admin policies. Requires a permissions/auth rewrite and data migration | Reject for this sprint: cheaper hosting does not offset rewriting tested safeguards |
| Express/PGlite on a small VPS | Reuses local code but adds OS patching, TLS, disk monitoring and off-site recovery | Lower migration work but greater founder maintenance; not the preferred managed solution |

Cloudflare Workers could later provide a narrow authenticated run-discovery endpoint, but Node DNS/HTTP/image probing and existing connector execution are not a drop-in Workers migration. Keep scheduled discovery in Node/GitHub Actions. Hosted immediate runs are via GitHub's browser workflow, not a falsely enabled dashboard API. Hosted image checks also remain scheduled. This release does not claim complete managed staging execution.

## Source of truth and deployment

Use the one private GitHub repository for code, PR history and CI. CI runs bounded test/build checks on code updates using the included GitHub runner allowance; deployment remains separately opt-in. The supplied deployment workflow runs tests, reconciliation and build before sending only dist to Cloudflare Pages. It is manual dispatch and gated by DEPLOY_ENABLED, private repository and production environment; no deployment is activated by this sprint. Prefer review of code changes followed by one browser workflow dispatch, rather than repeated ZIP maintenance. Pin the selected Wrangler 4 patch in a deployment lockfile during first staging setup; it is not a runtime dependency today.

Retain local mode as a recovery/development compatibility path after hosted migration, not as a second live database. Only one database should be authoritative after a reviewed cutover. Never run two independent production feeds. Hosted manual-run UX and connected backup-health status remain explicit limitations rather than hidden assumptions.

## Remaining risk

No hosted credentials/access were supplied for Supabase/Cloudflare. No production uptime or unattended cloud restore has been demonstrated. The founder's actual Mac can contain edits/publication decisions absent from the supplied workspace, so the workspace baseline cannot certify that Mac's current totals. The updater preserves those records; reconcile an owner export before any hosted migration. Native Mac/Safari/mobile OS tests remain owner-side checks. Image rights clearance remains human work; no new images were auto-approved.
