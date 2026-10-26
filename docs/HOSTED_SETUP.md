# Hosted preparation — 26 October 2026

**Update:** Owner data transfer is complete. See [the transfer and validation report](OWNER_EXPORT_REVIEW.md) for current counts, the explicit missing-history waiver and remaining login/hosting gates. The empty-database checks below describe the pre-import preparation stage.

The existing empty Supabase project `ahxcgrwkifwkewvvhlad` in the **Inside Access** organization is healthy, on Free, in eu-west-1, PostgreSQL 17.11. No new project, branch, account or paid feature was created. The owner Mac database has not been read or overwritten. This is preparation, not a completed migration or a public deployment.

## What was installed and verified

The eight unchanged source migrations were applied in order through Supabase's migration API, with their original names also entered in `private.app_migrations` for compatibility with the existing setup CLI. The hosted migration service generated its own timestamps; the two ledgers agree on the eight source operations. File hashes and actual checks are in [hosted-preflight-v064.json](hosted-preflight-v064.json).

The public schema has 10 application tables, all with RLS. Anonymous users have no table SELECT grants. Authenticated users have no direct INSERT/UPDATE/DELETE grants; guarded admin RPCs remain the write route. The worker cannot publish opportunities or approve images.

Actual Data API requests using an active modern publishable key returned: public feed HTTP 200 with zero records, anonymous private-table access HTTP 401/42501, anonymous admin-overview RPC HTTP 401/42501. SQL authenticated-role simulation without admin membership rejected overview, publication and image approval; the transaction was rolled back. No Auth account or synthetic opportunity was inserted into the hosted database.

The cloud database intentionally contains zero opportunities, zero sources, zero application users and zero publications until the owner's current records are supplied. Do not import an initial seed as a replacement for the edited Mac database. The earlier workspace baseline and backup are not the owner's actual Mac state.

## Hosted installation permissions

This project initially had broad Supabase automatic grants to anon/authenticated/service_role for new public objects. Before creating the first application object, these postgres defaults were hardened:

```sql
-- Hosted installation: opt in to explicit object permissions before creating application objects.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated, service_role;
```

These settings are recorded in the first hosted installation migration alongside the unchanged core SQL. They are deployment defaults, not a new application data model. Original source migration files 001–008 were not edited. For another fresh Supabase installation, apply the same opt-in defaults before the application migrations; otherwise existing provider defaults can add unintended explicit privileges even when PUBLIC permissions are revoked.

The installed code uses modern Node/HTTPS and does not depend on the old TLS CBC ciphers being removed in November. PostgreSQL changelog checks found no existing ltree/custom-operator/legacy-pgcrypto data to migrate in this empty project. No existing extension data was modified.

## Advisor review

Do not report a clean advisor scan: there are intentional API-design notices.

- The image-fetch cache has RLS and no client policy/grant: deliberate deny-all, accessed only through service RPCs. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Three anonymous SECURITY DEFINER functions expose only the approved public projection/images. Sixteen authenticated functions include the admin guards and public projections. Their grants and nonadmin rejection were checked; do not switch these functions blindly to invoker or grant table access to silence a notice. [Anonymous function notice](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated function notice](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). A later dedicated API-schema refactor may reduce this exposed surface after compatibility tests.
- Ten informational foreign-key index suggestions and seven unused-index notices remain. The database is empty; preserve the existing indexes and assess additional FK indexes when actual records/workload are imported. [Foreign-key notice](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

## Handover procedure and current status

Open the **current running Mac app**, choose **Overview → Export private database JSON**, and provide that downloaded file for reconciliation. If using the new three-area interface already, the export is under **System → Database totals and exports**. No new ZIP installation is needed for an existing export control.

Before importing, check the file's table coverage. Older browser exports can omit source_snapshots, image tables or other later history; missing tables must be treated as missing, not empty. If history is missing, obtain a complete protected copy or record an explicit owner waiver before proceeding. In this transfer the owner waived missing source snapshots; all supplied history was retained. Do not request passwords or paste service keys into chat.

Owner-controlled application Auth setup is still required; the Supabase organization login is not automatically an Inside Access admin. Historical actor UUIDs and foreign keys must be reconciled explicitly. Do not insert directly into hosted auth.users or overwrite audit actor IDs silently. Disable public signup, verify admin membership and test real password login privately before cutover.

Cloudflare hosting is not configured. GitHub source and CI are ready; protected staging, a tested owner-data transfer/restore and authorization precede a public production deployment. Keep daily review on the current Mac until cutover checks pass.

The owner export has now been imported and checked twice. Do not ask for another backup to recover the waived snapshots. The owner UUID exists in Auth (unconfirmed); app-admin membership is intentionally absent pending secure account setup. No direct hosted auth.users insertion was used. Cloudflare hosting and scheduled cloud operations remain inactive.
