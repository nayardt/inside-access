# Cloudflare hosting setup — 26 October 2026

The owner explicitly approved creating the project with deployment paused. The project was created successfully and read back through the Cloudflare API.

## Verified current state

| Item | Actual value |
| --- | --- |
| Project | inside-access-nayardt |
| Project ID | b1758e10-ff03-4381-9eee-a669901cfef7 |
| Account | 7f66ca1d65e8949f984b361f9f9b284b |
| Git repository | private nayardt/inside-access |
| Production branch | main |
| Production automatic deployments | disabled |
| Preview automatic deployments | none |
| Deployments | 0 |
| Latest / canonical deployment | null / null |
| Build command | npm test && npm run verify:data && npm run build |
| Build output | dist |

Both production and preview environment settings match the prepared [configuration](../ops/cloudflare-pages.json): Node 24, Supabase mode, the existing database URL and its modern browser-safe publishable key. No service-role key or database password was installed in the frontend configuration. The assigned subdomain is inside-access-nayardt.pages.dev; there is no deployed website at this stage.

[Machine-readable verification](cloudflare-project-verification.json) records the actual project GET and deployment-list results. No application code or database content was changed in this hosting step. No paid service was activated.

The API also returns the deprecated source.config.deployments_enabled flag as true. The current, granular controls were explicitly checked: production_deployments_enabled is false and preview_deployment_setting is none. These are the documented branch controls; do not mistake the deprecated flag for an active release.

## Updates after owner-approved cutover

The native Cloudflare Git integration will handle updates from main when production deployments are enabled after approval. Every release must pass tests and data checks before the frontend build. Retain previews disabled unless required. Keep the manual GitHub deployment workflow disabled as a fallback to avoid two deployment systems. Everyday founder operation should require a browser, without downloading ZIPs or using Terminal.

## Remaining readiness gates

1. Complete owner-controlled Auth password/email verification and app-admin membership; verify real login and nonadmin rejection. Do not enter or request passwords in chat.
2. Connect hosted discovery triggering, image enrichment and backup execution, and verify restore. These currently have local-only execution paths and must not be described as fully operational on Pages.
3. Perform hosted smoke tests and review the initial release with the owner.
4. Obtain explicit deployment approval before creating any frontend deployment or enabling production automatic deployments.

The Mac app remains the operational fallback until cutover checks pass. No new opportunity approval, publication decision or image approval was made by project setup.

## Previous blocker and recovery

The earlier Pages Git installation error (HTTP 401 / 8000011) was resolved after the owner's GitHub authorization and connection setup. A read-only repository configuration query subsequently returned HTTP 200 and detected npm and the actual build script. A later check-only turn did not authorize project creation; automatic review blocked that attempt. After the owner specifically approved the paused project, creation returned HTTP 200 and verification confirmed zero deployments.

Remote-browser sign-in had separately failed with a website-surfaced HTTP 403. No further sign-in attempts, credential exposure or security bypass were used.

## Cost basis and limitations

Static Pages asset requests are free under Cloudflare's current pricing: https://developers.cloudflare.com/pages/functions/pricing/ . This setup adds no Functions, paid Workers, D1, domain purchase or paid subscription. Existing Supabase Free remains the database/Auth architecture. The validation target remains at or below €15/month; usage must stay within free quotas.

Account subscriptions could not be inspected because this OAuth connection lacks Billing Read scope. No billing settings were changed; a broad billing token is not needed for this setup.

The cloud-configured frontend already passed TypeScript and Vite production build: 70 modules, 509.53 kB JavaScript / 143.66 kB gzip, with a nonfatal bundle-size advisory. The preceding application CI passed 124 tests, data reconciliation and production build. No new application tests are claimed for this configuration-only step.
