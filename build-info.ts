import type { Plugin } from 'vite';

import { readBuildIdentity } from './scripts/build-identity.ts';

export function buildInfo(): Plugin {
  let json = '';
  return {
    name: 'build-info',
    config(config) {
      const info = readBuildIdentity(config.root ?? process.cwd());
      json = `${JSON.stringify(info, null, 2)}\n`;
      return { define: { __BUILD_INFO__: JSON.stringify(info) } };
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.split('?')[0]?.endsWith('/version.json')) {
          next();
          return;
        }
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Cache-Control', 'no-store');
        response.end(json);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: json });
    },
  };
}
