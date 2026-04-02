# Red Alert 2: Reborn

A browser-based RTS game inspired by Command & Conquer: Red Alert 2, built entirely with Three.js WebGL and procedural 3D geometry. No external art assets — all buildings, units, and terrain are code-generated.

**[Play Now](https://my-redalert2-reborn.vercel.app)**

## Gameplay

![Gameplay Demo](screenshots/gameplay.gif)

![Base Overview](screenshots/gameplay-base.jpg)

## Features

- **Three.js WebGL** rendering with isometric orthographic camera
- **Procedural 3D models**: Soviet refinery (storage tanks, pipes, chimney), barracks (guard tower, sandbags, flag), soldiers (humanoid with rifle)
- **Real-time combat**: A* pathfinding, splash damage, auto-engage, retaliation
- **AI opponent**: Builds base, trains soldiers, launches coordinated attacks
- **Fog of war**: Hidden / explored / visible terrain states
- **Mobile support**: Touch controls (tap, long-press, pinch zoom, two-finger pan), collapsible sidebar
- **Build system**: Refinery (auto-income), barracks (training queue up to 30)

## Controls

### Desktop
| Input | Action |
|-------|--------|
| Left click | Select unit/building |
| Drag | Box select multiple units |
| Right click | Move / Attack command |
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

```bash
bash build.sh
npx vercel --prod --yes
```

## License

MIT
