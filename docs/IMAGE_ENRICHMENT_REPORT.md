# Inside Access v0.6.3 — Actual event image results

25 October 2026. The live backfill checked **all 30 selected opportunities**, using their actual source/booking/additional URLs and published image metadata. It found **20 technically suitable image candidates across 15 opportunities**. **0 are approved for public display**: reuse, direct-embedding permission and attribution requirements still need human clearance. No opportunities/images were invented, generated or automatically approved.

The other 15 records keep the premium fallback. A zero result is accurate, not a failed import. Full per-source results, rejected/uncertain metadata, URLs, dimensions, dates, source titles and errors are included in `enrichment/selected-images-v063.json` inside the application package. Missing rights/dimensions/credits remain unknown. The snapshot contains 226 metadata candidates including filtered/uncertain images, not 226 suitable event images. No image binaries are distributed.

The application upgrade imports these actual private findings once for matching original IDs/titles/source links, while preserving existing image checks and owner edits. Open **Admin → Opportunities → Review → Images**. An image's approval is independent from listing approval/publication. A public URL, Open Graph tag or database licence is not a commercial image-reuse licence.

## Results for all 30 selected records

| Stable ID | Original opportunity | Result | Original source |
| --- | --- | --- | --- |
| IA-AMS-001 | IDFA 2026 — regular public screenings | No suitable image: event match not established; image fetch not confirmed | [Source](<https://festival.idfa.nl/en/practical/helpdesk/>) |
| IA-AMS-002 | PAN Amsterdam 2026 — public fair admission | No suitable image: event match not established | [Source](<https://www.pan.nl/en/visit>) |
| IA-AMS-003 | 14th — IDFA Hit and talk with Ava DuVernay | 1 technically suitable; private review required | [Source](<https://festival.idfa.nl/en/film/ec589c48-fff7-44e9-a4a0-60b70b593149/14th/>) |
| IA-AMS-004 | IDFA × de Volkskrant — curated festival day | No suitable image: event match not established; image fetch not confirmed | [Source](<https://festival.idfa.nl/en/composition/b5a35261-4afa-46f1-ad23-035af0d3a5ee/de-volkskrantdag/>) |
| IA-AMS-005 | Amsterdam Light Festival — Edition 15 | No suitable image: no extracted image metadata | [Source](<https://amsterdamlightfestival.com/en/faq-general>) |
| IA-AMS-006 | Haantjes — club guest and passer-by background roles | 1 technically suitable; private review required | [Source](<https://bluecirclecasting.nl/rollen/haantjes>) |
| IA-AMS-007 | Eva — live studio audience | 3 technically suitable; private review required | [Source](<https://eva.avrotros.nl/pagina/bijwonen-2>) |
| IA-AMS-008 | Imagine Fantastic Film Festival 2026 | 1 technically suitable; private review required | [Source](<https://www.imaginefilmfestival.nl/haal-nu-je-kaartjes-voor-imagine-2026/>) |
| IA-AMS-009 | IDFA DocLab: Shared Realities — interactive exhibition | 1 technically suitable; private review required | [Source](<https://festival.idfa.nl/en/composition/e5c72e0d-c1c5-4fa2-8650-3c2712554b81/doclab-exhibition/>) |
| IA-LON-001 | Gillian Anderson in conversation | 1 technically suitable; private review required | [Source](<https://whatson.bfi.org.uk/Online/default.asp?BOparam%3A%3AWScontent%3A%3AloadArticle%3A%3Apermalink=gillian-anderson-in-conversation>) |
| IA-LON-002 | Whispers in the Woods — UK premiere and Vincent Munier Q&A | 1 technically suitable; private review required | [Source](<https://whatson.bfi.org.uk/imax/Online/default.asp?BOparam%3A%3AWScontent%3A%3AloadArticle%3A%3Apermalink=whispers-in-the-woods-uk-premiere-qanda>) |
| IA-LON-003 | Olivia Wilde in conversation | 1 technically suitable; private review required | [Source](<https://whatson.bfi.org.uk/Online/default.asp?BOparam%3A%3AWScontent%3A%3AloadArticle%3A%3Apermalink=olivia-wilde-in-conversation>) |
| IA-LON-004 | Godzilla Minus Zero — BFI IMAX exclusive preview | 2 technically suitable; private review required | [Source](<https://whatson.bfi.org.uk/imax/Online/default.asp?BOparam%3A%3AWScontent%3A%3AloadArticle%3A%3Apermalink=godzilla-minus-zero-imax-exclusive-preview>) |
| IA-LON-005 | Cunk on Cinema — TV preview and Charlie Brooker/Diane Morgan Q&A | 1 technically suitable; private review required | [Source](<https://whatson.bfi.org.uk/Online/default.asp?BOparam%3A%3AWScontent%3A%3AloadArticle%3A%3Apermalink=cunk-on-cinema-tv-preview-qanda>) |
| IA-LON-006 | Skate Lates with Aperol Spritz | No suitable image: image fetch not confirmed | [Source](<https://www.somersethouse.org.uk/whats-on/skate-lates-26-27>) |
| IA-LON-007 | The Fashion Awards 2026 — public general admission | No suitable image: publisher access/policy restriction on a source; no extracted image metadata | [Source](<https://fashionawards.com/Tickets>) |
| IA-LON-008 | Trivial Pursuit with LeVar Burton — paid studio audience | No suitable image: no extracted image metadata | [Source](<https://www.sroaudiences.com/application.asp?show_id=586>) |
| IA-LON-009 | Have I Got News for You — studio audience | No suitable image: no extracted image metadata | [Source](<https://www.sroaudiences.com/application.asp?show_id=3160>) |
| IA-LON-010 | Fashion students and dressmakers — feature-film background casting | No suitable image: generic/logo candidates filtered; low resolution; event match not established | [Source](<https://www.castingcollective.co.uk/artiste/casting-calls/fashion-students-london>) |
| IA-LON-011 | Hunger Games: Sunrise on the Reaping — red-carpet fan pens | No suitable image: no extracted image metadata | [Source](<https://www.applausestore.com/book-hunger-games-sunrise-on-the-reaping-uk-fan-screening-event-fan-Pen-invite>) |
| IA-LON-012 | Martin McDonagh in conversation | 1 technically suitable; private review required | [Source](<https://whatson.bfi.org.uk/Online/default.asp?BOparam%3A%3AWScontent%3A%3AloadArticle%3A%3Apermalink=martin-mcdonagh-in-conversation>) |
| IA-PAR-001 | Miu Miu × Alice Diop — Geste de Consolation | No suitable image: event match not established; image fetch not confirmed | [Source](<https://www.miumiu.com/ww/en/miumiu-club/special-projects/geste-de-consolation.html>) |
| IA-PAR-002 | Les midinettes — fashion-history lecture | 2 technically suitable; private review required | [Source](<https://www.paris.fr/evenements/conference-les-midinettes-ces-grandes-oubliees-du-monde-de-la-mode-126498>) |
| IA-PAR-003 | Paris Photo 2026 — public fair and optional preview access | No suitable image: low resolution | [Source](<https://www.parisphoto.com/en-gb/info/tickets.html>) |
| IA-PAR-004 | TEN and Broc’Japan — Japanese art and vintage pop-up | 1 technically suitable; private review required | [Source](<https://www.4u-foryou.org/>) |
| IA-PAR-005 | Nona Source — La Grande Braderie | 2 technically suitable; private review required | [Source](<https://www.nona-source.com/>) |
| IA-PAR-006 | Salon du Chocolat & de la Pâtisserie — inaugural evening | 1 technically suitable; private review required | [Source](<https://www.salon-du-chocolat.com/fr-FR/paris/infos-pratiques/billetterie>) |
| IA-PAR-007 | L’Écran Pop: Mamma Mia! — final Grand Rex karaoke nights | No suitable image: publisher access/policy restriction on a source; low resolution; event match not established | [Source](<https://www.legrandrex.com/mobile/fiche-film.php?id=5542>) |
| IA-PAR-008 | Forty Love — preview with the film team | No suitable image: publisher access/policy restriction on a source; low resolution; event match not established | [Source](<https://www.legrandrex.com/mobile/fiche-film.php?id=5645>) |
| IA-PAR-009 | Astérix – Le Royaume de Nubie — preview with the film team | No suitable image: publisher access/policy restriction on a source; low resolution; event match not established | [Source](<https://www.legrandrex.com/mobile/fiche-film.php?id=5685>) |

## Suitable candidate evidence

These are links for private review, not public-use approvals. Every row is pending verification/approval with unknown reuse/embedding rights. Where a credit or licence was absent, it remains unknown. Actual timestamps, source-page associations and bounded raster probes are retained in the JSON snapshot.

| Stable ID | Method | Confirmed dimensions | Image metadata URL | Credit found |
| --- | --- | --- | --- | --- |
| IA-AMS-003 | inline_event_image | 2500 × 1874 | [Private review link](<https://my.idfa.nl/image-transforms/9862852c-7432-4a4e-91bc-396f068014f3/2500.jpeg>) | Unknown |
| IA-AMS-006 | open_graph | 1260 × 620 | [Private review link](<https://bluecirclecasting.nl/media/3886/conversions/E4A5B377C0BCFABC5819DC22CC07E79FA9567167D2A251C2224EBBC67D0E0105-socials.jpg>) | Unknown |
| IA-AMS-007 | inline_event_image | 1419 × 1065 | [Private review link](<https://eva.avrotros.nl/assets/images/eva-bijwonen.webp?key=1024w-3x2>) | Unknown |
| IA-AMS-007 | inline_event_image | 1419 × 1065 | [Private review link](<https://eva.avrotros.nl/assets/images/over-eva.webp?key=1024w-3x2>) | Unknown |
| IA-AMS-007 | open_graph | 1200 × 630 | [Private review link](<https://eva.avrotros.nl/cms-assets/dd9b20fc-64c1-479c-8d8b-e009ebb67d0e?key=og-image>) | Unknown |
| IA-AMS-008 | open_graph | 1415 × 796 | [Private review link](<https://www.imaginefilmfestival.nl/wp-content/uploads/2026/10/grotesque-copy.jpeg>) | Unknown |
| IA-AMS-009 | inline_event_image | 2500 × 1667 | [Private review link](<https://my.idfa.nl/image-transforms/9a80fa68-7a08-488c-b3da-8f8fc8fb13f0/2500.jpeg>) | Unknown |
| IA-LON-001 | inline_event_image | 1280 × 720 | [Private review link](<https://whatson.bfi.org.uk/ArticleMedia/Images/WhatsOn%20images/20261011/gillian-anderson-01.jpeg>) | Unknown |
| IA-LON-002 | inline_event_image | 1280 × 720 | [Private review link](<https://whatson.bfi.org.uk/ArticleMedia/Images/WhatsOn%20images/20261011/whisper-in-the-woods-02.jpg>) | Unknown |
| IA-LON-003 | inline_event_image | 1280 × 720 | [Private review link](<https://whatson.bfi.org.uk/ArticleMedia/Images/WhatsOn%20images/20261011/olivia-wilde-01.jpeg>) | Unknown |
| IA-LON-004 | inline_event_image | 1280 × 720 | [Private review link](<https://whatson.bfi.org.uk/ArticleMedia/Images/WhatsOn%20images/20261011/godzilla-minus-zero-02.jpg>) | Unknown |
| IA-LON-004 | inline_event_image | 1280 × 720 | [Private review link](<https://whatson.bfi.org.uk/ArticleMedia/Images/WhatsOn%20images/20261011/godzilla-minus-zero-03.jpg>) | Unknown |
| IA-LON-005 | inline_event_image | 1280 × 720 | [Private review link](<https://whatson.bfi.org.uk/ArticleMedia/Images/WhatsOn%20images/20261011/cunk-on-cinema-01.jpeg>) | Unknown |
| IA-LON-012 | inline_event_image | 1280 × 720 | [Private review link](<https://whatson.bfi.org.uk/ArticleMedia/Images/WhatsOn%20images/20261011/martin-mcdonagh-01.jpeg>) | Unknown |
| IA-PAR-002 | json_ld_event | 1200 × 750 | [Private review link](<https://cdn.paris.fr/qfapv4/2026/09/11/huge-2eba45f5918ab9a8d3d009c22200265d.jpg>) | Unknown |
| IA-PAR-002 | open_graph | 1040 × 395 | [Private review link](<https://www.billetweb.fr/files/page/thumb/conference-les-midinettes-ces-grandes-oubliees-du-monde-de-la-mode.jpg?v=1789204466>) | Unknown |
| IA-PAR-004 | json_ld_event | 1200 × 750 | [Private review link](<https://cdn.paris.fr/qfapv4/2026/10/13/huge-a76d17e80b15e47bcb43c162d74ba2a6.jpg>) | Unknown |
| IA-PAR-005 | json_ld_event | 940 × 476 | [Private review link](<https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1195670247%2F2895856286421%2F1%2Foriginal.20261013-082826?crop=focalpoint&fit=crop&w=940&auto=format%2Ccompress&q=75&sharp=10&fp-x=0.5&fp-y=0.5&s=4898ec0459e5991425dca351265c8705>) | Unknown |
| IA-PAR-005 | json_ld_event | 1200 × 750 | [Private review link](<https://cdn.paris.fr/qfapv4/2026/10/21/huge-ca63671ce99e8bb8be1c0d72306603b7.png>) | Unknown |
| IA-PAR-006 | inline_event_image | 2000 × 755 | [Private review link](<https://www.salon-du-chocolat.com/-/media/Project/Comexposium-Master1/Master1-Chocolat/_banner-paris/banner-Salon-Chocolat-Portraits_Portraits-Modeles-Paris.jpg?rev=0fb5624049cc486dacae6b312f2bcb5a&w=+2000&hash=AC57EB26EA2F9ECD20FF1D9A8F112CC0>) | Unknown |

## What was actually validated

- One real source image for each of the 15 found records was visually inspected. The scope is **15 images, not all 20 candidates**. Content was consistent with source event/production/experience metadata; some are programme illustrations or portraits rather than event photographs. This does not identify depicted people or establish copyright permission. Observations: `docs/image-visual-qa-v063.json`.
- A repeated backfill checked 30 records with **4 requests, 160 cache hits, zero image rows inserted/refreshed and zero duplicate groups**. Existing opportunity/source values were unchanged; anonymous public visibility remained zero. Evidence: `docs/image-repeat-v063.json`.
- The real **Find images** admin HTTP action retrieved the official Haantjes production image (1260 × 620), with four requests on the first check and zero on the repeat. Review entries stayed private, image rows stayed identical and opportunity data/public visibility did not change. Evidence: `docs/image-admin-live-v063.json` and `.log`.
- A separate real authenticated discovery run observed 40 official Paris source records and created **two private candidates**, automatically finding one suitable image candidate for each. Neither opportunities nor images were approved or published; repeated discovery produced zero duplicates. Evidence: `docs/discovery-image-integration-v063.json` and `.log`.
- A fresh database imported all 30 image-check results with 20 suitable candidates across 15 records. Second import inserted zero and skipped the existing 30 checks. Owner changes and later checks take precedence over the bundled snapshot.
- **120 automated tests passed**, including permission gates, independent image approval, replacement, expiry, policy errors, image load fallback and caching. Chrome mobile/desktop previews loaded real source imagery without horizontal overflow; native macOS/Safari/iOS/Android and hosted delivery were not available for execution.

## Limits and next decisions

Confirm the specific chosen image and actual intended reuse/direct-embedding permission before approval. Keep unknown rights unknown. Respect the publisher's terms, expiry, credit and restrictions. Reject unrelated/generic material; use an authorized manual replacement if available. Fifteen records still need a suitable confirmed image, and automatic metadata extraction can miss valid imagery or associate programme artwork with a broader experience. Logos, low-quality images, expired/conflicting metadata and inaccessible/blocked images are not treated as approved substitutes.

Current image processing is bounded and caches metadata; it does not run large-scale scraping, generate imagery or buy a licence. Automatic discovery attempts up to three unattempted private candidates per successful source run; failed checks currently need manual retry. No periodic sweep revalidates all older images yet. The current local setup adds **€0/month in service subscriptions** and remains within the €15/month target. No paid service or public production deployment was activated.
