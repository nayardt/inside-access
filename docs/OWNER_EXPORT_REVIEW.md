# Owner export review — 26 October 2026

The owner's browser export was inspected without modifying the original file or the hosted database. Supplied rows were restored into isolated local PostgreSQL with identity values and actor UUID references retained. User triggers were disabled only in the disposable rehearsal transaction so restoration did not reset existing decisions or append artificial history; FK/check validation remained enabled. No hosted Auth user was created.

| Supplied data | Count |
| --- | ---: |
| Opportunities | 50: 30 selected, 6 pending, 12 unsuitable, 2 discovered |
| Discovery sources | 22 |
| Verification checks | 50 |
| Audit entries | 307 |
| Discovery runs | 1 |
| Pending source changes | 0 |
| Image metadata | 216: 215 pending, 1 rejected; no image approved |
| Image checks | 32 |
| Already published opportunities | 2 |

All eight supplied tables matched after the rehearsal, comparing SQL timestamps as the same UTC instants and numeric amounts independent of decimal-string JSON representation. Missing values stayed null/unknown. The isolated public feed showed precisely the owner's two already approved/published listings; nothing new was approved. The computed display_image property is a public projection, not a database column, and was omitted only from storage. The original export was left unchanged.

**Migration completeness gate:** source_snapshots is absent from this export, while the stored successful discovery run observed 40 records. Absence must not be interpreted as an empty table. Browser exports previously omitted this table; the private export API/UI have now been corrected with deterministic composite-key pagination and an HTTP authorization regression test. No schema migration is needed for that export fix.

Do not replace the owner's edited database with the initial seed, regenerate historical source evidence or silently discard the missing rows. Obtain a full, consistent copy of the stopped local database for the one-time transfer. Keep credentials/session material private and out of GitHub. The cloud application remains empty until the complete handover and Auth reference mapping are validated. The Mac database has not been changed.
