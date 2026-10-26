# Inside Access v0.6.1

This maintenance update completes source-change exception decisions in the dashboard. Pending changes appear first. Open listing supports direct manual source checks; Dismiss change requires a reason and retains the decision in history. Applying changes still creates an unverified draft. Dismissal does not clear source warnings or restore approval/publication.

Automatic audit context now includes the specific change ID and evidence URL. Migration 006 is additive and preserves existing data/history. The five earlier migrations are unchanged.

82 automated tests passed. Data remains 30 selected / 6 pending / 12 unsuitable / 22 sources; zero public records in the existing workspace database. macOS installation and live hosted-service testing still require owner-side access. The existing Paris discovery proof remains the only implemented connector. No new services or costs were introduced.

Use the same safe updater for an existing v0.5 or v0.6 installation. Stop the app, extract this release separately, run `node scripts/upgrade.mjs` in the extracted folder, enter the existing project path, then start the existing project with `npm run dev` and your existing login. Do not restore the starter snapshot or create a new administrator. See `MACOS_UPGRADE.md` for recovery instructions.
