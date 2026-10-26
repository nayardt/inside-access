# v0.6 monthly operating-cost estimate

Checked against official provider documentation on **24 October 2026**. The initial recurring service target remains **€0/month**, within the €15 ceiling. No paid plan, purchase, AI workflow, email service or public hosting was activated.

| Component | Initial configuration | Recurring estimate |
| --- | --- | ---: |
| Current local application/database | Existing Mac, Node + disk-backed PostgreSQL | €0 service fees |
| Local daily discovery | Same running Node process; one permitted public API | €0 service fees |
| Optional hosted frontend | Cloudflare Pages Free, static React assets, provider subdomain | €0 within limits |
| Optional hosted database/Auth | Supabase Free, one project | €0 within limits |
| Optional private source repo | GitHub Free | €0 |
| Optional scheduled cloud discovery | One daily bounded Linux Actions job within included allowance | €0 within limits |
| Email and paid AI | Disabled/not used | €0 |
| **Total service target** | Excludes existing internet/computer/electricity and human research time | **€0/month** |

Local monitoring runs only while the Mac and app are running. No always-on hosting is needed for local validation. A later hosted setup uses existing free allowances; it has not been deployed in this build.

Supabase Free currently includes a 500 MB database, 50,000 monthly active users, 5 GB egress and 1 GB storage. Low-activity free projects can pause after a week. Automatic paid-plan backups/uptime are not assumed. Source snapshots and audit history grow: monitor usage and export/back up before expanding monitoring.

Cloudflare static asset requests are free; this architecture deploys no Pages Functions. Pages Free allows 500 builds/month. GitHub Free includes 2,000 standard-runner minutes/month for private repositories and 500 MB shared artifact storage. A five-minute maximum daily discovery job would consume at most 155 minutes in a 31-day month, plus CI. Account allowances may be shared with other work. Real GitHub job duration has not been measured here.

The connector's normal daily limit is two API calls, with at most one retry each. It makes no paid API calls. Manual checks add requests but do not activate paid features. This is a bounded low-volume validation estimate, not a guarantee of future provider pricing or account-wide spend. Keep paid overages blocked; seek approval before upgrading. Supabase Pro starts at US$25/month and is outside this initial configuration.

Official sources:

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/pages/platform/limits/
- https://docs.github.com/en/billing/concepts/product-billing/github-actions

## v0.6.1 change

The exception-review controls and audit migration introduce no new service, subscription, background job, external API call or paid workflow. The existing €15/month operating ceiling and free-tier configuration remain. No paid service was activated during this update.
