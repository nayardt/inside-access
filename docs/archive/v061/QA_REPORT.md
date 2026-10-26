# Inside Access v0.6.1 — QA results

25 October 2026 · **82 automated tests passed, 0 failed.** This patch completes exception decisions in the source-change dashboard and improves their automatic audit context. No production environment was deployed, no service was purchased and no existing research opportunity was published for testing.

## Working changes

- Source changes opens in Pending review; Applied, Dismissed and All changes remain accessible and exportable.
- Open listing loads the existing editor directly, including for missing-source investigations.
- Apply as unverified draft retains its existing safeguards. Missing-source proposals cannot be directly applied.
- Dismiss change requires a reason of at least 10 characters. It leaves listing fields, verification, quality flags, approval and publication unchanged.
- New audit entries retain change ID, associated listing/source/run IDs, evidence URL, current verification status, administrator identity, timestamp and field diffs. Old audit rows are not rewritten.
- Save failures remain visible and retain the entered reason. The database enforces authorization, stale-revision checks and reason requirements independently of UI controls.

## Executed checks

| Check | Actual result |
| --- | --- |
| Database/import/security regression suite | 33 passed |
| HTTP/authentication/session/filter/error/security suite | 10 passed |
| Admin React + real PostgreSQL integration | 11 passed |
| Public discovery UI/filter/details/error suite | 3 passed |
| Workflow/discovery/parser/upgrade/installer suite | 25 passed |
| **Total** | **82 passed, 0 failed** |
| TypeScript + local production build | PASS |
| Supabase-mode TypeScript + production build | PASS with nonsecret placeholders; hosted execution not tested |
| Workbook/import/prototype reconciliation | PASS: 30 selected, 6 pending, 12 unsuitable, 22 sources; repeated import inserted 0 |
| Existing v0.6 database upgrade | PASS: all 48 opportunity rows, 22 source rows and 71 audit rows identical before/after migration 006; 0 public rows; 0 enabled sources |
| Chrome responsive layout and dismissal flow | PASS with isolated synthetic transport; mobile and desktop dimensions below |

Machine-readable records: `test-results-v061.json`, `database-upgrade-v061.json`, `responsive-qa-v061.json`. The original v0.6 report is retained in `archive/v06/QA_REPORT.md`.

The five new tests exercise full React/PostgreSQL dismissal and audit persistence, missing-source review navigation, error/reason retention, database authorization/revision/reason denial, and HTTP status filtering including SQL-injection-shaped input. Existing approval/publication and discovery tests still run against isolated verified/synthetic fixtures.

## Preservation and upgrade

Only additive migration `202610250006_source_change_audit.sql` is new. The five earlier migration files are unchanged. The workspace database was upgraded in place with an automatic pre-upgrade backup, with exact before/after row comparisons. This does not imply access to the user's Mac database. The supplied updater retains that installation's data, configuration and login and runs only pending migrations. Existing v0.5 upgrade/restore and path-with-spaces installer tests passed again on Linux.

## Browser results

Real React components and styles were inspected in Chrome with explicit dev-only synthetic transport, without a live user session or database access. At 375 px outer mobile width, usable document width was 360 px and document scroll width was 360 px. The admin table scrolled within its 328 px container (780 px table content); review controls and textarea measured approximately 325 px. At 1200 px desktop width, document width stayed 1200 px, table content/container were both 1150 px and the review control width was 360 px. A synthetic dismissal left the pending queue and reappeared in Dismissed with its reason. Fixtures are disabled by default and excluded from production bundles.

## Remaining limits

- Actual macOS, Safari/iOS/Android and hosted Supabase Auth/PostgREST execution remain untested here; owner-side installation/account access is required for those checks.
- Only the existing Paris connector is implemented. Its prior live proof remains in `discovery-proof-v06.json`; this patch does not add a connector or claim another live source check.
- Latest-40/rotating-20 discovery remains bounded and can miss busy intervals. Source absence is not proof of cancellation; human source verification remains necessary.
- No hosted schedule was activated. Local source checking runs while the app/Mac is running and only for explicitly enabled, reviewed sources.
- Cost configuration is unchanged; this patch adds no external service or paid feature.
