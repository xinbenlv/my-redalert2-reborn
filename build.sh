#!/bin/bash
# Generate version info for the build
HASH=$(git rev-parse --short=6 HEAD 2>/dev/null || echo "dev")
VERSION="0.2.0"
DATE=$(date -u +"%Y-%m-%d")
echo "window.__VERSION__='${VERSION}';window.__GIT_HASH__='${HASH}';window.__BUILD_DATE__='${DATE}';" > js/version.js
echo "Built version ${VERSION} (${HASH}) on ${DATE}"
