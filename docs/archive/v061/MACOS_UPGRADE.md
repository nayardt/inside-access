# macOS: upgrade v0.5 or v0.6 to v0.6.1 safely

You have already installed Node, created your administrator and tested the app. Keep that installation and database.

## Upgrade

1. In the Terminal where your current version is running, press **Ctrl+C**. Do not just close the browser.
2. Before leaving that Terminal, run `pwd` and copy the existing project path. It should be the folder containing `package.json`, `server/` and your `.local/` database.
3. Unzip `Inside_Access_v06_Upgrade.zip (latest package, containing v0.6.1)` into a separate folder. The extracted code folder is `inside-access-v061`.
4. Open a Terminal in the new folder. You can type `cd `, drag the new folder from Finder into Terminal, then press Return.
5. Run:

```bash
node scripts/upgrade.mjs
```

6. When asked for your **existing project** path, paste the path from step 2. Quoted and Finder-dragged paths with spaces are supported.
7. Wait for dependency installation, migrations and the build to finish. Note the backup folder printed by the script.
8. Open Terminal in your **existing project folder**, then run:

```bash
npm run dev
```

9. Open http://localhost:5173/admin and sign in with your existing credentials.

Do **not** run `admin:create` again for an upgrade. Do **not** restore `database/inside-access-initial.tgz`. Do **not** copy a different `.local` folder over your current database.

## What is preserved

The file upgrader leaves your existing `.local/`, `.env`, `.git`, original research and starter database files untouched. It copies updated application code and documentation into the existing project. It creates a private sibling backup of the existing project before doing so, excluding only dependencies and Git history. Git history remains in the original project.

Migrations 004–006 are additive; only unapplied migrations run. The original five migration files are unchanged in v0.6.1. Migration 006 improves future source-change audit context without rewriting existing audit history. Accounts, password hashes, session records, saved database edits, original IDs, raw source records and audit rows are preserved. Existing current approval/publication decisions remain; normal expiry and newly observed material source changes can later withdraw a listing through the documented safeguards.

Before applying pending migrations to an existing local database, the application creates a compressed pre-upgrade database snapshot under the database's parent `backups/` directory. Re-running an already applied upgrade does not repeat those migrations or create duplicate records.

Browser-local saved IDs/preferences remain on the same `localhost:5173` origin. Changing the hostname or port can make browser storage appear empty even when the database is unchanged.

## Discovery after upgrade

The upgrade does not silently enable a new source. To use the local engine, enable `W-001` through the source editor after recording the one-time API terms acknowledgement. Then click **Check enabled sources now**. You can leave the app running to receive daily candidate checks; the Mac must be on and the application process running. If you stop it, due checks resume when it restarts.

New candidates are **not verified or published automatically**. Missing evidence and time/date conflicts are displayed. The Source changes tab defaults to Pending review. You can open a listing, apply a proposed change as an unverified draft, or dismiss a change with a reason. Applied/dismissed history remains accessible through the status filter. Dismissal leaves verification, source warnings, approval and publication unchanged. Rejection or warning overrides require a reason; ordinary saves and approvals do not.

## Recovery / errors

- **App still running / database already open:** stop its Terminal process with Ctrl+C, then retry. Do not run the database CLI against the same live process; use the admin UI instead.
- **Dependency download fails:** the backup is retained. In the existing project folder, rerun `npm ci`, then `npm run db:setup` and `npm run build`. No successful migration or seed import needs to be repeated manually.
- **Migration/build error:** retain both the current project and backup. The migration transaction rolls back the failing migration; the pre-upgrade snapshot remains. The printed backup contains the old application and original data. Work from a separate copy of that backup if returning to v0.5; do not overwrite a running database.
- **Custom database location:** `LOCAL_DB_PATH` in your retained `.env` continues to be used. The migration backup is made alongside that actual database location.
- **Hosted/Supabase mode:** the installer preserves configuration and builds, but does not silently migrate a remote database. After obtaining account access, apply the pending migrations with `npm run db:setup -- --remote` and verify Auth/RLS in private staging. Hosted deployment still needs owner approval.

The installer and migration logic were executed in Linux automated tests, including paths with spaces and restore checks. An actual macOS machine was not available to execute the installer during this build. It uses Node/npm and standard cross-platform filesystem operations rather than macOS-specific dependencies.
