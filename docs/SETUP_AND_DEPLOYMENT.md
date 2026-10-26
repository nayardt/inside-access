# v0.6.3 setup and deployment

## Existing local installation

Use `docs/MACOS_UPGRADE.md` and the Node upgrader. It preserves the existing database, login and configuration and backs up before applying pending additive migrations. Do not restore a starter database over an existing installation. No cloud credentials are needed for local administration or the public Paris API.

## Fresh local installation

Node 24 LTS is recommended. Run `npm ci`, `npm run db:setup`, `npm run admin:create`, then `npm run dev`. Open http://localhost:5173/admin. The first import preserves 30 selected, 6 pending, 12 unsuitable and 22 sources; all opportunities remain unpublished. Stop the app before running database CLI commands against the same database.

## Optional hosted setup — not deployed

The React frontend supports Supabase Auth/PostgREST and Cloudflare Pages. A private GitHub workflow supports daily cloud discovery. These require owner account access and private staging tests; no project, repository, secret or deployment was created in this build.

1. Create/select a **private** GitHub repository and a Supabase Free project. Keep paid upgrades disabled. Store `DATABASE_URL` privately for the migration CLI.
2. On an authorized Supabase database, run `npm run db:setup -- --remote`. The CLI applies only unapplied migration files, in numeric order. Existing v0.5 installations receive 004–008; fresh projects receive all eight. Alternatively, manage all SQL migrations through the Supabase CLI and use only `db:import -- --remote` for the seed. Do not mix migration owners without reconciling their ledgers.
3. Retain existing Supabase Auth users/admin membership. For a fresh project only, create a confirmed-password user through the server-only Admin API (no invitation email), then grant that exact Auth UUID membership in `private.admins` using the owner's SQL editor. Disable public signups. Never use user-editable metadata to authorize admins.
4. Configure the frontend with public values `VITE_DATA_MODE=supabase`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable/anon key). No service key or database password belongs in a `VITE_` variable.
5. Run tests/build and verify anonymous, nonadmin and administrator access in private staging, including review RPC serialization, optional notes, warning reasons, source changes, exports, sessions and audit history.
6. Only after owner approval, configure Cloudflare Pages with Node 24, `npm run build` and output `dist`. Deploy **only** `dist`, never the project root, research, snapshots, credentials or `.local/`. `_redirects` supports `/admin`; `_headers` keeps cache/framing/CSP controls. A preview URL is not automatically private; protect staging access.

Useful SQL checks:

```sql
select origin_group,count(*) from public.opportunities group by origin_group;
select count(*) from public.sources; -- 22 original watchlist sources
select count(*) from public.opportunities where published;
```

Publication count must reflect only the owner's explicit decisions. Do not reset a live upgraded database to an expected zero if the owner has deliberately published listings. A fresh installation starts at zero.

## Optional cloud discovery

The source must be explicitly enabled after its API/ODbL review. The local dashboard now provides Enable Paris and run discovery; ordinary runs need no repeated note. Configure server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as private Actions secrets and set repository variable `DISCOVERY_ENABLED=true` only when activation is wanted. The workflow checks private repository visibility, limits jobs to five minutes and runs at **07:17 UTC daily**, with manual dispatch available. Provider service keys are broad secrets: restrict repository access and consider a narrow dedicated worker identity before adding more connectors.

The worker claims due sources, runs the bounded connector, records failures/backoff, ingests private candidates/proposals and runs date/deadline maintenance. Neither the workflow nor source ingestion publishes or emails. Do not run local and cloud monitors against the same data without the lease system and due times enabled.

Local monitoring requires the app/Mac to remain on; cloud monitoring runs without the Mac once accounts and the hosted database are configured. Hosted Auth/API/runner execution has not been tested without those credentials.

## Recovery and limits

Local upgrades create a backup alongside the actual database. Restore to a new directory, never over a live database. Keep full native PostgreSQL/schema/Auth backups for a hosted installation; JSON exports alone are not a full hosted recovery strategy. Free Supabase projects may pause and do not provide the paid plan's automatic backup guarantees. See operating costs and the QA report for actual tests and remaining limits.

Before switching a Mac installation to hosted mode, transfer its edited data through a reviewed export/migration; `db:setup -- --remote` only seeds absent original records. Keep the original local database intact. Local credentials are not Supabase Auth accounts. See `SCHEDULING.md` for the exact account/secrets/source/default-branch requirements and best-effort timing limits.

## Image upgrade

Migration 008 and the server-side `enrichment/` snapshot must remain private. The authorized setup/import CLI imports actual pending image metadata once for unchanged source/title records; it never imports rights approvals. Existing checks/decisions are skipped. For hosted projects apply 008 with the existing migration owner; the remote import requires private `DATABASE_URL`. The image worker uses the existing service-role connection; no paid image service/key is needed. Hosted Find images is disabled with an explanation until a protected worker endpoint is configured; local Find images works through the authenticated admin API. `_headers` allows HTTPS image delivery for approved URLs. Publish only `dist/`. See `IMAGE_ENRICHMENT.md`.
