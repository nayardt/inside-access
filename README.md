# Inside Access v0.6.4 — simpler founder operations

Incremental simplification of v0.6.3. Same database, authentication, source connector, public design, image rights and publication safeguards. **No new SQL migration.**

- **Inbox:** opportunities needing review, meaningful source changes, verification/source problems and exceptions.
- **Listings:** one searchable database; review opens directly, with separate Approve and Publish. Advanced filters/research fields collapse; expired records remain in a reversible archive.
- **System:** discovery health/run controls, source management, full backup creation/download, cost estimate and secondary audit/preview tools.

Read [the one-page operator guide](docs/OPERATOR_GUIDE.md). Daily work requires a browser. The local app must be running; after one-time setup the included Mac launcher starts it without commands to type. Managed cloud cutover removes the Mac dependency only after approved setup.

## Existing Mac installation

Download/extract this repository separately from the existing app. Stop the existing app, then run `node scripts/upgrade.mjs` from the new folder and provide the **existing** project path. The updater backs up the full existing project and preserves .local, .env, login, research and data. Keep that backup. Do not create a new administrator or restore the starter database. Start the retained project with the printed command or Start_Inside_Access.command. Full instructions and rollback: [recovery guide](docs/RECOVERY_AND_MIGRATION.md).

## Fresh development installation only

Node 24 LTS (minimum 22.12): `npm ci`, `npm run db:setup`, `npm run admin:create`, `npm run dev`. Open http://localhost:5173/admin. Working database, .env and backups must never enter Git. The shipped research snapshots are initial source records, not the owner's edited live database.

## Technical evidence

[Audit/architecture](docs/SIMPLIFICATION_AUDIT.md), [QA results](docs/QA_REPORT.md), [preservation](docs/preservation-v064.json), [upgrade rehearsal](docs/upgrade-rehearsal-v064.json), [costs](docs/OPERATING_COSTS.md), [image safeguards](docs/IMAGE_ENRICHMENT.md). All eight original migrations remain unchanged. Source-of-truth repository: https://github.com/nayardt/inside-access (private).

## Development and prepared hosting

`npm test`, `npm run verify:data`, `npm run build`. Browser System creates/restores-checks local full snapshots; CLI backup/export/restore remain available for recovery. `npm run discover:validate -- --images` is an isolated live proof (see earlier versioned reports); production discovery is still the single bounded Paris connector. No unrestricted scraping or automatic approval/publication.

The private GitHub workflows test/build code. Deployment, cloud discovery and encrypted cloud backups require explicit owner opt-in variables/secrets. They are supplied disabled, with no paid activation. Recommended target is Cloudflare Pages + existing Supabase PostgreSQL/Auth, preserving SQL safeguards rather than rewriting for SQLite/D1. Managed Auth/deployment/backup integration needs private staging verification; it is not claimed operational here. See the audit/recovery guides for exact remaining account tasks.

Historical starter database binaries remain in the prior v0.6.3 release archive. Git stores the complete original JSON/CSV/workbook/prototype evidence snapshots instead of database backup files. Restore always from an explicit verified full backup, never from a seed over an existing installation.
