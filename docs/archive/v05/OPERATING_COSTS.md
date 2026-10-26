# Monthly operating-cost estimate

Checked against official provider pricing on **24 October 2026**. Target: **€0/month recurring infrastructure** for the initial validation workload, within the €15 ceiling. This assumes free tiers remain available and usage stays within their shared account allowances. Nothing has been purchased, activated or upgraded.

| Component | Validation configuration | Monthly target |
| --- | --- | ---: |
| Frontend hosting | Cloudflare Pages Free; provider subdomain; static React build | €0 |
| PostgreSQL + Auth | Supabase Free; one project; no paid add-ons | €0 |
| Source repository | GitHub Free private repository | €0 |
| Scheduled discovery | One bounded daily Linux GitHub Actions job, within included minutes | €0 |
| Email delivery | Disabled; no provider subscription | €0 |
| AI services | No paid AI workflows | €0 |
| Backups | Manual secure local dumps during validation; no paid backup service | €0 |
| **Total recurring service target** | Excludes existing computer/internet and human maintenance time | **€0** |

No custom domain is necessary. Purchasing one is optional and outside this estimate; it requires approval.

## Limits and budget controls

- **Supabase Free:** 500 MB database, 50,000 monthly active users, 5 GB egress and 1 GB file storage. Up to two active free projects. Low-activity projects can pause after one week; Free is suitable for validation, not a promise of uninterrupted production service. Automatic daily backups are not included. Monitor database/audit growth and export regularly.
- **Cloudflare Pages Free:** 500 builds/month and 20,000 files. This app deploys static assets only, with no Pages Functions/Workers runtime billing.
- **GitHub Free:** 2,000 standard-runner minutes/month for private repositories, 500 MB shared artifact storage and 10 GB repository cache allowance. Allowances may be shared with other repositories. The discovery workflow has a five-minute maximum; a daily run is at most roughly 155 minutes over 31 days, plus CI. Actual install/run time has not been measured on GitHub runners. No job artifacts are uploaded.
- Keep paid overage spending blocked in provider billing settings. No code can guarantee an account-wide €15 cap if other services/repositories or paid features are activated separately. Reassess before growth or a public launch.
- Supabase Pro starts at **US$25/month**, outside this validation configuration. Do not upgrade without explicit approval and a revised budget.

Thousands of rows alone should not require an upgrade; traffic, audit/snapshot growth, sustained reliability and backup needs may. This is an engineering estimate, not a capacity or uptime guarantee.

## Official sources

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://developers.cloudflare.com/pages/platform/limits/
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
