# Discovery scheduling without the Mac

Recommendation for validation: **private GitHub Actions + Supabase Free**, with the app and worker sharing the same hosted database. Estimated service fees are €0/month while within their included allowances; keep the €15/month ceiling and do not authorize overages/upgrades. This is a daily best-effort monitor, not a time-critical or guaranteed scheduler.

## Prepared workflow

`.github/workflows/discovery.yml` runs at **07:17 UTC daily**, off the busy start-of-hour, and supports **workflow_dispatch** for manual execution. It only runs in a private repository with repository variable `DISCOVERY_ENABLED=true`. Each job is capped at five minutes. Source leases/due times prevent overlapping ingestion, and failures retain retry backoff. SQL ingestion can create candidates and withhold changed/expired records; it cannot approve or publish them.

GitHub documents 2,000 included minutes/month for Free private repositories. At five minutes/day, the scheduled job's cap is 155 minutes in a 31-day month, excluding manual runs, CI and other account usage. GitHub also documents possible schedule delays and dropped jobs under load. Check last-success timestamps and run errors; an SLA is not included.

## Owner-side setup still needed

1. Provide/select the private GitHub repository and Supabase **Free** project. No repository or cloud database was created/deployed during this build. Do not upgrade plans or add paid features.
2. Back up the existing Mac project/database and export records before any migration. The existing `db:setup -- --remote` command applies schema/imports seeds; it does **not** transfer your edited Mac records or local login. Review and migrate that existing data into the shared hosted database before switching. Keep the original local database intact. The cloud authentication/admin membership must be configured separately and privately; local password hashes are not Supabase Auth users.
3. Apply all pending SQL migrations, including 007, to the authorized hosted database; verify RLS/admin access in private staging.
4. Enable/review W-001 in that hosted database. Set private Actions secrets **SUPABASE_URL** and **SUPABASE_SERVICE_ROLE_KEY**. This key is server-only, broad access: never put it in a `VITE_` variable, frontend bundle, chat message or repository file.
5. Set repository variable **DISCOVERY_ENABLED=true** only when ready. Keep paid overages blocked. Put the workflow on the repository's default branch, then run **workflow_dispatch** once and check the job log and database status before relying on the daily schedule.
6. Configure the app's Supabase frontend mode to that same hosted database (public URL/publishable key only). Otherwise your local embedded database will not display cloud-created candidates. Hosted dashboard manual checks currently direct the operator to GitHub's manual workflow; the local dashboard Run discovery button is fully implemented.

GitHub Actions and Supabase Auth/PostgREST execution require owner account access and have not been tested live here. No public production deployment or paid service is required to prepare this path. Public hosting remains a separate approval step.

## Free-tier limits and sources

- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions): private Free allowance of 2,000 minutes; shared with other repository/account work.
- [GitHub scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule): default-branch requirement, possible delays/dropped jobs.
- [Supabase pricing](https://supabase.com/pricing): Free 500 MB database / 5 GB egress; projects may pause after one week of inactivity. Automatic database backups are not included in Free. Retain/export your own backups.

A Cloudflare Worker schedule is another small-job option, but would require a separate runtime adapter and credential/deployment work. The existing tested Node connector already fits GitHub's runner, so GitHub is the simpler next setup. Neither option can write into a switched-off Mac's local database without changing where the data is hosted.
