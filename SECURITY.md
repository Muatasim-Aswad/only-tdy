# Security

Report vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/Muatasim-Aswad/only-tdy/security/advisories/new). Do not include credentials or real task data in a public issue or Discussion. Describe the affected version, reproduction using synthetic data, and likely impact. Support is best effort, with no promised response time.

## Supported versions

Before the first release, `main` is supported. After release, only the latest release receives security fixes; older versions should upgrade.

## Trust boundary

only-tdy is a static frontend with no backend or authentication system of its own. Its intended deployment shares an HTTPS origin with Tududi and relies on Tududi's session cookie, CSRF token, authorization and data storage. The reverse proxy must keep `/api/` and login routes on Tududi, strip the `/only-tdy` prefix when forwarding static requests, and expose the only-tdy container on loopback only.

Treat every application sharing that origin as trusted: same-origin scripts can access browser preferences and authenticated APIs. Do not place untrusted sites there. Public access requires secure HTTPS, appropriate Tududi authentication and proxy configuration, and regular updates of both applications. Cross-origin API deployments are unsupported. Back up and restore data through Tududi; the only-tdy container stores no task data.

The service worker caches static app assets, never API responses. Task data and unsaved drafts live in memory; preferences and the last seen build identity remain in browser storage. There is no analytics, telemetry, external runtime font service, or persisted offline write queue. See [data handling and recovery](docs/limitations.md) and [deployment checks](docs/deployment.md).
