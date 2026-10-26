# Cloudflare hosting handover — 26 October 2026

Cloudflare connection identity matches the project owner. The connected account is 7f66ca1d65e8949f984b361f9f9b284b. Existing Pages projects: zero, checked before and after the setup attempt.

## Prepared configuration

[ops/cloudflare-pages.json](../ops/cloudflare-pages.json) contains the reviewed Pages creation request. It uses the existing private nayardt/inside-access repository, Node 24, Supabase client mode, the existing database URL and a browser-safe publishable key. There is no service-role key, database password, private export or Auth credential in this configuration.

- Production branch: main.
- Build: npm test && npm run verify:data && npm run build.
- Output: dist.
- Production automatic deployments: disabled pending explicit owner approval.
- Preview automatic deployments: none.
- Proposed project name: inside-access-nayardt. No hostname has been provisioned or verified yet.
- No D1 migration, paid Worker, domain purchase or new account is required.

After the owner explicitly approves deployment and automatic updates, enable production deployments only; retain previews disabled unless explicitly needed. Every deploy then runs tests and reconciliation before building. Keep the manual GitHub deployment workflow disabled as a fallback to avoid two deployment systems. Do not ask the founder to download updates or use Terminal.

## Actual blocker

The Pages project creation request was rejected with HTTP 401, Cloudflare code 8000011: an internal issue with the Pages Git installation. Account identity and Pages listing still succeed; the connector reports Pages Write scope. This does not prove the GitHub app is absent, but the Git connection is not usable.

The owner must authorize/repair Cloudflare Workers & Pages access to **only** nayardt/inside-access through the official Git integration. Installing the ChatGPT GitHub connector does not give Cloudflare repository access. Do not create a Direct Upload project as a workaround: that would complicate the intended native Git integration.

Official instructions: https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/
GitHub app: https://github.com/apps/cloudflare-workers-and-pages

Stop before Save and Deploy. After authorization, retry the same disabled-deployment configuration once and inspect both the project and deployment list. If the same error remains, reconnect the Cloudflare connector as directed by its credential error; do not repeatedly retry or request a broad API token.

## Cost and readiness limits

Static Pages asset requests are free under Cloudflare's current published pricing: https://developers.cloudflare.com/pages/functions/pricing/ . This request does not activate a paid subscription or any Functions. Account billing subscriptions could not be read because the OAuth connection has no Billing Read scope; no billing setting was changed and no additional billing credential is required for this preparation.

Owner Auth password/email verification and app-admin membership remain pending. Hosted discovery triggering, image enrichment and backup operations also require their private cloud execution path and restore verification; those local-only controls must not be described as fully functional on Pages. The Mac app remains the operational fallback until a complete hosted smoke test passes.

No Pages project or frontend deployment was created by this attempt. The imported database is unchanged.

## Build verification

The frontend built successfully with the actual hosted Supabase URL and modern publishable key: TypeScript check passed, Vite transformed 70 modules, build completed in 1.09 seconds. The bundle was 509.53 kB (143.66 kB gzip); Vite emitted its nonfatal 500 kB chunk-size advisory. Configuration assertions passed: both automatic deployment types disabled, cloud mode selected and publishable key only. No source application changes were made in this stage; the preceding GitHub CI run passed 124 tests.
