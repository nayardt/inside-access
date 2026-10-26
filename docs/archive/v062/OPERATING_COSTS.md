# v0.6.2 operating cost — checked 25 October 2026

Initial ceiling: **€15/month**. No paid service was activated. The local application, source connector and scheduler require no service subscription; existing Mac/internet/electricity and administrative time are excluded.

| Configuration | Estimated service cost | Conditions |
| --- | --- | --- |
| Current local app + manual/local daily discovery | €0/month | Mac/app running; public Paris API needs no key |
| Recommended future private GitHub Actions + Supabase Free | €0/month within included allowances | Shared hosted database, owner account setup and staging tests required; not activated |
| Paid plans/overages | Not authorized | Approval required; Supabase Pro is not part of this configuration |

The GitHub job has a five-minute maximum and one daily schedule: at most 155 scheduled job minutes in a 31-day month, plus manual checks/CI/other account usage. GitHub Free private repositories include 2,000 minutes/month and 500 MB artifact storage. The existing workflow does not upload large data artifacts. Keep spending/overage blocks in place.

Supabase Free includes a 500 MB database and 5 GB egress. Free projects may pause after a week of inactivity; automatic database backups are not included. This is a validation setup with monitoring and retained backups, not a production SLA. No paid AI, email delivery, scraping service or image service is used.

Official sources: [GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [Supabase pricing](https://supabase.com/pricing), [GitHub schedule limits](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Account-wide usage may affect the remaining free allowance. See `SCHEDULING.md` before activating a cloud worker.
