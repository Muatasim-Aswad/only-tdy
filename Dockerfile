FROM node:26.11.1-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a AS build
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

FROM nginxinc/nginx-unprivileged:1.31.6-alpine@sha256:884e0b7f42f303641b0f4e78755aea647521dca0b89ca3be7992ad78b5c07434 AS runtime
LABEL org.opencontainers.image.source="https://github.com/Muatasim-Aswad/only-tdy"
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
