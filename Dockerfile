FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS build
ENV CI=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json vite.config.ts build-info.ts index.html LICENSE THIRD_PARTY_NOTICES.md ./
COPY scripts ./scripts
COPY src ./src
COPY public ./public
ARG APP_REVISION=dev
ARG APP_COMMIT_TIME
ARG APP_BUILD_TIME
ARG SOURCE_DATE_EPOCH=0
RUN node scripts/build.mjs

FROM nginxinc/nginx-unprivileged:1.31.6-alpine@sha256:b54ac358b83fc6c965793fd271839b4ea4cdb6e99895bb19618cbc2ca152d972 AS runtime
ARG SOURCE_DATE_EPOCH=0
USER root
RUN rm -f /etc/nginx/conf.d/default.conf && rm -rf /usr/share/nginx/html/*
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=root:root /app/dist /usr/share/nginx/html
RUN nginx -t -c /etc/nginx/nginx.conf
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget --quiet --spider --tries=1 http://127.0.0.1:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
