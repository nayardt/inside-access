# macOS — install v0.6.2 and run real discovery

This update keeps your existing database, administrator login, edits, source settings and audit history. Node is already installed on your Mac. No Paris API key or paid service is needed.

## Update the existing app

1. In the Terminal where the current app is running, press **Ctrl+C**. In that same Terminal run `pwd` and copy the existing project path. This is the original working installation, not the new download.
2. Download the updated `Inside_Access_v06_Upgrade.zip` and unzip it separately. This release contains the folder **inside-access-v062**. Do not copy a different `.local` directory into your working project.
3. Open Terminal. Type `cd`, press **Space**, drag the new **inside-access-v062** folder from Finder into Terminal, and press Return. The space after `cd` matters.
4. Run:

```bash
node scripts/upgrade.mjs
```

5. At the prompt, paste the **existing project path** copied in step 1. The updater makes a backup, retains the existing database/configuration/login, installs dependencies, applies pending migrations and builds.
6. At completion it prints a `cd 'your existing project path' && npm run dev` command. Copy that exact command and run it. This starts the updated app from the original project containing your database, rather than the extracted update folder.
7. Open http://localhost:5173/admin, sign in with your existing credentials and confirm **v0.6.2**.

Do not run `admin:create` again. Do not restore `database/inside-access-initial.tgz` over your working database. Keep the printed backup folder until you have checked the upgrade. Migration 007 adds only an administrator-only status function; existing migration files and existing data are not replaced. Only unapplied migrations run, and a pre-migration database snapshot is made automatically.

## Activate and execute discovery

1. On **Overview**, find **Run discovery**.
2. If Paris is not yet enabled/reviewed, open the linked dataset/API and ODbL terms, tick **I reviewed this source for private candidate discovery**, then click **Enable Paris and run discovery**. This records the dated acknowledgement and administrator audit automatically.
3. If it is already enabled, click **Run discovery**. No repeated review note is needed.
4. Wait for the result line. It reports sources checked/succeeded/failed/skipped, records observed, new private candidates, existing listings flagged and expiry/closure maintenance. Last successful check and recent results stay visible after refreshing.
5. Click **Review discovered candidates** to open **Opportunities** filtered to the discovered/pending queue. Open a candidate to inspect source URLs, evidence, dates, eligibility and quality flags.
6. Run discovery again. If the source has not changed, it should report **0 new candidates**. A zero result is normal; no opportunity is invented to fill the queue.
7. Under **Discovery checks**, inspect the stored execution/coverage details. Under **Source changes**, review material updates. Applying a proposal leaves an unverified draft; approval and publication remain separate human decisions.

The current sample may differ from our 25 October run, which found two candidates. Missing prices/deadlines remain unknown. Discovery never verifies, approves or publishes an opportunity automatically.

## Scheduling

Leave the app/Mac running for local daily checks. Due checks resume on restart, but nothing runs while the Mac/app is off. To run independently of the Mac, use the prepared private GitHub Actions workflow with a shared Supabase Free database; account setup and migrating the existing local records are still required. A cloud worker cannot update the PostgreSQL files on a switched-off Mac. See `SCHEDULING.md`.

## Troubleshooting

- **Cannot find module `/Users/.../scripts/upgrade.mjs`:** Terminal is not in the extracted update folder. Repeat step 3 with the space after `cd`.
- **App/database already running:** stop the original app Terminal with Ctrl+C before upgrading or using database CLI commands. Do not remove a live database lock or run a second app against it.
- **No ready sources:** use the activation control or check W-001 under Source watchlist → Manage → Automation. The other 21 sources have no implemented connector.
- **No new candidates:** inspect observed count, timestamps and coverage. The source may be unchanged or the latest sample may contain no relevant opportunities.
- **Source error:** the dashboard and Discovery checks retain the error. Correct connectivity/settings and use Run discovery to retry; scheduled attempts use backoff.
- **Dependency download failure:** backup is retained. In the existing project folder rerun `npm ci`, `npm run db:setup`, then `npm run build` before starting.
- **Build/migration error:** retain the current project and backup; a failing migration rolls back. Restore only into a separate directory, never over a live database.
- **Custom database path:** your retained `LOCAL_DB_PATH` continues to apply. Backups are made beside that actual database location.

Installer/restore tests ran on Linux, including paths with spaces. We have not remotely inspected your Mac database or run the installer on a native Mac. Your earlier v0.6.1 installation was confirmed running; this is an additional update using the same safe updater.
