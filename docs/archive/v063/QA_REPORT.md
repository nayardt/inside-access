# Inside Access v0.6.3 — Image enrichment and regression QA

25 October 2026. **120 automated tests passed, 0 failed.** TypeScript/local and Supabase-mode builds passed. npm audit reported zero known vulnerabilities. No paid service, public deployment, email or organizer contact was activated. This report distinguishes actual source retrieval from isolated synthetic test cases.

## Actual 30-record image backfill

All 30 selected opportunity source sets were checked. **20 technically suitable image candidates across 15 opportunities; 0 approved for public display.** The other 15 have no suitable/confirmed candidate. Full URLs, per-image dimensions/credit/timestamps, probes and failures are retained in `enrichment/selected-images-v063.json`. The readable per-record result is `IMAGE_ENRICHMENT_REPORT.md`. A public URL/API/OG tag is not permission: all bundled image candidates have unknown reuse and delivery rights and remain private.

One actual source image for each of the 15 records was visually inspected, with observations in `image-visual-qa-v063.json`. That does not verify every candidate, establish the identity of depicted people or clear image rights. No downloaded source-image binaries are distributed. Publishers with robots/access restrictions were not bypassed; errors are retained. Image/title matching is conservative and human confirmation remains mandatory.

A repeated 30-record check used 4 requests and 160 cache hits, stored/refreshed **0 image rows**, kept the image-row count stable and produced **0 duplicate groups**. All 48 opportunity rows and 22 source rows remained identical. Anonymous public visibility stayed zero. See `image-repeat-v063.json`.

## Actual Find images admin action

`npm run images:validate` exercised the same authenticated `/api/admin/images/enrich` HTTP endpoint as the Images tab against the original official Haantjes casting page. It checked one listing, made four real requests and stored four private metadata candidates, of which one was technically suitable (1260 × 620). A second HTTP check made **zero requests**, stored/refreshed zero rows and retained identical image records. Anonymous execution returned 401. The admin review endpoint returned the pending/unknown-rights candidates; opportunity fields were unchanged and public visibility stayed zero. Evidence: `image-admin-live-v063.json` and `.log`, from a separate disk-backed proof database. No working owner database was modified.

## Actual discovery → automatic image processing

`npm run discover:validate -- --images` used real authenticated admin HTTP endpoints, actual official Ville de Paris HTTPS data and a separate disk-backed PostgreSQL proof database. It observed 40 records, created two real private candidates and automatically extracted/probed **two suitable image candidates for those two listings**, using three image-processing requests. No image or opportunity was approved/published. Exact captured replay and a second live check created zero duplicate opportunities and zero changes. Already attempted image records were skipped on the next automatic pass. Evidence: `discovery-image-integration-v063.json` and `.log`.

The operational source connector remains `paris-open-data`; the other 21 original sources have no opportunity connector. OG/Twitter/JSON-LD/inline image extraction is implemented, but individual sites can lack accessible or relevant metadata. No live cancellation or meaningful event/image change occurred in these checks; those branches were tested separately with synthetic inputs. The existing owner's Mac database was not accessed remotely.

## Automated regression results

| Suite | Passed |
| --- | ---: |
| Database/import/security/discovery/durability | 33 |
| HTTP authentication/edit/filter/export/error handling | 10 |
| Administrator React with real PostgreSQL | 13 |
| Public search/filter/details/error UI | 3 |
| Existing workflow/parser/discovery/upgrade/installer | 25 |
| Discovery activation/status/overlap/permissions | 8 |
| Image parsing, policy, cache, SQL rights/privacy/audit | 23 |
| Image rendering/fallback and admin workflow | 5 |
| **Total** | **120; 0 failed** |

`test-results-v063.json` is the actual runner output. Coverage includes OG/Twitter/JSON-LD extraction, missing metadata/nulls, relative/unsafe URLs, logo/pixel/low-resolution/context/date/expiry rejection, public-host/DNS constraints, robots directives, image-header dimensions, blocked requests, repeat caching, image fingerprint changes, stable imports, image rights/embedding/attribution gates, expiry, independent image/listing approval, replacement/withdrawal, audit identity/diffs, stale revisions, anonymous/nonadmin/service restrictions, private data path denial and image load errors. Synthetic approval/expiry/change cases run only in disposable test databases; no real unverified record was published to exercise them.

## Preservation and installation evidence

The pre-008 disk-backed database backup was restored separately and compared against the working database. All **48 original opportunities, 22 sources and 71 prior audit rows** are preserved exactly; new image changes append their own audit rows. Original groups remain 30 selected, 6 pending, 12 unsuitable. Source activation/publication decisions remain unchanged. Migrations 001–007 are unchanged; 008 is additive. Evidence: `database-upgrade-v063.json`.

A fresh migrated/imported database loaded the actual bundled metadata snapshot: 226 candidate metadata rows (including unknown/rejected candidates), 30 image-check records, 20 suitable candidates across 15 records, 0 image approvals and 0 public opportunities. A second import inserted 0 and skipped all 30 checks. Already checked or edited title/source records are preserved by the import guard. See `image-snapshot-import-v063.json`. The original workbook/prototype reconciliation and seed idempotency also passed; original dates/prices/deadlines are unchanged.

Existing installer tests exercise backups, preserved accounts/sessions/edits/publication decisions, snapshot restoration, running-app protection and paths containing spaces. Native macOS installer/Safari execution was unavailable; follow `MACOS_UPGRADE.md` on the existing Mac project. The updater copies the new `images/` and `enrichment/` code/data while retaining `.local/`, `.env` and research files.

## Rendering and builds

Chrome inspected actual React/CSS at 375 px mobile and 1200 px desktop outer frames using explicit development-only synthetic transport. Mobile document/scroll width was 360/360 px, preview 284 × 160; desktop document/scroll width 1200/1200, preview 885 × 498. The actual 1260 × 620 source preview loaded in both, with object-fit cover and consistent approximately 16:9 crops. Expanded rights fields stayed within the viewport; unknown-rights approval remained disabled with explanatory text. See `responsive-qa-v063.json`. Layout fixtures do not bypass real authentication and are excluded from the production entry/bundle.

Cards/details use lazy, async-decoded, responsive-width approved images with dimensions, alt text, required credit, subtle gradients and a premium fallback. Automated load-error tests cover broken/blocked URLs, replacement recovery and missing approval. No invented resize URLs or image variants are generated. Native iOS/Android and real hosted image delivery remain untested.

TypeScript/Vite production builds passed for local mode and Supabase mode with explicitly nonsecret placeholder settings. Hosted Auth/PostgREST, Cloudflare deployment and GitHub scheduled execution were not run without credentials. The hosted bundle produced a non-blocking default 500 kB chunk warning (504.04 kB minified JavaScript); its build still passed. Only `dist/` is deployable. Private research/image metadata remains outside the production bundle. Free service allowances, Mac-off scheduling and permission limitations are described in the cost/scheduling/image guides.

## Remaining limitations

Rights clearance is the primary remaining decision: **no discovered image is publicly authorized**. Fifteen original records still need a suitable confirmed image; retain their fallback. Automatic enrichment processes at most three new/unattempted discovered opportunities per successful run and currently needs a manual retry for failed/uncertain attempts; it does not periodically revalidate every old image. Dynamic/script-only pages, unreviewed CDN hosts, access restrictions, large headers and conservative matching can leave results unknown. Metadata and cached header fingerprints do not provide semantic or legal verification. No paid AI, unrestricted scraping, copied-image hosting, user accounts or premium features were added.
