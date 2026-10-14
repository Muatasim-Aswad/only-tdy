#!/usr/bin/env bash
#
# Local verification for the only-tdy production container.
#
# Builds the real production image, runs one isolated throwaway container with
# the same hardening the Compose service declares, and proves health, the
# single-page fallback, cache headers, the manifest and every base-path asset,
# non-root execution, and read-only behaviour. It creates nothing outside its own
# uniquely named image, container, and temporary directory, and removes all three
# on success or failure.
#
# Usage: scripts/verify-container.sh [--skip-local-build]
#   ONLY_TDY_VERIFY_PORT   host port for the throwaway container (default 33003)

set -euo pipefail

readonly REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly PORT="${ONLY_TDY_VERIFY_PORT:-33003}"
readonly RUN_ID="$$-$(date +%s)"
readonly IMAGE_TAG="only-tdy-verify:${RUN_ID}"
readonly CONTAINER_NAME="only-tdy-verify-${RUN_ID}"
readonly EXTRACT_NAME="only-tdy-extract-${RUN_ID}"

SKIP_LOCAL_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-local-build) SKIP_LOCAL_BUILD=1 ;;
    *) printf 'unknown argument: %s\n' "$arg" >&2; exit 2 ;;
  esac
done

WORK_DIR="$(mktemp -d -t only-tdy-verify.XXXXXX)"
readonly WORK_DIR

cd "$REPO_ROOT"
eval "$(node scripts/identity.mjs --shell)"

cleanup() {
  local status=$?
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker rm -f "$EXTRACT_NAME" >/dev/null 2>&1 || true
  docker image rm -f "$IMAGE_TAG" >/dev/null 2>&1 || true
  rm -rf "$WORK_DIR"
  return "$status"
}
trap cleanup EXIT

FAILURES=0
SECTION=''

section() {
  SECTION="$1"
  printf '\n== %s\n' "$1"
}

pass() { printf '  ok    %s\n' "$1"; }

fail() {
  printf '  FAIL  %s\n' "$1"
  if [[ -n "${2:-}" ]]; then
    printf '        %s\n' "$2"
  fi
  FAILURES=$((FAILURES + 1))
}

check() {
  # check <description> <expected> <actual>
  if [[ "$2" == "$3" ]]; then
    pass "$1"
  else
    fail "$1" "expected [$2], got [$3]"
  fi
}

check_contains() {
  # check_contains <description> <needle> <haystack>
  if [[ "$3" == *"$2"* ]]; then
    pass "$1"
  else
    fail "$1" "missing [$2]"
  fi
}

check_absent() {
  # check_absent <description> <needle> <haystack>
  if [[ "$3" != *"$2"* ]]; then
    pass "$1"
  else
    fail "$1" "unexpectedly present [$2]"
  fi
}

# --- HTTP helpers -----------------------------------------------------------

http_headers=''
http_body_file=''
http_status=''

request() {
  # request <path> -> sets http_status, http_headers, http_body_file
  local path="$1"
  http_body_file="$WORK_DIR/body"
  http_headers="$(
    curl --silent --show-error --max-time 10 \
      --dump-header - --output "$http_body_file" \
      "http://127.0.0.1:${PORT}${path}"
  )"
  http_status="$(printf '%s' "$http_headers" | head -n 1 | awk '{print $2}')"
}

header_value() {
  # header_value <name> — case-insensitive lookup, CR stripped
  printf '%s' "$http_headers" \
    | tr -d '\r' \
    | awk -v name="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')" '
        {
          colon = index($0, ":")
          if (colon == 0) next
          if (tolower(substr($0, 1, colon - 1)) != name) next
          value = substr($0, colon + 1)
          sub(/^[ \t]+/, "", value)
          print value
          exit
        }
      '
}

exec_in_container() {
  docker exec "$CONTAINER_NAME" "$@"
}

# --- 0. Preflight -----------------------------------------------------------

section "Preflight"

if ! docker info >/dev/null 2>&1; then
  fail "docker daemon reachable"
  exit 1
fi
pass "docker daemon reachable"

if curl --silent --max-time 2 --output /dev/null "http://127.0.0.1:${PORT}/" 2>/dev/null; then
  fail "host port ${PORT} is free" "something is already answering on ${PORT}"
  exit 1
fi
pass "host port ${PORT} is free"

# --- 1. Static definitions --------------------------------------------------

section "Build and Compose definitions"

dockerfile="$(cat "$REPO_ROOT/Dockerfile")"
check_contains "builder pinned to node 24.20.0-alpine by digest" \
  'node:24.20.0-alpine@sha256:' "$dockerfile"
check_contains "runtime pinned to nginx-unprivileged:1.31.6-alpine by digest" \
  'nginxinc/nginx-unprivileged:1.31.6-alpine@sha256:' "$dockerfile"
check_contains "install uses the committed lockfile" \
  'pnpm install --frozen-lockfile' "$dockerfile"
check_absent "no /only-tdy redirect in the server config" \
  'location /only-tdy' "$(cat "$REPO_ROOT/deploy/nginx.conf")"

compose_json="$(cd "$REPO_ROOT" && docker compose config --format json)"
svc() { printf '%s' "$compose_json" | jq -r ".services[\"only-tdy\"].$1"; }

check "compose binds loopback only"        '127.0.0.1' "$(svc 'ports[0].host_ip')"
check "compose publishes the selected host port"   "${ONLY_TDY_PORT:-3003}"      "$(svc 'ports[0].published')"
check "compose targets container port 8080" '8080'     "$(svc 'ports[0].target')"
check "compose restarts unless stopped"    'unless-stopped' "$(svc 'restart')"
check "compose root filesystem is read-only" 'true'    "$(svc 'read_only')"
check "compose drops all capabilities"     'ALL'       "$(svc 'cap_drop[0]')"
check "compose forbids new privileges"     'no-new-privileges:true' "$(svc 'security_opt[0]')"
check "compose caps memory at 128 MiB"     '134217728' "$(svc 'mem_limit')"
check "compose caps CPU at 0.5"            '0.5'       "$(svc 'cpus')"
check "compose caps PIDs at 64"            '64'        "$(svc 'pids_limit')"
check "compose bounds log size"            '10m'       "$(svc 'logging.options["max-size"]')"
check "compose bounds log files"           '3'         "$(svc 'logging.options["max-file"]')"
check "compose declares a health check"    'false'     "$(svc 'healthcheck == null')"
check "compose declares no volume"         'null'      "$(svc 'volumes')"
check "compose declares no secret"         'null'      "$(svc 'secrets')"
check_contains "compose mounts a tmpfs for nginx scratch space" '/tmp:' "$(svc 'tmpfs[0]')"

# --- 2. Local production build ---------------------------------------------

section "Local production build"

if [[ "$SKIP_LOCAL_BUILD" -eq 1 ]]; then
  if [[ ! -f "$REPO_ROOT/dist/index.html" ]]; then
    fail "local dist/ exists" "--skip-local-build was given but dist/ is missing"
    exit 1
  fi
  pass "reusing the existing local dist/ (--skip-local-build)"
else
  (cd "$REPO_ROOT" && pnpm run build) >"$WORK_DIR/local-build.log" 2>&1 \
    || { fail "local production build" "see below"; tail -n 20 "$WORK_DIR/local-build.log"; exit 1; }
  pass "local production build"
fi

# --- 3. Production image ----------------------------------------------------

section "Production image"

ONLY_TDY_IMAGE="$IMAGE_TAG" node scripts/container-build.mjs \
  >"$WORK_DIR/image-build.log" 2>&1 \
  || { fail "docker build"; tail -n 30 "$WORK_DIR/image-build.log"; exit 1; }
pass "docker build"

image_user="$(docker image inspect --format '{{.Config.User}}' "$IMAGE_TAG")"
check "image runs as the unprivileged nginx user" 'nginx' "$image_user"

docker create --name "$EXTRACT_NAME" "$IMAGE_TAG" >/dev/null
mkdir -p "$WORK_DIR/image-dist"
docker cp "$EXTRACT_NAME:/usr/share/nginx/html/." "$WORK_DIR/image-dist"
docker rm "$EXTRACT_NAME" >/dev/null

toolchain="$(docker run --rm --entrypoint sh "$IMAGE_TAG" -c '
  for binary in node npm pnpm yarn corepack; do
    command -v "$binary" >/dev/null 2>&1 && printf "FOUND:%s\n" "$binary"
  done
  find / -xdev -maxdepth 6 -name node_modules -print -quit 2>/dev/null
  test -e /app && printf "FOUND:/app\n"
  true
' 2>/dev/null)"
check "image carries no Node or package manager" '' "$toolchain"

leaked="$(cd "$WORK_DIR/image-dist" && find . \( -name '*.map' -o -name '*.ts' -o -name '*.tsx' \) -print)"
check "image ships no source map or TypeScript source" '' "$leaked"

world_writable="$(docker run --rm --entrypoint sh "$IMAGE_TAG" -c '
  find /usr/share/nginx/html \( ! -user root -o -perm -0002 \) -print 2>/dev/null | head -n 5
  true
' 2>/dev/null)"
check "served files are root-owned and not world-writable" '' "$world_writable"

# --- 4. Artifact equality ---------------------------------------------------

section "Artifact equality"

hash_tree() {
  (cd "$1" && find . -type f -print0 \
    | LC_ALL=C sort -z \
    | xargs -0 sha256sum)
}

# Tailwind has an explicit production source boundary, so the repository
# build and the image build must agree directly. Source maps are
# not produced by the distribution build.
hash_tree "$REPO_ROOT/dist" >"$WORK_DIR/reference.sha256"
hash_tree "$WORK_DIR/image-dist" >"$WORK_DIR/image.sha256"

if diff -u "$WORK_DIR/reference.sha256" "$WORK_DIR/image.sha256" >"$WORK_DIR/artifact.diff"; then
  pass "image is byte-identical to the local production build ($(wc -l <"$WORK_DIR/reference.sha256" | tr -d ' ') files)"
else
  fail "image is byte-identical to the local production build"
  head -n 20 "$WORK_DIR/artifact.diff"
fi

# Deleting the source maps must never leave the precache manifest pointing at a
# file the image does not ship: an install-time 404 breaks the whole worker.
mapfile -t precached < <(
  grep -o '"url":"[^"]*"' "$WORK_DIR/image-dist/sw.js" \
    | sed 's/^"url":"//; s/"$//' \
    | LC_ALL=C sort -u \
    || true
)
missing_precache=''
for entry in "${precached[@]}"; do
  [[ -f "$WORK_DIR/image-dist/$entry" ]] || missing_precache+="$entry "
done
check "every precached URL is present in the image" '' "${missing_precache% }"
if [[ ${#precached[@]} -ge 13 ]]; then
  pass "worker precaches the shell and icons (${#precached[@]} entries)"
else
  fail "worker precaches the shell and icons" "only ${#precached[@]} entries"
fi
check_absent "worker precaches no source map" '.map' "${precached[*]}"
check_absent "worker precaches no API path" '/api/' "${precached[*]}"


# --- 5. Isolated container --------------------------------------------------

section "Isolated container"

docker run --detach \
  --name "$CONTAINER_NAME" \
  --publish "127.0.0.1:${PORT}:8080" \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --memory 128m \
  --cpus 0.5 \
  --pids-limit 64 \
  --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 \
  "$IMAGE_TAG" >/dev/null
pass "container started on 127.0.0.1:${PORT}"
node "$REPO_ROOT/scripts/runtime-inventory.mjs" "$CONTAINER_NAME"

ready=0
for _ in $(seq 1 60); do
  if curl --silent --max-time 2 --output /dev/null "http://127.0.0.1:${PORT}/healthz"; then
    ready=1
    break
  fi
  sleep 0.5
done
if [[ "$ready" -ne 1 ]]; then
  fail "container answered within 30s"
  docker logs "$CONTAINER_NAME" 2>&1 | tail -n 20
  exit 1
fi
pass "container answered within 30s"

health_status="$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo none)"
for _ in $(seq 1 40); do
  [[ "$health_status" == healthy ]] && break
  sleep 1
  health_status="$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo none)"
done
check "declared HEALTHCHECK reports healthy" 'healthy' "$health_status"

# --- 6. HTTP behaviour ------------------------------------------------------

section "Health and shell"

request /healthz
check "/healthz returns 200"       '200'      "$http_status"
check "/healthz body"              'ok'       "$(tr -d '\n' <"$http_body_file")"
check "/healthz is never cached"   'no-store' "$(header_value Cache-Control)"

request /
cp "$http_body_file" "$WORK_DIR/shell.html"
index_html="$(cat "$WORK_DIR/shell.html")"
check "/ returns the shell"            '200' "$http_status"
check "/ is revalidated every load"    'no-cache' "$(header_value Cache-Control)"
check_contains "/ serves HTML"         'text/html' "$(header_value Content-Type)"
check_contains "shell contains the React root" '<div id="root">' "$index_html"
check_contains "shell canonicalizes the exact /only-tdy path" "window.location.pathname === '/only-tdy'" "$index_html"

request /today/deep/link
check "unknown path falls back to the shell" '200' "$http_status"
if cmp -s "$WORK_DIR/shell.html" "$http_body_file"; then
  pass "the fallback body is byte-identical to the shell"
else
  fail "the fallback body is byte-identical to the shell"
fi

# The reverse proxy strips the mount prefix, so the container itself must not redirect.
request /only-tdy
check "/only-tdy is served, not redirected" '200' "$http_status"
request /only-tdy/
check "/only-tdy/ is served, not redirected" '200' "$http_status"

section "Manifest and worker"

request /version.json
check "deployed identity is uncached" 'no-store' "$(header_value Cache-Control)"
check "deployed revision matches expected" "$APP_REVISION" "$(jq -r '.revision' "$http_body_file")"
if cmp -s "$REPO_ROOT/dist/version.json" "$http_body_file"; then pass "served identity equals local identity"; else fail "served identity equals local identity"; fi

request /manifest.webmanifest
manifest="$(cat "$http_body_file")"
check "manifest returns 200"        '200' "$http_status"
check "manifest is never cached"    'no-cache' "$(header_value Cache-Control)"
check_contains "manifest content type" 'application/manifest+json' "$(header_value Content-Type)"
check "manifest id"        '/only-tdy/' "$(printf '%s' "$manifest" | jq -r '.id')"
check "manifest start_url" '/only-tdy/' "$(printf '%s' "$manifest" | jq -r '.start_url')"
check "manifest scope"     '/only-tdy/' "$(printf '%s' "$manifest" | jq -r '.scope')"
check "manifest display"   'standalone' "$(printf '%s' "$manifest" | jq -r '.display')"
check "manifest name"      'only-tdy' "$(printf '%s' "$manifest" | jq -r '.name')"

request /sw.js
check "service worker returns 200"     '200' "$http_status"
check "service worker is never cached" 'no-cache' "$(header_value Cache-Control)"
check_contains "service worker content type" 'javascript' "$(header_value Content-Type)"
check_contains "worker namespaces its caches" 'only-tdy-' "$(cat "$http_body_file")"

request /sw.js.map
check "source maps are not served" '404' "$http_status"

section "Base-path assets"

# Every URL the shell emits is rooted at /only-tdy/. The reverse proxy removes that
# prefix, so each one must resolve here with the prefix stripped.
mapfile -t emitted < <(
  grep -o '/only-tdy/[A-Za-z0-9._/-]*' "$WORK_DIR/shell.html" \
    | LC_ALL=C sort -u \
    || true
)
if [[ ${#emitted[@]} -ge 4 ]]; then
  pass "shell emits ${#emitted[@]} base-path URLs"
else
  fail "shell emits its base-path URLs" "found only ${#emitted[@]}"
fi

for url in "${emitted[@]}"; do
  stripped="${url#/only-tdy}"
  [[ "$stripped" == '/' ]] && continue
  request "$stripped"
  cache="$(header_value Cache-Control)"
  if [[ "$http_status" != '200' ]]; then
    fail "$url resolves once the mount prefix is stripped" "got HTTP $http_status for $stripped"
    continue
  fi
  case "$stripped" in
    /assets/*)
      check "$url is immutable for a year" 'public, max-age=31536000, immutable' "$cache" ;;
    /manifest.webmanifest)
      check "$url is never cached" 'no-cache' "$cache" ;;
    *)
      pass "$url resolves (${cache:-no Cache-Control})" ;;
  esac
done

request /icons/icon-512.png
check "manifest icon resolves" '200' "$http_status"
check_contains "manifest icon content type" 'image/png' "$(header_value Content-Type)"

request /assets/does-not-exist-9f3a.js
check "a missing hashed asset is a 404, not the shell" '404' "$http_status"

# --- 7. Runtime hardening ---------------------------------------------------

section "Runtime hardening"

check "server process runs as uid 101" '101' "$(exec_in_container id -u | tr -d '\r')"
check "server process is not root"     'nginx' "$(exec_in_container id -un | tr -d '\r')"

if exec_in_container sh -c 'echo x > /usr/share/nginx/html/verify-write' >/dev/null 2>&1; then
  fail "web root is read-only" "a write to /usr/share/nginx/html succeeded"
else
  pass "web root is read-only"
fi

if exec_in_container sh -c 'echo x > /etc/nginx/verify-write' >/dev/null 2>&1; then
  fail "nginx configuration is read-only" "a write to /etc/nginx succeeded"
else
  pass "nginx configuration is read-only"
fi

if exec_in_container sh -c 'echo x > /tmp/verify-write && rm /tmp/verify-write' >/dev/null 2>&1; then
  pass "the tmpfs scratch mount is writable"
else
  fail "the tmpfs scratch mount is writable" "nginx cannot write its pid or temp files"
fi

check "pid file lives on the tmpfs" '0' \
  "$(exec_in_container sh -c 'test -f /tmp/nginx.pid; printf %s $?' | tr -d '\r')"

# --- Result -----------------------------------------------------------------

printf '\n'
if [[ "$FAILURES" -eq 0 ]]; then
  printf 'Container verification passed.\n'
  exit 0
fi
printf 'Container verification failed: %d check(s).\n' "$FAILURES"
exit 1
