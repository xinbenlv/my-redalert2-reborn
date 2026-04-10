#!/bin/bash
# Generate version info for the build
# Vercel provides VERCEL_GIT_COMMIT_SHA; fallback to git or "dev"
if [ -n "$VERCEL_GIT_COMMIT_SHA" ]; then
    HASH="${VERCEL_GIT_COMMIT_SHA:0:6}"
else
    HASH=$(git rev-parse --short=6 HEAD 2>/dev/null || echo "dev")
fi
VERSION="0.3.0"
DATE=$(date -u +"%Y-%m-%d")
echo "window.__VERSION__='${VERSION}';window.__GIT_HASH__='${HASH}';window.__BUILD_DATE__='${DATE}';" > js/version.js
echo "Built version ${VERSION} (${HASH}) on ${DATE}"
