# AGENTS.md — Red Alert 2: Reborn

## Project Overview

Browser-based RTS game inspired by Red Alert 2. Built with Three.js WebGL, procedural 3D models, and isometric camera. No external assets — all geometry is code-generated.

- **Live**: https://my-redalert2-reborn.vercel.app
- **Repo**: https://github.com/xinbenlv/my-redalert2-reborn
- **Stack**: Vanilla JS + Three.js (CDN) + static file server (Node.js)
- **Deploy**: Vercel (static), `build.sh` injects git hash into `js/version.js`

## Architecture

```
index.html          — HTML shell + UI overlay (top bar, sidebar, minimap, EVA)
css/style.css       — All styling (sidebar, build cards, mobile responsive)
js/three.min.js     — Three.js r162 (bundled locally)
js/version.js       — Auto-generated: window.__VERSION__, __GIT_HASH__, __BUILD_DATE__
js/models.js        — Procedural 3D model factory (refinery, barracks, soldier)
js/renderer3d.js    — Three.js scene, camera, lights, shadows, fog, coordinate conversion
js/game.js          — Game state, input, pathfinding (A*), AI, combat, UI updates
server.js           — Simple static file server (port 3003, dev only)
build.sh            — Version injection script (used by Vercel build)
vercel.json         — Vercel deploy config
```

## Game Balance (Constants in js/game.js)

### Buildings

| Building | Cost | Build Time | HP | Income | Notes |
|----------|------|------------|-----|--------|-------|
| Refinery | $1,500 | 8s | 800 | $50/2s ($1,500/min) | Each refinery earns independently |
| Barracks | $600 | 5s | 500 | — | Trains soldiers, queue max 30 per barracks |

### Units

| Unit | Cost | Train Time | HP | Damage | Range | Fire Rate | Speed | Sight |
|------|------|------------|-----|--------|-------|-----------|-------|-------|
| Soldier | $200 | 3s | 50 | 8 | 4 tiles | 800ms | 1.2 | 6 tiles |

### Combat Mechanics
- **Splash damage**: 1.2 tile radius, 50% damage to non-primary targets
- **Auto-engage**: Moving units stop and fight enemies within attack range
- **Retaliation**: Units being attacked switch to nearest attacker if in range
- **Pathfinding**: A* with building/water avoidance, 2000 iteration limit
- **Unit separation**: 0.6 tile push radius to prevent overlapping

### AI Behavior
- Builds up to 3 refineries, 2 barracks
- Continuously trains soldiers
- Attacks with 5+ idle soldiers (4+ when aggressive at 8+ total)
- Decision interval: 3-5 seconds (randomized)

## Map
- Size: 40x40 tiles
- Tile types: grass, water, ore
- Diamond isometric projection (TILE_W=64, TILE_H=32)
- Fog of war: hidden / explored / visible

## Development Rules

1. **Version display**: Bottom-left corner shows `vX.Y.Z (hash)` — always visible
2. **Hash is mandatory**: `build.sh` must fail if neither `SOURCE_GIT_SHA` nor `VERCEL_GIT_COMMIT_SHA` is present. Never fall back to `dev`.
3. **Production deploy policy**: Prefer Git-integrated deploys via `git push origin main` so Vercel injects `VERCEL_GIT_COMMIT_SHA`.
4. **Manual CLI deploy policy**: If using `vercel --prod`, pass `SOURCE_GIT_SHA=$(git rev-parse HEAD)` explicitly (or use `npm run deploy:vercel:prod`).
5. **Static only**: No npm build step, no bundler — all files served as-is
6. **Mobile support**: Touch controls (tap=select, long-press=command, pinch=zoom, two-finger=pan)
7. **Sidebar**: Collapsible on mobile, compact card-style build items

## Coding Conventions
- All game logic in `game.js`, all 3D rendering in `renderer3d.js`, all models in `models.js`
- Faction color passed as parameter to model factories
- Coordinate system: tile-based internally, Three.js world units = tile * tileSize
- Camera: OrthographicCamera with isometric rotation

## Deploy

```bash
# Local dev
node server.js  # → http://localhost:3003

# Preferred production deploy: Git integration (guaranteed commit SHA)
git push origin main

# Manual Vercel deploy: always pass the current SHA explicitly
npm run deploy:vercel:prod
```
