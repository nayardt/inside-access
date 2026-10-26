# Inside Access v0.6.2 — Discovery activation and QA

25 October 2026 · **92 automated tests passed, 0 failed.** One real source connector passed authenticated manual HTTP execution and persisted two real private candidates. The existing Mac database was not accessed remotely. No paid services, cloud schedule, email sending or public production deployment was activated.

## Live execution, separate from synthetic tests

`npm run discover:validate` created a fresh **disk-backed PostgreSQL** proof database, signed in through the real local authentication endpoint, enabled/reviewed W-001 through the admin save RPC and triggered the same `/api/admin/discovery/run` endpoint used by the dashboard. The connector made actual HTTPS calls to the official Ville de Paris API. No fixture connector was injected into either live HTTP run.

| Observation | Actual result |
| --- | ---: |
| First live run: sources checked / successful / failed | 1 / 1 / 0 |
| First live run: source records observed | 40 |
| First live run: new private candidates | 2 |
| First live run: existing listings changed | 0 |
| Exact replay of captured live records: new / changed | 0 / 0 |
| Second live HTTP check: new / changed / failed | 0 / 0 / 0 |
| Duplicate source/record ID groups | 0 |
| Candidates awaiting private review | 2 |
| Public records after execution | 0 |
| Existing user database writes from the proof | 0 |

The proof is timestamped in `discovery-activation-v062.json`. A concise execution trace is in `discovery-execution-v062.log`. Candidate IDs, source URLs, observed/discovered/source-update timestamps, evidence, flags and per-source run rows are retained in the JSON. Source publication time is absent from the API and remains null. Source retrieval does not establish original-organizer access or eligibility.

Real findings:

- **Festival des Fiertés : Ciné - debat au CPA Angel Parra** — https://www.paris.fr/evenements/festival-des-fiertes-cine-debat-au-cpa-angel-parra-126484
- **Le Mois du doc : Souvent, l'hiver se mutine : projection et rencontre** — https://www.paris.fr/evenements/souvent-l-hiver-se-mutine-projection-et-rencontre-123327

Both records are source-verification pending, approval pending and unpublished. These are candidate findings, not a claim of rare/exclusive access or approved feed eligibility. No live meaningful source change, cancellation or closure occurred during these two checks; those behaviors were exercised separately with explicitly synthetic records.

## Automated results

| Suite | Actual result |
| --- | ---: |
| Database/import/security/discovery/durability | 33 passed |
| HTTP authentication, editing, export/filter access and errors | 10 passed |
| Administrator React + real PostgreSQL, including discovery activation and retry | 13 passed |
| Public discovery UI/filter/details/errors | 3 passed |
| Existing v0.6 workflow/parser/discovery/upgrade/installer | 25 passed |
| New admin HTTP discovery/status/scheduling/permissions/overlap tests | 8 passed |
| **Total** | **92 passed, 0 failed** |

Machine-readable results: `test-results-v062.json`. Tests cover disabled-source zero-work reporting, reviewed activation, extraction, repeated ingestion, meaningful-change proposals without editorial overwrite, expiry/closed/cancelled behavior, source-missing flags, failure/backoff, due-check resumption, overlapping manual-run rejection, stale revisions, reasons, anonymous/nonadmin/service restrictions and publication safeguards. Synthetic observations are confined to tests/dev layout fixtures and are not included in live findings.

## Implementation and dashboard

- Only `paris-open-data` is implemented; all other 21 original sources are watchlist records. Full names/statuses are in `CONNECTOR_STATUS.md`.
- Run discovery and one-time Enable Paris and run discovery controls are available from Overview, Source watchlist and Discovery checks.
- Last successful timestamp, enabled/ready-source counts, error counts, pending candidates, latest run and per-execution checked/new/changed/failed/skipped results are displayed. Zero new records is reported accurately.
- Review discovered candidates opens the private discovered/pending queue. Source changes retain apply/dismiss review and required reasons; neither action publishes.
- Source watchlist Checked now shows actual automated retrieval time, separately from source verification. Discovery checks expose completion and coverage details.
- Unsupported configured connectors are reported as unavailable. Claim/log failures no longer silently terminate the entire batch without a per-source result.
- Run errors survive status refresh and retry is available. The UI repeats database-enforced source review/authorization safeguards.

## Data, build and browser checks

Migration 007 is additive and read-only, adding an administrator-only operational-status function. The six earlier migrations remain unchanged. The main workspace's existing 48 opportunities, 22 sources and 71 audit rows were compared to the restored pre-upgrade snapshot after migration, with exact preservation; see `database-upgrade-v062.json`. Main source settings remain unchanged. The live proof uses a separate persisted database rather than replacing/importing over the owner's existing database.

Workbook/prototype reconciliation passed: 30 selected, 6 pending, 12 unsuitable, 22 sources, 30 seed-audit records; repeat import inserted 0. TypeScript and local/Supabase-mode production builds passed. Production bundles contain no private research IDs or synthetic QA fixture strings. Hosted build uses explicit nonsecret placeholders and is not a live hosted-service test.

Chrome inspected real React/CSS with explicit synthetic transport. At a 375 px outer frame, usable document/scroll width stayed 360 px; dashboard panel width was 330 px with two metric columns. Desktop outer 1200 px had 1185 px usable width/scroll width and four metric columns. Activation/results layout was checked; native Safari/macOS/iOS/Android execution remains untested. Browser fixtures are disabled by default and excluded from the production bundle. Live execution evidence comes from the authenticated HTTP/API logs, not from those layout fixtures.

## Scheduling, cost and remaining blockers

Manual and local daily discovery work. Automatic local checking polls due sources every minute while the app/Mac is running. GitHub Actions daily/manual scheduling is prepared and disabled until explicitly configured. Recommended future setup is a private GitHub repository and shared Supabase Free database; estimated €0/month within included allowances. This is a best-effort validation schedule with possible delays and free-tier pausing, not a production SLA.

Remaining owner steps: install this patch on the existing Mac project, use the dashboard's one-time source activation, and verify the returned run result. We cannot remotely operate that Mac database. To run while the Mac is off, private repository/Supabase setup, reviewed transfer of existing local records, secrets and private staging tests are still required. Local PostgreSQL files are not reachable from a cloud worker while the Mac is off. No hosted account/credential access was available, and hosted execution is not claimed.

Coverage remains latest 40 updated records plus 20 rotating tracked IDs. No exhaustive backfill, semantic near-duplicate matching, guaranteed inventory or original-organizer verification is implemented. No user-account/premium/image work was added in this task.
