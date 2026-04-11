// =====================================================
// RED ALERT 2: REBORN — Main Game Engine (Three.js WebGL)
// Simplified: 2 buildings (Refinery, Barracks) + 1 unit (Soldier)
// Two-player: Human (Red) vs AI (Blue)
// =====================================================

// ==================== CONSTANTS ====================
const TILE_W = 64, TILE_H = 32; // kept for minimap compatibility
const MAP_SIZE = 40;
const BUILD_TYPES = window.BUILD_TYPES;
const UNIT_TYPES = window.UNIT_TYPES;
const POWER_SYSTEM = window.POWER_SYSTEM;

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
            { faction: 'soviet', money: 6500, buildings: [], units: [], color: '#cc2222', isAI: false, lowPowerNotified: false },
            { faction: 'soviet', money: 6500, buildings: [], units: [], color: '#2266cc', isAI: true, lowPowerNotified: false }
        ];
        this.currentPlayer = 0;

        // Selection
        this.selected = [];
        this.selBox = null;
        this.placingBuilding = null;
        this.commandMode = null;
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

        // Version info
        const vEl = document.getElementById('version-info');
        if (vEl) {
            const v = window.__VERSION__ || '0.0.0';
            const h = window.__GIT_HASH__ || 'dev';
            vEl.textContent = `v${v} (${h})`;
        }
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

                this.map[y][x] = {
                    type,
                    variant: (x * 7 + y * 13) % 5,
                    oreAmount: type === 'ore' ? 5000 : 0,
                    maxOreAmount: type === 'ore' ? 5000 : 0
                };
                this.fog[y][x] = 0;
            }
        }
    }

    spawnBase(playerIdx, bx, by) {
        const p = this.players[playerIdx];
        p.buildings.push(this.createBuilding('powerPlant', bx, by + 3, playerIdx));
        p.buildings.push(this.createBuilding('refinery', bx, by, playerIdx));
        p.buildings.push(this.createBuilding('barracks', bx + 3, by, playerIdx));
        p.units.push(this.createUnit('harvester', bx + 1, by + 4, playerIdx));
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
            training: null, trainProgress: 0, trainQueue: [],
            rallyPoint: { x: tx + def.size + 1, y: ty + Math.floor(def.size / 2) },
            oreStored: 0
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
            role: def.role,
            armorType: def.armorType,
            projectileSpeed: def.projectileSpeed || 8,
            weaponType: def.weaponType || 'rifle',
            damageProfile: def.damageProfile || null,
            cargo: 0,
            cargoCapacity: def.cargoCapacity || 0,
            harvestRate: def.harvestRate || 0,
            harvestInterval: def.harvestInterval || 0,
            unloadRate: def.unloadRate || 0,
            unloadInterval: def.unloadInterval || 0,
            harvestTimer: 0,
            unloadTimer: 0,
            oreTarget: null,
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

    getTargetArmorClass(target) {
        if (!target) return 'light';
        if (target.tx !== undefined) return 'building';
        if (target.role === 'infantry' || target.role === 'anti-armor infantry' || target.role === 'anti-air infantry') {
            return 'infantry';
        }
        return target.armorType || 'light';
    }

    getDamageAgainstTarget(baseDamage, damageProfile, target) {
        const armorClass = this.getTargetArmorClass(target);
        const multiplier = damageProfile?.[armorClass] ?? 1;
        return Math.max(1, Math.round(baseDamage * multiplier));
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
                this.commandMode = null;
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
                // Tap — check if placing building first
                if (this.placingBuilding) {
                    this.tryPlaceBuilding(t.clientX, t.clientY);
                } else if (now - touch.lastTapTime < 300) {
                    // Double tap = attack command (right-click on enemy)
                    this.onRightClick({ clientX: t.clientX, clientY: t.clientY });
                    touch.lastTapTime = 0;
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
        console.log('[RightClick] tile:', tile, 'selected:', this.selected.length, 'gameOver:', this.gameOver, 'mode:', this.commandMode);

        if (this.commandMode === 'set-rally') {
            const building = this.getPrimarySelectedBuilding();
            if (!building || !this.canSetRallyPoint(building)) {
                this.commandMode = null;
                this.updateSelectionInfo();
                return;
            }
            building.rallyPoint = { x: tile.x, y: tile.y };
            this.commandMode = null;
            this.eva(`${this.getDisplayName(building.type)} rally point updated.`);
            this.commandPings.push({ tx: tile.x, ty: tile.y, color: '#00aaff', time: 0 });
            this.updateSelectionInfo();
            return;
        }

        // Check if right-clicked on an enemy unit
        const enemyUnit = this._findEnemyUnitAt(tile.x, tile.y);
        if (enemyUnit) {
            for (const u of this.selected) {
                if (!this.canUnitReceiveCommand(u)) continue;
                u.attackTarget = enemyUnit;
                u.target = null;
                u.state = 'attacking';
                u.path = this.findPath(Math.round(u.x), Math.round(u.y), Math.floor(enemyUnit.x), Math.floor(enemyUnit.y));
                u.pathIdx = 0;
            }
            this.commandPings.push({ tx: tile.x, ty: tile.y, color: '#ff2200', time: 0 });
            return;
        }

        // Check if right-clicked on an enemy building
        const enemyBuilding = this._findEnemyBuildingAt(tile.x, tile.y);
        if (enemyBuilding) {
            for (const u of this.selected) {
                if (!this.canUnitReceiveCommand(u)) continue;
                u.attackTarget = enemyBuilding;
                u.target = null;
                u.state = 'attacking';
                u.path = this.findPath(Math.round(u.x), Math.round(u.y), enemyBuilding.tx + 1, enemyBuilding.ty + 1);
                u.pathIdx = 0;
            }
            this.commandPings.push({ tx: enemyBuilding.tx + 1, ty: enemyBuilding.ty + 1, color: '#ff2200', time: 0 });
            return;
        }

        // Move command
        for (const u of this.selected) {
            if (!this.canUnitReceiveCommand(u)) continue;
            u.target = { x: tile.x, y: tile.y };
            u.attackTarget = null;
            u._savedTarget = null;
            u._savedPath = null;
            u.state = 'moving';
            const sx = Math.round(u.x), sy = Math.round(u.y);
            u.path = this.findPath(sx, sy, tile.x, tile.y);
            // Skip first waypoint if it's the start position (avoid walking backward)
            if (u.path && u.path.length > 1 && Math.hypot(u.path[0].x - u.x, u.path[0].y - u.y) < 0.5) {
                u.pathIdx = 1;
            } else {
                u.pathIdx = 0;
            }
        }
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

        if (this.selected.length > 0 && this.selected.some(s => this.canUnitReceiveCommand(s))) {
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

        if (this.getMissingPrerequisites(p, def.prerequisites || []).length > 0) {
            this.eva(`Prerequisite missing: ${this.getMissingPrerequisites(p, def.prerequisites || []).join(', ')}`);
            return;
        }

        p.money -= def.cost;
        const b = this.createBuilding(type, tile.x, tile.y, this.currentPlayer);
        b.built = false;
        b.buildProgress = 0;
        p.buildings.push(b);
        this.placingBuilding = null;
        this.eva(`${def.name} under construction.`);
        this.updateMoney();
    }


    getDisplayName(type) {
        return BUILD_TYPES[type]?.name || UNIT_TYPES[type]?.name || type;
    }

    getMissingPrerequisites(player, prerequisites) {
        const owned = new Set(player.buildings.filter(b => b.hp > 0 && b.built).map(b => b.type));
        return (prerequisites || []).filter(req => !owned.has(req)).map(req => BUILD_TYPES[req]?.name || req);
    }

    canUnitReceiveCommand(unit) {
        return unit && unit.state !== 'dead' && unit.role !== 'harvester';
    }

    isCombatUnit(unit) {
        return unit && unit.state !== 'dead' && unit.damage > 0;
    }

    getProductionBuildings(player, unitType) {
        const producer = UNIT_TYPES[unitType]?.producedBy;
        return player.buildings.filter(b => b.type === producer && b.built && b.hp > 0);
    }

    getQueueLength(building) {
        return (building.training ? 1 : 0) + (building.trainQueue?.length || 0);
    }

    getPrimarySelectedBuilding() {
        return this.selected.length === 1 && this.selected[0]?.tx !== undefined ? this.selected[0] : null;
    }

    canSetRallyPoint(building) {
        return !!(building && BUILD_TYPES[building.type]?.production && building.built && building.hp > 0);
    }

    canRepairBuilding(player, building) {
        if (!building || building.tx === undefined || !building.built || building.hp <= 0) return false;
        if (building.hp >= building.maxHp) return false;
        return player.money > 0;
    }

    toggleRepairBuilding(building) {
        const player = this.players[building.owner];
        if (!this.canRepairBuilding(player, building) && !building.repairing) {
            this.eva('Cannot repair right now.');
            return;
        }
        building.repairing = !building.repairing;
        if (building.repairing) {
            building.sellPending = false;
            this.eva(`${this.getDisplayName(building.type)} repair started.`);
        } else {
            this.eva(`${this.getDisplayName(building.type)} repair stopped.`);
        }
        this.updateSelectionInfo();
    }

    sellBuilding(building) {
        const player = this.players[building.owner];
        const refund = Math.max(100, Math.floor((BUILD_TYPES[building.type]?.cost || 0) * 0.5 * Math.max(0.3, building.hp / building.maxHp)));
        player.money += refund;
        building.hp = 0;
        building.repairing = false;
        building.training = null;
        building.trainQueue = [];
        if (building.owner === this.currentPlayer) {
            this.commandMode = null;
            this.selected = [];
            this.updateMoney();
            this.updateUI();
            this.eva(`${this.getDisplayName(building.type)} sold for $${refund}.`);
        }
    }

    cancelBuildingConstruction(building) {
        if (!building || building.built) return;
        const player = this.players[building.owner];
        const totalCost = BUILD_TYPES[building.type]?.cost || 0;
        const refund = Math.max(0, Math.floor(totalCost * (1 - building.buildProgress)));
        player.money += refund;
        building.hp = 0;
        building.training = null;
        building.trainQueue = [];
        if (building.owner === this.currentPlayer) {
            this.commandMode = null;
            this.selected = [];
            this.updateMoney();
            this.updateUI();
            this.eva(`${this.getDisplayName(building.type)} construction cancelled. Refund $${refund}.`);
        }
    }

    cancelCurrentProduction(building) {
        if (!building?.training) return;
        const player = this.players[building.owner];
        const type = building.training;
        const def = UNIT_TYPES[type];
        const progress = building.trainProgress || 0;
        const refund = Math.max(0, Math.floor(def.cost * (1 - progress)));
        player.money += refund;
        building.training = null;
        building.trainProgress = 0;
        if (building.owner === this.currentPlayer) {
            this.updateMoney();
            this.updateUI();
            this.eva(`${def.name} production cancelled. Refund $${refund}.`);
        }
    }

    cancelQueuedProduction(building) {
        if (!building?.trainQueue?.length) return;
        const player = this.players[building.owner];
        const type = building.trainQueue.pop();
        const def = UNIT_TYPES[type];
        const refund = def.cost;
        player.money += refund;
        if (building.owner === this.currentPlayer) {
            this.updateMoney();
            this.updateUI();
            this.eva(`${def.name} queue cancelled. Refund $${refund}.`);
        }
    }

    spawnProducedUnit(player, building, unitType) {
        const exit = building.rallyPoint || { x: building.tx + building.size + 1, y: building.ty + Math.floor(building.size / 2) };
        const unit = this.createUnit(unitType, exit.x, exit.y, building.owner);
        player.units.push(unit);
        if (unit.role === 'harvester') this.assignHarvesterJob(unit, player);
    }

    issueMoveOrder(unit, tx, ty, state = 'moving') {
        unit.target = { x: tx, y: ty };
        unit.attackTarget = null;
        unit.state = state;
        unit.path = this.findPath(Math.round(unit.x), Math.round(unit.y), Math.floor(tx), Math.floor(ty));
        unit.pathIdx = unit.path && unit.path.length > 1 && Math.hypot(unit.path[0].x - unit.x, unit.path[0].y - unit.y) < 0.5 ? 1 : 0;
    }

    getEntityAnchor(entity) {
        if (!entity) return null;
        if (entity.tx !== undefined) {
            return {
                x: entity.tx + entity.size / 2 - 0.5,
                y: entity.ty + entity.size / 2 - 0.5
            };
        }
        return { x: entity.x, y: entity.y };
    }

    getSelectedRallyOverlay() {
        const building = this.getPrimarySelectedBuilding();
        if (!building || !this.canSetRallyPoint(building)) return null;
        const source = this.getEntityAnchor(building);
        const target = this.commandMode === 'set-rally'
            ? { x: this.hoverTile.x, y: this.hoverTile.y }
            : building.rallyPoint;
        if (!source || !target) return null;
        return {
            kind: 'rally',
            active: this.commandMode === 'set-rally',
            source,
            target,
            label: this.commandMode === 'set-rally' ? 'RALLY PREVIEW' : 'RALLY'
        };
    }

    getSelectedOrderOverlays() {
        const overlays = [];
        for (const unit of this.selected) {
            if (!this.canUnitReceiveCommand(unit)) continue;

            const anchor = this.getEntityAnchor(unit);
            if (!anchor) continue;

            const pathPoints = [anchor];
            if (unit.path && unit.pathIdx < unit.path.length) {
                for (let i = unit.pathIdx; i < unit.path.length; i++) {
                    pathPoints.push({ x: unit.path[i].x, y: unit.path[i].y });
                }
            } else if (unit.target) {
                pathPoints.push({ x: unit.target.x, y: unit.target.y });
            }

            const finalPoint = pathPoints[pathPoints.length - 1];
            if (!finalPoint || pathPoints.length < 2) continue;

            overlays.push({
                kind: unit.attackTarget ? 'attack' : 'move',
                unit,
                path: pathPoints,
                target: finalPoint
            });
        }
        return overlays;
    }

    moveUnitAlongPath(unit, dt) {
        let targetX, targetY;
        if (unit.path && unit.pathIdx < unit.path.length) {
            const waypoint = unit.path[unit.pathIdx];
            targetX = waypoint.x;
            targetY = waypoint.y;
        } else if (unit.target) {
            targetX = unit.target.x;
            targetY = unit.target.y;
        } else {
            unit.state = 'idle';
            return true;
        }

        const dx = targetX - unit.x;
        const dy = targetY - unit.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.2) {
            if (unit.path && unit.pathIdx < unit.path.length - 1) unit.pathIdx++;
            else {
                unit.state = 'idle';
                unit.target = null;
                unit.path = null;
                return true;
            }
        } else if (dist > 0.1) {
            const speed = unit.speed * dt / 1000;
            unit.x += (dx / dist) * Math.min(speed, dist);
            unit.y += (dy / dist) * Math.min(speed, dist);
            this.faceToward(unit, targetX, targetY);
        }
        return false;
    }

    findNearestRefinery(player, unit) {
        let best = null;
        let bestDist = Infinity;
        for (const building of player.buildings) {
            if (building.type !== 'refinery' || building.hp <= 0 || !building.built) continue;
            const cx = building.tx + building.size / 2 - 0.5;
            const cy = building.ty + building.size / 2 - 0.5;
            const dist = Math.hypot(unit.x - cx, unit.y - cy);
            if (dist < bestDist) {
                bestDist = dist;
                best = building;
            }
        }
        return best;
    }

    findNearestOreTile(unit) {
        let best = null;
        let bestDist = Infinity;
        for (let y = 0; y < MAP_SIZE; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
                const tile = this.map[y][x];
                if (tile.type !== 'ore' || tile.oreAmount <= 0) continue;
                const dist = Math.hypot(unit.x - x, unit.y - y);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = { x, y, tile };
                }
            }
        }
        return best;
    }

    assignHarvesterJob(unit, player) {
        const refinery = this.findNearestRefinery(player, unit);
        if (!refinery) {
            unit.state = 'idle';
            unit.target = null;
            return;
        }
        if (unit.cargo >= unit.cargoCapacity) {
            const tx = refinery.tx + refinery.size / 2 - 0.5;
            const ty = refinery.ty + refinery.size / 2 - 0.5;
            unit.returnRefinery = refinery;
            this.issueMoveOrder(unit, tx, ty, 'movingToRefinery');
            return;
        }
        const ore = this.findNearestOreTile(unit);
        if (!ore) {
            unit.state = 'idle';
            unit.target = null;
            return;
        }
        unit.oreTarget = ore;
        this.issueMoveOrder(unit, ore.x, ore.y, 'movingToOre');
    }

    updateHarvesterUnit(unit, player, dt) {
        if (unit.state === 'dead') {
            unit.deadTimer += dt;
            return;
        }

        if (!unit.target && !unit.oreTarget && unit.cargo === 0 && unit.state === 'idle') {
            this.assignHarvesterJob(unit, player);
        }

        if (unit.state === 'movingToOre' || unit.state === 'movingToRefinery') {
            const finished = this.moveUnitAlongPath(unit, dt);
            if (!finished) return;
        }

        if (unit.cargo >= unit.cargoCapacity) {
            const refinery = unit.returnRefinery || this.findNearestRefinery(player, unit);
            if (!refinery) return;
            const tx = refinery.tx + refinery.size / 2 - 0.5;
            const ty = refinery.ty + refinery.size / 2 - 0.5;
            const dist = Math.hypot(unit.x - tx, unit.y - ty);
            if (dist > 1.75) {
                unit.returnRefinery = refinery;
                this.issueMoveOrder(unit, tx, ty, 'movingToRefinery');
                return;
            }
            unit.state = 'unloading';
            unit.unloadTimer += dt;
            if (unit.unloadTimer >= unit.unloadInterval) {
                unit.unloadTimer = 0;
                const amount = Math.min(unit.unloadRate, unit.cargo);
                unit.cargo -= amount;
                player.money += amount;
            }
            if (unit.cargo <= 0) {
                unit.cargo = 0;
                unit.returnRefinery = null;
                this.assignHarvesterJob(unit, player);
            }
            return;
        }

        const ore = unit.oreTarget && unit.oreTarget.tile?.oreAmount > 0 ? unit.oreTarget : this.findNearestOreTile(unit);
        if (!ore) {
            unit.state = 'idle';
            return;
        }
        unit.oreTarget = ore;
        const dist = Math.hypot(unit.x - ore.x, unit.y - ore.y);
        if (dist > 0.65) {
            this.issueMoveOrder(unit, ore.x, ore.y, 'movingToOre');
            return;
        }

        unit.state = 'harvesting';
        unit.harvestTimer += dt;
        if (unit.harvestTimer >= unit.harvestInterval) {
            unit.harvestTimer = 0;
            const mined = Math.min(unit.harvestRate, ore.tile.oreAmount, unit.cargoCapacity - unit.cargo);
            ore.tile.oreAmount -= mined;
            unit.cargo += mined;
            if (ore.tile.oreAmount <= 0 || unit.cargo >= unit.cargoCapacity) {
                if (ore.tile.oreAmount <= 0) ore.tile.type = 'grass';
                this.assignHarvesterJob(unit, player);
            }
        }
    }

    updatePowerState(player) {
        if (!player) return;
        const status = POWER_SYSTEM.getStatusLabel(player);
        const display = document.getElementById('power-display');
        if (!display) return;
        display.textContent = status.text;
        display.classList.toggle('low-power', status.lowPower);
        if (player === this.players[this.currentPlayer]) {
            if (status.lowPower && !player.lowPowerNotified) {
                this.eva('Warning: low power.');
                player.lowPowerNotified = true;
            }
            if (!status.lowPower) player.lowPowerNotified = false;
        }
    }

    // ==================== PATHFINDING (Simple A*) ====================

    findPath(sx, sy, ex, ey) {
        if (sx === ex && sy === ey) return [{ x: ex, y: ey }];
        const open = [{ x: sx, y: sy, g: 0, h: 0, f: 0, parent: null }];
        const closedSet = new Set();
        const closedNodes = new Map(); // key → node (for path reconstruction)
        const key = (x, y) => `${x},${y}`;

        const isWalkable = (x, y) => {
            if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return false;
            if (this.map[y][x].type === 'water') return false;
            for (const p of this.players) {
                for (const b of p.buildings) {
                    if (x >= b.tx && x < b.tx + b.size && y >= b.ty && y < b.ty + b.size) return false;
                }
            }
            return true;
        };

        const reconstructPath = (node) => {
            const path = [];
            let n = node;
            while (n) { path.unshift({ x: n.x, y: n.y }); n = n.parent; }
            return path;
        };

        let iterations = 0;
        let bestClosedNode = null, bestClosedDist = Infinity;

        while (open.length > 0 && iterations < 2000) {
            iterations++;
            open.sort((a, b) => a.f - b.f);
            const curr = open.shift();

            if (curr.x === ex && curr.y === ey) {
                return reconstructPath(curr);
            }

            const k = key(curr.x, curr.y);
            closedSet.add(k);
            closedNodes.set(k, curr);

            // Track closest explored node to target
            const distToTarget = Math.hypot(curr.x - ex, curr.y - ey);
            if (distToTarget < bestClosedDist) {
                bestClosedDist = distToTarget;
                bestClosedNode = curr;
            }

            const neighbors = [
                { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 },
                { x: curr.x + 1, y: curr.y + 1 }, { x: curr.x - 1, y: curr.y - 1 },
                { x: curr.x + 1, y: curr.y - 1 }, { x: curr.x - 1, y: curr.y + 1 },
            ];

            for (const nb of neighbors) {
                if (!isWalkable(nb.x, nb.y) || closedSet.has(key(nb.x, nb.y))) continue;
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
        // No complete path — walk to closest reachable tile (with proper path reconstruction)
        if (bestClosedNode && (bestClosedNode.x !== sx || bestClosedNode.y !== sy)) {
            return reconstructPath(bestClosedNode);
        }
        return [];
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
        this.updatePowerState(this.players[this.currentPlayer]);
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
            const buildSpeed = POWER_SYSTEM.getBuildSpeedMultiplier(p);
            for (const b of p.buildings) {
                if (!b.built) {
                    b.buildProgress += (dt / BUILD_TYPES[b.type].buildTime) * buildSpeed;
                    if (b.buildProgress >= 1) {
                        b.buildProgress = 1;
                        b.built = true;
                        if (b.owner === this.currentPlayer) {
                            this.eva('Construction complete.');
                            this.updateUI();
                        }
                    }
                }

                const def = BUILD_TYPES[b.type];
                if (b.repairing && b.built && b.hp > 0 && b.hp < b.maxHp) {
                    const repairCost = dt * 0.02;
                    const repairAmount = dt * 0.03;
                    if (p.money >= repairCost) {
                        p.money -= repairCost;
                        b.hp = Math.min(b.maxHp, b.hp + repairAmount);
                    } else {
                        b.repairing = false;
                        if (b.owner === this.currentPlayer) this.eva('Repair paused: insufficient funds.');
                    }
                    if (b.hp >= b.maxHp) {
                        b.repairing = false;
                        if (b.owner === this.currentPlayer) this.eva(`${this.getDisplayName(b.type)} fully repaired.`);
                    }
                }

                if (def.production && b.built && b.hp > 0) {
                    if (!b.training && b.trainQueue.length > 0) {
                        b.training = b.trainQueue.shift();
                        b.trainProgress = 0;
                    }
                    if (b.training) {
                        const unitDef = UNIT_TYPES[b.training];
                        b.trainProgress += (dt / unitDef.trainTime) * buildSpeed;
                        if (b.trainProgress >= 1) {
                            const producedType = b.training;
                            b.trainProgress = 0;
                            b.training = null;
                            this.spawnProducedUnit(p, b, producedType);
                            if (b.owner === this.currentPlayer) {
                                const qLeft = this._getTotalTrainQueue(p);
                                this.eva(`${unitDef.name} ready.${qLeft > 0 ? ` (${qLeft} queued)` : ''}`);
                                this._updateQueueBadge();
                                this.updateUI();
                            }
                        }
                    }
                }

                if (b.hp <= 0) {
                    this.effects.push({ type: 'explosion', x: b.tx + b.size / 2, y: b.ty + b.size / 2, frame: 0, timer: 0, big: true });
                    this.renderer3d.removeBuilding(b);
                }
            }
            p.buildings = p.buildings.filter(b => b.hp > 0);
        }
    }

    updateUnits(dt) {
        for (const p of this.players) {
            for (const u of p.units) {
                if (u.type === 'harvester') {
                    this.updateHarvesterUnit(u, p, dt);
                    continue;
                }

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

                        // Retaliation: if being attacked by someone closer, switch to fight them
                        if (u._lastHitTime && Date.now() - u._lastHitTime < 3000) {
                            const nearbyAttacker = this._findNearestEnemy(u, u.owner);
                            if (nearbyAttacker) {
                                const attackerDist = Math.hypot(u.x - (nearbyAttacker.x !== undefined ? nearbyAttacker.x : nearbyAttacker.tx + 1),
                                    u.y - (nearbyAttacker.y !== undefined ? nearbyAttacker.y : nearbyAttacker.ty + 1));
                                // If attacker is closer than current target and in range, switch
                                if (attackerDist <= u.range && attackerDist < dist) {
                                    u.attackTarget = nearbyAttacker;
                                    u.path = null;
                                    u._lastHitTime = 0;
                                    continue;
                                }
                            }
                        }

                        // Move toward attack target using pathfinding
                        // Repath every 2s or if no path exists
                        u._repathTimer = (u._repathTimer || 0) + dt;
                        if (!u.path || u.path.length === 0 || u.pathIdx >= u.path.length || u._repathTimer > 2000) {
                            u.path = this.findPath(Math.round(u.x), Math.round(u.y), Math.floor(targetX), Math.floor(targetY));
                            u.pathIdx = 0;
                            u._repathTimer = 0;
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
                    } else if (u.state === 'moving') {
                        // While moving, check for enemies in attack range → auto-engage
                        const nearbyEnemy = this._findNearestEnemy(u, u.owner);
                        if (nearbyEnemy) {
                            const ed = Math.hypot(u.x - (nearbyEnemy.x !== undefined ? nearbyEnemy.x : nearbyEnemy.tx + 1),
                                                   u.y - (nearbyEnemy.y !== undefined ? nearbyEnemy.y : nearbyEnemy.ty + 1));
                            if (ed <= u.range) {
                                // Enemy in attack range → stop and engage
                                // Save move target so player can resume later
                                u._savedTarget = u.target;
                                u._savedPath = u.path;
                                u._savedPathIdx = u.pathIdx;
                                u.attackTarget = nearbyEnemy;
                                u.state = 'engaging'; // special state: auto-engaged during move
                                u.target = null;
                                u.path = null;
                                this.faceToward(u, nearbyEnemy.x !== undefined ? nearbyEnemy.x : nearbyEnemy.tx + 1,
                                                nearbyEnemy.y !== undefined ? nearbyEnemy.y : nearbyEnemy.ty + 1);
                                if (u.fireTimer <= 0) {
                                    u.fireTimer = u.fireRate;
                                    this.fireAt(u, nearbyEnemy);
                                }
                                continue;
                            }
                        }

                        // Normal movement
                        if (u.path && u.pathIdx < u.path.length) {
                            const waypoint = u.path[u.pathIdx];
                            targetX = waypoint.x;
                            targetY = waypoint.y;
                        } else if (u.target) {
                            targetX = u.target.x;
                            targetY = u.target.y;
                        } else {
                            u.state = 'idle';
                            continue;
                        }
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

                // Engaging state: auto-engaged enemy during movement
                if (u.state === 'engaging') {
                    const at = u.attackTarget;
                    if (!at || (at.hp !== undefined && at.hp <= 0) || at.state === 'dead') {
                        // Enemy dead → go idle (player must re-issue move command)
                        u.attackTarget = null;
                        u.state = 'idle';
                        u._savedTarget = null;
                        u._savedPath = null;
                        u._savedPathIdx = null;
                        continue;
                    }

                    const etx = at.x !== undefined ? at.x : at.tx + 1;
                    const ety = at.y !== undefined ? at.y : at.ty + 1;
                    const ed = Math.hypot(u.x - etx, u.y - ety);

                    if (ed <= u.range) {
                        // In range — keep firing
                        this.faceToward(u, etx, ety);
                        if (u.fireTimer <= 0) {
                            u.fireTimer = u.fireRate;
                            this.fireAt(u, at);
                        }
                    } else {
                        // Enemy moved out of range — chase them (not resume original move)
                        u.state = 'attacking';
                        u._savedTarget = null;
                        u._savedPath = null;
                        u._savedPathIdx = null;
                    }
                    continue;
                }

                if (u.state === 'idle') {
                    u.frame = 0;
                }

                // Unit separation force to prevent stacking
                if (u.state !== 'dead') {
                    let pushX = 0, pushY = 0;
                    for (const p2 of this.players) {
                        for (const other of p2.units) {
                            if (other === u || other.state === 'dead') continue;
                            const sdx = u.x - other.x;
                            const sdy = u.y - other.y;
                            const sd = Math.hypot(sdx, sdy);
                            if (sd < 0.6 && sd > 0.001) {
                                // Stronger push at closer distances
                                const pushStrength = (0.6 - sd) * 0.15;
                                pushX += (sdx / sd) * pushStrength;
                                pushY += (sdy / sd) * pushStrength;
                            }
                        }
                    }
                    // Only apply push if destination tile is walkable (not water)
                    if (pushX !== 0 || pushY !== 0) {
                        const newTX = Math.floor(u.x + pushX);
                        const newTY = Math.floor(u.y + pushY);
                        if (newTX >= 0 && newTY >= 0 && newTX < MAP_SIZE && newTY < MAP_SIZE &&
                            this.map[newTY]?.[newTX]?.type !== 'water') {
                            u.x += pushX;
                            u.y += pushY;
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
            speed: u.projectileSpeed || 8,
            damage: u.damage,
            damageProfile: u.damageProfile || null,
            weaponType: u.weaponType || 'rifle',
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
                // Splash damage: hit primary target + nearby enemies within 1.2 tiles
                const splashRadius = 1.2;
                const hitX = p.tx, hitY = p.ty;
                for (let pi2 = 0; pi2 < this.players.length; pi2++) {
                    if (pi2 === p.owner) continue; // don't splash friendlies
                    for (const eu of this.players[pi2].units) {
                        if (eu.state === 'dead' || eu.hp <= 0) continue;
                        const sd = Math.hypot(eu.x - hitX, eu.y - hitY);
                        if (sd <= splashRadius) {
                            const directDamage = this.getDamageAgainstTarget(p.damage, p.damageProfile, eu);
                            const dmg = (eu === p.target) ? directDamage : Math.max(1, Math.floor(directDamage * 0.5));
                            eu.hp -= dmg;
                            // Record who attacked this unit (for retaliation)
                            eu._lastAttackerOwner = p.owner;
                            eu._lastHitTime = Date.now();
                            if (eu.hp <= 0) eu.state = 'dead';
                        }
                    }
                    for (const eb of this.players[pi2].buildings) {
                        if (eb.hp <= 0) continue;
                        const bx = eb.tx + 1, by = eb.ty + 1;
                        const sd = Math.hypot(bx - hitX, by - hitY);
                        if (sd <= splashRadius) {
                            const directDamage = this.getDamageAgainstTarget(p.damage, p.damageProfile, eb);
                            const dmg = (eb === p.target) ? directDamage : Math.max(1, Math.floor(directDamage * 0.5));
                            eb.hp -= dmg;
                        }
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
        this.aiDecisionInterval = 2500 + Math.random() * 1500;

        const ai = this.players[1];
        if (!ai || (ai.buildings.length === 0 && ai.units.length === 0)) return;

        const baseX = ai.buildings.length > 0 ? ai.buildings[0].tx : MAP_SIZE - 10;
        const baseY = ai.buildings.length > 0 ? ai.buildings[0].ty : MAP_SIZE - 10;
        const builtTypes = new Set(ai.buildings.filter(b => b.built && b.hp > 0).map(b => b.type));

        const tryBuild = type => {
            const def = BUILD_TYPES[type];
            if (ai.money < def.cost) return false;
            if (this.getMissingPrerequisites(ai, def.prerequisites).length > 0) return false;
            const pos = this._aiPickBuildPos(baseX, baseY, type);
            if (!pos) return false;
            ai.money -= def.cost;
            const b = this.createBuilding(type, pos.x, pos.y, 1);
            b.built = false;
            b.buildProgress = 0;
            ai.buildings.push(b);
            return true;
        };

        if (POWER_SYSTEM.isLowPower(ai) && tryBuild('powerPlant')) return;
        if (!builtTypes.has('refinery') && tryBuild('refinery')) return;
        if (!builtTypes.has('barracks') && tryBuild('barracks')) return;
        if (!builtTypes.has('warFactory') && tryBuild('warFactory')) return;
        if (ai.buildings.filter(b => b.type === 'powerPlant').length < 2 && ai.money > 2200 && tryBuild('powerPlant')) return;

        const harvesters = ai.units.filter(u => u.type === 'harvester' && u.state !== 'dead').length;
        const refineries = ai.buildings.filter(b => b.type === 'refinery' && b.built && b.hp > 0).length;
        const warFactories = this.getProductionBuildings(ai, 'harvester');
        const barracks = this.getProductionBuildings(ai, 'soldier');
        const tankFactories = this.getProductionBuildings(ai, 'tank');
        const enemyPlayer = this.players[0];
        const enemyHeavyUnits = enemyPlayer.units.filter(u => u.state !== 'dead' && u.armorType === 'heavy').length;
        const enemyInfantryUnits = enemyPlayer.units.filter(u => u.state !== 'dead' && u.role !== 'harvester' && u.armorType !== 'heavy').length;

        if (warFactories.length > 0 && harvesters < Math.max(1, refineries) && ai.money >= UNIT_TYPES.harvester.cost) {
            const wf = warFactories.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            ai.money -= UNIT_TYPES.harvester.cost;
            if (!wf.training) wf.training = 'harvester';
            else wf.trainQueue.push('harvester');
            return;
        }

        if (tankFactories.length > 0 && ai.money >= UNIT_TYPES.tank.cost) {
            const wf = tankFactories.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            ai.money -= UNIT_TYPES.tank.cost;
            if (!wf.training) wf.training = 'tank';
            else wf.trainQueue.push('tank');
        }

        const aiRocketCount = ai.units.filter(u => u.state !== 'dead' && u.type === 'rocketInfantry').length + this._getTotalTrainQueue(ai, 'rocketInfantry');
        const aiFlakCount = ai.units.filter(u => u.state !== 'dead' && u.type === 'flakTrooper').length + this._getTotalTrainQueue(ai, 'flakTrooper');
        const aiSoldierCount = ai.units.filter(u => u.state !== 'dead' && u.type === 'soldier').length + this._getTotalTrainQueue(ai, 'soldier');

        if (barracks.length > 0) {
            const bb = barracks.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            let infantryChoice = 'soldier';
            if (enemyHeavyUnits > aiRocketCount && ai.money >= UNIT_TYPES.rocketInfantry.cost) {
                infantryChoice = 'rocketInfantry';
            } else if (enemyInfantryUnits > aiFlakCount + 1 && ai.money >= UNIT_TYPES.flakTrooper.cost) {
                infantryChoice = 'flakTrooper';
            } else if (aiSoldierCount > 0 && aiSoldierCount % 3 === 0 && ai.money >= UNIT_TYPES.rocketInfantry.cost) {
                infantryChoice = 'rocketInfantry';
            } else if (aiSoldierCount > 1 && aiSoldierCount % 2 === 0 && ai.money >= UNIT_TYPES.flakTrooper.cost) {
                infantryChoice = 'flakTrooper';
            } else if (ai.money < UNIT_TYPES.soldier.cost) {
                return;
            }

            ai.money -= UNIT_TYPES[infantryChoice].cost;
            if (!bb.training) bb.training = infantryChoice;
            else bb.trainQueue.push(infantryChoice);
        }

        const combatUnits = ai.units.filter(u => this.isCombatUnit(u) && u.state === 'idle');
        if (combatUnits.length >= 5) {
            const playerData = this.players[0];
            let target = playerData.buildings.find(b => b.type === 'powerPlant' || b.type === 'warFactory') || playerData.buildings[0];
            if (!target) target = playerData.units.find(u => u.state !== 'dead');
            if (target) {
                const tx = target.tx !== undefined ? target.tx + target.size / 2 - 0.5 : target.x;
                const ty = target.ty !== undefined ? target.ty + target.size / 2 - 0.5 : target.y;
                for (const unit of combatUnits) {
                    unit.attackTarget = target;
                    unit.state = 'attacking';
                    unit.path = this.findPath(Math.floor(unit.x), Math.floor(unit.y), Math.floor(tx), Math.floor(ty));
                    unit.pathIdx = 0;
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

        // Rally / movement overlays for selected entities
        this._drawOrderOverlays(this.overlayCtx);

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

    _drawOrderOverlays(ctx) {
        const rallyOverlay = this.getSelectedRallyOverlay();
        if (rallyOverlay) {
            this._drawOverlayPath(ctx, [rallyOverlay.source, rallyOverlay.target], {
                color: rallyOverlay.active ? '#66ddff' : '#00aaff',
                dashed: true,
                width: rallyOverlay.active ? 2.5 : 2
            });
            this._drawOverlayMarker(ctx, rallyOverlay.target, {
                color: rallyOverlay.active ? '#66ddff' : '#00aaff',
                label: rallyOverlay.label,
                style: 'diamond'
            });
        }

        const orderOverlays = this.getSelectedOrderOverlays();
        for (const overlay of orderOverlays.slice(0, 10)) {
            const isAttack = overlay.kind === 'attack';
            this._drawOverlayPath(ctx, overlay.path, {
                color: isAttack ? '#ff5a36' : '#00ff88',
                dashed: true,
                width: 1.5,
                alpha: 0.75
            });
            this._drawOverlayMarker(ctx, overlay.target, {
                color: isAttack ? '#ff5a36' : '#00ff88',
                label: isAttack ? 'ATTACK' : 'MOVE',
                style: isAttack ? 'crosshair' : 'ring',
                alpha: 0.85
            });
        }
    }

    _drawOverlayPath(ctx, points, options = {}) {
        if (!points || points.length < 2) return;
        const screens = points.map(point => this.renderer3d.tileToScreen(point.x, point.y));
        ctx.save();
        ctx.strokeStyle = options.color || '#00ff88';
        ctx.lineWidth = options.width || 2;
        ctx.globalAlpha = options.alpha ?? 1;
        if (options.dashed) ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(screens[0].x, screens[0].y);
        for (let i = 1; i < screens.length; i++) {
            ctx.lineTo(screens[i].x, screens[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }

    _drawOverlayMarker(ctx, point, options = {}) {
        const screen = this.renderer3d.tileToScreen(point.x, point.y);
        const color = options.color || '#00ff88';
        const alpha = options.alpha ?? 1;
        const style = options.style || 'ring';
        const radius = options.radius || 10;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;

        if (style === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y - radius);
            ctx.lineTo(screen.x + radius, screen.y);
            ctx.lineTo(screen.x, screen.y + radius);
            ctx.lineTo(screen.x - radius, screen.y);
            ctx.closePath();
            ctx.stroke();
        } else if (style === 'crosshair') {
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(screen.x - radius - 4, screen.y);
            ctx.lineTo(screen.x + radius + 4, screen.y);
            ctx.moveTo(screen.x, screen.y - radius - 4);
            ctx.lineTo(screen.x, screen.y + radius + 4);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        if (options.label) {
            ctx.font = 'bold 10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = 'rgba(0,0,0,0.85)';
            ctx.lineWidth = 3;
            ctx.strokeText(options.label, screen.x, screen.y - radius - 8);
            ctx.fillText(options.label, screen.x, screen.y - radius - 8);
        }
        ctx.restore();
    }

    renderMinimap() {
        const mctx = this.minimapCtx;
        const mw = 180, mh = 180;
        const scale = mw / MAP_SIZE;
        const ownP = this.players[this.currentPlayer];
        const radarOffline = POWER_SYSTEM.isLowPower(ownP);

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
        mctx.fillStyle = ownP.color;
        for (const b of ownP.buildings) {
            mctx.fillRect(b.tx * scale, b.ty * scale, b.size * scale, b.size * scale);
        }
        for (const u of ownP.units) {
            if (u.state === 'dead') continue;
            mctx.fillRect(u.x * scale - 1, u.y * scale - 1, 2, 2);
        }

        // Enemy: only show in revealed fog
        if (!radarOffline) for (let pi = 0; pi < this.players.length; pi++) {
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

        if (radarOffline) {
            mctx.fillStyle = 'rgba(120,0,0,0.35)';
            mctx.fillRect(0, 0, mw, mh);
            mctx.fillStyle = '#ff8888';
            mctx.font = 'bold 14px Courier New';
            mctx.fillText('RADAR OFFLINE', 24, mh / 2);
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
        this.updatePowerState(this.players[this.currentPlayer]);

        document.querySelectorAll('.build-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.build-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateUI();
            });
        });

        document.getElementById('selection-info').addEventListener('click', e => {
            const action = e.target?.dataset?.action;
            if (!action) return;
            const building = this.getPrimarySelectedBuilding();
            if (!building) return;

            if (action === 'repair') {
                this.toggleRepairBuilding(building);
            } else if (action === 'sell') {
                this.sellBuilding(building);
            } else if (action === 'cancel-build') {
                this.cancelBuildingConstruction(building);
            } else if (action === 'cancel-current') {
                this.cancelCurrentProduction(building);
            } else if (action === 'cancel-queue') {
                this.cancelQueuedProduction(building);
            } else if (action === 'rally') {
                if (!this.canSetRallyPoint(building)) return;
                this.commandMode = this.commandMode === 'set-rally' ? null : 'set-rally';
                this.eva(this.commandMode ? 'Right-click to place rally point.' : 'Rally placement cancelled.');
                this.updateSelectionInfo();
            }
        });
    }

    updateUI() {
        const activeTab = document.querySelector('.build-tab.active')?.dataset.tab || 'buildings';
        const container = document.getElementById('build-items');
        container.innerHTML = '';
        const p = this.players[this.currentPlayer];

        if (activeTab === 'buildings') {
            ['powerPlant', 'refinery', 'barracks', 'warFactory'].forEach(type => {
                const def = BUILD_TYPES[type];
                this.addBuildItem(container, type, def.name, def.cost, def.description, false);
            });
        } else {
            ['soldier', 'rocketInfantry', 'flakTrooper', 'harvester', 'tank'].forEach(type => {
                const def = UNIT_TYPES[type];
                this.addBuildItem(container, type, def.name, def.cost, def.role, true);
            });
        }

        this.updateSelectionInfo();
        this._updateQueueBadge();
        this.updatePowerState(p);
    }

    addBuildItem(container, type, name, cost, desc, isUnit = false) {
        const p = this.players[this.currentPlayer];
        const sourceDef = isUnit ? UNIT_TYPES[type] : BUILD_TYPES[type];
        const div = document.createElement('div');
        const missing = this.getMissingPrerequisites(p, sourceDef.prerequisites || []);
        const locked = missing.length > 0;
        const affordable = p.money >= cost;
        div.className = 'build-item' + (!affordable ? ' disabled' : '') + (locked ? ' locked' : '');

        const iconSize = 80;
        const iconCanvas = this.renderer3d.renderBuildIcon(type, p.color, iconSize);
        const iconImg = document.createElement('canvas');
        iconImg.width = iconSize;
        iconImg.height = iconSize;
        const ictx = iconImg.getContext('2d');
        ictx.fillStyle = '#1a1a2e';
        ictx.fillRect(0, 0, iconSize, iconSize);
        ictx.drawImage(iconCanvas, 0, 0, iconSize, iconSize);
        div.appendChild(iconImg);

        const costEl = document.createElement('div');
        costEl.className = 'item-cost';
        costEl.textContent = `$${cost}`;
        div.appendChild(costEl);

        const labelEl = document.createElement('div');
        labelEl.className = 'item-label';
        labelEl.textContent = name;
        div.appendChild(labelEl);

        const descEl = document.createElement('div');
        descEl.className = 'item-desc';
        descEl.textContent = desc;
        div.appendChild(descEl);

        const statusEl = document.createElement('div');
        statusEl.className = 'item-status';
        statusEl.textContent = locked ? `Need ${missing.join(', ')}` : (!affordable ? 'Insufficient funds' : '');
        if (statusEl.textContent) div.appendChild(statusEl);

        if (isUnit) {
            const totalQueued = this._getTotalTrainQueue(p, type);
            const badge = document.createElement('div');
            badge.className = 'queue-badge';
            badge.textContent = totalQueued;
            badge.style.display = totalQueued > 0 ? 'block' : 'none';
            div.appendChild(badge);
            this._queueBadges = this._queueBadges || {};
            this._queueBadges[type] = badge;
        }

        div.addEventListener('click', () => {
            if (locked) { this.eva(`Prerequisite missing: ${missing.join(', ')}`); return; }
            if (!affordable) { this.eva('Insufficient funds.'); return; }
            if (isUnit) {
                const buildings = this.getProductionBuildings(p, type);
                if (buildings.length === 0) { this.eva(`No available ${BUILD_TYPES[UNIT_TYPES[type].producedBy].name}.`); return; }
                buildings.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b));
                const producer = buildings[0];
                if (this.getQueueLength(producer) >= 20) { this.eva('Production queue full (20 max).'); return; }
                p.money -= cost;
                if (!producer.training) {
                    producer.training = type;
                    producer.trainProgress = 0;
                } else {
                    producer.trainQueue.push(type);
                }
                this.updateMoney();
                const qTotal = this._getTotalTrainQueue(p, type);
                this.eva(`Training ${name}... (${qTotal} queued)`);
                this._updateQueueBadge();
            } else {
                this.placingBuilding = type;
                this.eva(`Select location for ${name}.`);
            }
            this.updateUI();
        });

        container.appendChild(div);
    }

    updateMoney() {
        document.getElementById('money').textContent = Math.floor(this.players[this.currentPlayer].money);
    }

    updateSelectionInfo() {
        const info = document.getElementById('selection-info');
        if (this.selected.length === 0) {
            info.innerHTML = '<div style="color:#666">No selection</div>';
            return;
        }

        if (this.selected.length === 1) {
            const s = this.selected[0];
            if (s.tx === undefined) {
                const extras = [];
                if (s.role === 'harvester') extras.push(`ORE: ${Math.floor(s.cargo)}/${s.cargoCapacity}`);
                else extras.push(`DMG: ${s.damage} | RNG: ${s.range}`);
                info.innerHTML = `<div style="color:#00ff88">${this.getDisplayName(s.type)}</div>
                    <div>HP: ${Math.floor(s.hp)}/${s.maxHp}</div>
                    <div>${extras.join(' ')}</div>
                    <div style="color:#666;font-size:9px">${s.state}</div>`;
            } else {
                const def = BUILD_TYPES[s.type];
                const statusBits = [];
                if (s.training) statusBits.push(`Producing: ${this.getDisplayName(s.training)} ${Math.floor(s.trainProgress * 100)}%`);
                if (!s.built) statusBits.push(`Building: ${Math.floor(s.buildProgress * 100)}%`);
                if (def.powerSupply) statusBits.push(`Power +${def.powerSupply}`);
                if (def.powerDrain) statusBits.push(`Drain ${def.powerDrain}`);
                if (s.repairing) statusBits.push('Repairing');
                if (s.rallyPoint && this.canSetRallyPoint(s)) statusBits.push(`Rally: ${Math.round(s.rallyPoint.x)}, ${Math.round(s.rallyPoint.y)}`);
                const canRepair = this.canRepairBuilding(this.players[s.owner], s);
                const rallyButton = this.canSetRallyPoint(s)
                    ? `<button class="selection-action ${this.commandMode === 'set-rally' ? 'active' : ''}" data-action="rally">${this.commandMode === 'set-rally' ? 'Placing Rally' : 'Set Rally'}</button>`
                    : '';
                const repairButton = `<button class="selection-action" data-action="repair" ${(!canRepair && !s.repairing) ? 'disabled' : ''}>${s.repairing ? 'Stop Repair' : 'Repair'}</button>`;
                const sellButton = `<button class="selection-action danger" data-action="sell">Sell</button>`;
                const cancelBuildButton = !s.built
                    ? `<button class="selection-action" data-action="cancel-build">Cancel Build</button>`
                    : '';
                const cancelCurrentButton = s.training
                    ? `<button class="selection-action" data-action="cancel-current">Cancel Current</button>`
                    : '';
                const cancelQueueButton = s.trainQueue?.length
                    ? `<button class="selection-action" data-action="cancel-queue">Cancel Queue</button>`
                    : '';
                const rallyHint = this.canSetRallyPoint(s)
                    ? `<div class="selection-hint">${this.commandMode === 'set-rally' ? 'Right-click any visible tile to place the rally marker.' : 'Select Rally to preview the route and marker.'}</div>`
                    : '';
                info.innerHTML = `<div style="color:#ffd700">${this.getDisplayName(s.type)}</div>
                    <div>HP: ${Math.floor(s.hp)}/${s.maxHp}</div>
                    ${statusBits.map(bit => `<div>${bit}</div>`).join('')}
                    ${rallyHint}
                    <div class="selection-actions">${repairButton}${sellButton}${cancelBuildButton}${cancelCurrentButton}${cancelQueueButton}${rallyButton}</div>`;
            }
        } else {
            const units = this.selected.filter(u => u.tx === undefined);
            const harvesters = units.filter(u => u.role === 'harvester').length;
            const fighters = units.length - harvesters;
            info.innerHTML = `<div style="color:#00ff88">${units.length} units selected</div>
                <div>${fighters} combat | ${harvesters} harvesters</div>
                <div style="color:#666;font-size:9px">Right-click commands apply to combat units only</div>`;
        }
    }

    _getTotalTrainQueue(player, unitType = null) {
        let total = 0;
        for (const b of player.buildings) {
            if (b.hp <= 0) continue;
            const producer = unitType ? UNIT_TYPES[unitType]?.producedBy : null;
            if (producer && b.type !== producer) continue;
            total += (b.training ? 1 : 0) + (b.trainQueue?.length || 0);
        }
        return total;
    }

    _updateQueueBadge() {
        if (!this._queueBadges) return;
        const p = this.players[this.currentPlayer];
        Object.keys(this._queueBadges).forEach(type => {
            const badge = this._queueBadges[type];
            const total = this._getTotalTrainQueue(p, type);
            badge.textContent = total;
            badge.style.display = total > 0 ? 'inline-block' : 'none';
        });
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
    window.game = new GameState();
});
