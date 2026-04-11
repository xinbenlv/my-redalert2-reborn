#!/bin/bash
set -euo pipefail

# Generate version info for the build.
# Priority:
# 1) SOURCE_GIT_SHA       — explicitly passed by manual CLI deploys
# 2) VERCEL_GIT_COMMIT_SHA — provided by Vercel Git integrations
# No hash -> hard fail. Shipping "dev" is a config bug, not a fallback.
if [ -n "${SOURCE_GIT_SHA:-}" ]; then
    HASH="${SOURCE_GIT_SHA:0:6}"
elif [ -n "${VERCEL_GIT_COMMIT_SHA:-}" ]; then
    HASH="${VERCEL_GIT_COMMIT_SHA:0:6}"
else
    echo "ERROR: missing git hash for build. Set SOURCE_GIT_SHA or use Vercel Git integration." >&2
    exit 1
fi

VERSION="0.3.27"
DATE=$(date -u +"%Y-%m-%d")
echo "window.__VERSION__='${VERSION}';window.__GIT_HASH__='${HASH}';window.__BUILD_DATE__='${DATE}';" > js/version.js
echo "Built version ${VERSION} (${HASH}) on ${DATE}"
