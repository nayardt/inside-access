# Operating costs — checked 26 October 2026

Target: ≤€15/month. No new subscription, public deployment or paid feature was activated.

| Component | Validation service estimate | Constraint |
| --- | --- | --- |
| Current local application/database/backups | €0/month subscriptions | Existing Mac, electricity, internet and independent backup destination excluded |
| Private GitHub repository and Actions | €0 within included Free allowance | 2,000 minutes/month, 500 MB artifact storage; account-wide consumption matters |
| Cloudflare Pages frontend | €0 on Free within limits | Only dist; account setup/owner opt-in required |
| Supabase PostgreSQL/Auth | €0 on Free within limits | 500 MB database, 5 GB egress, free project pausing; no included automatic backups |
| Daily hosted discovery | Included in GitHub allowance | Five-minute cap ×31 days ≤155 scheduled minutes/month |
| Prepared encrypted hosted backup job | Included in allowance if activated | Ten-minute cap ×31 ≤310 minutes; 14-day retention, monitor encrypted artifact size |
| CI/release runs | Included if allowance remains | Ten/fifteen-minute caps; 20 releases/checks can add up to 500 minutes |
| Image processing | €0 new subscriptions | Bounded/cached retrieval; no paid image/AI/CDN workflow; rights/hotlink clearance remains required |
| Domain/email/paid monitoring | €0 added | Not activated; custom domains/email are optional future costs |
| **Planned managed validation total** | **€0/month within allowances** | Does not promise an SLA or zero maintenance |

Worst-case listed discovery+backup caps total 465 minutes/month before CI/manual/account-wide jobs. Fourteen 10 MB encrypted backups use about 140 MB before other artifacts; larger databases can exceed the 500 MB allowance, so measure before activation. Local backup files are not uploaded automatically and are not silently deleted; storage grows until reviewed.

A managed production reliability guarantee with included daily managed backups is not established within €15. Supabase Pro starts at US$25/month before applicable tax/exchange, already above the intended validation tier; it was not selected or purchased. Least-cost safe validation path: keep the recoverable local installation while testing the Free managed stack, maintain independent verified backups, accept free-tier pausing/limits and request approval before any paid change. Free-tier jobs are best effort, not a production recovery SLA.

Official references: https://supabase.com/pricing ; https://supabase.com/docs/guides/platform/backups ; https://developers.cloudflare.com/pages/platform/limits/ ; https://developers.cloudflare.com/workers/platform/pricing/ ; https://developers.cloudflare.com/d1/ ; https://docs.github.com/en/actions/reference/limits . Actual billing/usage APIs are not connected; System labels its cost as an estimate.
