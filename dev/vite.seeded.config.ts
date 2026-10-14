import { defineConfig } from 'vite';

import baseConfig from '../vite.config.ts';

import { seededTududiApi } from './seeded-api.ts';

/**
 * The dev server, plus a Tududi for it to talk to.
 *
 * This is a second config rather than a mode inside the first one, because the
 * production image builds from `vite.config.ts` and a handful of named files
 * and must not grow a path into `dev/` to do it — a build that has to copy the
 * fixtures in to resolve an import it will never run is exactly the dependency
 * the Dockerfile refuses for the test fixtures. Keeping the seam at the config
 * file leaves `vite.config.ts` the one thing both the container and the tests
 * load, and leaves this the one thing that knows the stand-in exists.
 *
 * `root` is unset on purpose: Vite resolves it from the working directory, not
 * from where the config file sits, so every relative path in the base config
 * still means what it meant. Run from the repository root, as `dev:seeded`
 * does.
 */
export default defineConfig({
  ...baseConfig,
  plugins: [...(baseConfig.plugins ?? []), seededTududiApi()],
});
