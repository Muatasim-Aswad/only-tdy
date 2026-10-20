# Security

Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/Muatasim-Aswad/only-tdy/security/advisories/new), with the affected version, synthetic reproduction and likely impact. Keep credentials and real task data out of public issues and Discussions. Support is best effort; no response time is promised.

## Supported versions

Only the latest release receives security fixes; upgrade older versions.

## Trust boundary

only-tdy is a static frontend sharing Tududi's HTTPS origin, session cookie, CSRF token, authorization and storage. It has no backend or authentication system. The proxy must keep `/api/` and login routes on Tududi, strip `/only-tdy` from forwarded static requests, and reach only-tdy on loopback only.

Trust every application sharing that origin: its scripts can access preferences and authenticated APIs. Do not host untrusted sites there. Public access requires secure HTTPS, correct Tududi authentication/proxy settings and regular updates of both apps. Cross-origin APIs are unsupported. Back up and restore through Tududi; only-tdy's container stores no task data.

The worker caches static assets, never API responses. Tasks and drafts stay in memory; preferences and the last seen build identity persist in browser storage. There is no analytics, telemetry, external runtime font service or persisted offline write queue. See [data handling and recovery](docs/limitations.md) and [deployment checks](docs/deployment.md).
