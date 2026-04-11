# Red Alert 2: Reborn

A browser-based RTS game inspired by Command & Conquer: Red Alert 2, built entirely with Three.js WebGL and procedural 3D geometry. No external art assets — all buildings, units, and terrain are code-generated.

**[Play Now](https://my-redalert2-reborn.vercel.app)**

## Demo

![Gameplay Demo](docs/demo-gifs/gameplay.gif)

## Gameplay

![Gameplay Demo](screenshots/gameplay.gif)

![Base Overview](screenshots/gameplay-base.jpg)

## Features

- **Three.js WebGL** rendering with isometric orthographic camera
- **Procedural 3D models**: power plant, refinery, barracks, war factory, soldier, harvester, tank
- **Real-time combat**: A* pathfinding, splash damage, auto-engage, retaliation, infantry + vehicle mix
- **AI opponent**: Builds base, expands power, mixes ground pushes with Harrier air strikes, and launches attacks
- **Fog of war**: Hidden / explored / visible terrain states
- **Economy loop**: harvesters mine ore, return to refineries, and turn cargo into credits
- **Power system**: live power production/drain, low-power slowdown, radar offline warning
- **Mobile support**: Touch controls (tap, long-press, pinch zoom, two-finger pan), collapsible sidebar
- **Build system**: prerequisites, building/unit production queues, cancellation refunds, war factory vehicle tech
- **Production controls**: repair, sell, rally point, persistent rally-route markers, and cancel/refund commands on selected production buildings

## Controls

### Desktop
| Input | Action |
|-------|--------|
| Left click | Select unit/building |
| Drag | Box select multiple units |
| Right click | Move / Attack command / place rally point when rally mode is active (with live route preview) |
| WASD / Arrows | Pan camera |
| Escape | Deselect / Cancel placement |
| Ctrl+1-9 | Assign control group |
| 1-9 | Recall control group |

### Mobile
| Input | Action |
|-------|--------|
| Tap | Select unit/building |
| Drag | Box select |
| Long press (500ms) | Move / Attack command |
| Two-finger drag | Pan camera |
| Pinch | Zoom in/out |

## Tech Stack

- **Rendering**: Three.js r162 (OrthographicCamera, DirectionalLight, shadow mapping)
- **Language**: Vanilla JavaScript (no framework, no bundler)
- **Server**: Node.js static file server (dev only)
- **Deploy**: Vercel (static hosting)
- **Version**: Auto-injected git hash via `build.sh`

## Run Locally

```bash
git clone https://github.com/xinbenlv/my-redalert2-reborn.git
cd my-redalert2-reborn
node server.js
# Open http://localhost:3003
```

## Deploy

### Production (preferred)

Use Git integration so Vercel always knows the exact commit SHA:

```bash
git push origin main
```

### Manual Vercel deploy

When deploying from the CLI, always pass the current commit SHA explicitly:

```bash
npm run deploy:vercel:prod
```

`build.sh` now fails hard if neither `SOURCE_GIT_SHA` nor `VERCEL_GIT_COMMIT_SHA` is present. That is intentional: shipping `dev` as the version hash is a broken build, not an acceptable fallback.

## Planning Docs

- [RA2 遭遇战差距总清单](docs/checklists/ra2-skirmish-gap-checklist.md)

## License

MIT
