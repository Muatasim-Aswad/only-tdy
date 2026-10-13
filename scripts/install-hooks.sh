#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
git config --local core.hooksPath .githooks
printf 'Installed local check hooks.\n'
