# Inside Access v0.6.2 — Discovery activation and validation

Adds dashboard Run discovery, one-time reviewed Paris activation, persistent last-success/source/error/queue status, detailed execution counts, and a direct discovered-candidate queue link. Source retrieval timestamps are displayed separately from verification dates. Unsupported connectors and per-source failures are reported explicitly.

The real authenticated HTTP pipeline checked the official Paris API: 40 observations, 2 private candidates, 0 errors. A fresh live repeat and an exact captured-live replay created 0 additional candidates or changes. Both candidates remained pending/unpublished. Live logs and normalized evidence are included. Only Paris is implemented; 21 sources remain watchlist entries.

92 automated tests passed. Synthetic fixtures separately exercise changes, expiry, closure/cancellation, source failure and access controls. Additive migration 007 adds a read-only admin status RPC; the six previous migrations and existing data remain intact. The existing Mac installation still needs this patch and the dashboard source-enable action; we did not operate that Mac remotely.

Use the existing safe updater and login; do not restore a starter snapshot. The updater now prints the exact command to start the retained original installation. No paid services, user accounts/premium features, cloud schedule or public deployment were activated. GitHub Actions + a shared Supabase Free database is the recommended future Mac-independent schedule; exact account/data-transfer/secret requirements are in SCHEDULING.md.
