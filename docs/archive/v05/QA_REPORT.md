# Inside Access v0.5 — actual technical QA

**Tested: 24 October 2026. Outcome: 46 automated tests passed, 0 failed.** Nothing was deployed publicly, no paid services were enabled, and no organizers were contacted.

## Executed checks

| Check | Actual result |
| --- | --- |
| PostgreSQL/schema/security/discovery/export/durability tests | **33 passed** |
| HTTP authentication, admin API, CSRF, pagination and private-file protection tests | **8 passed** |
| React admin integration tests, backed by the actual SQL functions in an isolated database | **5 passed** |
| `npm run verify:data` | **PASS**; workbook, JSON and v0.4 reconciled |
| `npm run build` | **PASS**; TypeScript and Vite production build |
| Supabase-mode frontend build using explicit nonsecret configuration placeholders | **PASS**; separate output, no live account connection claimed |
| Repeated seed import | First insert **48**; second insert **0** |
| Actual database close/reopen | Stored value survived on disk |
| Bundled PostgreSQL snapshot restore | Restored **30 selected / 6 pending / 12 unsuitable** |
| Interactive `admin:create` CLI in disposable database | Created account successfully with hidden password input |
| Frontend bundle inspection | No private seed IDs, suspicious input URL or synthetic opportunity titles embedded in local/hosted builds |
| `npm audit` including development dependencies | **0 reported vulnerabilities** at build time |
| Browser inspection | Public discovery and sign-in screens rendered with the v0.4 identity; zero unpublished cards visible |

Machine-readable test names/results are in `test-results.json`. Exact initial database checks are in `initial-database-checks.json`. The React tests substitute the HTTP transport with calls to the real authorization-controlled SQL functions; the separate HTTP tests exercise the actual Express routes and sessions.

## Delivered database state

| Measure | Result |
| --- | ---: |
| Selected imported records | 30 |
| Pending candidates | 6 |
| Unsuitable/rejected imported records | 12 |
| Discovery sources | 22 |
| Selected city split | Amsterdam 9 / London 12 / Paris 9 |
| Initial verification records | 48 |
| Initial import audit records | 70 |
| Published records | **0** |
| Anonymous public feed records | **0** |
| Enabled discovery sources | **0** |
| Accounts/sessions in bundled database | **0 / 0** |
| Duplicate IDs/fingerprints | **0** |

The restorable snapshot is an actual initialized PostgreSQL data directory for the pinned PGlite engine, not a JSON mock. The live local database was approximately **8.9 MB** including system catalogs. Supabase uses the same application migrations with its own Auth schema; the local Auth compatibility layer is excluded from remote migration.

## Data fidelity

All original opportunity, pending, unsuitable and source records are retained exactly in `raw_record`. Normalized fields preserve their typed values. The workbook's 30 selected, 6 pending, 12 unsuitable, 22 sources and 30 seed dispositions reconcile to the JSON import; the prototype snapshot matches the corresponding datasets.

Month-only filming windows keep null exact dates. Unknown prices/pay/deadlines remain null; zero/free and compensation remain distinct. Pending date claims remain text rather than invented confirmed dates. Date-only source verification keeps `verified_date` and a null `checked_at`; the separate actual ingestion timestamp is `recorded_at`. Original confidence, eligibility, source links, restrictions and notes are retained. Re-import never overwrites administrator edits.

## Authorization and publication tests

- Anonymous base-table reads fail; anonymous public RPC returns no drafts.
- Authenticated nonadmins see zero private rows, cannot read private membership, self-promote, edit, review, get private overview or invoke worker ingestion.
- Administrators cannot bypass review RPCs through direct table writes.
- Approval alone leaves the feed empty. A separate authorized publication action is required.
- The public projection excludes raw imports, private review notes, fingerprint and administrator identity.
- A content edit revokes previous publication approval; stale revisions and protected-field edits fail.
- Pending/unsuitable, expired, sold-out, stale-verified or closed-deadline examples cannot pass approval readiness.
- Public date expiry remains enforced even if a stored publication flag is still true.
- Audit entries preserve actor, note and before/after values; app administrators cannot update/delete history.
- Sessions are hashed server-side; cookie security, wrong-password rejection, expiry/revocation and cross-origin write rejection are covered.
- Private research/database/credential filesystem routes are denied ahead of the local dev server; production output contains no research files.

Publication/rejection/edit actions in QA used throwaway databases. The delivered initial database has never been approved or published.

## Discovery proof — actually tested

A live bounded read of the documented Ville de Paris API returned **15 Paris records** after filtering the 20-record sample to in-scope, unexpired/undated candidates. The normalized observation was ingested into an isolated PostgreSQL database:

- First ingestion: **15 created**.
- Identical second ingestion: **0 created, 0 changed**.
- Anonymous public feed: **0**.
- Main database writes: **0**.
- Monitoring activation: **false**.

`discovery-proof.json` contains the endpoint, observation/test times, counts and licensing attribution. Synthetic fixture tests additionally exercise malformed payloads, expiry, city filtering, removal of contact fields, source changes, exact duplicates, batch limits, legal-review requirements and worker publication denial.

This validates one connector's bounded sample, parsing, hashing and ingestion. It does not establish primary-organizer verification, complete Paris coverage, ticket inventory, deleted-event detection or the other 21 integrations. Scheduled GitHub execution and Supabase worker execution have not been run without account/secrets access.

## Remaining verification limits

- No live Supabase project/Auth/PostgREST credentials were available. Hosted adapter code builds; managed login, grants and response serialization must be tested in private staging.
- No accessible GitHub repository was connected; no private repository was created or pushed.
- No Cloudflare account/project was configured and no deployment was attempted.
- Browser visual QA covers public/login screens. Authenticated admin flows were verified through SQL, HTTP and React integration tests; an authenticated cloud-browser admin session was not exercised.
- Mobile breakpoints are preserved from v0.4 with responsive admin additions. Native mobile-browser visual testing is still required before public launch.
- The initial evidence snapshot remains 24 October 2026. Old event records are retained for provenance; freshness and expiry gates can hide them over time. Publication requires editorial rechecking.

The prioritized continuation steps are in `REMAINING_WORK.md`.
