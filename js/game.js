// =====================================================
// RED ALERT 2: REBORN — Main Game Engine (Three.js WebGL)
// Simplified: 2 buildings (Refinery, Barracks) + 1 unit (Soldier)
// Two-player: Human (Red) vs AI (Blue)
// =====================================================

// ==================== CONSTANTS ====================
const TILE_W = 64, TILE_H = 32; // kept for minimap compatibility
const MAP_SIZE = 40;
const BUILD_TYPES = {
    refinery: { cost: 1500, buildTime: 8000, hp: 800, sight: 5, size: 2, incomeRate: 50, incomeInterval: 2000 },
    barracks: { cost: 600, buildTime: 5000, hp: 500, sight: 4, size: 2, trainCost: 200, trainTime: 3000 }
};
const UNIT_TYPES = {
    soldier: { cost: 200, hp: 50, speed: 1.2, damage: 8, range: 4, fireRate: 800, sight: 6 }
};

// ==================== GAME STATE ====================
class GameState {
    constructor() {
        // 3D Renderer
        this.renderer3d = new Renderer3D();
        const oldCanvas = document.getElementById('gameCanvas');
        if (oldCanvas) oldCanvas.remove();
        document.body.insertBefore(this.renderer3d.domElement, document.getElementById('ui-overlay'));

        // 2D overlay canvas for selection box
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.id = 'selectionOverlay';
        this.overlayCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
        document.body.insertBefore(this.overlayCanvas, document.getElementById('ui-overlay'));
        this.overlayCtx = this.overlayCanvas.getContext('2d');

        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        this.sidebarCollapsed = false;
        this.width = window.innerWidth - 200;
        this.height = window.innerHeight - 36;
        this.resize();

        // Camera (tile coordinates)
        this.camTileX = 10;
        this.camTileY = 10;
        this.camSpeed = 0.15;
        this.keys = {};
        this.dragStart = null;
        this.isDragging = false;

        // Map
        this.map = [];
        this.fog = [];
        this.generateMap();

        // Players: Human (Red) vs AI (Blue)
        this.players = [
            { faction: 'soviet', money: 5000, buildings: [], units: [], color: '#cc2222', isAI: false },
            { faction: 'soviet', money: 5000, buildings: [], units: [], color: '#2266cc', isAI: true }
        ];
        this.currentPlayer = 0;

        // Selection
        this.selected = [];
        this.selBox = null;
        this.placingBuilding = null;
        this.hoverTile = { x: 0, y: 0 };

        // Build queue
        this.buildQueue = [];

        // Projectiles & Effects
        this.projectiles = [];
        this.effects = [];

        // Timing
        this.lastTime = 0;
        this.waterFrame = 0;
        this.waterTimer = 0;
        this.aiTimer = 0;
        this.aiDecisionInterval = 3000 + Math.random() * 2000;

        // Game over state
        this.gameOver = false;

        // Command ping effects (2D overlay)
        this.commandPings = [];

        // EVA
        this.evaEl = document.getElementById('eva-message');
        this.evaTimeout = null;

        // Build terrain in 3D
        this.renderer3d.buildTerrain(this.map, MAP_SIZE);

        // Spawn bases for both players
        this.spawnBase(0, 8, 8);
        this.spawnBase(1, MAP_SIZE - 10, MAP_SIZE - 10);

        // Set initial camera on player base
        this.camTileX = 10;
        this.camTileY = 10;
        this.renderer3d.setCameraTarget(this.camTileX, this.camTileY);

        // Start
        this.setupInput();
        this.setupUI();
        this.setupSidebarToggle();
        this.eva('Construction complete. Base established. Enemy detected!');
        requestAnimationFrame(t => this.loop(t));
    }

    resize() {
        const sidebarWidth = this.sidebarCollapsed ? 0 : 200;
        this.width = window.innerWidth - sidebarWidth;
        this.height = window.innerHeight - 36;
        this.overlayCanvas.width = window.innerWidth;
        this.overlayCanvas.height = window.innerHeight;
        if (this.renderer3d) this.renderer3d.resize();
    }

    setupSidebarToggle() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle');
        this.sidebarCollapsed = window.innerWidth <= 768;

        // Create floating minimap container
        const floatingMinimap = document.createElement('div');
        floatingMinimap.id = 'minimap-floating';
        document.body.appendChild(floatingMinimap);

        const updateSidebar = () => {
            if (this.sidebarCollapsed) {
                sidebar.classList.add('collapsed');
                toggleBtn.classList.add('sidebar-collapsed');
                toggleBtn.textContent = '☰';
                // Move minimap canvas to floating container
                floatingMinimap.style.display = 'block';
                floatingMinimap.appendChild(this.minimapCanvas);
            } else {
                sidebar.classList.remove('collapsed');
                toggleBtn.classList.remove('sidebar-collapsed');
                toggleBtn.textContent = '✕';
                // Move minimap canvas back to sidebar
                floatingMinimap.style.display = 'none';
                document.getElementById('minimap-container').appendChild(this.minimapCanvas);
            }
            this.resize();
        };

        toggleBtn.addEventListener('click', () => {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            updateSidebar();
        });

        updateSidebar();
    }

    // ==================== MAP GENERATION ====================
    generateMap() {
        for (let y = 0; y < MAP_SIZE; y++) {
            this.map[y] = [];
            this.fog[y] = [];
            for (let x = 0; x < MAP_SIZE; x++) {
                let type = 'grass';
                const distFromCenter = Math.sqrt((x - MAP_SIZE/2)**2 + (y - MAP_SIZE/2)**2);

                if (distFromCenter > MAP_SIZE * 0.42) type = 'water';
                const riverX = MAP_SIZE / 2 + Math.sin(y / 5) * 3;
                if (Math.abs(x - riverX) < 1.5 && y > 10 && y < MAP_SIZE - 10) type = 'water';

                if (type === 'grass') {
                    const oreDist1 = Math.sqrt((x - 15)**2 + (y - 15)**2);
                    const oreDist2 = Math.sqrt((x - (MAP_SIZE - 15))**2 + (y - (MAP_SIZE - 15))**2);
                    const oreDist3 = Math.sqrt((x - MAP_SIZE/2)**2 + (y - MAP_SIZE/2)**2);
                    if (oreDist1 < 3 || oreDist2 < 3 || oreDist3 < 3) type = 'ore';
                }

                this.map[y][x] = { type, variant: (x * 7 + y * 13) % 5 };
                this.fog[y][x] = 0;
            }
        }
    }

    spawnBase(playerIdx, bx, by) {
        const p = this.players[playerIdx];
        p.buildings.push(this.createBuilding('refinery', bx, by, playerIdx));
        p.buildings.push(this.createBuilding('barracks', bx + 3, by, playerIdx));
        for (let i = 0; i < 3; i++) {
            p.units.push(this.createUnit('soldier', bx + i, by + 3, playerIdx));
        }
    }

    createBuilding(type, tx, ty, owner) {
        const def = BUILD_TYPES[type];
        return {
            type, tx, ty, owner,
            hp: def.hp, maxHp: def.hp,
            built: true, buildProgress: 1,
            sight: def.sight, size: def.size,
            incomeTimer: 0,
            training: null, trainProgress: 0
        };
    }

    createUnit(type, tx, ty, owner) {
        const def = UNIT_TYPES[type];
        return {
            type, owner,
            x: tx, y: ty,
            hp: def.hp, maxHp: def.hp,
            speed: def.speed,
            damage: def.damage,
            range: def.range,
            fireRate: def.fireRate,
            sight: def.sight,
            dir: 4, frame: 0, walkTimer: 0,
            target: null,
            attackTarget: null,
            fireTimer: 0,
            state: 'idle',
            deadTimer: 0,
            path: null,
            pathIdx: 0,
            _walkPhase: 0
        };
    }

    // ==================== INPUT ====================

    setupInput() {
        window.addEventListener('resize', () => this.resize());

        window.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
                this._groups = this._groups || {};
                this._groups[e.key] = [...this.selected];
                e.preventDefault();
            } else if (!e.ctrlKey && e.key >= '1' && e.key <= '9') {
                this._groups = this._groups || {};
                if (this._groups[e.key]) {
                    this.selected = this._groups[e.key].filter(u => u.state !== 'dead');
                    this.updateSelectionInfo();
                }
            }
            if (e.key === 'Escape') {
                this.placingBuilding = null;
                this.selected = [];
                this.updateSelectionInfo();
            }
        });

        window.addEventListener('keyup', e => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Scroll zoom
        this.renderer3d.domElement.addEventListener('wheel', e => {
            e.preventDefault();
            this.renderer3d.zoom(e.deltaY * 0.01);
        }, { passive: false });

        // Mouse
        this.renderer3d.domElement.addEventListener('mousedown', e => this.onMouseDown(e));
        this.renderer3d.domElement.addEventListener('mousemove', e => this.onMouseMove(e));
        this.renderer3d.domElement.addEventListener('mouseup', e => this.onMouseUp(e));
        this.renderer3d.domElement.addEventListener('contextmenu', e => {
            e.preventDefault();
            this.onRightClick(e);
        });

        // Touch support - full gesture system
        const touch = {
            startPos: null,      // {x, y, time} for first finger
            startPos2: null,     // second finger start
            lastPos: null,       // last known position for panning
            pinchDist: null,     // distance between two fingers
            gesture: null,       // 'none' | 'tap' | 'drag' | 'longpress' | 'pan' | 'pinch'
            longPressTimer: null,
            longPressReady: false,
            lastTapTime: 0,
            moved: false,
            LONG_PRESS_MS: 500,
            DRAG_THRESHOLD: 10,
        };

        // Long-press visual indicator (expanding circle)
        this._longPressIndicator = { active: false, x: 0, y: 0, startTime: 0 };

        const cancelLongPress = () => {
            if (touch.longPressTimer) { clearTimeout(touch.longPressTimer); touch.longPressTimer = null; }
            touch.longPressReady = false;
            this._longPressIndicator.active = false;
        };

        const el = this.renderer3d.domElement;

        el.addEventListener('touchstart', e => {
            e.preventDefault();
            const now = Date.now();

            if (e.touches.length === 1) {
                const t = e.touches[0];
                touch.startPos = { x: t.clientX, y: t.clientY, time: now };
                touch.lastPos = { x: t.clientX, y: t.clientY };
                touch.moved = false;
                touch.gesture = 'none';
                touch.longPressReady = false;

                // Start long-press timer
                touch.longPressTimer = setTimeout(() => {
                    if (!touch.moved && e.touches.length === 1) {
                        touch.longPressReady = true;
                        touch.gesture = 'longpress';
                    }
                }, touch.LONG_PRESS_MS);

                // Start visual indicator
                this._longPressIndicator = { active: true, x: t.clientX, y: t.clientY, startTime: now };

            } else if (e.touches.length === 2) {
                cancelLongPress();
                // Cancel any single-finger drag/select
                this.selBox = null;
                this.isDragging = false;
                this.dragStart = null;

                const t1 = e.touches[0], t2 = e.touches[1];
                touch.pinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                touch.lastPos = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
                touch.gesture = 'pinch';
            }
        }, { passive: false });

        el.addEventListener('touchmove', e => {
            e.preventDefault();
            if (!touch.startPos && e.touches.length < 2) return;

            if (e.touches.length === 1 && touch.gesture !== 'pinch') {
                const t = e.touches[0];
                const dx = t.clientX - touch.startPos.x;
                const dy = t.clientY - touch.startPos.y;
                const dist = Math.hypot(dx, dy);

                if (dist > touch.DRAG_THRESHOLD) {
                    touch.moved = true;
                    cancelLongPress();

                    if (touch.gesture !== 'drag') touch.gesture = 'drag';

                    // Box-select drag (single finger)
                    this.dragStart = this.dragStart || { x: touch.startPos.x, y: touch.startPos.y };
                    this.isDragging = true;
                    this.selBox = {
                        x1: Math.min(this.dragStart.x, t.clientX),
                        y1: Math.min(this.dragStart.y, t.clientY),
                        x2: Math.max(this.dragStart.x, t.clientX),
                        y2: Math.max(this.dragStart.y, t.clientY)
                    };
                }

            } else if (e.touches.length === 2) {
                cancelLongPress();
                const t1 = e.touches[0], t2 = e.touches[1];
                const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                const midX = (t1.clientX + t2.clientX) / 2;
                const midY = (t1.clientY + t2.clientY) / 2;

                // Pinch zoom
                if (touch.pinchDist) {
                    const delta = (touch.pinchDist - newDist) * 0.02;
                    this.renderer3d.zoom(delta);
                }

                // Two-finger pan
                if (touch.lastPos) {
                    this.camTileX -= (midX - touch.lastPos.x) * 0.05;
                    this.camTileY -= (midY - touch.lastPos.y) * 0.05;
                }

                touch.lastPos = { x: midX, y: midY };
                touch.pinchDist = newDist;
                touch.gesture = 'pinch';
            }
        }, { passive: false });

        el.addEventListener('touchend', e => {
            e.preventDefault();

            // Save longpress state BEFORE cancelling
            const wasLongPress = touch.gesture === 'longpress' && touch.longPressReady;
            cancelLongPress();

            if (e.touches.length > 0) {
                // Still fingers down — wait for all to lift
                return;
            }

            const t = e.changedTouches[0];
            const now = Date.now();

            if (wasLongPress) {
                // Long press = right-click action (move/attack)
                console.log('[Touch] Long press triggered at', t.clientX, t.clientY, 'selected:', this.selected.length);
                this.onRightClick({ clientX: t.clientX, clientY: t.clientY });

            } else if (touch.gesture === 'drag' && this.isDragging && this.selBox) {
                // Box select complete
                this.onMouseUp({ clientX: t.clientX, clientY: t.clientY, button: 0 });

            } else if (!touch.moved && touch.gesture !== 'pinch') {
                // Tap — check for double-tap
                if (now - touch.lastTapTime < 300) {
                    // Double tap = attack command (right-click on enemy)
                    this.onRightClick({ clientX: t.clientX, clientY: t.clientY });
                    touch.lastTapTime = 0; // reset so triple tap doesn't re-trigger
                } else {
                    // Single tap = select
                    const tile = this.renderer3d.screenToTile(t.clientX, t.clientY);
                    this.clickSelect(tile.x, tile.y);
                    touch.lastTapTime = now;
                }
            }

            // Reset state
            this.isDragging = false;
            this.selBox = null;
            this.dragStart = null;
            touch.startPos = null;
            touch.pinchDist = null;
            touch.gesture = null;
            touch.moved = false;
            touch.longPressReady = false;
        }, { passive: false });

        el.addEventListener('touchcancel', e => {
            e.preventDefault();
            cancelLongPress();
            this.isDragging = false;
            this.selBox = null;
            this.dragStart = null;
            touch.startPos = null;
            touch.pinchDist = null;
            touch.gesture = null;
        }, { passive: false });
    }

    onMouseDown(e) {
        if (e.button !== 0) return;
        const wx = e.clientX, wy = e.clientY;

        if (wx > this.width) return;

        if (this.placingBuilding) {
            this.tryPlaceBuilding(e.clientX, e.clientY);
            return;
        }

        this.dragStart = { x: wx, y: wy };
        this.selBox = null;
        this.isDragging = false;
    }

    onMouseMove(e) {
        this.hoverTile = this.renderer3d.screenToTile(e.clientX, e.clientY);

        // Update cursor based on hover context
        this._updateCursor(this.hoverTile);

        if (this.dragStart) {
            const dx = e.clientX - this.dragStart.x;
            const dy = e.clientY - this.dragStart.y;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                this.isDragging = true;
                this.selBox = {
                    x1: Math.min(this.dragStart.x, e.clientX),
                    y1: Math.min(this.dragStart.y, e.clientY),
                    x2: Math.max(this.dragStart.x, e.clientX),
                    y2: Math.max(this.dragStart.y, e.clientY)
                };
            }
        }
    }

    onMouseUp(e) {
        if (this.isDragging && this.selBox) {
            // Box select: convert each unit's tile pos to screen pos and check
            this.selected = [];
            const p = this.players[this.currentPlayer];
            for (const u of p.units) {
                if (u.state === 'dead') continue;
                const screenPos = this.renderer3d.tileToScreen(u.x, u.y);
                if (screenPos.x >= this.selBox.x1 && screenPos.x <= this.selBox.x2 &&
                    screenPos.y >= this.selBox.y1 && screenPos.y <= this.selBox.y2) {
                    this.selected.push(u);
                }
            }
            this.updateSelectionInfo();
        } else if (!this.isDragging) {
            const tile = this.renderer3d.screenToTile(e.clientX, e.clientY);
            this.clickSelect(tile.x, tile.y);
        }
        this.dragStart = null;
        this.selBox = null;
        this.isDragging = false;
    }

    clickSelect(tx, ty) {
        this.selected = [];
        const p = this.players[this.currentPlayer];

        let bestUnit = null, bestDist = 999;
        for (const u of p.units) {
            if (u.state === 'dead') continue;
            const d = Math.hypot(u.x - tx, u.y - ty);
            if (d < 1.5 && d < bestDist) {
                bestDist = d;
                bestUnit = u;
            }
        }
        if (bestUnit) {
            this.selected = [bestUnit];
            this.updateSelectionInfo();
            return;
        }

        for (const b of p.buildings) {
            if (tx >= b.tx && tx < b.tx + b.size && ty >= b.ty && ty < b.ty + b.size) {
                this.selected = [b];
                this.updateSelectionInfo();
                return;
            }
        }
        this.updateSelectionInfo();
    }

    onRightClick(e) {
        if (this.selected.length === 0) return;
        const tile = this.renderer3d.screenToTile(e.clientX, e.clientY);
        console.log('[RightClick] tile:', tile, 'selected:', this.selected.length, 'gameOver:', this.gameOver);

        // Check if right-clicked on an enemy unit
        const enemyUnit = this._findEnemyUnitAt(tile.x, tile.y);
        if (enemyUnit) {
            for (const u of this.selected) {
                if (u.type !== 'soldier') continue;
                u.attackTarget = enemyUnit;
                u.target = null;
                u.state = 'attacking';
                u.path = this.findPath(Math.floor(u.x), Math.floor(u.y), Math.floor(enemyUnit.x), Math.floor(enemyUnit.y));
                u.pathIdx = 0;
            }
            this.commandPings.push({ tx: tile.x, ty: tile.y, color: '#ff2200', time: 0 });
            return;
        }

        // Check if right-clicked on an enemy building
        const enemyBuilding = this._findEnemyBuildingAt(tile.x, tile.y);
        if (enemyBuilding) {
            for (const u of this.selected) {
                if (u.type !== 'soldier') continue;
                u.attackTarget = enemyBuilding;
                u.target = null;
                u.state = 'attacking';
                u.path = this.findPath(Math.floor(u.x), Math.floor(u.y), enemyBuilding.tx + 1, enemyBuilding.ty + 1);
                u.pathIdx = 0;
            }
            this.commandPings.push({ tx: enemyBuilding.tx + 1, ty: enemyBuilding.ty + 1, color: '#ff2200', time: 0 });
            return;
        }

        // Move command
        let movedCount = 0;
        for (const u of this.selected) {
            if (u.type !== 'soldier') continue;
            u.target = { x: tile.x, y: tile.y };
            u.attackTarget = null;
            u.state = 'moving';
            u.path = this.findPath(Math.floor(u.x), Math.floor(u.y), tile.x, tile.y);
            u.pathIdx = 0;
            movedCount++;
            console.log('[Move] unit at', u.x.toFixed(1), u.y.toFixed(1), '→ tile', tile.x, tile.y, 'path length:', u.path?.length);
        }
        console.log('[Move] Issued move to', movedCount, 'units → tile', tile.x, tile.y);
        this.commandPings.push({ tx: tile.x, ty: tile.y, color: '#00ff88', time: 0 });
    }

    _updateCursor(tile) {
        const canvas = this.renderer3d.domElement;
        canvas.classList.remove('cursor-move', 'cursor-attack');

        if (this.placingBuilding) {
            canvas.style.cursor = 'cell';
            return;
        }

        canvas.style.cursor = '';

        if (this.selected.length > 0 && this.selected.some(s => s.type === 'soldier')) {
            const enemy = this._findEnemyUnitAt(tile.x, tile.y) || this._findEnemyBuildingAt(tile.x, tile.y);
            if (enemy) {
                canvas.classList.add('cursor-attack');
            } else {
                canvas.classList.add('cursor-move');
            }
        }
    }

    _findEnemyUnitAt(tx, ty) {
        for (let pi = 0; pi < this.players.length; pi++) {
            if (pi === this.currentPlayer) continue;
            for (const u of this.players[pi].units) {
                if (u.state === 'dead') continue;
                if (Math.hypot(u.x - tx, u.y - ty) < 1.5) return u;
            }
        }
        return null;
    }

    _findEnemyBuildingAt(tx, ty) {
        for (let pi = 0; pi < this.players.length; pi++) {
            if (pi === this.currentPlayer) continue;
            for (const b of this.players[pi].buildings) {
                if (tx >= b.tx && tx < b.tx + b.size && ty >= b.ty && ty < b.ty + b.size) return b;
            }
        }
        return null;
    }

    tryPlaceBuilding(px, py) {
        const tile = this.renderer3d.screenToTile(px, py);
        const type = this.placingBuilding;
        const def = BUILD_TYPES[type];
        const p = this.players[this.currentPlayer];

        if (tile.x < 0 || tile.y < 0 || tile.x + def.size > MAP_SIZE || tile.y + def.size > MAP_SIZE) return;

        for (let dy = 0; dy < def.size; dy++) {
            for (let dx = 0; dx < def.size; dx++) {
                const t = this.map[tile.y + dy]?.[tile.x + dx];
                if (!t || t.type === 'water') return;
            }
        }

        const allBuildings = this.players.flatMap(p => p.buildings);
        for (const bp of allBuildings) {
            if (tile.x < bp.tx + bp.size && tile.x + def.size > bp.tx &&
                tile.y < bp.ty + bp.size && tile.y + def.size > bp.ty) return;
        }

        if (p.money < def.cost) {
            this.eva('Insufficient funds.');
            return;
        }

        p.money -= def.cost;
        const b = this.createBuilding(type, tile.x, tile.y, this.currentPlayer);
        b.built = false;
        b.buildProgress = 0;
        p.buildings.push(b);
        this.placingBuilding = null;
        this.eva(`${type === 'refinery' ? 'Refinery' : 'Barracks'} under construction.`);
        this.updateMoney();
    }

    // ==================== PATHFINDING (Simple A*) ====================

    findPath(sx, sy, ex, ey) {
        if (sx === ex && sy === ey) return [{ x: ex, y: ey }];
        const open = [{ x: sx, y: sy, g: 0, h: 0, f: 0, parent: null }];
        const closed = new Set();
        const key = (x, y) => `${x},${y}`;

        const isWalkable = (x, y) => {
            if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return false;
            if (this.map[y][x].type === 'water') return false;
            // Check building occupancy
            for (const p of this.players) {
                for (const b of p.buildings) {
                    if (x >= b.tx && x < b.tx + b.size && y >= b.ty && y < b.ty + b.size) return false;
                }
            }
            return true;
        };

        let iterations = 0;
        while (open.length > 0 && iterations < 500) {
            iterations++;
            open.sort((a, b) => a.f - b.f);
            const curr = open.shift();

            if (curr.x === ex && curr.y === ey) {
                const path = [];
                let n = curr;
                while (n) { path.unshift({ x: n.x, y: n.y }); n = n.parent; }
                return path;
            }

            closed.add(key(curr.x, curr.y));

            const neighbors = [
                { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 },
                { x: curr.x + 1, y: curr.y + 1 }, { x: curr.x - 1, y: curr.y - 1 },
                { x: curr.x + 1, y: curr.y - 1 }, { x: curr.x - 1, y: curr.y + 1 },
            ];

            for (const nb of neighbors) {
                if (!isWalkable(nb.x, nb.y) || closed.has(key(nb.x, nb.y))) continue;
                const g = curr.g + (nb.x !== curr.x && nb.y !== curr.y ? 1.41 : 1);
                const h = Math.hypot(nb.x - ex, nb.y - ey);
                const existing = open.find(n => n.x === nb.x && n.y === nb.y);
                if (existing) {
                    if (g < existing.g) { existing.g = g; existing.f = g + h; existing.parent = curr; }
                } else {
                    open.push({ x: nb.x, y: nb.y, g, h, f: g + h, parent: curr });
                }
            }
        }
        return [{ x: ex, y: ey }];
    }

    // ==================== UPDATE ====================

    update(dt) {
        if (this.gameOver) return;
        this.updateCamera(dt);
        this.updateBuildings(dt);
        this.updateUnits(dt);
        this.updateAutoAttack(dt);
        this.updateProjectiles(dt);
        this.updateEffects(dt);
        this.updateFog();
        this.updateAI(dt);
        this.checkVictoryConditions();
    }

    updateCamera(dt) {
        const spd = this.camSpeed;
        if (this.keys['w'] || this.keys['arrowup']) this.camTileY -= spd;
        if (this.keys['s'] || this.keys['arrowdown']) this.camTileY += spd;
        if (this.keys['a'] || this.keys['arrowleft']) this.camTileX -= spd;
        if (this.keys['d'] || this.keys['arrowright']) this.camTileX += spd;

        this.camTileX = Math.max(0, Math.min(MAP_SIZE, this.camTileX));
        this.camTileY = Math.max(0, Math.min(MAP_SIZE, this.camTileY));

        this.renderer3d.setCameraTarget(this.camTileX, this.camTileY);
    }

    updateBuildings(dt) {
        for (const p of this.players) {
            for (const b of p.buildings) {
                if (!b.built) {
                    b.buildProgress += dt / BUILD_TYPES[b.type].buildTime;
                    if (b.buildProgress >= 1) {
                        b.buildProgress = 1;
                        b.built = true;
                        if (b.owner === this.currentPlayer) {
                            this.eva('Construction complete.');
                        }
                    }
                }

                if (b.type === 'refinery' && b.built && b.hp > 0) {
                    b.incomeTimer += dt;
                    if (b.incomeTimer >= BUILD_TYPES.refinery.incomeInterval) {
                        b.incomeTimer = 0;
                        p.money += BUILD_TYPES.refinery.incomeRate;
                        if (b.owner === this.currentPlayer) this.updateMoney();
                    }
                }

                if (b.type === 'barracks' && b.built && b.training && b.hp > 0) {
                    b.trainProgress += dt / BUILD_TYPES.barracks.trainTime;
                    if (b.trainProgress >= 1) {
                        b.trainProgress = 0;
                        b.training = null;
                        const spawnX = b.tx + b.size;
                        const spawnY = b.ty + Math.floor(b.size / 2);
                        p.units.push(this.createUnit('soldier', spawnX, spawnY, b.owner));
                        if (b.owner === this.currentPlayer) {
                            this.eva('Unit ready.');
                            this.updateUI();
                        }
                    }
                }

                if (b.hp <= 0) {
                    this.effects.push({ type: 'explosion', x: b.tx + 1, y: b.ty + 1, frame: 0, timer: 0, big: true });
                    this.renderer3d.removeBuilding(b);
                }
            }
            p.buildings = p.buildings.filter(b => b.hp > 0);
        }
    }

    updateUnits(dt) {
        for (const p of this.players) {
            for (const u of p.units) {
                if (u.state === 'dead') {
                    u.deadTimer += dt;
                    continue;
                }

                u.fireTimer = Math.max(0, u.fireTimer - dt);

                if (u.state === 'moving' || (u.state === 'attacking' && u.attackTarget)) {
                    let targetX, targetY;

                    if (u.state === 'attacking' && u.attackTarget) {
                        const at = u.attackTarget;
                        targetX = at.x !== undefined ? at.x : at.tx + 1;
                        targetY = at.y !== undefined ? at.y : at.ty + 1;

                        const dist = Math.hypot(u.x - targetX, u.y - targetY);

                        if ((at.hp !== undefined && at.hp <= 0) || at.state === 'dead') {
                            u.attackTarget = null;
                            u.state = 'idle';
                            continue;
                        }

                        if (dist <= u.range) {
                            u.state = 'attacking';
                            this.faceToward(u, targetX, targetY);

                            if (u.fireTimer <= 0) {
                                u.fireTimer = u.fireRate;
                                this.fireAt(u, at);
                            }
                            continue;
                        }

                        // Move toward attack target using pathfinding
                        if (!u.path || u.path.length === 0) {
                            u.path = this.findPath(Math.floor(u.x), Math.floor(u.y), Math.floor(targetX), Math.floor(targetY));
                            u.pathIdx = 0;
                        }
                        // Follow path waypoints
                        if (u.path && u.pathIdx < u.path.length) {
                            const wp = u.path[u.pathIdx];
                            const dx = wp.x - u.x;
                            const dy = wp.y - u.y;
                            const d = Math.hypot(dx, dy);
                            if (d < 0.2) {
                                u.pathIdx++;
                            } else if (d > 0.1) {
                                const speed = u.speed * dt / 1000;
                                u.x += (dx / d) * Math.min(speed, d);
                                u.y += (dy / d) * Math.min(speed, d);
                                this.faceToward(u, wp.x, wp.y);
                            }
                        } else {
                            // Fallback: direct move (shouldn't happen often)
                            const dx = targetX - u.x;
                            const dy = targetY - u.y;
                            const d = Math.hypot(dx, dy);
                            if (d > 0.1) {
                                const speed = u.speed * dt / 1000;
                                u.x += (dx / d) * Math.min(speed, d);
                                u.y += (dy / d) * Math.min(speed, d);
                                this.faceToward(u, targetX, targetY);
                            }
                        }
                        continue;
                    } else if (u.state === 'moving' && u.path && u.pathIdx < u.path.length) {
                        const waypoint = u.path[u.pathIdx];
                        targetX = waypoint.x;
                        targetY = waypoint.y;
                    } else if (u.state === 'moving' && u.target) {
                        targetX = u.target.x;
                        targetY = u.target.y;
                    } else {
                        u.state = 'idle';
                        continue;
                    }

                    const dx = targetX - u.x;
                    const dy = targetY - u.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist < 0.2 && u.state === 'moving') {
                        if (u.path && u.pathIdx < u.path.length - 1) {
                            u.pathIdx++;
                        } else {
                            u.state = 'idle';
                            u.target = null;
                            u.path = null;
                        }
                    } else if (dist > 0.1) {
                        const speed = u.speed * dt / 1000;
                        u.x += (dx / dist) * Math.min(speed, dist);
                        u.y += (dy / dist) * Math.min(speed, dist);
                        this.faceToward(u, targetX, targetY);
                    }
                }

                if (u.state === 'idle') {
                    u.frame = 0;
                }

                // Unit separation force to prevent stacking
                if (u.state !== 'dead') {
                    for (const p2 of this.players) {
                        for (const other of p2.units) {
                            if (other === u || other.state === 'dead') continue;
                            const sdx = u.x - other.x;
                            const sdy = u.y - other.y;
                            const sd = Math.hypot(sdx, sdy);
                            if (sd < 0.3 && sd > 0.001) {
                                const pushStrength = (0.3 - sd) * 0.05;
                                u.x += (sdx / sd) * pushStrength;
                                u.y += (sdy / sd) * pushStrength;
                            }
                        }
                    }
                }
            }
            p.units = p.units.filter(u => u.state !== 'dead' || u.deadTimer < 3000);
        }
    }

    // ==================== AUTO-ATTACK ====================

    updateAutoAttack(dt) {
        for (let pi = 0; pi < this.players.length; pi++) {
            const p = this.players[pi];
            for (const u of p.units) {
                if (u.state !== 'idle' || u.hp <= 0 || u.state === 'dead') continue;

                // Find nearest enemy in sight range
                const enemy = this._findNearestEnemy(u, pi);
                if (enemy) {
                    u.attackTarget = enemy;
                    u.state = 'attacking';
                }
            }
        }
    }

    _findNearestEnemy(unit, ownerIdx) {
        let best = null, bestDist = unit.sight + 1;
        for (let pi = 0; pi < this.players.length; pi++) {
            if (pi === ownerIdx) continue;
            // Check enemy units
            for (const eu of this.players[pi].units) {
                if (eu.state === 'dead' || eu.hp <= 0) continue;
                const d = Math.hypot(unit.x - eu.x, unit.y - eu.y);
                if (d < bestDist) { bestDist = d; best = eu; }
            }
            // Check enemy buildings
            for (const eb of this.players[pi].buildings) {
                if (eb.hp <= 0) continue;
                const bx = eb.tx + 1, by = eb.ty + 1;
                const d = Math.hypot(unit.x - bx, unit.y - by);
                if (d < bestDist) { bestDist = d; best = eb; }
            }
        }
        return best;
    }

    faceToward(u, tx, ty) {
        const dx = tx - u.x;
        const dy = ty - u.y;
        const angle = Math.atan2(dy, dx);
        const dir = Math.round(((angle + Math.PI) / (Math.PI * 2)) * 8) % 8;
        const mapping = [6, 7, 0, 1, 2, 3, 4, 5];
        u.dir = mapping[dir];
    }

    fireAt(u, target) {
        const tx = target.x !== undefined ? target.x : target.tx + 1;
        const ty = target.y !== undefined ? target.y : target.ty + 1;

        this.projectiles.push({
            x: u.x, y: u.y,
            tx, ty,
            speed: 8,
            damage: u.damage,
            owner: u.owner,
            target
        });
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const dx = p.tx - p.x;
            const dy = p.ty - p.y;
            const dist = Math.hypot(dx, dy);
            const spd = p.speed * dt / 1000;

            if (dist < 0.3) {
                if (p.target && p.target.hp > 0) {
                    p.target.hp -= p.damage;
                    if (p.target.hp <= 0) {
                        if (p.target.state !== undefined) p.target.state = 'dead';
                    }
                }
                this.effects.push({ type: 'hit', x: p.tx, y: p.ty, frame: 0, timer: 0 });
                this.renderer3d.removeProjectile(p);
                this.projectiles.splice(i, 1);
            } else {
                p.x += (dx / dist) * Math.min(spd, dist);
                p.y += (dy / dist) * Math.min(spd, dist);
            }
        }
    }

    updateEffects(dt) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const e = this.effects[i];
            e.timer += dt;
            if (e.timer > 100) {
                e.timer = 0;
                e.frame++;
            }
            if (e.frame >= 6) {
                this.effects.splice(i, 1);
            }
        }
    }

    updateFog() {
        const p = this.players[this.currentPlayer];
        for (let y = 0; y < MAP_SIZE; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
                if (this.fog[y][x] === 2) this.fog[y][x] = 1;
            }
        }

        const reveal = (cx, cy, r) => {
            const r2 = r * r;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (dx * dx + dy * dy > r2) continue;
                    const nx = Math.floor(cx) + dx;
                    const ny = Math.floor(cy) + dy;
                    if (nx >= 0 && ny >= 0 && nx < MAP_SIZE && ny < MAP_SIZE) {
                        this.fog[ny][nx] = 2;
                    }
                }
            }
        };

        for (const u of p.units) {
            if (u.state !== 'dead') reveal(u.x, u.y, u.sight);
        }
        for (const b of p.buildings) {
            reveal(b.tx + 1, b.ty + 1, b.sight);
        }
    }

    // ==================== AI SYSTEM ====================

    updateAI(dt) {
        this.aiTimer += dt;
        if (this.aiTimer < this.aiDecisionInterval) return;
        this.aiTimer = 0;
        this.aiDecisionInterval = 3000 + Math.random() * 2000;

        const ai = this.players[1];
        if (!ai || ai.buildings.length === 0 && ai.units.length === 0) return;

        // AI base center (approximate from first building or starting position)
        const baseX = ai.buildings.length > 0 ? ai.buildings[0].tx : MAP_SIZE - 10;
        const baseY = ai.buildings.length > 0 ? ai.buildings[0].ty : MAP_SIZE - 10;

        // --- Economy: Build refineries (max 3) ---
        const refineries = ai.buildings.filter(b => b.type === 'refinery');
        if (refineries.length < 3 && ai.money >= BUILD_TYPES.refinery.cost) {
            const pos = this._aiPickBuildPos(baseX, baseY, 'refinery');
            if (pos) {
                ai.money -= BUILD_TYPES.refinery.cost;
                const b = this.createBuilding('refinery', pos.x, pos.y, 1);
                b.built = false;
                b.buildProgress = 0;
                ai.buildings.push(b);
            }
        }

        // --- Military: Build barracks (max 2) ---
        const barracks = ai.buildings.filter(b => b.type === 'barracks');
        if (barracks.length < 2 && ai.money >= BUILD_TYPES.barracks.cost) {
            const pos = this._aiPickBuildPos(baseX, baseY, 'barracks');
            if (pos) {
                ai.money -= BUILD_TYPES.barracks.cost;
                const b = this.createBuilding('barracks', pos.x, pos.y, 1);
                b.built = false;
                b.buildProgress = 0;
                ai.buildings.push(b);
            }
        }

        // --- Train soldiers ---
        const builtBarracks = ai.buildings.filter(b => b.type === 'barracks' && b.built && !b.training && b.hp > 0);
        for (const bb of builtBarracks) {
            if (ai.money >= UNIT_TYPES.soldier.cost) {
                ai.money -= UNIT_TYPES.soldier.cost;
                bb.training = 'soldier';
                bb.trainProgress = 0;
            }
        }

        // --- Combat: Attack when enough soldiers ---
        const idleSoldiers = ai.units.filter(u => u.state === 'idle' && u.hp > 0 && u.state !== 'dead');
        const totalSoldiers = ai.units.filter(u => u.hp > 0 && u.state !== 'dead').length;
        const attackThreshold = totalSoldiers >= 8 ? 4 : 5;

        if (idleSoldiers.length >= attackThreshold) {
            // Find player's nearest building or unit to attack
            const playerData = this.players[0];
            let target = null;

            // Prefer buildings
            if (playerData.buildings.length > 0) {
                target = playerData.buildings[0];
            } else if (playerData.units.length > 0) {
                const alive = playerData.units.filter(u => u.state !== 'dead');
                if (alive.length > 0) target = alive[0];
            }

            if (target) {
                const tx = target.tx !== undefined ? target.tx + 1 : target.x;
                const ty = target.ty !== undefined ? target.ty + 1 : target.y;

                for (const soldier of idleSoldiers) {
                    soldier.attackTarget = target;
                    soldier.state = 'attacking';
                    soldier.path = this.findPath(Math.floor(soldier.x), Math.floor(soldier.y), Math.floor(tx), Math.floor(ty));
                    soldier.pathIdx = 0;
                }
            }
        }
    }

    _aiPickBuildPos(baseX, baseY, type) {
        const size = BUILD_TYPES[type].size;
        // Try random positions near base
        for (let attempt = 0; attempt < 20; attempt++) {
            const ox = Math.floor(Math.random() * 10 - 3);
            const oy = Math.floor(Math.random() * 10 - 3);
            const tx = baseX + ox;
            const ty = baseY + oy;

            if (tx < 0 || ty < 0 || tx + size > MAP_SIZE || ty + size > MAP_SIZE) continue;

            // Check terrain
            let valid = true;
            for (let dy = 0; dy < size; dy++) {
                for (let dx = 0; dx < size; dx++) {
                    const t = this.map[ty + dy]?.[tx + dx];
                    if (!t || t.type === 'water') { valid = false; break; }
                }
                if (!valid) break;
            }
            if (!valid) continue;

            // Check overlap with existing buildings
            const allBuildings = this.players.flatMap(p => p.buildings);
            let overlap = false;
            for (const bp of allBuildings) {
                if (tx < bp.tx + bp.size && tx + size > bp.tx &&
                    ty < bp.ty + bp.size && ty + size > bp.ty) { overlap = true; break; }
            }
            if (overlap) continue;

            return { x: tx, y: ty };
        }
        return null;
    }

    // ==================== VICTORY / DEFEAT ====================

    checkVictoryConditions() {
        if (this.gameOver) return;

        for (let pi = 0; pi < this.players.length; pi++) {
            const p = this.players[pi];
            const alive = p.buildings.length > 0 || p.units.some(u => u.state !== 'dead');
            if (!alive) {
                this.gameOver = true;
                if (pi === 0) {
                    this.eva('DEFEAT! Your base has been destroyed.');
                } else {
                    this.eva('VICTORY! Enemy eliminated!');
                }
                return;
            }
        }
    }

    // ==================== RENDER ====================

    render(dt) {
        // Sync 3D objects with game state
        this._syncRenderer(dt);

        // Render 3D scene
        this.renderer3d.render(dt);

        // Draw 2D overlay
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        // Selection box drag rectangle
        if (this.selBox) {
            this.overlayCtx.strokeStyle = '#00ff88';
            this.overlayCtx.lineWidth = 1.5;
            this.overlayCtx.setLineDash([4, 4]);
            this.overlayCtx.strokeRect(
                this.selBox.x1, this.selBox.y1,
                this.selBox.x2 - this.selBox.x1, this.selBox.y2 - this.selBox.y1
            );
            this.overlayCtx.fillStyle = 'rgba(0,255,136,0.08)';
            this.overlayCtx.fillRect(
                this.selBox.x1, this.selBox.y1,
                this.selBox.x2 - this.selBox.x1, this.selBox.y2 - this.selBox.y1
            );
            this.overlayCtx.setLineDash([]);
        }

        // Long-press indicator (expanding circle)
        if (this._longPressIndicator && this._longPressIndicator.active) {
            const lp = this._longPressIndicator;
            const elapsed = Date.now() - lp.startTime;
            const progress = Math.min(elapsed / 500, 1); // 500ms = LONG_PRESS_MS
            const radius = 6 + progress * 24;
            const ctx = this.overlayCtx;
            ctx.beginPath();
            ctx.arc(lp.x, lp.y, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
            ctx.strokeStyle = progress >= 1 ? '#ff4444' : 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 3;
            ctx.stroke();
            if (progress >= 1) {
                ctx.beginPath();
                ctx.arc(lp.x, lp.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,68,68,0.15)';
                ctx.fill();
            }
        }

        // 2D health bars
        const selectedSet = new Set(this.selected);
        this.renderer3d.drawHealthBars2D(this.overlayCtx, this.players, selectedSet);

        // Command ping effects
        this._drawCommandPings(this.overlayCtx, dt);

        // Minimap
        this.renderMinimap();
    }

    _syncRenderer(dt) {
        // Sync buildings
        for (let pi = 0; pi < this.players.length; pi++) {
            const p = this.players[pi];
            for (const b of p.buildings) {
                this.renderer3d.addBuilding(b, p.color);
                this.renderer3d.updateBuilding(b);

                // Fog of war: hide enemy buildings not in player's sight
                if (pi !== this.currentPlayer) {
                    const bx = Math.floor(b.tx + b.size / 2);
                    const by = Math.floor(b.ty + b.size / 2);
                    const visible = bx >= 0 && by >= 0 && bx < MAP_SIZE && by < MAP_SIZE && this.fog[by][bx] === 2;
                    this.renderer3d.setBuildingVisible(b, visible);
                }
            }
        }

        // Sync units
        for (let pi = 0; pi < this.players.length; pi++) {
            const p = this.players[pi];
            for (const u of p.units) {
                if (!this.renderer3d.unitMeshes.has(u)) {
                    this.renderer3d.addUnit(u, p.color);
                }
                this.renderer3d.updateUnit(u, dt);

                // Fog of war: hide enemy units not in player's sight
                if (pi !== this.currentPlayer) {
                    const ux = Math.floor(u.x);
                    const uy = Math.floor(u.y);
                    const visible = u.state !== 'dead' && ux >= 0 && uy >= 0 && ux < MAP_SIZE && uy < MAP_SIZE && this.fog[uy][ux] === 2;
                    this.renderer3d.setUnitVisible(u, visible);
                } else {
                    this.renderer3d.setUnitVisible(u, true);
                }
            }
        }
        this.renderer3d.cleanupDeadUnits(this.players);

        // Sync projectiles
        const activeProjectiles = new Set(this.projectiles);
        for (const p of this.projectiles) {
            this.renderer3d.addProjectile(p);
            this.renderer3d.updateProjectile(p);
        }
        // Clean up removed projectiles
        for (const [proj] of this.renderer3d.projectileMeshes) {
            if (!activeProjectiles.has(proj)) {
                this.renderer3d.removeProjectile(proj);
            }
        }

        // Sync effects - add new ones
        for (const e of this.effects) {
            if (!e._added3d) {
                this.renderer3d.addEffect(e);
                e._added3d = true;
            }
        }

        // Update fog
        this.renderer3d.updateFog(this.fog, MAP_SIZE);

        // Update selection
        this.renderer3d.updateSelection(this.selected, this.players[this.currentPlayer].color);

        // Health bars (only show visible entities)
        this.renderer3d.updateHealthBars(this.players);

        // Placement preview
        if (this.placingBuilding) {
            this.renderer3d.showPlacementPreview(this.placingBuilding, this.hoverTile.x, this.hoverTile.y, this.players[this.currentPlayer].color);
        } else {
            this.renderer3d.hidePlacementPreview();
        }
    }

    _drawCommandPings(ctx, dt) {
        for (let i = this.commandPings.length - 1; i >= 0; i--) {
            const ping = this.commandPings[i];
            ping.time += dt;
            const progress = ping.time / 500; // 0.5 second duration
            if (progress >= 1) {
                this.commandPings.splice(i, 1);
                continue;
            }
            const screen = this.renderer3d.tileToScreen(ping.tx, ping.ty);
            const radius = 5 + progress * 20;
            const alpha = 1 - progress;

            ctx.beginPath();
            ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = ping.color;
            ctx.lineWidth = 2.5 * (1 - progress * 0.5);
            ctx.globalAlpha = alpha;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    renderMinimap() {
        const mctx = this.minimapCtx;
        const mw = 180, mh = 180;
        const scale = mw / MAP_SIZE;

        mctx.fillStyle = '#0a0a1a';
        mctx.fillRect(0, 0, mw, mh);

        for (let y = 0; y < MAP_SIZE; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
                const tile = this.map[y][x];
                const fog = this.fog[y][x];
                if (fog === 0) continue;

                if (tile.type === 'water') mctx.fillStyle = fog === 2 ? '#1a5276' : '#0d2940';
                else if (tile.type === 'ore') mctx.fillStyle = fog === 2 ? '#aa8800' : '#554400';
                else mctx.fillStyle = fog === 2 ? '#3d6b35' : '#1e3519';

                mctx.fillRect(x * scale, y * scale, scale + 0.5, scale + 0.5);
            }
        }

        // Player buildings and units (always show own)
        const ownP = this.players[this.currentPlayer];
        mctx.fillStyle = ownP.color;
        for (const b of ownP.buildings) {
            mctx.fillRect(b.tx * scale, b.ty * scale, b.size * scale, b.size * scale);
        }
        for (const u of ownP.units) {
            if (u.state === 'dead') continue;
            mctx.fillRect(u.x * scale - 1, u.y * scale - 1, 2, 2);
        }

        // Enemy: only show in revealed fog
        for (let pi = 0; pi < this.players.length; pi++) {
            if (pi === this.currentPlayer) continue;
            const ep = this.players[pi];
            mctx.fillStyle = ep.color;
            for (const b of ep.buildings) {
                const bx = Math.floor(b.tx + b.size / 2);
                const by = Math.floor(b.ty + b.size / 2);
                if (bx >= 0 && by >= 0 && bx < MAP_SIZE && by < MAP_SIZE && this.fog[by][bx] === 2) {
                    mctx.fillRect(b.tx * scale, b.ty * scale, b.size * scale, b.size * scale);
                }
            }
            for (const u of ep.units) {
                if (u.state === 'dead') continue;
                const ux = Math.floor(u.x), uy = Math.floor(u.y);
                if (ux >= 0 && uy >= 0 && ux < MAP_SIZE && uy < MAP_SIZE && this.fog[uy][ux] === 2) {
                    mctx.fillRect(u.x * scale - 1, u.y * scale - 1, 2, 2);
                }
            }
        }

        // Viewport indicator
        mctx.strokeStyle = '#fff';
        mctx.lineWidth = 1;
        const vpW = this.renderer3d.frustumSize * (window.innerWidth / window.innerHeight);
        const vpH = this.renderer3d.frustumSize;
        const vpScale = scale;
        mctx.strokeRect(
            (this.camTileX - vpW / 2) * vpScale,
            (this.camTileY - vpH / 2) * vpScale,
            vpW * vpScale,
            vpH * vpScale
        );
    }

    // ==================== UI ====================

    setupUI() {
        this.updateUI();
        this.updateMoney();

        document.querySelectorAll('.build-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.build-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateUI();
            });
        });
    }

    updateUI() {
        const activeTab = document.querySelector('.build-tab.active')?.dataset.tab || 'buildings';
        const container = document.getElementById('build-items');
        container.innerHTML = '';

        if (activeTab === 'buildings') {
            this.addBuildItem(container, 'refinery', 'Refinery', BUILD_TYPES.refinery.cost, 'Auto-income');
            this.addBuildItem(container, 'barracks', 'Barracks', BUILD_TYPES.barracks.cost, 'Train soldiers');
        } else {
            this.addBuildItem(container, 'soldier', 'Soldier', UNIT_TYPES.soldier.cost, 'Infantry unit', true);
        }
    }

    addBuildItem(container, type, name, cost, desc, isUnit = false) {
        const p = this.players[this.currentPlayer];
        const div = document.createElement('div');
        div.className = 'build-item' + (p.money < cost ? ' disabled' : '');

        // Render 3D icon
        const iconCanvas = this.renderer3d.renderBuildIcon(type, p.color, 48);
        const iconImg = document.createElement('canvas');
        iconImg.width = 48;
        iconImg.height = 48;
        const ictx = iconImg.getContext('2d');
        // Dark background
        ictx.fillStyle = '#1a1a2e';
        ictx.fillRect(0, 0, 48, 48);
        ictx.drawImage(iconCanvas, 0, 0, 48, 48);
        // Border
        ictx.strokeStyle = p.color;
        ictx.lineWidth = 1;
        ictx.strokeRect(0, 0, 48, 48);

        div.appendChild(iconImg);
        div.innerHTML += `<div><div>${name}</div><div style="font-size:9px;color:#888">${desc}</div></div><div class="cost">$${cost}</div>`;

        div.addEventListener('click', () => {
            if (p.money < cost) { this.eva('Insufficient funds.'); return; }
            if (isUnit) {
                const barracks = p.buildings.find(b => b.type === 'barracks' && b.built && !b.training);
                if (!barracks) { this.eva('No available barracks.'); return; }
                p.money -= cost;
                barracks.training = 'soldier';
                barracks.trainProgress = 0;
                this.updateMoney();
                this.eva('Training soldier...');
            } else {
                this.placingBuilding = type;
                this.eva(`Select location for ${name}.`);
            }
        });

        container.appendChild(div);
    }

    updateMoney() {
        document.getElementById('money').textContent = this.players[this.currentPlayer].money;
    }

    updateSelectionInfo() {
        const info = document.getElementById('selection-info');
        if (this.selected.length === 0) {
            info.innerHTML = '<div style="color:#666">No selection</div>';
            return;
        }

        if (this.selected.length === 1) {
            const s = this.selected[0];
            if (s.type === 'soldier') {
                info.innerHTML = `<div style="color:#00ff88">Soldier</div>
                    <div>HP: ${s.hp}/${s.maxHp}</div>
                    <div>DMG: ${s.damage} | RNG: ${s.range}</div>
                    <div style="color:#666;font-size:9px">${s.state}</div>`;
            } else {
                info.innerHTML = `<div style="color:#ffd700">${s.type === 'refinery' ? 'Refinery' : 'Barracks'}</div>
                    <div>HP: ${s.hp}/${s.maxHp}</div>
                    ${s.training ? `<div>Training: ${Math.floor(s.trainProgress * 100)}%</div>` : ''}
                    ${s.type === 'refinery' ? `<div style="color:#ffd700">+$${BUILD_TYPES.refinery.incomeRate}/2s</div>` : ''}`;
            }
        } else {
            const soldiers = this.selected.filter(u => u.type === 'soldier');
            info.innerHTML = `<div style="color:#00ff88">${soldiers.length} Soldiers selected</div>
                <div style="color:#666;font-size:9px">Right-click to move/attack</div>`;
        }
    }

    eva(msg) {
        this.evaEl.textContent = msg;
        this.evaEl.classList.add('show');
        clearTimeout(this.evaTimeout);
        this.evaTimeout = setTimeout(() => this.evaEl.classList.remove('show'), 3000);
    }

    // ==================== GAME LOOP ====================

    loop(time) {
        const dt = Math.min(time - (this.lastTime || time), 50);
        this.lastTime = time;

        this.update(dt);
        this.render(dt);
        this.updateMoney();

        requestAnimationFrame(t => this.loop(t));
    }
}

// Start the game!
window.addEventListener('DOMContentLoaded', () => {
    new GameState();
});
