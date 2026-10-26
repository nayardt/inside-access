# Connector status — v0.6.3, 25 October 2026

Only `paris-open-data` is registered in `discovery/index.ts`. Its fetch/check methods are implemented and tested against the documented public API. There are no fabricated success stubs for the other sources: they remain watchlist records. Synthetic data exists only in explicit tests/layout fixtures.

| Source | Watchlist name | Operational status |
| --- | --- | --- |
| W-001 | Ville de Paris — Que Faire à Paris dataset | Implemented; two authenticated live HTTP checks passed; 2 private candidates created. |
| W-002 | BFI Southbank — Previews and events | Watchlist only; no connector implemented or executed. |
| W-003 | BFI IMAX — Special screenings | Watchlist only; no connector implemented or executed. |
| W-004 | SRO Audiences — Current shows | Watchlist only; no connector implemented or executed. |
| W-005 | ApplauseStore — Show calendar and event pages | Watchlist only; no connector implemented or executed. |
| W-006 | Blue Circle Casting — Upcoming calls | Watchlist only; no connector implemented or executed. |
| W-007 | Casting Collective — Specific casting calls | Watchlist only; no connector implemented or executed. |
| W-008 | Le Grand Rex — Upcoming and special screenings | Watchlist only; no connector implemented or executed. |
| W-009 | Eva / AVROTROS — Audience tickets | Watchlist only; no connector implemented or executed. |
| W-010 | IDFA — Festival programme and practical ticket information | Watchlist only; no connector implemented or executed. |
| W-011 | Imagine Fantastic Film Festival — Programme | Watchlist only; no connector implemented or executed. |
| W-012 | FHCM — Paris Fashion Week calendar | Watchlist only; no connector implemented or executed. |
| W-013 | Galeries Lafayette — Original Fashion Shows | Watchlist only; no connector implemented or executed. |
| W-014 | Nona Source — Brand event announcements | Watchlist only; no connector implemented or executed. |
| W-015 | Somerset House — What’s On | Watchlist only; no connector implemented or executed. |
| W-016 | Cassandra — Television recording calendar | Watchlist only; no connector implemented or executed. |
| W-017 | Idille Émissions | Watchlist only; no connector implemented or executed. |
| W-018 | Casting Events — Public Émission | Watchlist only; no connector implemented or executed. |
| W-019 | Filmcastings.nl — Background listings | Watchlist only; no connector implemented or executed. |
| W-020 | Casting Collective — General registration | Watchlist only; no connector implemented or executed. |
| W-021 | 2027 EE BAFTA Film Awards — fan-pen interest page | Watchlist only; no connector implemented or executed. |
| W-022 | BFI London Film Festival — Future red-carpet arrangements | Watchlist only; no connector implemented or executed. |

The live source is a participatory calendar: retrieval does not verify original-organizer eligibility or admission. No API key is needed locally. Source enablement, connector configuration and a dated source-review acknowledgement are required. An admin can now perform that one-time activation from the overview. Unknown or unsupported configured connectors are reported as unavailable, not silently skipped.

Manual checks use the authenticated admin endpoint. Local automatic checks poll due settings every minute; enabled sources are checked daily by default. GitHub Actions scheduling is prepared but not activated. Bounded coverage is latest 40 updated Paris records plus at most 20 rotating tracked IDs; no exhaustive catalogue, publication-time cursor or complete cancellation coverage is claimed.

## Image enrichment

OG/Twitter/JSON-LD/inline metadata parsers and the Paris API cover adapter are implemented. Live backfill checked all 30 original source sets, finding suitable candidates for 15. Site access is not universally available; see `IMAGE_ENRICHMENT_REPORT.md`. This does not create 21 additional opportunity-discovery connectors or grant image rights.
