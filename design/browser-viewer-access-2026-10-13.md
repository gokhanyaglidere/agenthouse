# Clientless observer access

Status: code implemented and tested, external Cloudflare provisioning pending. No public tunnel, DNS record, email grant or Access application was created in this run. The Mac owner panel remains on its existing private Tailscale URL.

## User experience

The project owner grants an observer's email through Project sharing and explicitly publishes selected work/results. The observer receives a normal HTTPS URL, signs in through Cloudflare Access (email one-time PIN), and sees only assigned projects and published content. No Tailscale, WARP, Claude or editor installation is required on their device. This route is read-only even when the email is also an owner on the private panel.

## Implemented boundary

- Opt-in secondary **listener in the existing gateway process**, loopback only, default disabled. It is not a duplicate control gateway.
- HTTPS hostname and forwarded protocol match the configured viewer origin. The Cloudflare Access JWT is independently checked with jose against the fixed team's JWKS, issuer, application audience, RS256 signature, expiry, issued-at, user subject and email. The unverified email or Tailscale identity headers are never used as an identity on this listener.
- A server-only verified identity forces observer projection. It cannot become owner preview, even for an owner email. Existing grant expiry/revocation checks apply to every data request, including the post-read recheck.
- Only the observer page, compiled static assets and two read-only observer APIs are reachable. Owner/task/session/transcript/backup/sharing routes, mutations and WebSocket upgrades are denied.
- Invalid or missing setup leaves web access disabled without shutting down the private panel. Cloudflare/JWKS verification failure fails closed; no auth fallback.
- Sharing UI reports inactive setup or exposes the configured viewer URL. Observer UI offers logout when browser authentication is active and a readable re-entry action on invalid/HTML login responses.

## Provisioning (requires owner account/domain)

1. Obtain the owner's Cloudflare account, chosen hostname and Zero Trust team name. Account creation/terms and credential entry are completed by the owner; no secrets in chat or Git.
2. Create a self-hosted Access application covering the **entire hostname**. Enable one-time PIN, use explicit observer emails in Allow policy (no Everyone/Bypass), and a suitable session duration.
3. Record the team's issuer URL and the application's audience. Set the existing gateway LaunchAgent environment using `deploy/web-viewer.env.example`. Store real values outside Git; tunnel credentials separately with owner-only permissions.
4. Connect a named Cloudflare Tunnel to **127.0.0.1:3101 only** using `deploy/cloudflare-viewer.yml.example`. Per-host Access validation is required. Never point a public tunnel to3100, a native office engine or any terminal service. The final ingress rule is404.
5. Grant the same email in Project sharing and publish one owner-approved work item. Email policy admission and project authorization are both necessary.
6. Verify from a browser with Tailscale disabled: login by email, correct project and approved result, no other project's data. Check revoked/expired grant, logout/expiry, fake assertion, POST, owner APIs and WebSocket denial. This external acceptance is still pending.
7. Rollback: remove tunnel hostname/stop tunnel; set AGENTHOUSE_WEB_VIEWERS=0 on the existing service and restart it. The private owner route remains unchanged.

## Evidence

197 backend tests and105 UI tests passed; TypeScript/Vite build passed. New tests exercise genuine RSA-signed tokens, wrong keys/issuer/audience/expiry/algorithm, missing email, future issued-at, disabled/invalid config, forced observer status for owner emails, HTTP write/path/header denial and WebSocket403. Existing fixture tests cover project projection, grants, revocation and expiry. Tests use temporary listeners and synthetic credentials; no live public access or paid model call.

Live private sharing UI correctly displays “Kurulumsuz web erişimi henüz etkin değil.” Screenshot: design/verification/web-access-pending-2026-10-13.png (local ignored artifact).

## Official references

- [Browser access without VPN and email PIN](https://developers.cloudflare.com/cloudflare-one/setup/secure-private-apps/private-web-app/)
- [Cloudflare Access application tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
- [Tunnel configuration API and per-host Access settings](https://developers.cloudflare.com/api/resources/zero_trust/subresources/tunnels/subresources/cloudflared/subresources/configurations/methods/get/)
