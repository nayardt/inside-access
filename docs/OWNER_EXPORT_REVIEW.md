# Owner data transfer — 26 October 2026

The owner authorized proceeding without unavailable history: “no need to preserve history proceed.” Only the absent source_snapshots data was omitted. All supplied audit, verification, discovery-run and image records were preserved. The original uploaded file and Mac database were not changed.

| Data | Imported |
| --- | ---: |
| Opportunities | 50: selected 30, pending 6, unsuitable 12, discovered 2 |
| Sources | 22 |
| Verification checks | 50 |
| Audit entries | 307 |
| Discovery runs / changes | 1 / 0 |
| Image metadata / image checks | 216 / 32 |
| Existing publications | 2 |
| Approved images | 0 |

The export SHA256 is recorded in [the actual validation report](owner-cloud-transfer-v064.json). The computed display_image property was removed only from database storage. Nulls, dates, prices, stable IDs, evidence, actor IDs and approval/publication fields were compared against typed SQL records in all eight supplied tables. The two existing publications remain IA-AMS-001 and IA-AMS-003; nothing new was approved or published.

## Restore and security evidence

An isolated database rehearsal passed atomic restore, every-field equality, repeated import without duplicates, and rollback on a corrupt payload. The same SQL ran successfully twice against the initially empty hosted tables, retaining exactly one import receipt and 307 original audit entries. User triggers were suspended only within the exclusive, atomic restoration transaction; constraints and foreign keys stayed enabled. Every trigger is enabled afterward. Audit identity allocation was advanced beyond the restored maximum.

A temporary private-schema staging table received 22 payload parts. Their combined checksum was verified before restoring. The staging table was dropped after successful validation. [The operator-only restore SQL](../scripts/restore-staged-owner-export.sql) is retained for review; it is not a client RPC or an application migration. It rejects a changed payload or a nonempty target rather than overwriting data.

The original owner UUID/email was created through the supported Auth Admin API, preserving approval foreign keys. No invitation or recovery email was sent and no owner-chosen password was transferred or set. The account is unconfirmed and has no app-admin membership. The short-lived migration helper required both JWT validation and a random migration credential, accepted only a fixed identity, and was replaced with an inert HTTP 410 response immediately afterward. It exposed no service key. Its unauthorized request returned 403; its retired version returned 410 even with the former credential. The hosted application remains inaccessible to an administrator until the owner completes secure Auth setup and membership is granted.

Actual public Data API requests returned only the two existing publications (HTTP 200); anonymous base-table access and admin overview returned HTTP 401. All ten public application tables retain RLS, with zero anonymous table SELECT grants and zero authenticated direct writes.

## Explicit limits and next steps

source_snapshots is absent from the old export despite a run recording 40 observations. The hosted snapshot table is empty because that missing data was waived, not because the old database was proven empty. Do not fabricate historical observations. A future successful source run establishes a fresh comparison baseline; existing opportunity deduplication still applies.

The latest GitHub check passed **124 tests in nine files**, data reconciliation and production build: [run 40351658200](https://github.com/nayardt/inside-access/actions/runs/40351658200).

Cloudflare hosting, owner password/email verification, app-admin membership and live cloud schedules are still pending. No public frontend was deployed and no paid feature was enabled. The original Mac app remains the rollback route until cloud login, discovery, backups and restoration are verified. The JSON transfer is not a full Auth/session/image-cache backup.

