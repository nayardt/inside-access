# Event image enrichment — v0.6.3

## Processing and evidence

The bounded image worker reads original source/booking/additional URLs (at most three pages per opportunity), parses Open Graph, Twitter cards, JSON-LD Event.image/ImageObject and relevant inline images, and consumes official Paris API cover metadata for newly discovered candidates. The latter was tested against live API data. The HTML parsers are tested; a parser's presence does not imply every watchlist site is accessible. Existing opportunity discovery still has one operational connector, `paris-open-data`; the other 21 sources remain a watchlist.

Actual URLs are resolved from published metadata or srcset values. The worker never guesses image paths, generates event imagery, rotates proxies, executes a browser or bypasses a denied source. Technical host allowlists are in `images/network.ts`; inclusion there is not a grant of content rights. Unknown hosts need individual review before automatic fetching. Manual replacement can store another actual HTTPS URL for human review without turning the server into an arbitrary URL proxy.

`opportunity_images` stores stable IDs, opportunity/source/image URLs, extraction method, source title, alt text, credit, nullable attribution requirement, actual dimensions/MIME when verified, retrieval timestamps, licence metadata, explicit unknown rights/delivery status, expiry, quality flags, verification and independent image approval. Bounded header probes record an evidence fingerprint, not a full-file cryptographic integrity guarantee. Event/source page and image probe timestamps remain separately inspectable. Unknown dates, dimensions and rights remain unknown. Header metadata alone cannot establish that an image depicts the event.

Filters reject logos, favicons, trackers, advertising/placeholder paths, tiny images, implausible crops, explicit expired campaign/expiry metadata and conflicting event dates. Suitable automatic candidates need verified raster dimensions of at least 640 × 360 and a contextual event-title match. This deliberately misses some valid images. Exact-word matching excludes generic site/type words and years; humans still verify event relevance. A soft event-match warning can be resolved with an explicit reason; hard quality, policy and expiry failures are not bypassed.

## Permission and publication

All discoveries enter private review. A public URL, Open Graph tag, API cover or ODbL database licence does not establish commercial image reuse or direct-embedding permission. Image-level licence metadata is stored as evidence, never interpreted as automatic approval. ODbL explicitly separates rights in individual contents from database rights.

Admin → Opportunities → Review → Images offers Find images, an explicit private preview, metadata/rights editing, manual replacement, rejection with a reason, approval and withdrawal. Preview loading is opt-in for unapproved candidates and blocked for explicit publisher/use prohibitions. Review the original source when in doubt. Loading a preview makes a direct request to the publisher from the administrator's browser.

Approve image requires all of: verified specific-event match, suitable confirmed dimensions, meaningful alt text, cleared intended reuse, evidence URL and explanation, permission for direct image embedding/hotlinking, known attribution obligations with any required credit, and unexpired image/rights. This release embeds approved source URLs directly; it does not copy images into a CDN or imply storage permission. If only local hosting is permitted, obtain an authorized hosted asset and add its actual URL manually after permission review. Source access/hotlink restrictions can still change; failed loads show the designed fallback.

Image approval never approves/publishes the opportunity. Opportunity publication never approves the image. Anonymous reads receive a narrow approved-image projection only when the opportunity also passes its existing publication gates. Rights/expiry changes hide images; meaningful image-content changes revoke image clearance; listing title/source/date changes revoke image approval. Database RLS and admin RPCs enforce the workflow, with actor identity, time, evidence and diffs in audit history.

## Bounded automatic work and caching

After a successful enabled-source discovery run, up to three previously unattempted discovered opportunities are enriched. Additional opportunities are processed by later runs. Manual Find images processes one opportunity. `npm run images:enrich` checks all 30 selected opportunities; stop the app before using this CLI because embedded PostgreSQL is single-process.

Page/robots metadata cache: 24 hours. Raster-prefix metadata cache: seven days. Ordinary failure retry cache: ten minutes; policy/access blocks: 24 hours. In-run deduplication shares requests. ETag/Last-Modified revalidation is used where supplied. Cached original retrieval times are retained. No HTML bodies or raster image binaries are persisted by the application. Bounds: 10 seconds/request, at most three redirects, 1 MB/page, 256 KiB/image prefix, three image probes and 12 candidate rows per opportunity. Robots, publisher image-preview directives, redirects, TLS and reviewed hosts are checked. A 401/403/429 stops that host for the run.

Automatic processing currently attempts each new discovered opportunity once; failed/uncertain checks need manual retry. There is no automatic weekly image revalidation sweep over every existing listing. Explicit manual/backfill runs re-use the caches and can detect changed headers after cache expiry. Cached content, signed URLs, dynamic scripts, missing publisher metadata and large image headers limit detection. No OCR, face recognition, AI image matching, exhaustive licence inference or unrestricted scraping is implemented.

`npm run images:validate` exercises the real authenticated Find images HTTP endpoint against one original official source in a separate disk-backed proof database, repeats the check, and records private-queue, caching and no-publication evidence. It does not change the working database.

## Database upgrade and snapshot import

Migration 008 adds image tables/RPCs/guards and wraps the existing public projection. Migrations 001–007 remain unchanged. `enrichment/selected-images-v063.json` contains actual source metadata from this build's 30-record live backfill, not image files or test fixtures. Startup/setup imports it privately once for matching original IDs/titles/source links. It skips every opportunity with an existing image check and declines changed title/source records, preserving later checks and decisions. Repeating import inserts zero rows. There is no bundled permission approval.

Keep `enrichment/`, research, server sources and `.local/` private. Local middleware/Vite deny those paths; hosted deployments must upload only `dist/`. Never deploy the project root. For a hosted upgrade, apply 008 using the existing migration owner and run the authorized remote import CLI if the snapshot is wanted. Live hosted RPC/Auth execution still requires staging credentials; only the adapter build was tested here.

Official format/policy references: [Open Graph](https://ogp.me/), [Schema.org Event](https://schema.org/Event), [ImageObject](https://schema.org/ImageObject), [Google image licence metadata](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata), [robots meta directives](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag), [ODbL §2.4](https://opendatacommons.org/licenses/odbl/1-0/).
