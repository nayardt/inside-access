# Preservation, upgrade, recovery and rollback — v0.6.4

## Verified before edits

Code archive and complete workspace database snapshot were created before changes. Every table in public/private/auth/local_auth was restored independently and compared row-for-row. Preservation evidence: preservation-v064.json. No database schema change is introduced by this release; all eight migrations retain their original bytes. A second rehearsal loaded that snapshot into a disk-backed copy, applied the normal migrator, idempotent seed and image imports, and found all tables identical (upgrade-rehearsal-v064.json).

Workspace baseline: 30 selected + 6 pending + 12 unsuitable = 48; 22 sources; 48 verification records; 507 audit rows; 231 image metadata rows; 30 image checks; no existing discovery runs/candidates or public listings. The extra image candidates/audit rows reflect earlier enrichment, not new opportunities. The 26 October live proof used a separate database and added two discovered candidates there only. The workspace has no administrator account: the owner's Mac login/data is separate and must be retained, not replaced from this snapshot.

## One-time Mac update (technical setup, not a daily task)

Stop the running application. Extract the new version separately, then in that extracted folder run `node scripts/upgrade.mjs` and enter the existing project path. Type `cd`, a space, then drag the extracted folder into Terminal if navigating manually. The updater backs up the existing project (including actual local database/configuration) before copying code, retains .local/.env/Git/data/reference, installs dependencies and builds. It applies only unapplied migrations. An existing v0.6.3 database needs no new migration. Keep the printed full-project backup.

Start from the original project with the updater's printed command, or double-click Start_Inside_Access.command there. Do not create a new administrator or restore the starter database. Check Inbox/Listings/System, source settings, image decisions and publication totals against your pre-update export. All founder edits after the update continue to live in the retained database. Native macOS double-click behavior is supplied but not executed in this Linux QA environment.

## Browser backups

System → Create verified backup → Download latest full backup. Admin authentication is required for status, creation and download. Full snapshots include schema, records, credentials and sessions; protect them accordingly and store a downloaded copy in an encrypted/protected independent location. A JSON export is useful for inspection but is not a full login/schema recovery backup.

Daily local backups run at startup when overdue and hourly check whether 24 hours elapsed; no work runs with the app/Mac off. Archives sit in operator-backups beside the actual configured database directory, with restrictive file permissions. Creation restores the archive to an isolated in-memory PostgreSQL and queries every application table before reporting success. Tests additionally compare every restored row and verify restored login. Failure retains the previous successful file and shows an error in System. Each snapshot has a timestamp, hash, verification flag and initiating administrator/system metadata. No automatic deletion policy is applied yet: monitor disk space and retain independent copies. Startup timing can defer a snapshot by up to an hour once the app is running.

## Restore into a new folder only

For a local snapshot, stop the app and ask the setup helper to run:

```bash
LOCAL_DB_PATH="/absolute/path/to/new-recovery/pgdata" npm run db:restore -- "/absolute/path/to/downloaded-backup.tgz"
```

The destination must not exist. Existing restore tooling rejects an existing directory. Compare counts, stable IDs, sources, audit history, approvals/publication and image rights; test the restored login in private. Change LOCAL_DB_PATH only after those checks. The original directory remains available for rollback. The workspace pre-sprint snapshot is not a substitute for the owner's real Mac backup.

## Roll back code safely

With the app stopped, use the full-project backup created by the updater, or check out the previous reviewed code commit. This release adds no SQL schema changes, so v0.6.3 can read the same eight-migration database. Keep any post-update edits in the current database; do not blindly restore an older snapshot and discard them. The tested archive restoration and no-migration rehearsal demonstrate recovery prerequisites; a native Mac launch/recovery exercise is still required before relying on it operationally.

## Future managed cutover — deliberately not performed

1. Record the owner Mac's actual counts, all stable IDs, publication decisions, audit/verification history, sources/settings and image permissions. Create/download a full verified snapshot and private JSON export; freeze writes for final transfer.
2. Set up authorized Supabase Free and Cloudflare Pages accounts without enabling paid features. Configure Auth, exact administrator UUID membership, disabled public signup and protected staging. Local password hashes are not Supabase Auth users: arrange a secure owner-controlled Auth transition, preserving actor history and remapping only explicit admin references after review.
3. Apply the existing eight SQL migrations to staging. Transfer the owner's edited rows/history, not just the original seed. Verify every table/key/relationship and image decision. Reconcile publication counts against the actual owner export; zero is a fresh-install value, not a command to erase owner decisions.
4. Test real Auth/PostgREST/RLS, unpublished isolation, discovery repeats/failures, image permissions, backup restoration and frontend delivery. Configure the private scheduled discovery and encrypted backup workflows. Their cloud credentials/restore path have not been exercised here.
5. Archive the local authoritative copy and declare the hosted DB authoritative only after owner approval. Then opt in to DEPLOY_ENABLED and dispatch the gated frontend workflow. Revert the frontend to its prior commit if needed; keep the source database untouched until reconciliation is signed off.

Cloud backup workflow: DATABASE_URL (TLS), BACKUP_ENCRYPTION_KEY of at least 32 characters, CLOUD_BACKUP_ENABLED=true in the private repository. It makes a PostgreSQL 17 custom dump, validates its archive directory, encrypts with OpenSSL and retains an encrypted artifact for 14 days. Keep the decryption key outside GitHub too. That is an archive-structure check, **not** an automated full hosted restore. Match the pg_dump major version to the actual hosted server, ensure OpenSSL is installed on the runner image, and perform a staging restore before activation. Storage objects/provider project settings are not included in pg_dump; images currently remain external URL metadata.

Deployment configuration: public SUPABASE_PUBLIC_URL/KEY and PAGES_PROJECT variables; server-only CLOUDFLARE_ACCOUNT_ID/API_TOKEN secrets scoped to that project; private production environment approval where supported. No database password/service key belongs in a VITE variable. Nothing is deployed automatically until the owner opts in. Owner-controlled restoration/setup are exceptional technical operations; daily content work remains browser-based.
