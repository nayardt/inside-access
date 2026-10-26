# Inside Access v0.6 — actual QA results

**24 October 2026 · 77 automated tests passed · 0 failed.** Local implementation complete. No public deployment, paid services, organizer contact or email sending occurred.

## Executed automated checks

| Suite/check | Actual result |
| --- | --- |
| Existing database/import/security/discovery/durability regression suite | 33 passed |
| HTTP authentication, permissions, sessions, edits, errors and private-file protection | 9 passed |
| Administrator React/SQL integration, approval UI and warning/rejection reasons | 7 passed |
| Discovery UI, city/casting/month filters, listing detail fidelity and API errors | 3 passed |
| v0.6 workflow/discovery/parser/migration/installer tests | 25 passed |
| **Total** | **77 passed, 0 failed** |
| Workbook/prototype/import reconciliation (`verify:data`) | PASS: 30 selected / 6 pending / 12 unsuitable / 22 sources / 30 seed dispositions |
| Standard React production build + TypeScript | PASS |
| Supabase-mode production build with explicit nonsecret placeholders | PASS; live hosted Auth/API execution not claimed |
| Dependency audit, including dev dependencies | 0 reported vulnerabilities at check time |
| Frontend bundle inspection | Private research IDs, suspicious source URL and layout fixture data absent in both build modes |

Machine-readable test names and results: `test-results-v06.json`. The initial v0.5 report is retained under `archive/v05/`.

## Existing data and safe upgrade

The workspace's existing PostgreSQL database was migrated **in place**, from the three unchanged v0.5 migrations to the two additional v0.6 migrations. All existing opportunity field values were compared before/after and retained exactly. Original raw research is preserved. Re-import inserted **0** duplicates. Counts remained **30 selected, 6 pending, 12 unsuitable and 22 sources**. It has **0 published records**, **0 newly enabled sources**, and **0 public feed rows**. See `database-upgrade-v06.json`.

A separate disk-backed v0.5 upgrade test created an existing account/session, edited a listing, approved and published that verified test record, then migrated. It confirmed the account/session, edited fields, IDs, original audit history and publication decision all survived. The automatic pre-upgrade snapshot restored successfully with the original three-migration schema and retained edited/published record. Re-running migrations created no duplicate import or extra migration backup.

The installer test used a destination path with spaces and confirmed that `.local/`, `.env`, Git configuration and original code backups were retained, while the updated application code was copied. A second process was prevented from opening the same local database. These installer/migration tests ran on Linux; an actual Mac was not available. The user's real Mac database has not been remotely inspected or changed; the supplied upgrader applies the same tested path locally.

## Approval and audit workflow

- Standard edits, approvals, publication and unpublication work without a typed review note.
- Audit rows automatically retain actor UUID/email, timestamp, verification status, evidence URLs, operation context and field diffs.
- Approve alone does not expose a record. Publish is a separate authorized action.
- Rejection requires an explicit reason of at least 10 characters.
- Medium/low/unknown-confidence warnings require explicit acknowledgement and a reason. The reason/actor/time are retained with the approval.
- Override requests cannot bypass missing eligibility, pending/unverified sources, stale verification, expired/closed dates or unresolved source conflicts.
- Material edits invalidate approval/publication and clear warning acknowledgements. Revision checks prevent lost updates.
- Disabled actions display their explanations beside the control, including review, save, exports and pagination. The database repeats authorization/readiness checks even if UI controls are bypassed.
- Anonymous table reads fail; signed-in nonadmins see no private rows and cannot self-promote, edit or review. Worker roles cannot use review/publication RPCs. Audit history cannot be altered by app administrators.

## Discovery — live proof and controlled lifecycle tests

The live proof used **W-001, the documented Ville de Paris API**, not a fabricated endpoint:

| Live observation/result | Actual result |
| --- | ---: |
| Recent Paris records read | 40 |
| Relevant private candidates created in isolated PostgreSQL | 2 |
| Identical repeat: new candidates | 0 |
| Identical repeat: meaningful changes | 0 |
| Known source IDs rechecked through the live ID query | 2 |
| Missing tracked source IDs in that recheck | 0 |
| Publicly visible records after live proof | 0 |
| Main database writes from live proof | 0 |
| Hosted schedule activated | No |

See `discovery-proof-v06.json` for times, endpoint, request counts, coverage and licensing attribution. Source creation/publication timestamps are not supplied by the API; that field stays null. First discovery and source update time are stored separately.

Synthetic, isolated integration tests additionally verified:

- Exact duplicate prevention, timestamp-only no-ops and HTML-formatting no-ops.
- Meaningful price/access/content changes create a private proposed change and retain editorial copy until applied.
- Applying a proposed change leaves the record unverified/unpublished and clears stale numeric price/currency data when the new source does not supply it.
- Explicit cancellation, application closure and sold-out text are recognized. Date/deadline maintenance marks expired/closed records without deleting provenance or IDs.
- Two successful missing-ID checks flag/withhold an item without falsely declaring it cancelled.
- Missing dates, eligibility, routes and contradictory source time/date values are flagged. Contact email/phone fields are excluded.
- Disabled/unreviewed sources cannot run; leases prevent overlap, failures retain errors and backoff, and worker ingestion cannot approve/publish.

The local app contains the scheduler and immediate check control. Sources stay disabled until enabled through reviewed settings. Monitoring requires the Mac/app to be running; cloud scheduling requires the private repository and hosted database setup. Unchanged records need no manual review. The other **21 watchlist sources are preserved, not claimed as working integrations**.

## Responsive/browser checks

Chrome browser checks used the actual React components/CSS in an isolated synthetic transport harness, without accessing a live database or bypassing real authentication.

- Mobile frames: **375 px** outer width / **360 px** usable content with scrollbar. Discovery and admin pages had document scroll width **360 px**, so no page-level horizontal overflow.
- Mobile discovery cards: one column, **330 px**.
- Mobile editor: **344 px** dialog; one **287 px** field column. All measured field widths matched. The v0.4 inherited field-span bug was found and fixed.
- Mobile review actions: one column; Approve enabled without a routine note, and Publish/rejection/other disabled controls displayed specific reasons.
- Desktop: **1200 px** content/scroll width, **1000 px** dialog, two **452.5 px** editor columns.

Measurements are recorded in `responsive-qa-v06.json`. No screenshots containing user data were saved. Native Safari/iOS/Android execution was not available. Real admin authentication was tested through SQL/HTTP sessions; React integration tests exercised real authorized SQL calls, while visual fixtures tested layout only.

## Fixes found during QA

- Removed repeated note entry while retaining rejection/override reasons and all database gates.
- Added explicit disabled-state explanations rather than leaving review actions silently greyed out.
- Corrected the mobile editor's implicit second column inherited from v0.4 CSS.
- Made editor timestamp rendering/transport handling robust.
- Retained editorial values on source change; applied updates now clear unsupported stale numeric prices safely.
- Added exclusive local database opening and improved clean shutdown/restart handling.
- Preserved unknown verification times and source publication times instead of inventing values.

## Remaining limitations

- The bounded latest-40 plus rotating-20 monitor can miss a busy interval; it is not a complete backfill or exhaustive city feed.
- Only Paris is connected. Cancellation detection relies on explicit source text; source disappearance is not proof of cancellation. Near-duplicate semantic matching is not implemented.
- Contributor data is never automatically original-organizer verified. Public access/eligibility and material conflicts still require human source review.
- Live Supabase Auth/PostgREST behavior, hosted migrations/grants, Cloudflare deployment and actual GitHub runner scheduling remain untested without account access/secrets. Both frontend configurations build, and the application SQL runs in actual embedded PostgreSQL.
- The macOS installer logic is tested cross-platform on Linux; actual macOS execution is a user installation step.
- Old research is retained for provenance and naturally expires. There is no email alert delivery, consumer account system or live seat-inventory guarantee.
