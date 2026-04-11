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
const MATCH_CONFIG_STORAGE_KEY = 'ra2reborn.matchConfig';
const MATCH_PANEL_COLLAPSED_KEY = 'ra2reborn.setupCollapsed';
const OPENING_AUTO_DEPLOY_MS = 250;
const HARVESTER_RETREAT_RECENT_HIT_MS = 3200;
const HARVESTER_RETREAT_HEALTH_RATIO = 0.55;
const HARVESTER_RETREAT_THREAT_RADIUS = 6.5;
const HARVESTER_RETREAT_SAFE_HOLD_MS = 1800;
const PLAYER_COLORS = ['#cc2222', '#3f7cff', '#2dbd63', '#f2c14e'];
const MAP_PROFILES = {
    classic: {
        id: 'classic',
        name: 'Classic Frontier',
        briefing: 'Balanced ore clusters with the familiar river split.',
        spawnPoints: [{ x: 8, y: 8 }, { x: MAP_SIZE - 10, y: MAP_SIZE - 10 }, { x: MAP_SIZE - 10, y: 8 }, { x: 8, y: MAP_SIZE - 10 }],
        neutralStructures: [
            { type: 'battleBunker', x: 20, y: 19 },
            { type: 'civilianBlock', x: 15, y: 14 },
        ],
    },
    crossroads: {
        id: 'crossroads',
        name: 'Crossroads',
        briefing: 'A harder center fight with a broad crossing and exposed ore lanes.',
        spawnPoints: [{ x: 10, y: 10 }, { x: MAP_SIZE - 13, y: MAP_SIZE - 13 }, { x: MAP_SIZE - 13, y: 10 }, { x: 10, y: MAP_SIZE - 13 }],
        neutralStructures: [
            { type: 'battleBunker', x: 18, y: 18 },
            { type: 'battleBunker', x: 21, y: 18 },
            { type: 'battleBunker', x: 18, y: 21 },
            { type: 'battleBunker', x: 21, y: 21 },
            { type: 'civilianBlock', x: 15, y: 16 },
            { type: 'civilianBlock', x: 23, y: 16 },
        ],
    },
    'twin-rivers': {
        id: 'twin-rivers',
        name: 'Twin Rivers',
        briefing: 'Two river channels carve the battlefield, with a contested central ore basin and safer flank expansions.',
        spawnPoints: [{ x: 7, y: MAP_SIZE - 10 }, { x: MAP_SIZE - 10, y: 8 }, { x: 7, y: 8 }, { x: MAP_SIZE - 10, y: MAP_SIZE - 10 }],
        neutralStructures: [
            { type: 'battleBunker', x: 14, y: 18 },
            { type: 'battleBunker', x: 25, y: 18 },
            { type: 'civilianBlock', x: 20, y: 14 },
            { type: 'civilianBlock', x: 20, y: 22 },
        ],
    },
};
const DEFAULT_MATCH_CONFIG = {
    startingCredits: 6500,
    map: 'classic',
    playerFaction: 'soviet',
    aiDifficulty: 'medium',
    aiPlayers: 1,
    aiBuildOrder: 'balanced',
    gameSpeed: 'normal',
};
const GAME_SPEED_PROFILES = {
    slow: { speed: 'slow', label: 'Slow Grind', multiplier: 0.8 },
    normal: { speed: 'normal', label: 'Standard Tempo', multiplier: 1 },
    fast: { speed: 'fast', label: 'Fast Strike', multiplier: 1.35 },
};
const AI_BUILD_ORDER_PROFILES = {
    balanced: {
        buildOrder: 'balanced',
        label: 'Balanced Pressure',
        prioritizeAirfield: false,
        prioritizeBattleLab: true,
        desiredPowerPlants: 2,
        desiredPillboxes: 1,
        desiredSentryGuns: 1,
        desiredHarriers: 2,
        desiredArtilleryBias: 0,
        attackThresholdDelta: 0,
    },
    armor: {
        buildOrder: 'armor',
        label: 'Armor Spearhead',
        prioritizeAirfield: false,
        prioritizeBattleLab: true,
        desiredPowerPlants: 2,
        desiredPillboxes: 1,
        desiredSentryGuns: 1,
        desiredHarriers: 1,
        desiredArtilleryBias: 0,
        attackThresholdDelta: -1,
    },
    air: {
        buildOrder: 'air',
        label: 'Air Supremacy',
        prioritizeAirfield: true,
        prioritizeBattleLab: false,
        desiredPowerPlants: 2,
        desiredPillboxes: 1,
        desiredSentryGuns: 1,
        desiredHarriers: 4,
        desiredArtilleryBias: 0,
        attackThresholdDelta: 0,
    },
    fortified: {
        buildOrder: 'fortified',
        label: 'Fortified Grind',
        prioritizeAirfield: false,
        prioritizeBattleLab: true,
        desiredPowerPlants: 3,
        desiredPillboxes: 2,
        desiredSentryGuns: 2,
        desiredHarriers: 2,
        desiredArtilleryBias: 1,
        attackThresholdDelta: 1,
    },
};
const VETERANCY_THRESHOLDS = {
    veteran: 80,
    elite: 180,
};
const VETERANCY_BONUSES = {
    rookie: { hp: 1, damage: 1, fireRate: 1 },
    veteran: { hp: 1.12, damage: 1.15, fireRate: 0.9 },
    elite: { hp: 1.28, damage: 1.3, fireRate: 0.8 },
};
const TRANSPORTABLE_INFANTRY_TYPES = new Set(['soldier', 'rocketInfantry', 'flakTrooper', 'engineer']);
const NON_VEHICLE_ROLES = new Set(['infantry', 'anti-armor infantry', 'anti-air infantry', 'engineer', 'attack dog']);
const UNIT_STANCE_ORDER = ['guard', 'aggressive', 'hold'];
const UNIT_STANCE_PROFILES = {
    guard: { id: 'guard', label: 'Guard', hotkey: 'G', autoAcquireBonus: 1.5, movingAcquireRadius: 0, chaseLeash: 5.5 },
    aggressive: { id: 'aggressive', label: 'Aggressive', hotkey: 'A', autoAcquireBonus: 3, movingAcquireRadius: 1.2, chaseLeash: Infinity },
    hold: { id: 'hold', label: 'Hold Ground', hotkey: 'H', autoAcquireBonus: 0.5, movingAcquireRadius: 0, chaseLeash: 0 },
};

function normalizeMatchConfig(config = {}) {
    const startingCredits = Number(config.startingCredits);
    const map = MAP_PROFILES[config.map] ? config.map : DEFAULT_MATCH_CONFIG.map;
    const playerFaction = config.playerFaction === 'allied' ? 'allied' : 'soviet';
    const aiDifficulty = ['easy', 'medium', 'hard'].includes(config.aiDifficulty) ? config.aiDifficulty : DEFAULT_MATCH_CONFIG.aiDifficulty;
    const aiPlayers = Math.max(1, Math.min(3, Number(config.aiPlayers) || DEFAULT_MATCH_CONFIG.aiPlayers));
    const aiBuildOrder = AI_BUILD_ORDER_PROFILES[config.aiBuildOrder] ? config.aiBuildOrder : DEFAULT_MATCH_CONFIG.aiBuildOrder;
    const gameSpeed = GAME_SPEED_PROFILES[config.gameSpeed] ? config.gameSpeed : DEFAULT_MATCH_CONFIG.gameSpeed;
    return {
        startingCredits: [5000, 6500, 10000].includes(startingCredits) ? startingCredits : DEFAULT_MATCH_CONFIG.startingCredits,
        map,
        playerFaction,
        aiDifficulty,
        aiPlayers,
        aiBuildOrder,
        gameSpeed,
    };
}

function getStoredMatchConfig() {
    try {
        return normalizeMatchConfig(JSON.parse(localStorage.getItem(MATCH_CONFIG_STORAGE_KEY) || '{}'));
    } catch {
        return { ...DEFAULT_MATCH_CONFIG };
    }
}

function persistMatchConfig(config) {
    localStorage.setItem(MATCH_CONFIG_STORAGE_KEY, JSON.stringify(normalizeMatchConfig(config)));
}

function getPlayerFactionProfile(faction, color = null) {
    return {
        faction: faction === 'allied' ? 'allied' : 'soviet',
        color: color || (faction === 'allied' ? '#3f7cff' : '#cc2222'),
    };
}

function getAIFactionProfile(playerFaction, aiIndex = 0) {
    const aiFaction = playerFaction === 'allied' ? 'soviet' : 'allied';
    const fallbackColors = playerFaction === 'allied'
        ? ['#cc2222', '#2dbd63', '#f2c14e']
        : ['#3f7cff', '#2dbd63', '#f2c14e'];
    return {
        faction: aiFaction,
        color: fallbackColors[aiIndex] || PLAYER_COLORS[(aiIndex + 1) % PLAYER_COLORS.length],
    };
}

function getAIDifficultyProfile(difficulty) {
    const profiles = {
        easy: { difficulty: 'easy', decisionMin: 3400, decisionRange: 1800, attackThreshold: 5 },
        medium: { difficulty: 'medium', decisionMin: 2500, decisionRange: 1500, attackThreshold: 4 },
        hard: { difficulty: 'hard', decisionMin: 1800, decisionRange: 1100, attackThreshold: 3 },
    };
    return profiles[difficulty] || profiles.medium;
}

function getAIBuildOrderProfile(buildOrder) {
    return AI_BUILD_ORDER_PROFILES[buildOrder] || AI_BUILD_ORDER_PROFILES.balanced;
}

function getGameSpeedProfile(speed) {
    return GAME_SPEED_PROFILES[speed] || GAME_SPEED_PROFILES.normal;
}

function getGameSpeedLabel(speed) {
    return getGameSpeedProfile(speed).label;
}

function getAIProfile(matchConfig) {
    const difficultyProfile = getAIDifficultyProfile(matchConfig.aiDifficulty);
    const buildOrderProfile = getAIBuildOrderProfile(matchConfig.aiBuildOrder);
    return {
        ...difficultyProfile,
        ...buildOrderProfile,
        attackThreshold: Math.max(2, difficultyProfile.attackThreshold + (buildOrderProfile.attackThresholdDelta || 0)),
    };
}

function updateSetupBriefing(config) {
    const normalized = normalizeMatchConfig(config);
    const briefingEl = document.getElementById('setup-briefing');
    if (!briefingEl) return;
    const mapProfile = MAP_PROFILES[normalized.map];
    const aiPlan = getAIBuildOrderProfile(normalized.aiBuildOrder);
    const speedLabel = getGameSpeedLabel(normalized.gameSpeed).toUpperCase();
    briefingEl.textContent = `${mapProfile.name.toUpperCase()} • ${normalized.aiPlayers} AI • ${normalized.aiDifficulty.toUpperCase()} • ${aiPlan.label.toUpperCase()} • ${speedLabel} • $${normalized.startingCredits}`;
}

// ==================== GAME STATE ====================
class GameState {
    constructor(matchConfig = DEFAULT_MATCH_CONFIG) {
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

        this.matchConfig = normalizeMatchConfig(matchConfig);
        this.mapProfile = MAP_PROFILES[this.matchConfig.map];
        this.aiConfig = getAIProfile(this.matchConfig);
        this.gameSpeedProfile = getGameSpeedProfile(this.matchConfig.gameSpeed);
        this.gameSpeedMultiplier = this.gameSpeedProfile.multiplier;

        // Map
        this.map = [];
        this.fog = [];
        this.generateMap();

        // Players: Human vs AI coalition
        const playerFaction = getPlayerFactionProfile(this.matchConfig.playerFaction, PLAYER_COLORS[0]);
        this.players = [
            { faction: playerFaction.faction, money: this.matchConfig.startingCredits, buildings: [], units: [], color: playerFaction.color, isAI: false, lowPowerNotified: false, startingBaseGranted: false }
        ];
        for (let aiIndex = 0; aiIndex < this.matchConfig.aiPlayers; aiIndex += 1) {
            const aiFaction = getAIFactionProfile(this.matchConfig.playerFaction, aiIndex);
            this.players.push({
                faction: aiFaction.faction,
                money: this.matchConfig.startingCredits,
                buildings: [],
                units: [],
                color: aiFaction.color,
                isAI: true,
                lowPowerNotified: false,
                startingBaseGranted: false,
                aiBuildOrder: this.aiConfig.buildOrder,
                aiBuildOrderLabel: this.aiConfig.label,
            });
        }
        this.neutralPlayerIndex = this.players.length;
        this.players.push({ faction: 'neutral', money: 0, buildings: [], units: [], color: '#8a8a8a', isAI: false, isNeutral: true, canLose: false, lowPowerNotified: false, startingBaseGranted: true });
        this.players.forEach((player, index) => { player.owner = index; });
        this.currentPlayer = 0;
        this.matchStats = this.players.map(() => this.createEmptyPlayerStats());
        this.matchResult = null;

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
        this.aiState = this.players.map((player, index) => player.isAI ? {
            owner: index,
            timer: 0,
            decisionInterval: this.aiConfig.decisionMin + Math.random() * this.aiConfig.decisionRange,
        } : null);
        this.elapsedMs = 0;

        // Game over state
        this.gameOver = false;

        // Command ping effects (2D overlay)
        this.commandPings = [];

        // EVA
        this.evaEl = document.getElementById('eva-message');
        this.evaTimeout = null;

        // Build terrain in 3D
        this.renderer3d.buildTerrain(this.map, MAP_SIZE);

        // Spawn bases for the human player plus configured AI opponents
        const activeSpawnPoints = this.mapProfile.spawnPoints.slice(0, this.players.length - 1);
        activeSpawnPoints.forEach((spawn, index) => this.spawnBase(index, spawn.x, spawn.y));
        this.spawnNeutralStructures();

        // Set initial camera on player base
        const playerSpawn = this.mapProfile.spawnPoints[0] || { x: 10, y: 10 };
        this.camTileX = playerSpawn.x + 2;
        this.camTileY = playerSpawn.y + 2;
        this.renderer3d.setCameraTarget(this.camTileX, this.camTileY);

        // Start
        this.setupInput();
        this.setupUI();
        this.setupSidebarToggle();
        const titleEl = document.getElementById('game-title');
        if (titleEl) titleEl.textContent = `RED ALERT 2: REBORN — ${this.mapProfile.name.toUpperCase()}`;
        updateSetupBriefing(this.matchConfig);
        this.eva(`Skirmish loaded: ${this.mapProfile.name}. Deploy your MCV to establish the Construction Yard.`);

        // Version info
        const vEl = document.getElementById('version-info');
        if (vEl) {
            const v = window.__VERSION__ || '0.0.0';
            const h = window.__GIT_HASH__ || 'dev';
            vEl.textContent = `v${v} (${h})`;
        }
        requestAnimationFrame(t => this.loop(t));
    }

    createEmptyPlayerStats() {
        return {
            unitsBuilt: 0,
            unitsLost: 0,
            unitsKilled: 0,
            buildingsConstructed: 0,
            buildingsLost: 0,
            buildingsDestroyed: 0,
            oreDelivered: 0,
        };
    }

    getPlayer(owner) {
        return Number.isInteger(owner) ? (this.players[owner] || null) : null;
    }

    getPlayerStats(owner) {
        if (!this.matchStats[owner]) this.matchStats[owner] = this.createEmptyPlayerStats();
        return this.matchStats[owner];
    }

    recordUnitBuilt(owner) {
        this.getPlayerStats(owner).unitsBuilt += 1;
    }

    recordBuildingConstructed(owner) {
        this.getPlayerStats(owner).buildingsConstructed += 1;
    }

    recordOreDelivered(owner, amount) {
        this.getPlayerStats(owner).oreDelivered += amount;
    }

    getVeterancyRankFromXp(xp = 0) {
        if (xp >= VETERANCY_THRESHOLDS.elite) return 'elite';
        if (xp >= VETERANCY_THRESHOLDS.veteran) return 'veteran';
        return 'rookie';
    }

    getVeterancyLabel(rank = 'rookie') {
        if (rank === 'elite') return 'Elite';
        if (rank === 'veteran') return 'Veteran';
        return 'Rookie';
    }

    isCombatUnit(unit) {
        return !!unit && unit.tx === undefined && unit.damage > 0 && unit.range > 0;
    }

    applyVeterancyBonuses(unit, rank = 'rookie', options = {}) {
        if (!unit?.baseMaxHp) return;
        const { healOnPromotion = false } = options;
        const previousMaxHp = unit.maxHp || unit.baseMaxHp;
        const bonus = VETERANCY_BONUSES[rank] || VETERANCY_BONUSES.rookie;
        unit.veterancyRank = rank;
        unit.maxHp = Math.round(unit.baseMaxHp * bonus.hp);
        unit.damage = Math.max(0, Math.round(unit.baseDamage * bonus.damage));
        unit.fireRate = unit.baseFireRate > 0 ? Math.max(250, Math.round(unit.baseFireRate * bonus.fireRate)) : 0;
        if (healOnPromotion) {
            const gainedHp = Math.max(0, unit.maxHp - previousMaxHp);
            unit.hp = Math.min(unit.maxHp, unit.hp + gainedHp + unit.maxHp * 0.15);
        } else if (unit.hp > unit.maxHp) {
            unit.hp = unit.maxHp;
        }
    }

    grantVeterancy(unit, amount) {
        if (!this.isCombatUnit(unit) || !amount || amount <= 0 || unit.state === 'dead') return;
        unit.veterancyXp = (unit.veterancyXp || 0) + amount;
        const nextRank = this.getVeterancyRankFromXp(unit.veterancyXp);
        if (nextRank !== unit.veterancyRank) {
            this.applyVeterancyBonuses(unit, nextRank, { healOnPromotion: true });
            if (unit.owner === this.currentPlayer) {
                this.eva(`${this.getDisplayName(unit.type)} promoted to ${this.getVeterancyLabel(nextRank)}.`);
            }
            if (this.selected.includes(unit)) this.updateSelectionInfo();
        }
    }

    markUnitDestroyed(unit, attackerOwner = null, attackerUnit = null) {
        if (!unit || unit._lossRecorded) return;
        unit._lossRecorded = true;
        if (unit.passengers?.length) {
            for (const passenger of unit.passengers) {
                this.markUnitDestroyed(passenger, attackerOwner, attackerUnit);
            }
            unit.passengers = [];
        }
        if (unit.transportCarrier && unit.transportCarrier.passengers) {
            unit.transportCarrier.passengers = unit.transportCarrier.passengers.filter(passenger => passenger !== unit);
        }
        unit.transportCarrier = null;
        unit.transportTarget = null;
        unit.loadTarget = null;
        unit.unloadTarget = null;
        unit.state = 'dead';
        this.renderer3d?.setUnitVisible(unit, true);
        this.getPlayerStats(unit.owner).unitsLost += 1;
        if (Number.isInteger(attackerOwner) && attackerOwner !== unit.owner) {
            this.getPlayerStats(attackerOwner).unitsKilled += 1;
        }
        if (attackerUnit && attackerUnit.owner !== unit.owner) {
            this.grantVeterancy(attackerUnit, 35);
        }
    }

    markBuildingDestroyed(building, attackerOwner = null, options = {}) {
        if (!building || building._lossRecorded) return;
        const { countAsLoss = true, attackerUnit = null } = options;
        building._lossRecorded = true;
        if (countAsLoss) {
            this.getPlayerStats(building.owner).buildingsLost += 1;
            if (Number.isInteger(attackerOwner) && attackerOwner !== building.owner) {
                this.getPlayerStats(attackerOwner).buildingsDestroyed += 1;
            }
            if (attackerUnit && attackerUnit.owner !== building.owner) {
                this.grantVeterancy(attackerUnit, 60);
            }
        }
    }

    hasLiveMCV(player) {
        return player.units.some(unit => unit.type === 'mcv' && unit.state !== 'dead' && unit.hp > 0);
    }

    hasLivingBase(player) {
        return player.buildings.some(building => building.hp > 0) || this.hasLiveMCV(player);
    }

    getRemainingForces(player) {
        return {
            buildings: player.buildings.filter(building => building.hp > 0).length,
            units: player.units.filter(unit => unit.state !== 'dead' && unit.hp > 0).length,
        };
    }

    formatDuration(ms) {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    renderMatchSummary() {
        const overlay = document.getElementById('match-summary-overlay');
        const result = this.matchResult;
        if (!overlay || !result) return;

        const title = document.getElementById('match-summary-title');
        const duration = document.getElementById('match-summary-duration');
        const reason = document.getElementById('match-summary-reason');
        const stats = document.getElementById('match-summary-stats');
        const playerStats = this.getPlayerStats(0);
        const aiIndices = this.players
            .map((player, index) => player?.isAI ? index : -1)
            .filter(index => index >= 0);
        const enemyStats = aiIndices.reduce((totals, owner) => {
            const statsForPlayer = this.getPlayerStats(owner);
            totals.unitsBuilt += statsForPlayer.unitsBuilt;
            totals.unitsLost += statsForPlayer.unitsLost;
            totals.unitsKilled += statsForPlayer.unitsKilled;
            totals.buildingsConstructed += statsForPlayer.buildingsConstructed;
            totals.buildingsLost += statsForPlayer.buildingsLost;
            totals.buildingsDestroyed += statsForPlayer.buildingsDestroyed;
            totals.oreDelivered += statsForPlayer.oreDelivered;
            return totals;
        }, this.createEmptyPlayerStats());
        const playerForces = this.getRemainingForces(this.players[0]);
        const enemyForces = aiIndices.reduce((totals, owner) => {
            const forces = this.getRemainingForces(this.players[owner]);
            totals.buildings += forces.buildings;
            totals.units += forces.units;
            return totals;
        }, { buildings: 0, units: 0 });

        if (title) title.textContent = result.playerWon ? 'Victory' : 'Defeat';
        if (duration) duration.textContent = `Duration ${this.formatDuration(result.durationMs)}`;
        if (reason) reason.textContent = result.summaryText;
        if (stats) {
            stats.innerHTML = `
                <div class="summary-card overview">
                    <h3>Outcome</h3>
                    <div class="summary-line highlight"><span>Result</span><span>${result.playerWon ? 'Enemy eliminated' : 'Base lost'}</span></div>
                    <div class="summary-line"><span>Player base status</span><span>${playerForces.buildings} buildings / ${playerForces.units} units</span></div>
                    <div class="summary-line"><span>Enemy base status</span><span>${enemyForces.buildings} buildings / ${enemyForces.units} units</span></div>
                </div>
                <div class="summary-card player">
                    <h3>Your Forces</h3>
                    <div class="summary-line"><span>Units built</span><span>${playerStats.unitsBuilt}</span></div>
                    <div class="summary-line"><span>Units lost</span><span>${playerStats.unitsLost}</span></div>
                    <div class="summary-line"><span>Units killed</span><span>${playerStats.unitsKilled}</span></div>
                    <div class="summary-line"><span>Buildings deployed</span><span>${playerStats.buildingsConstructed}</span></div>
                    <div class="summary-line"><span>Buildings lost</span><span>${playerStats.buildingsLost}</span></div>
                    <div class="summary-line"><span>Buildings destroyed</span><span>${playerStats.buildingsDestroyed}</span></div>
                    <div class="summary-line"><span>Ore delivered</span><span>$${Math.floor(playerStats.oreDelivered)}</span></div>
                </div>
                <div class="summary-card enemy">
                    <h3>Enemy Coalition</h3>
                    <div class="summary-line"><span>Units built</span><span>${enemyStats.unitsBuilt}</span></div>
                    <div class="summary-line"><span>Units lost</span><span>${enemyStats.unitsLost}</span></div>
                    <div class="summary-line"><span>Units killed</span><span>${enemyStats.unitsKilled}</span></div>
                    <div class="summary-line"><span>Buildings deployed</span><span>${enemyStats.buildingsConstructed}</span></div>
                    <div class="summary-line"><span>Buildings lost</span><span>${enemyStats.buildingsLost}</span></div>
                    <div class="summary-line"><span>Buildings destroyed</span><span>${enemyStats.buildingsDestroyed}</span></div>
                    <div class="summary-line"><span>Ore delivered</span><span>$${Math.floor(enemyStats.oreDelivered)}</span></div>
                </div>
            `;
        }

        overlay.classList.remove('hidden');
    }

    finishMatch(losingPlayerIndex) {
        if (this.gameOver) return;
        this.gameOver = true;
        const playerWon = losingPlayerIndex !== 0;
        const hasFallbackMCV = this.hasLiveMCV(this.players[losingPlayerIndex]);
        const loserName = losingPlayerIndex === 0 ? 'Your' : 'Enemy';
        const summaryText = hasFallbackMCV
            ? `${loserName} field command was broken after its base collapsed.`
            : `${loserName} construction network is gone — stray units no longer keep the match alive.`;
        this.matchResult = {
            playerWon,
            losingPlayerIndex,
            durationMs: this.elapsedMs,
            summaryText,
        };
        this.renderMatchSummary();
        this.eva(playerWon ? 'VICTORY! Enemy coalition neutralized.' : 'DEFEAT! Your construction network has collapsed.');
    }

    getEnemyPlayers(owner) {
        return this.players.filter((player, index) => index !== owner && index !== this.neutralPlayerIndex && player?.canLose !== false && this.hasLivingBase(player));
    }

    getClosestEnemyPlayer(aiPlayer) {
        if (!aiPlayer) return null;
        const aiAnchor = aiPlayer.buildings[0]
            ? this.getEntityAnchor(aiPlayer.buildings[0])
            : this.getEntityAnchor(aiPlayer.units.find(unit => unit.state !== 'dead'));
        const enemies = this.getEnemyPlayers(aiPlayer.owner ?? this.players.indexOf(aiPlayer));
        if (!enemies.length) return null;
        if (!aiAnchor) return enemies[0];
        return enemies
            .map(player => {
                const anchor = player.buildings[0]
                    ? this.getEntityAnchor(player.buildings[0])
                    : this.getEntityAnchor(player.units.find(unit => unit.state !== 'dead'));
                return { player, distance: anchor ? Math.hypot(anchor.x - aiAnchor.x, anchor.y - aiAnchor.y) : Infinity };
            })
            .sort((a, b) => a.distance - b.distance)[0]?.player || enemies[0];
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
        const mapId = this.mapProfile?.id || 'classic';
        const oreFieldsByMap = {
            classic: [
                { x: 15, y: 15, r: 3 },
                { x: MAP_SIZE - 15, y: MAP_SIZE - 15, r: 3 },
                { x: MAP_SIZE / 2, y: MAP_SIZE / 2, r: 3 },
            ],
            crossroads: [
                { x: 10, y: 10, r: 3.2 },
                { x: MAP_SIZE - 11, y: MAP_SIZE - 11, r: 3.2 },
                { x: MAP_SIZE / 2 - 5, y: MAP_SIZE / 2, r: 2.4 },
                { x: MAP_SIZE / 2 + 5, y: MAP_SIZE / 2, r: 2.4 },
            ],
            'twin-rivers': [
                { x: 10, y: MAP_SIZE - 11, r: 3.2 },
                { x: MAP_SIZE - 11, y: 10, r: 3.2 },
                { x: MAP_SIZE / 2, y: MAP_SIZE / 2, r: 4 },
                { x: MAP_SIZE / 2 - 8, y: MAP_SIZE / 2 + 4, r: 2.4 },
                { x: MAP_SIZE / 2 + 8, y: MAP_SIZE / 2 - 4, r: 2.4 },
            ],
        };
        const oreFields = oreFieldsByMap[mapId] || oreFieldsByMap.classic;

        for (let y = 0; y < MAP_SIZE; y++) {
            this.map[y] = [];
            this.fog[y] = [];
            for (let x = 0; x < MAP_SIZE; x++) {
                let type = 'grass';
                const dx = x - MAP_SIZE / 2;
                const dy = y - MAP_SIZE / 2;
                const distFromCenter = Math.sqrt(dx ** 2 + dy ** 2);

                if (distFromCenter > MAP_SIZE * 0.42) type = 'water';
                if (mapId === 'crossroads') {
                    const verticalRiver = Math.abs(x - MAP_SIZE / 2) < 1.35 && y > 6 && y < MAP_SIZE - 6;
                    const horizontalRiver = Math.abs(y - MAP_SIZE / 2) < 1.35 && x > 6 && x < MAP_SIZE - 6;
                    const centralBridge = Math.abs(x - MAP_SIZE / 2) < 3 && Math.abs(y - MAP_SIZE / 2) < 3;
                    if ((verticalRiver || horizontalRiver) && !centralBridge) type = 'water';
                } else if (mapId === 'twin-rivers') {
                    const riverLeftX = MAP_SIZE / 2 - 5 + Math.sin(y / 4) * 1.5;
                    const riverRightX = MAP_SIZE / 2 + 5 + Math.cos(y / 4) * 1.5;
                    const leftRiver = Math.abs(x - riverLeftX) < 1.2 && y > 5 && y < MAP_SIZE - 5;
                    const rightRiver = Math.abs(x - riverRightX) < 1.2 && y > 5 && y < MAP_SIZE - 5;
                    const centralFord = Math.abs(y - MAP_SIZE / 2) < 2.5 && x > MAP_SIZE / 2 - 8 && x < MAP_SIZE / 2 + 8;
                    const flankFords = (Math.abs(y - 10) < 1.8 || Math.abs(y - (MAP_SIZE - 10)) < 1.8)
                        && x > MAP_SIZE / 2 - 9 && x < MAP_SIZE / 2 + 9;
                    if ((leftRiver || rightRiver) && !(centralFord || flankFords)) type = 'water';
                } else {
                    const riverX = MAP_SIZE / 2 + Math.sin(y / 5) * 3;
                    if (Math.abs(x - riverX) < 1.5 && y > 10 && y < MAP_SIZE - 10) type = 'water';
                }

                if (type === 'grass' && oreFields.some(field => Math.hypot(x - field.x, y - field.y) < field.r)) {
                    type = 'ore';
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
        const mcv = this.createUnit('mcv', bx + 1, by + 1, playerIdx);
        mcv.isStartingMCV = true;
        mcv.autoDeployAt = OPENING_AUTO_DEPLOY_MS + playerIdx * 120;
        p.units.push(mcv);
    }

    spawnNeutralStructures() {
        const neutralPlayer = this.getPlayer(this.neutralPlayerIndex);
        if (!neutralPlayer) return;
        const structures = this.mapProfile?.neutralStructures || [];
        for (const structure of structures) {
            if (!structure?.type || !this.canPlaceBuildingAt(structure.type, structure.x, structure.y)) continue;
            const building = this.createBuilding(structure.type, structure.x, structure.y, this.neutralPlayerIndex, {
                isNeutralStructure: true,
                neutralOwner: this.neutralPlayerIndex,
            });
            neutralPlayer.buildings.push(building);
        }
    }

    createBuilding(type, tx, ty, owner, options = {}) {
        const def = BUILD_TYPES[type];
        const building = {
            type, tx, ty, owner,
            hp: def.hp, maxHp: def.hp,
            built: true, buildProgress: 1,
            sight: def.sight, size: def.size,
            damage: def.damage || 0,
            range: def.range || 0,
            fireRate: def.fireRate || 0,
            fireTimer: 0,
            projectileSpeed: def.projectileSpeed || 8,
            weaponType: def.weaponType || 'rifle',
            damageProfile: def.damageProfile || null,
            targetArmorClasses: Array.isArray(def.targetArmorClasses) ? [...def.targetArmorClasses] : null,
            canAttackGround: def.canAttackGround !== false,
            canAttackAir: !!def.canAttackAir,
            attackTarget: null,
            training: null, trainProgress: 0, trainQueue: [],
            rallyPoint: { x: tx + def.size + 1, y: ty + Math.floor(def.size / 2) },
            oreStored: 0,
            isNeutralStructure: !!options.isNeutralStructure,
            neutralOwner: Number.isInteger(options.neutralOwner) ? options.neutralOwner : owner,
            garrisonCapacity: def.garrisonCapacity || 0,
            garrisonedUnits: []
        };
        this.refreshGarrisonBuildingStats(building);
        return building;
    }

    createUnit(type, tx, ty, owner) {
        const def = UNIT_TYPES[type];
        return {
            type, owner,
            x: tx, y: ty,
            hp: def.hp, maxHp: def.hp,
            baseMaxHp: def.hp,
            speed: def.speed,
            baseSpeed: def.speed,
            damage: def.damage,
            baseDamage: def.damage,
            range: def.range,
            fireRate: def.fireRate,
            baseFireRate: def.fireRate,
            sight: def.sight,
            role: def.role,
            armorType: def.armorType,
            projectileSpeed: def.projectileSpeed || 8,
            weaponType: def.weaponType || 'rifle',
            directFire: !!def.directFire,
            damageProfile: def.damageProfile || null,
            targetArmorClasses: Array.isArray(def.targetArmorClasses) ? [...def.targetArmorClasses] : null,
            canAttackGround: def.canAttackGround !== false,
            canAttackAir: !!def.canAttackAir,
            isAirUnit: !!def.isAirUnit,
            altitude: def.isAirUnit ? (def.flightAltitude || 1.1) : 0,
            ammo: def.ammoCapacity || 0,
            ammoCapacity: def.ammoCapacity || 0,
            reloadTime: def.reloadTime || 0,
            reloadAmount: def.reloadAmount || 0,
            reloadTimer: 0,
            homeAirfield: null,
            captureRange: def.captureRange || 0,
            captureTarget: null,
            cargo: 0,
            cargoCapacity: def.cargoCapacity || 0,
            passengerCapacity: def.passengerCapacity || 0,
            passengers: [],
            canTransport: !!def.canTransport,
            transportPickupRange: def.transportPickupRange || 1.1,
            unloadRadius: def.unloadRadius || 1.4,
            loadTarget: null,
            unloadTarget: null,
            transportTarget: null,
            transportCarrier: null,
            aiTransportAttackTarget: null,
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
            waypointQueue: [],
            patrolRoute: null,
            patrolIndex: 0,
            _walkPhase: 0,
            canDeploy: !!def.canDeploy,
            deploysTo: def.deploysTo || null,
            isStartingMCV: false,
            autoDeployAt: null,
            veterancyXp: 0,
            veterancyRank: 'rookie',
            stance: 'guard',
            stanceAnchor: { x: tx, y: ty },
            forceMove: false,
            _savedWaypointQueue: []
        };
    }

    canPlaceBuildingAt(type, tx, ty, options = {}) {
        const def = BUILD_TYPES[type];
        if (!def) return false;
        const ignoreBuilding = options.ignoreBuilding || null;
        if (tx < 0 || ty < 0 || tx + def.size > MAP_SIZE || ty + def.size > MAP_SIZE) return false;

        for (let dy = 0; dy < def.size; dy++) {
            for (let dx = 0; dx < def.size; dx++) {
                const tile = this.map[ty + dy]?.[tx + dx];
                if (!tile || tile.type === 'water') return false;
            }
        }

        for (const player of this.players) {
            for (const building of player.buildings) {
                if (building === ignoreBuilding || building.hp <= 0) continue;
                if (tx < building.tx + building.size && tx + def.size > building.tx &&
                    ty < building.ty + building.size && ty + def.size > building.ty) {
                    return false;
                }
            }
        }

        return true;
    }

    findNearbyConstructionSite(type, anchorX, anchorY, radius = 6, options = {}) {
        const candidates = [];
        for (let ty = Math.max(0, anchorY - radius); ty <= Math.min(MAP_SIZE - 1, anchorY + radius); ty++) {
            for (let tx = Math.max(0, anchorX - radius); tx <= Math.min(MAP_SIZE - 1, anchorX + radius); tx++) {
                if (!this.canPlaceBuildingAt(type, tx, ty, options)) continue;
                const dist = Math.hypot(tx - anchorX, ty - anchorY);
                candidates.push({ tx, ty, dist });
            }
        }
        candidates.sort((a, b) => a.dist - b.dist);
        return candidates[0] || null;
    }

    getMCVDeployPosition(unit) {
        if (!unit || unit.type !== 'mcv' || unit.state === 'dead') return null;
        const suggestedX = Math.round(unit.x) - 1;
        const suggestedY = Math.round(unit.y) - 1;
        return this.findNearbyConstructionSite('constructionYard', suggestedX, suggestedY, 3);
    }

    canDeployMCV(unit) {
        return !!this.getMCVDeployPosition(unit);
    }

    grantStartingBasePackage(playerIdx, constructionYard) {
        const player = this.players[playerIdx];
        if (!player || player.startingBaseGranted) return;
        const centerX = constructionYard.tx + 1;
        const centerY = constructionYard.ty + 1;
        const placements = {};
        for (const type of ['powerPlant', 'refinery', 'barracks']) {
            const site = this.findNearbyConstructionSite(type, centerX, centerY, 8);
            if (!site) continue;
            const building = this.createBuilding(type, site.tx, site.ty, playerIdx);
            player.buildings.push(building);
            placements[type] = building;
        }
        const refinery = placements.refinery;
        const barracks = placements.barracks;
        if (refinery) {
            const harvester = this.createUnit('harvester', refinery.tx + refinery.size * 0.5, refinery.ty + refinery.size + 1.2, playerIdx);
            player.units.push(harvester);
            this.assignHarvesterJob(harvester, player);
        }
        if (barracks) {
            for (let i = 0; i < 3; i++) {
                player.units.push(this.createUnit('soldier', barracks.tx + 0.5 + (i * 0.6), barracks.ty + barracks.size + 0.8, playerIdx));
            }
        }
        player.startingBaseGranted = true;
    }

    deployMCV(unit, options = {}) {
        if (!unit || unit.type !== 'mcv' || unit.state === 'dead') return false;
        const position = this.getMCVDeployPosition(unit);
        if (!position) {
            if (unit.owner === this.currentPlayer && !options.auto) this.eva('MCV cannot deploy here. Clear more space.');
            return false;
        }
        const player = this.players[unit.owner];
        const conyard = this.createBuilding('constructionYard', position.tx, position.ty, unit.owner);
        player.buildings.push(conyard);
        this.recordBuildingConstructed(unit.owner);
        player.units = player.units.filter(existing => existing !== unit);
        if (this.renderer3d?.unitMeshes?.has(unit)) {
            this.renderer3d.removeUnit(unit);
        }
        if (unit.owner === this.currentPlayer) {
            this.selected = [conyard];
            this.commandMode = null;
            this.updateSelectionInfo();
            this.updateUI();
            this.eva('MCV deployed. Construction Yard online.');
        }
        if (unit.isStartingMCV) {
            this.grantStartingBasePackage(unit.owner, conyard);
        }
        return true;
    }

    isAirUnit(entity) {
        return !!(entity && entity.tx === undefined && (entity.isAirUnit || entity.armorType === 'air' || entity.role === 'aircraft'));
    }

    isGroundAttackTarget(target) {
        return !!(target && target.isGroundTarget && target.x !== undefined && target.y !== undefined);
    }

    canUnitForceFire(unit) {
        return !!(this.canUnitReceiveCommand(unit)
            && this.isCombatUnit(unit)
            && unit.canAttackGround !== false
            && !unit.directFire);
    }

    canEntityTarget(attacker, target) {
        if (!attacker || !target) return false;
        if (this.isAirUnit(attacker) && attacker.ammoCapacity > 0 && attacker.ammo <= 0) return false;
        if (this.isGroundAttackTarget(target)) {
            return this.canUnitForceFire(attacker);
        }
        if (this.isAirUnit(target)) {
            if (!attacker.canAttackAir) return false;
            const targetArmorClass = this.getTargetArmorClass(target);
            return !Array.isArray(attacker.targetArmorClasses) || attacker.targetArmorClasses.includes(targetArmorClass);
        }
        if (target.tx !== undefined) {
            if (attacker.canAttackGround === false) return false;
            const targetArmorClass = this.getTargetArmorClass(target);
            return !Array.isArray(attacker.targetArmorClasses) || attacker.targetArmorClasses.includes(targetArmorClass);
        }
        if (attacker.canAttackGround === false) return false;
        const targetArmorClass = this.getTargetArmorClass(target);
        return !Array.isArray(attacker.targetArmorClasses) || attacker.targetArmorClasses.includes(targetArmorClass);
    }

    isGarrisonBuilding(building) {
        return !!(building && building.tx !== undefined && (building.garrisonCapacity || 0) > 0);
    }

    canGarrisonUnit(building, unit) {
        if (!this.isGarrisonBuilding(building) || !unit || unit.tx !== undefined) return false;
        const alliedOrNeutral = building.owner === unit.owner || (building.isNeutralStructure && building.owner === building.neutralOwner);
        if (!alliedOrNeutral || !building.built || building.hp <= 0) return false;
        if (unit.state === 'dead' || unit.state === 'loaded') return false;
        if (!TRANSPORTABLE_INFANTRY_TYPES.has(unit.type)) return false;
        return (building.garrisonedUnits?.length || 0) < building.garrisonCapacity;
    }

    refreshGarrisonBuildingStats(building) {
        if (!this.isGarrisonBuilding(building)) return;
        const occupants = (building.garrisonedUnits || []).filter(unit => unit.state === 'loaded' && unit.hp > 0);
        building.garrisonedUnits = occupants;
        if (building.isNeutralStructure && occupants.length === 0 && building.owner !== building.neutralOwner) {
            this.setBuildingOwner(building, building.neutralOwner);
        }
        const count = occupants.length;
        if (!count) {
            building.damage = 0;
            building.range = 0;
            building.fireRate = 0;
            building.damageProfile = null;
            building.canAttackGround = false;
            building.canAttackAir = false;
            building.attackTarget = null;
            building.projectileSpeed = 10;
            building.weaponType = 'rifle';
            return;
        }
        const avgDamage = occupants.reduce((sum, unit) => sum + (unit.damage || unit.baseDamage || 0), 0) / count;
        const bestRange = occupants.reduce((best, unit) => Math.max(best, unit.range || 0), 0);
        building.damage = Math.max(8, Math.round(avgDamage * Math.min(1.75, 1 + count * 0.18)));
        building.range = Math.max(4.5, bestRange + 0.6);
        building.fireRate = Math.max(280, 700 - count * 110);
        building.damageProfile = null;
        building.canAttackGround = occupants.some(unit => unit.canAttackGround !== false);
        building.canAttackAir = occupants.some(unit => unit.canAttackAir);
        building.projectileSpeed = 11;
        building.weaponType = occupants.some(unit => unit.canAttackAir) ? 'flak' : 'rifle';
    }

    setBuildingOwner(building, newOwner) {
        if (!building || building.owner === newOwner) return false;
        const oldPlayer = this.getPlayer(building.owner);
        const newPlayer = this.getPlayer(newOwner);
        if (!newPlayer) return false;
        if (oldPlayer) oldPlayer.buildings = oldPlayer.buildings.filter(candidate => candidate !== building);
        building.owner = newOwner;
        if (!newPlayer.buildings.includes(building)) newPlayer.buildings.push(building);
        return true;
    }

    getTargetArmorClass(target) {
        if (!target) return 'light';
        if (this.isAirUnit(target)) return 'air';
        if (target.tx !== undefined) return 'building';
        if (target.role === 'infantry' || target.role === 'anti-armor infantry' || target.role === 'anti-air infantry' || target.role === 'engineer' || target.role === 'attack dog') {
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
            const lowerKey = e.key.toLowerCase();
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
            if (lowerKey === 'x' && this.scatterSelectedUnits()) {
                e.preventDefault();
                return;
            }
            if (lowerKey === 's' && this.stopSelectedUnits()) {
                e.preventDefault();
                return;
            }
            if (lowerKey === 'p' && this.togglePatrolMode()) {
                e.preventDefault();
                return;
            }
            if (lowerKey === 'f' && this.toggleForceMoveMode()) {
                e.preventDefault();
                return;
            }
            if (lowerKey === 'c' && this.toggleForceFireMode()) {
                e.preventDefault();
                return;
            }
            if (lowerKey === 'g' && this.setSelectedUnitStance('guard')) {
                e.preventDefault();
                return;
            }
            if (lowerKey === 'a' && this.setSelectedUnitStance('aggressive')) {
                e.preventDefault();
                return;
            }
            if (lowerKey === 'h' && this.setSelectedUnitStance('hold')) {
                e.preventDefault();
                return;
            }
            if (lowerKey === 'd') {
                const unit = this.selected.length === 1 && this.selected[0]?.tx === undefined ? this.selected[0] : null;
                if (unit?.type === 'mcv') {
                    this.deployMCV(unit);
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
            if (u.state === 'dead' || u.state === 'loaded') continue;
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

        if (this.commandMode === 'set-patrol') {
            const units = this.getSelectedCommandableUnits();
            if (!units.length) {
                this.commandMode = null;
                this.updateSelectionInfo();
                return;
            }
            let issuedPatrol = false;
            units.forEach((unit, index) => {
                const angle = units.length > 1 ? (Math.PI * 2 * index) / units.length : 0;
                const radius = units.length > 1 ? Math.min(1.2, 0.35 * units.length) : 0;
                const tx = Math.max(0.5, Math.min(MAP_SIZE - 0.5, tile.x + Math.cos(angle) * radius));
                const ty = Math.max(0.5, Math.min(MAP_SIZE - 0.5, tile.y + Math.sin(angle) * radius));
                issuedPatrol = this.assignPatrolRoute(unit, tx, ty) || issuedPatrol;
            });
            this.commandMode = null;
            if (issuedPatrol) {
                this.commandPings.push({ tx: tile.x, ty: tile.y, color: '#66e0ff', time: 0 });
                this.eva(units.length === 1 ? `${this.getDisplayName(units[0].type)} patrol route confirmed.` : `${units.length} units patrolling.`);
            }
            this.updateSelectionInfo();
            return;
        }

        if (this.commandMode === 'set-force-move') {
            const units = this.getSelectedCommandableUnits();
            if (!units.length) {
                this.commandMode = null;
                this.updateSelectionInfo();
                return;
            }
            let issuedForceMove = false;
            units.forEach((unit, index) => {
                const angle = units.length > 1 ? (Math.PI * 2 * index) / units.length : 0;
                const radius = units.length > 1 ? Math.min(1.15, 0.32 * units.length) : 0;
                const tx = Math.max(0.5, Math.min(MAP_SIZE - 0.5, tile.x + Math.cos(angle) * radius));
                const ty = Math.max(0.5, Math.min(MAP_SIZE - 0.5, tile.y + Math.sin(angle) * radius));
                issuedForceMove = this.issueForceMoveOrder(unit, tx, ty) || issuedForceMove;
            });
            this.commandMode = null;
            if (issuedForceMove) {
                this.commandPings.push({ tx: tile.x, ty: tile.y, color: '#7ae6ff', time: 0 });
                this.eva(units.length === 1 ? `${this.getDisplayName(units[0].type)} force-moving.` : `${units.length} units force-moving.`);
            }
            this.updateSelectionInfo();
            return;
        }

        const forceFireActive = this.commandMode === 'set-force-fire' || e.ctrlKey;
        if (forceFireActive) {
            const units = this.selected.filter(unit => this.canUnitForceFire(unit));
            if (this.commandMode === 'set-force-fire') {
                this.commandMode = null;
            }
            if (!units.length) {
                this.updateSelectionInfo();
                return;
            }
            let issuedForceFire = false;
            units.forEach((unit, index) => {
                const angle = units.length > 1 ? (Math.PI * 2 * index) / units.length : 0;
                const radius = units.length > 1 ? Math.min(1.15, 0.3 * units.length) : 0;
                const tx = Math.max(0.5, Math.min(MAP_SIZE - 0.5, tile.x + Math.cos(angle) * radius));
                const ty = Math.max(0.5, Math.min(MAP_SIZE - 0.5, tile.y + Math.sin(angle) * radius));
                issuedForceFire = this.issueGroundAttackOrder(unit, tx, ty) || issuedForceFire;
            });
            if (issuedForceFire) {
                this.commandPings.push({ tx: tile.x, ty: tile.y, color: '#ff8855', time: 0 });
                this.eva(units.length === 1 ? `${this.getDisplayName(units[0].type)} force-firing.` : `${units.length} units force-firing.`);
            }
            this.updateSelectionInfo();
            return;
        }

        const friendlyTransport = this.players[this.currentPlayer].units.find(unit =>
            this.isTransportUnit(unit) && Math.hypot(unit.x - tile.x, unit.y - tile.y) < 1.5
        );
        if (friendlyTransport) {
            let boardingIssued = false;
            for (const unit of this.selected) {
                if (unit?.tx !== undefined || !this.canUnitReceiveCommand(unit) || !this.canTransportPassenger(friendlyTransport, unit)) continue;
                boardingIssued = this.orderPassengerToBoard(unit, friendlyTransport) || boardingIssued;
            }
            if (boardingIssued) {
                this.commandPings.push({ tx: tile.x, ty: tile.y, color: '#66ccff', time: 0 });
                return;
            }
        }

        const friendlyInfantry = this.players[this.currentPlayer].units.find(unit =>
            unit.state !== 'dead'
            && unit.state !== 'loaded'
            && unit.tx === undefined
            && TRANSPORTABLE_INFANTRY_TYPES.has(unit.type)
            && Math.hypot(unit.x - tile.x, unit.y - tile.y) < 1.1
        );
        if (friendlyInfantry) {
            let pickupIssued = false;
            for (const unit of this.selected) {
                if (!this.isTransportUnit(unit) || !this.canTransportPassenger(unit, friendlyInfantry)) continue;
                pickupIssued = this.orderTransportPickup(unit, friendlyInfantry) || pickupIssued;
            }
            if (pickupIssued) {
                this.commandPings.push({ tx: tile.x, ty: tile.y, color: '#66ccff', time: 0 });
                return;
            }
        }

        const friendlyGarrison = this.players.flatMap(player => player.buildings).find(building =>
            this.isGarrisonBuilding(building)
            && building.hp > 0
            && (building.owner === this.currentPlayer || (building.isNeutralStructure && building.owner === building.neutralOwner))
            && tile.x >= building.tx
            && tile.x < building.tx + building.size
            && tile.y >= building.ty
            && tile.y < building.ty + building.size
        );
        if (friendlyGarrison) {
            let garrisonIssued = false;
            for (const unit of this.selected) {
                if (!this.canUnitReceiveCommand(unit) || !this.canGarrisonUnit(friendlyGarrison, unit)) continue;
                garrisonIssued = this.orderUnitToGarrison(unit, friendlyGarrison) || garrisonIssued;
            }
            if (garrisonIssued) {
                this.commandPings.push({ tx: friendlyGarrison.tx, ty: friendlyGarrison.ty, color: '#ffaa33', time: 0 });
                return;
            }
        }

        // Check if right-clicked on an enemy unit
        const enemyUnit = this._findEnemyUnitAt(tile.x, tile.y);
        if (enemyUnit) {
            let issuedAttack = false;
            for (const u of this.selected) {
                if (!this.canUnitReceiveCommand(u) || !this.isCombatUnit(u) || !this.canEntityTarget(u, enemyUnit)) continue;
                u.captureTarget = null;
                u.attackTarget = enemyUnit;
                u.target = null;
                u.state = 'attacking';
                u.forceMove = false;
                u.waypointQueue = [];
                u._savedWaypointQueue = [];
                u.path = this.isAirUnit(u) ? null : this.findPath(Math.round(u.x), Math.round(u.y), Math.floor(enemyUnit.x), Math.floor(enemyUnit.y));
                u.pathIdx = 0;
                issuedAttack = true;
            }
            if (issuedAttack) {
                this.commandPings.push({ tx: tile.x, ty: tile.y, color: '#ff2200', time: 0 });
            }
            return;
        }

        // Check if right-clicked on an enemy building
        const enemyBuilding = this._findEnemyBuildingAt(tile.x, tile.y);
        if (enemyBuilding) {
            let issuedOrder = false;
            for (const u of this.selected) {
                if (!this.canUnitReceiveCommand(u)) continue;
                if (u.role === 'engineer') {
                    this.issueEngineerCaptureOrder(u, enemyBuilding);
                    issuedOrder = true;
                    continue;
                }
                if (!this.isCombatUnit(u) || !this.canEntityTarget(u, enemyBuilding)) continue;
                u.captureTarget = null;
                u.attackTarget = enemyBuilding;
                u.target = null;
                u.state = 'attacking';
                u.forceMove = false;
                u.waypointQueue = [];
                u._savedWaypointQueue = [];
                u.path = this.isAirUnit(u) ? null : this.findPath(Math.round(u.x), Math.round(u.y), enemyBuilding.tx + 1, enemyBuilding.ty + 1);
                u.pathIdx = 0;
                issuedOrder = true;
            }
            if (issuedOrder) {
                this.commandPings.push({ tx: enemyBuilding.tx + 1, ty: enemyBuilding.ty + 1, color: '#ff2200', time: 0 });
            }
            return;
        }

        // Move / unload command
        let issuedUnload = false;
        for (const u of this.selected) {
            if (this.isTransportUnit(u) && u.passengers?.length) {
                issuedUnload = this.orderTransportUnload(u, tile.x, tile.y) || issuedUnload;
            }
        }
        const queueMove = !!e.shiftKey;
        let queuedWaypoint = false;
        for (const [index, u] of this.selected.entries()) {
            if (!this.canUnitReceiveCommand(u)) continue;
            if (this.isTransportUnit(u) && u.passengers?.length) continue;
            const angle = this.selected.length > 1 ? (Math.PI * 2 * index) / this.selected.length : 0;
            const radius = this.selected.length > 1 ? Math.min(0.9, 0.28 * this.selected.length) : 0;
            const tx = Math.max(0.5, Math.min(MAP_SIZE - 0.5, tile.x + Math.cos(angle) * radius));
            const ty = Math.max(0.5, Math.min(MAP_SIZE - 0.5, tile.y + Math.sin(angle) * radius));
            if (queueMove) {
                queuedWaypoint = this.queueMoveWaypoint(u, tx, ty) || queuedWaypoint;
                continue;
            }
            u.captureTarget = null;
            u.transportTarget = null;
            u._savedTarget = null;
            u._savedPath = null;
            u._savedPathIdx = 0;
            u._savedWaypointQueue = [];
            this.issueMoveOrder(u, tx, ty);
        }
        this.commandPings.push({ tx: tile.x, ty: tile.y, color: issuedUnload ? '#00c8ff' : (queueMove ? '#66d9ff' : '#00ff88'), time: 0 });
        if (queuedWaypoint) {
            const commandableUnits = this.getSelectedCommandableUnits();
            if (commandableUnits.length) {
                this.eva(commandableUnits.length === 1 ? `${this.getDisplayName(commandableUnits[0].type)} waypoint queued.` : `${commandableUnits.length} units queued a waypoint.`);
            }
            this.updateSelectionInfo();
        }
    }

    _updateCursor(tile) {
        const canvas = this.renderer3d.domElement;
        canvas.classList.remove('cursor-move', 'cursor-attack');

        if (this.placingBuilding) {
            canvas.style.cursor = 'cell';
            return;
        }

        canvas.style.cursor = '';

        if (this.commandMode === 'set-force-fire') {
            canvas.classList.add('cursor-attack');
            return;
        }

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

    getOwnedBuildingTypes(player) {
        return new Set(player.buildings.filter(building => building.hp > 0 && building.built).map(building => building.type));
    }

    getPrerequisiteStatus(player, prerequisites) {
        const owned = this.getOwnedBuildingTypes(player);
        return (prerequisites || []).map(req => ({
            type: req,
            name: this.getDisplayName(req),
            satisfied: owned.has(req)
        }));
    }

    getMissingPrerequisites(player, prerequisites) {
        return this.getPrerequisiteStatus(player, prerequisites)
            .filter(req => !req.satisfied)
            .map(req => req.name);
    }

    getPrerequisiteSummary(player, prerequisites) {
        const status = this.getPrerequisiteStatus(player, prerequisites);
        const missing = status.filter(req => !req.satisfied);
        return {
            status,
            missing: missing.map(req => req.name),
            nextUnlock: missing[0]?.name || null,
            chainLabel: status.map(req => `${req.satisfied ? '✓' : '✗'} ${req.name}`).join(' → ')
        };
    }

    canUnitReceiveCommand(unit) {
        return unit && unit.state !== 'dead' && unit.state !== 'loaded' && unit.role !== 'harvester';
    }

    getSelectedCommandableUnits() {
        return this.selected.filter(unit => unit?.tx === undefined && this.canUnitReceiveCommand(unit));
    }

    getUnitStanceProfile(unit) {
        const stance = UNIT_STANCE_PROFILES[unit?.stance] ? unit.stance : 'guard';
        return UNIT_STANCE_PROFILES[stance];
    }

    getUnitStanceLabel(unit) {
        return this.getUnitStanceProfile(unit).label;
    }

    setUnitStance(unit, stance, options = {}) {
        if (!this.canUnitReceiveCommand(unit) || !UNIT_STANCE_PROFILES[stance]) return false;
        unit.stance = stance;
        if (!unit.stanceAnchor || options.resetAnchor) {
            unit.stanceAnchor = { x: unit.x, y: unit.y };
        }
        return true;
    }

    setSelectedUnitStance(stance) {
        const units = this.getSelectedCommandableUnits();
        if (!units.length || !UNIT_STANCE_PROFILES[stance]) return false;
        let changed = 0;
        for (const unit of units) {
            changed += this.setUnitStance(unit, stance, { resetAnchor: !unit.stanceAnchor }) ? 1 : 0;
        }
        if (!changed) return false;
        const label = UNIT_STANCE_PROFILES[stance].label;
        this.eva(changed === 1 ? `${this.getDisplayName(units[0].type)} stance set to ${label}.` : `${changed} units set to ${label}.`);
        this.updateSelectionInfo();
        return true;
    }

    getUnitAutoAcquireRadius(unit, mode = 'idle') {
        const profile = this.getUnitStanceProfile(unit);
        const sight = unit?.sight || 0;
        const range = unit?.range || 0;
        if (profile.id === 'hold') return range + 0.5;
        if (mode === 'moving') return Math.max(range + 0.2, Math.min(sight + profile.movingAcquireRadius, range + 1.8 + profile.autoAcquireBonus));
        return Math.max(range + 0.75, Math.min(sight + profile.autoAcquireBonus, range + 2.5 + profile.autoAcquireBonus));
    }

    shouldUnitKeepPursuing(unit, target) {
        if (!unit || !target) return false;
        const profile = this.getUnitStanceProfile(unit);
        if (profile.chaseLeash === Infinity) return true;
        const anchor = unit.stanceAnchor || { x: unit.x, y: unit.y };
        const targetAnchor = this.getEntityAnchor(target);
        if (!targetAnchor) return false;
        const chaseDistance = Math.hypot(anchor.x - targetAnchor.x, anchor.y - targetAnchor.y);
        if (profile.id === 'hold') return chaseDistance <= unit.range + 0.4;
        return chaseDistance <= unit.range + profile.chaseLeash;
    }

    resumeUnitPostEngagement(unit) {
        if (!unit) return false;
        if (unit.patrolRoute?.length >= 2) return this.advancePatrolRoute(unit);
        if (unit._savedTarget) {
            unit.target = unit._savedTarget;
            unit.path = unit._savedPath;
            unit.pathIdx = unit._savedPathIdx || 0;
            unit.waypointQueue = [...(unit._savedWaypointQueue || [])];
            unit._savedTarget = null;
            unit._savedPath = null;
            unit._savedPathIdx = 0;
            unit._savedWaypointQueue = [];
            unit.state = 'moving';
            return true;
        }
        const anchor = unit.stanceAnchor;
        const profile = this.getUnitStanceProfile(unit);
        if (anchor && profile.id !== 'aggressive' && Math.hypot(unit.x - anchor.x, unit.y - anchor.y) > 0.35) {
            this.issueMoveOrder(unit, anchor.x, anchor.y, 'moving');
            return true;
        }
        unit.state = 'idle';
        unit.target = null;
        unit.path = null;
        unit.pathIdx = 0;
        return false;
    }

    clearUnitOrders(unit) {
        if (!unit || unit.state === 'dead' || unit.state === 'loaded') return false;
        if (unit.transportTarget?.loadTarget === unit) {
            unit.transportTarget.loadTarget = null;
            if (unit.transportTarget.state === 'loading') unit.transportTarget.state = 'idle';
        }
        if (this.isTransportUnit(unit) && unit.loadTarget) {
            unit.loadTarget.transportTarget = null;
            unit.loadTarget._transportBoardingAnchor = null;
            if (unit.loadTarget.state === 'boardingTransport') unit.loadTarget.state = 'idle';
        }
        unit.captureTarget = null;
        unit.garrisonTarget = null;
        unit.transportTarget = null;
        unit.loadTarget = null;
        unit.unloadTarget = null;
        unit.transportCarrier = null;
        unit.attackTarget = null;
        unit.target = null;
        unit.path = null;
        unit.pathIdx = 0;
        unit.aiTransportAttackTarget = null;
        unit._transportBoardingAnchor = null;
        unit._transportUnloadAnchor = null;
        unit._savedTarget = null;
        unit._savedPath = null;
        unit._savedPathIdx = 0;
        unit._savedWaypointQueue = [];
        unit.waypointQueue = [];
        unit.patrolRoute = null;
        unit.patrolIndex = 0;
        unit.forceMove = false;
        unit.stanceAnchor = { x: unit.x, y: unit.y };
        unit.state = 'idle';
        return true;
    }

    togglePatrolMode() {
        const units = this.getSelectedCommandableUnits();
        if (!units.length) return false;
        this.commandMode = this.commandMode === 'set-patrol' ? null : 'set-patrol';
        this.eva(this.commandMode ? 'Right-click to place patrol route.' : 'Patrol placement cancelled.');
        this.updateSelectionInfo();
        return true;
    }

    toggleForceMoveMode() {
        const units = this.getSelectedCommandableUnits();
        if (!units.length) return false;
        this.commandMode = this.commandMode === 'set-force-move' ? null : 'set-force-move';
        this.eva(this.commandMode ? 'Right-click to force-move without auto-engaging.' : 'Force-move cancelled.');
        this.updateSelectionInfo();
        return true;
    }

    toggleForceFireMode() {
        const units = this.selected.filter(unit => this.canUnitForceFire(unit));
        if (!units.length) return false;
        this.commandMode = this.commandMode === 'set-force-fire' ? null : 'set-force-fire';
        this.eva(this.commandMode ? 'Right-click any ground tile to force-fire that position.' : 'Force-fire cancelled.');
        this.updateSelectionInfo();
        return true;
    }

    stopSelectedUnits() {
        const units = this.getSelectedCommandableUnits();
        if (!units.length) return false;
        let stopped = 0;
        for (const unit of units) {
            stopped += this.clearUnitOrders(unit) ? 1 : 0;
        }
        if (!stopped) return false;
        const primary = units[0];
        this.commandPings.push({ tx: primary.x, ty: primary.y, color: '#ffd36b', time: 0 });
        this.eva(stopped === 1 ? `${this.getDisplayName(primary.type)} standing by.` : `${stopped} units received stop order.`);
        this.updateSelectionInfo();
        return true;
    }

    scatterSelectedUnits() {
        const units = this.getSelectedCommandableUnits();
        if (!units.length) return false;
        const center = units.reduce((acc, unit) => {
            acc.x += unit.x;
            acc.y += unit.y;
            return acc;
        }, { x: 0, y: 0 });
        center.x /= units.length;
        center.y /= units.length;
        const baseRadius = units.length === 1 ? 1.4 : Math.max(1.2, 0.8 + units.length * 0.28);
        units.forEach((unit, index) => {
            this.clearUnitOrders(unit);
            const angle = (Math.PI * 2 * index) / units.length;
            const radius = baseRadius + (index % 2) * 0.5;
            const tx = Math.max(0.5, Math.min(MAP_SIZE - 0.5, center.x + Math.cos(angle) * radius));
            const ty = Math.max(0.5, Math.min(MAP_SIZE - 0.5, center.y + Math.sin(angle) * radius));
            this.issueMoveOrder(unit, tx, ty);
        });
        this.commandPings.push({ tx: center.x, ty: center.y, color: '#ffcc33', time: 0 });
        this.eva(units.length === 1 ? `${this.getDisplayName(units[0].type)} scattering.` : `${units.length} units scattering.`);
        this.updateSelectionInfo();
        return true;
    }

    assignPatrolRoute(unit, tx, ty) {
        if (!this.canUnitReceiveCommand(unit)) return false;
        const start = { x: unit.x, y: unit.y };
        const destination = { x: tx, y: ty };
        if (Math.hypot(start.x - destination.x, start.y - destination.y) < 0.4) return false;
        this.clearUnitOrders(unit);
        unit.patrolRoute = [start, destination];
        unit.patrolIndex = 1;
        this.issueMoveOrder(unit, destination.x, destination.y, 'patrolling');
        return true;
    }

    issueForceMoveOrder(unit, tx, ty) {
        if (!this.canUnitReceiveCommand(unit)) return false;
        this.clearUnitOrders(unit);
        this.issueMoveOrder(unit, tx, ty, 'moving', { forceMove: true });
        return true;
    }

    createGroundAttackTarget(tx, ty) {
        return {
            isGroundTarget: true,
            x: Math.max(0.5, Math.min(MAP_SIZE - 0.5, tx)),
            y: Math.max(0.5, Math.min(MAP_SIZE - 0.5, ty)),
            owner: null,
            armorType: 'light'
        };
    }

    issueGroundAttackOrder(unit, tx, ty) {
        if (!this.canUnitForceFire(unit)) return false;
        const groundTarget = this.createGroundAttackTarget(tx, ty);
        this.clearUnitOrders(unit);
        unit.captureTarget = null;
        unit.attackTarget = groundTarget;
        unit.target = null;
        unit.state = 'attacking';
        unit.forceMove = false;
        unit.waypointQueue = [];
        unit._savedWaypointQueue = [];
        unit.path = this.isAirUnit(unit) ? null : this.findPath(Math.round(unit.x), Math.round(unit.y), Math.floor(groundTarget.x), Math.floor(groundTarget.y));
        unit.pathIdx = 0;
        return true;
    }

    getQueuedMoveAnchor(unit) {
        if (unit?.waypointQueue?.length) return unit.waypointQueue[unit.waypointQueue.length - 1];
        if (unit?.target && (unit.state === 'moving' || unit.state === 'engaging')) {
            return { x: unit.target.x, y: unit.target.y, forceMove: !!unit.forceMove };
        }
        return unit ? { x: unit.x, y: unit.y, forceMove: false } : null;
    }

    queueMoveWaypoint(unit, tx, ty, options = {}) {
        if (!this.canUnitReceiveCommand(unit)) return false;
        const anchor = this.getQueuedMoveAnchor(unit);
        if (anchor && Math.hypot(anchor.x - tx, anchor.y - ty) < 0.35) return false;
        const queuedWaypoint = { x: tx, y: ty, forceMove: !!options.forceMove };
        const hasActiveMove = unit.target && (unit.state === 'moving' || unit.state === 'engaging') && !unit.attackTarget;
        if (!hasActiveMove) {
            this.clearUnitOrders(unit);
            this.issueMoveOrder(unit, tx, ty, 'moving', { forceMove: !!options.forceMove, preserveWaypoints: true });
            unit.waypointQueue = [];
            return true;
        }
        unit.waypointQueue.push(queuedWaypoint);
        return true;
    }

    advanceQueuedMove(unit) {
        if (!unit?.waypointQueue?.length) return false;
        const nextWaypoint = unit.waypointQueue.shift();
        if (!nextWaypoint) return false;
        this.issueMoveOrder(unit, nextWaypoint.x, nextWaypoint.y, 'moving', {
            forceMove: !!nextWaypoint.forceMove,
            preserveWaypoints: true
        });
        return true;
    }

    advancePatrolRoute(unit) {
        if (!unit?.patrolRoute?.length || unit.patrolRoute.length < 2) return false;
        unit.patrolIndex = unit.patrolIndex === 1 ? 0 : 1;
        const nextStop = unit.patrolRoute[unit.patrolIndex];
        if (!nextStop) return false;
        this.issueMoveOrder(unit, nextStop.x, nextStop.y, 'patrolling');
        return true;
    }

    isCombatUnit(unit) {
        return unit && unit.state !== 'dead' && unit.state !== 'loaded' && unit.damage > 0;
    }

    isTransportUnit(unit) {
        return !!(unit && unit.tx === undefined && unit.canTransport && unit.state !== 'dead');
    }

    canTransportPassenger(carrier, passenger) {
        if (!this.isTransportUnit(carrier) || !passenger || passenger.tx !== undefined) return false;
        if (carrier.owner !== passenger.owner || carrier === passenger) return false;
        if (passenger.state === 'dead' || passenger.state === 'loaded') return false;
        if (carrier.passengers.length >= carrier.passengerCapacity) return false;
        return TRANSPORTABLE_INFANTRY_TYPES.has(passenger.type);
    }

    getAvailableUnloadPositions(carrier, targetX = carrier?.x, targetY = carrier?.y, count = 1) {
        if (!carrier) return [];
        const positions = [];
        const seen = new Set();
        const baseX = Math.round(targetX);
        const baseY = Math.round(targetY);
        for (let radius = 1; radius <= 3 && positions.length < count; radius++) {
            for (let dy = -radius; dy <= radius && positions.length < count; dy++) {
                for (let dx = -radius; dx <= radius && positions.length < count; dx++) {
                    const tx = baseX + dx;
                    const ty = baseY + dy;
                    const key = `${tx},${ty}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    if (tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE) continue;
                    if (this.map[ty]?.[tx]?.type === 'water') continue;
                    if (this.players.some(player => player.buildings.some(building => building.hp > 0 && tx >= building.tx && tx < building.tx + building.size && ty >= building.ty && ty < building.ty + building.size))) continue;
                    if (this.players.some(player => player.units.some(unit => unit !== carrier && unit.state !== 'dead' && unit.state !== 'loaded' && Math.hypot(unit.x - tx, unit.y - ty) < 0.6))) continue;
                    positions.push({ x: tx, y: ty });
                }
            }
        }
        return positions;
    }

    getAvailableGarrisonExitPositions(building, targetX = building?.tx + 1, targetY = building?.ty + 1, count = 1) {
        if (!building) return [];
        const positions = [];
        const seen = new Set();
        const baseX = Math.round(targetX);
        const baseY = Math.round(targetY);
        for (let radius = 1; radius <= 4 && positions.length < count; radius++) {
            for (let dy = -radius; dy <= radius && positions.length < count; dy++) {
                for (let dx = -radius; dx <= radius && positions.length < count; dx++) {
                    const tx = baseX + dx;
                    const ty = baseY + dy;
                    const key = `${tx},${ty}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    if (tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE) continue;
                    if (this.map[ty]?.[tx]?.type === 'water') continue;
                    if (tx >= building.tx && tx < building.tx + building.size && ty >= building.ty && ty < building.ty + building.size) continue;
                    if (this.players.some(player => player.buildings.some(candidate => candidate !== building && candidate.hp > 0 && tx >= candidate.tx && tx < candidate.tx + candidate.size && ty >= candidate.ty && ty < candidate.ty + candidate.size))) continue;
                    if (this.players.some(player => player.units.some(unit => unit.state !== 'dead' && unit.state !== 'loaded' && Math.hypot(unit.x - tx, unit.y - ty) < 0.6))) continue;
                    positions.push({ x: tx, y: ty });
                }
            }
        }
        return positions;
    }

    orderUnitToGarrison(unit, building) {
        if (!this.canGarrisonUnit(building, unit)) return false;
        unit.garrisonTarget = building;
        unit.transportTarget = null;
        unit.captureTarget = null;
        unit.attackTarget = null;
        this.issueMoveOrder(unit, building.tx + building.size / 2 - 0.5, building.ty + building.size / 2 - 0.5, 'garrisoning');
        return true;
    }

    garrisonUnit(building, unit) {
        if (building.isNeutralStructure && building.owner === building.neutralOwner) {
            this.setBuildingOwner(building, unit.owner);
        }
        building.garrisonedUnits.push(unit);
        unit.garrisonTarget = building;
        unit.transportTarget = null;
        unit.transportCarrier = null;
        unit.captureTarget = null;
        unit.attackTarget = null;
        unit.target = null;
        unit.path = null;
        unit.pathIdx = 0;
        unit.x = building.tx + building.size / 2 - 0.5;
        unit.y = building.ty + building.size / 2 - 0.5;
        unit.state = 'loaded';
        this.refreshGarrisonBuildingStats(building);
        if (this.selected.includes(unit)) {
            this.selected = this.selected.filter(entity => entity !== unit);
        }
        this.updateSelectionInfo();
        return true;
    }

    ejectGarrison(building, targetX = building?.tx + 1, targetY = building?.ty + 1) {
        if (!this.isGarrisonBuilding(building) || !building.garrisonedUnits?.length) return 0;
        const positions = this.getAvailableGarrisonExitPositions(building, targetX, targetY, building.garrisonedUnits.length);
        let ejected = 0;
        while (building.garrisonedUnits.length && positions.length) {
            const unit = building.garrisonedUnits.shift();
            const pos = positions.shift();
            unit.garrisonTarget = null;
            unit.x = pos.x;
            unit.y = pos.y;
            unit.state = 'idle';
            unit.target = null;
            unit.path = null;
            unit.pathIdx = 0;
            this.renderer3d?.setUnitVisible(unit, true);
            ejected += 1;
        }
        if (building.isNeutralStructure && !building.garrisonedUnits.length) {
            this.setBuildingOwner(building, building.neutralOwner);
        }
        this.refreshGarrisonBuildingStats(building);
        return ejected;
    }

    destroyBuildingGarrison(building, attackerOwner = null, attackerUnit = null) {
        if (!this.isGarrisonBuilding(building) || !building.garrisonedUnits?.length) return;
        const occupants = [...building.garrisonedUnits];
        building.garrisonedUnits = [];
        for (const unit of occupants) {
            unit.garrisonTarget = null;
            this.markUnitDestroyed(unit, attackerOwner, attackerUnit);
            unit.deadTimer = 0;
        }
        this.refreshGarrisonBuildingStats(building);
    }

    orderPassengerToBoard(passenger, carrier) {
        if (!this.canTransportPassenger(carrier, passenger)) return false;
        passenger.transportTarget = carrier;
        passenger.captureTarget = null;
        passenger.attackTarget = null;
        passenger._transportBoardingAnchor = null;
        this.issueMoveOrder(passenger, carrier.x, carrier.y, 'boardingTransport');
        return true;
    }

    orderTransportPickup(carrier, passenger) {
        if (!this.canTransportPassenger(carrier, passenger)) return false;
        carrier.loadTarget = passenger;
        passenger.transportTarget = carrier;
        passenger.captureTarget = null;
        passenger.attackTarget = null;
        if (Math.hypot(carrier.x - passenger.x, carrier.y - passenger.y) > carrier.transportPickupRange) {
            this.issueMoveOrder(carrier, passenger.x, passenger.y, 'loading');
        } else {
            carrier.state = 'loading';
        }
        return true;
    }

    loadPassengerIntoTransport(carrier, passenger) {
        if (!this.canTransportPassenger(carrier, passenger)) return false;
        carrier.passengers.push(passenger);
        carrier.loadTarget = null;
        passenger.transportTarget = null;
        passenger.transportCarrier = carrier;
        passenger.target = null;
        passenger.attackTarget = null;
        passenger.captureTarget = null;
        passenger.path = null;
        passenger.pathIdx = 0;
        passenger._transportBoardingAnchor = null;
        passenger.x = carrier.x;
        passenger.y = carrier.y;
        passenger.state = 'loaded';
        if (this.selected.includes(passenger)) {
            this.selected = this.selected.filter(entity => entity !== passenger);
            this.updateSelectionInfo();
        }
        this.renderer3d?.setUnitVisible(passenger, false);
        return true;
    }

    orderTransportUnload(carrier, tx, ty) {
        if (!this.isTransportUnit(carrier) || !carrier.passengers.length) return false;
        carrier.loadTarget = null;
        carrier.unloadTarget = { x: tx, y: ty };
        carrier._transportUnloadAnchor = null;
        if (Math.hypot(carrier.x - tx, carrier.y - ty) > carrier.unloadRadius) {
            this.issueMoveOrder(carrier, tx, ty, 'unloadingPassengers');
        } else {
            carrier.state = 'unloadingPassengers';
        }
        return true;
    }

    unloadTransport(carrier, targetX = carrier?.x, targetY = carrier?.y) {
        if (!this.isTransportUnit(carrier) || !carrier.passengers.length) return 0;
        const positions = this.getAvailableUnloadPositions(carrier, targetX, targetY, carrier.passengers.length);
        const unloadedPassengers = [];
        let unloaded = 0;
        while (carrier.passengers.length && positions.length) {
            const passenger = carrier.passengers.shift();
            const pos = positions.shift();
            passenger.transportCarrier = null;
            passenger.transportTarget = null;
            passenger.x = pos.x;
            passenger.y = pos.y;
            passenger.state = 'idle';
            passenger.target = null;
            passenger.path = null;
            passenger.pathIdx = 0;
            passenger._transportBoardingAnchor = null;
            this.renderer3d?.setUnitVisible(passenger, true);
            unloadedPassengers.push(passenger);
            unloaded += 1;
        }
        const attackTarget = carrier.aiTransportAttackTarget;
        const targetAlive = attackTarget && ((attackTarget.tx !== undefined && attackTarget.hp > 0) || (attackTarget.tx === undefined && attackTarget.state !== 'dead' && attackTarget.hp > 0));
        if (targetAlive && unloadedPassengers.length) {
            this.issueAIAttackOrder(unloadedPassengers, attackTarget);
        }
        if (!carrier.passengers.length) {
            carrier.unloadTarget = null;
            carrier._transportUnloadAnchor = null;
            carrier.aiTransportAttackTarget = null;
        }
        return unloaded;
    }

    updateTransportUnit(unit, dt) {
        if (!this.isTransportUnit(unit)) return false;

        if (unit.passengers?.length) {
            for (const passenger of unit.passengers) {
                passenger.x = unit.x;
                passenger.y = unit.y;
            }
        }

        if (unit.loadTarget && unit.state !== 'loading') {
            unit.state = 'loading';
        }
        if (unit.unloadTarget && unit.state !== 'unloadingPassengers') {
            unit.state = 'unloadingPassengers';
        }

        if (unit.state === 'loading' && unit.loadTarget) {
            const passenger = unit.loadTarget;
            if (!this.canTransportPassenger(unit, passenger)) {
                unit.loadTarget = null;
                if (unit.state === 'loading') unit.state = 'idle';
                return true;
            }
            const dist = Math.hypot(unit.x - passenger.x, unit.y - passenger.y);
            if (dist > unit.transportPickupRange) {
                this.issueMoveOrder(unit, passenger.x, passenger.y, 'loading');
                this.moveUnitAlongPath(unit, dt);
                return true;
            }
            this.loadPassengerIntoTransport(unit, passenger);
            unit.state = 'idle';
            return true;
        }

        if (unit.state === 'unloadingPassengers' && unit.unloadTarget) {
            const dist = Math.hypot(unit.x - unit.unloadTarget.x, unit.y - unit.unloadTarget.y);
            if (dist > unit.unloadRadius) {
                const needsUnloadPath = !unit.path || !unit.path.length || !unit._transportUnloadAnchor || Math.hypot(unit._transportUnloadAnchor.x - unit.unloadTarget.x, unit._transportUnloadAnchor.y - unit.unloadTarget.y) > 0.5;
                if (needsUnloadPath) {
                    this.issueMoveOrder(unit, unit.unloadTarget.x, unit.unloadTarget.y, 'unloadingPassengers');
                    unit._transportUnloadAnchor = { x: unit.unloadTarget.x, y: unit.unloadTarget.y };
                }
                this.moveUnitAlongPath(unit, dt);
                return true;
            }
            this.unloadTransport(unit, unit.unloadTarget.x, unit.unloadTarget.y);
            unit.state = 'idle';
            return true;
        }

        return false;
    }

    isDefensiveBuilding(building) {
        return !!(building && building.hp > 0 && building.built && (building.damage || 0) > 0);
    }

    getProductionBuildings(player, unitType) {
        const producer = UNIT_TYPES[unitType]?.producedBy;
        return player.buildings.filter(b => b.type === producer && b.built && b.hp > 0);
    }

    getQueueLength(building) {
        return (building.training ? 1 : 0) + (building.trainQueue?.length || 0);
    }

    getUnitCount(player, unitType, { includeQueued = false } = {}) {
        if (!player || !unitType) return 0;
        const liveUnits = player.units.filter(u => u.state !== 'dead' && u.type === unitType).length;
        return includeQueued ? liveUnits + this._getTotalTrainQueue(player, unitType) : liveUnits;
    }

    getAirThreatPressure(player) {
        if (!player) return 0;
        const activeAircraft = player.units.filter(u => u.state !== 'dead' && this.isAirUnit(u)).length;
        const airfields = player.buildings.filter(b => b.type === 'airfield' && b.built && b.hp > 0).length;
        const queuedHarriers = this._getTotalTrainQueue(player, 'harrier');
        return activeAircraft + queuedHarriers + Math.min(2, airfields);
    }

    getAntiAirCoverageScore(player) {
        if (!player) return 0;
        const ifvCount = this.getUnitCount(player, 'ifv', { includeQueued: true });
        const flakTrackCount = this.getUnitCount(player, 'flakTrack', { includeQueued: true });
        const flakTrooperCount = this.getUnitCount(player, 'flakTrooper', { includeQueued: true });
        const patriotBatteryCount = player.buildings.filter(b => b.type === 'patriotBattery' && b.hp > 0).length;
        return (ifvCount * 2) + (flakTrackCount * 2) + flakTrooperCount + (patriotBatteryCount * 3);
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
        if (this.isGarrisonBuilding(building) && building.garrisonedUnits?.length) {
            this.ejectGarrison(building);
        }
        building._removedByOwner = true;
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
        building._removedByOwner = true;
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
        if (this.isAirUnit(unit) && building.type === 'airfield') {
            unit.homeAirfield = building;
        }
        player.units.push(unit);
        this.recordUnitBuilt(building.owner);
        if (unit.role === 'harvester') this.assignHarvesterJob(unit, player);
    }

    issueMoveOrder(unit, tx, ty, state = 'moving', options = {}) {
        unit.target = { x: tx, y: ty };
        unit.attackTarget = null;
        unit.state = state;
        if (state === 'moving' || state === 'patrolling') {
            unit.stanceAnchor = { x: tx, y: ty };
        }
        if (state !== 'patrolling') {
            unit.patrolRoute = null;
            unit.patrolIndex = 0;
        }
        if (!options.preserveWaypoints) unit.waypointQueue = [];
        unit.forceMove = !!options.forceMove;
        if (this.isAirUnit(unit)) {
            unit.path = null;
            unit.pathIdx = 0;
            return;
        }
        unit.path = this.findPath(Math.round(unit.x), Math.round(unit.y), Math.floor(tx), Math.floor(ty));
        unit.pathIdx = unit.path && unit.path.length > 1 && Math.hypot(unit.path[0].x - unit.x, unit.path[0].y - unit.y) < 0.5 ? 1 : 0;
    }

    issueEngineerCaptureOrder(unit, building) {
        if (!unit || unit.role !== 'engineer' || !building || building.owner === unit.owner || building.hp <= 0) return;
        unit.captureTarget = building;
        unit.attackTarget = null;
        this.issueMoveOrder(unit, building.tx + building.size / 2 - 0.5, building.ty + building.size / 2 - 0.5, 'capturing');
    }

    captureBuilding(unit, building) {
        if (!unit || !building || building.owner === unit.owner) return false;
        const previousOwner = building.owner;
        this.setBuildingOwner(building, unit.owner);
        building.repairing = false;
        building.training = null;
        building.trainProgress = 0;
        building.trainQueue = [];
        if (this.isGarrisonBuilding(building) && building.garrisonedUnits?.length) {
            this.ejectGarrison(building);
        }
        building.hp = Math.max(building.hp, Math.floor(building.maxHp * 0.35));
        if (!building.rallyPoint && this.canSetRallyPoint(building)) {
            building.rallyPoint = { x: building.tx + building.size + 1, y: building.ty + Math.floor(building.size / 2) };
        }
        unit.captureTarget = null;
        unit.attackTarget = null;
        unit.target = null;
        unit.path = null;
        this.markUnitDestroyed(unit);
        unit.deadTimer = 0;
        if (unit.owner === this.currentPlayer) {
            this.eva(`Engineer captured ${this.getDisplayName(building.type)}.`);
            this.selected = this.selected.filter(entity => entity !== unit);
            this.updateSelectionInfo();
            this.updateUI();
        } else if (previousOwner === this.currentPlayer) {
            this.eva(`Enemy engineer captured your ${this.getDisplayName(building.type)}.`);
            if (this.selected.includes(building)) {
                this.selected = [];
                this.updateSelectionInfo();
            }
            this.updateUI();
        }
        return true;
    }

    updateEngineerUnit(unit, dt) {
        if (unit.state === 'dead') {
            unit.deadTimer += dt;
            return;
        }

        const target = unit.captureTarget;
        if (!target || target.hp <= 0 || target.owner === unit.owner) {
            unit.captureTarget = null;
            if (unit.state === 'capturing') {
                unit.state = 'idle';
                unit.target = null;
                unit.path = null;
            }
        }

        if (unit.state === 'capturing' && unit.captureTarget) {
            const building = unit.captureTarget;
            const captureX = building.tx + building.size / 2 - 0.5;
            const captureY = building.ty + building.size / 2 - 0.5;
            const nearestX = Math.max(building.tx - 0.5, Math.min(unit.x, building.tx + building.size - 0.5));
            const nearestY = Math.max(building.ty - 0.5, Math.min(unit.y, building.ty + building.size - 0.5));
            const edgeDist = Math.hypot(unit.x - nearestX, unit.y - nearestY);
            if (edgeDist <= Math.max(0.75, unit.captureRange || 0)) {
                this.captureBuilding(unit, building);
                return;
            }
            if (!unit.path || unit.pathIdx >= unit.path.length) {
                unit.path = this.findPath(Math.round(unit.x), Math.round(unit.y), Math.floor(captureX), Math.floor(captureY));
                unit.pathIdx = 0;
            }
            this.moveUnitAlongPath(unit, dt);
            if (unit.state === 'idle') {
                unit.state = 'capturing';
            }
            return;
        }

        if (unit.state === 'moving') {
            this.moveUnitAlongPath(unit, dt);
        }
    }

    getEntityAnchor(entity) {
        if (!entity) return null;
        if (this.isGroundAttackTarget(entity)) {
            return { x: entity.x, y: entity.y };
        }
        if (entity.tx !== undefined) {
            return {
                x: entity.tx + entity.size / 2 - 0.5,
                y: entity.ty + entity.size / 2 - 0.5
            };
        }
        return { x: entity.x, y: entity.y };
    }

    canServiceDepotRepairUnit(unit) {
        return !!(unit && unit.tx === undefined && unit.state !== 'dead' && !this.isAirUnit(unit) && !NON_VEHICLE_ROLES.has(unit.role));
    }

    getServiceDepotRepairState(depot) {
        if (!depot || depot.type !== 'serviceDepot' || !depot.built || depot.hp <= 0) return null;
        const owner = this.players[depot.owner];
        if (!owner) return null;
        const anchor = this.getEntityAnchor(depot);
        if (!anchor) return null;
        const repairRadius = BUILD_TYPES.serviceDepot.repairRadius || 1.1;
        const candidate = owner.units.find(unit => this.canServiceDepotRepairUnit(unit)
            && unit.hp > 0
            && unit.hp < unit.maxHp
            && (unit.state === 'idle' || unit.state === 'moving')
            && Math.hypot(unit.x - anchor.x, unit.y - anchor.y) <= repairRadius);
        if (!candidate) return null;
        return {
            unit: candidate,
            label: this.getDisplayName(candidate.type),
            enoughFunds: owner.money >= (BUILD_TYPES.serviceDepot.repairCost || 0)
        };
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
                kind: unit.attackTarget ? 'attack' : (unit.patrolRoute ? 'patrol' : 'move'),
                unit,
                path: pathPoints,
                target: finalPoint
            });
        }
        return overlays;
    }

    getEntityEngagementOverlay(entity) {
        if (!entity?.attackTarget) return null;
        const target = entity.attackTarget;
        const isGroundTarget = this.isGroundAttackTarget(target);
        const targetAlive = isGroundTarget
            ? true
            : (target.tx !== undefined
                ? (target.hp ?? 0) > 0
                : target.state !== 'dead' && (target.hp ?? 0) > 0);
        if (!targetAlive || !this.canEntityTarget(entity, target)) return null;
        const source = this.getEntityAnchor(entity);
        const targetAnchor = this.getEntityAnchor(target);
        if (!source || !targetAnchor) return null;

        const attackAgainstAir = this.isAirUnit(target);
        const strikeFromAir = this.isAirUnit(entity);
        return {
            kind: isGroundTarget ? 'attack' : (attackAgainstAir ? 'anti-air-lock' : (strikeFromAir ? 'airstrike' : 'attack')),
            source,
            target: targetAnchor,
            label: isGroundTarget ? 'FORCE FIRE' : (attackAgainstAir ? 'AA LOCK' : (strikeFromAir ? 'AIRSTRIKE' : 'ATTACK')),
            entity,
            attackTarget: target,
        };
    }

    getSelectedEngagementOverlays() {
        const overlays = [];
        for (const entity of this.selected) {
            const overlay = this.getEntityEngagementOverlay(entity);
            if (overlay) overlays.push(overlay);
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

    getLocalOreFieldValue(x, y, radius = 2) {
        let total = 0;
        for (let oy = Math.max(0, y - radius); oy <= Math.min(MAP_SIZE - 1, y + radius); oy++) {
            for (let ox = Math.max(0, x - radius); ox <= Math.min(MAP_SIZE - 1, x + radius); ox++) {
                if (Math.hypot(ox - x, oy - y) > radius + 0.25) continue;
                const tile = this.map[oy][ox];
                if (tile.type !== 'ore' || tile.oreAmount <= 0) continue;
                total += tile.oreAmount;
            }
        }
        return total;
    }

    getNearestEnemyThreatDistance(unit, x, y) {
        if (!unit) return Infinity;
        let best = Infinity;
        for (let pi = 0; pi < this.players.length; pi++) {
            if (pi === unit.owner) continue;
            for (const enemyUnit of this.players[pi].units) {
                if (enemyUnit.state === 'dead' || enemyUnit.hp <= 0 || !this.canEntityTarget(enemyUnit, unit)) continue;
                const anchor = this.getEntityAnchor(enemyUnit);
                if (!anchor) continue;
                best = Math.min(best, Math.hypot(anchor.x - x, anchor.y - y));
            }
            for (const enemyBuilding of this.players[pi].buildings) {
                if (enemyBuilding.hp <= 0 || !this.canEntityTarget(enemyBuilding, unit)) continue;
                const anchor = this.getEntityAnchor(enemyBuilding);
                if (!anchor) continue;
                best = Math.min(best, Math.hypot(anchor.x - x, anchor.y - y));
            }
        }
        return best;
    }

    findNearestOreTile(unit, player, options = {}) {
        const refinery = options.refinery || this.findNearestRefinery(player, unit);
        const refineryAnchor = refinery
            ? { x: refinery.tx + refinery.size / 2 - 0.5, y: refinery.ty + refinery.size / 2 - 0.5 }
            : null;
        let best = null;
        let bestScore = Infinity;
        let bestDist = Infinity;
        for (let y = 0; y < MAP_SIZE; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
                const tile = this.map[y][x];
                if (tile.type !== 'ore' || tile.oreAmount <= 0) continue;
                const unitDist = Math.hypot(unit.x - x, unit.y - y);
                const refineryDist = refineryAnchor ? Math.hypot(refineryAnchor.x - x, refineryAnchor.y - y) : unitDist;
                const threatDist = this.getNearestEnemyThreatDistance(unit, x, y);
                const localFieldValue = this.getLocalOreFieldValue(x, y, 2);
                const richness = tile.maxOreAmount > 0 ? tile.oreAmount / tile.maxOreAmount : 0;
                const localFieldScore = Math.min(localFieldValue / 5000, 8);
                const threatPenalty = Number.isFinite(threatDist) ? Math.max(0, 7 - threatDist) * 8 : 0;
                const depletedPenalty = tile.oreAmount <= unit.harvestRate * 2 ? 6 : 0;
                const score = unitDist * 1.15
                    + refineryDist * 0.65
                    + threatPenalty
                    + depletedPenalty
                    - richness * 2.5
                    - localFieldScore * 1.6;
                if (score < bestScore - 0.001 || (Math.abs(score - bestScore) <= 0.001 && unitDist < bestDist)) {
                    bestScore = score;
                    bestDist = unitDist;
                    best = { x, y, tile, score, threatDist, localFieldValue };
                }
            }
        }
        return best;
    }

    assignHarvesterJob(unit, player) {
        unit.evadeUntil = 0;
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
        const ore = this.findNearestOreTile(unit, player, { refinery });
        if (!ore) {
            unit.state = 'idle';
            unit.target = null;
            return;
        }
        unit.oreTarget = ore;
        this.issueMoveOrder(unit, ore.x, ore.y, 'movingToOre');
    }

    getHarvesterThreat(unit) {
        if (!unit || unit.state === 'dead') return null;
        const recentHit = unit._lastHitTime && Date.now() - unit._lastHitTime <= HARVESTER_RETREAT_RECENT_HIT_MS;
        const recentAttacker = recentHit && unit._lastAttackerUnit && unit._lastAttackerUnit.state !== 'dead'
            ? unit._lastAttackerUnit
            : null;
        const nearbyEnemy = this._findNearestEnemy(unit, unit.owner);
        const nearbyDistance = nearbyEnemy ? Math.hypot(
            unit.x - (nearbyEnemy.x !== undefined ? nearbyEnemy.x : nearbyEnemy.tx + nearbyEnemy.size / 2 - 0.5),
            unit.y - (nearbyEnemy.y !== undefined ? nearbyEnemy.y : nearbyEnemy.ty + nearbyEnemy.size / 2 - 0.5)
        ) : Infinity;
        const badlyDamaged = unit.hp / unit.maxHp <= HARVESTER_RETREAT_HEALTH_RATIO;

        if (recentAttacker) {
            const recentDistance = Math.hypot(
                unit.x - (recentAttacker.x !== undefined ? recentAttacker.x : recentAttacker.tx + recentAttacker.size / 2 - 0.5),
                unit.y - (recentAttacker.y !== undefined ? recentAttacker.y : recentAttacker.ty + recentAttacker.size / 2 - 0.5)
            );
            if (recentDistance <= HARVESTER_RETREAT_THREAT_RADIUS || badlyDamaged) {
                return { enemy: recentAttacker, distance: recentDistance, recentHit: true };
            }
        }

        if (nearbyEnemy && nearbyDistance <= HARVESTER_RETREAT_THREAT_RADIUS && badlyDamaged) {
            return { enemy: nearbyEnemy, distance: nearbyDistance, recentHit };
        }

        return null;
    }

    updateHarvesterRetreat(unit, player, dt) {
        if (!unit || unit.state === 'dead') return false;
        const refinery = unit.returnRefinery || this.findNearestRefinery(player, unit);
        const threat = this.getHarvesterThreat(unit);
        if (threat && refinery) {
            const targetX = refinery.tx + refinery.size / 2 - 0.5;
            const targetY = refinery.ty + refinery.size / 2 - 0.5;
            unit.returnRefinery = refinery;
            unit.oreTarget = null;
            unit.harvestTimer = 0;
            unit.evadeUntil = Math.max(unit.evadeUntil || 0, Date.now() + HARVESTER_RETREAT_SAFE_HOLD_MS);
            const needsOrder = unit.state !== 'evadingToRefinery'
                || !unit.target
                || Math.hypot(unit.target.x - targetX, unit.target.y - targetY) > 0.25;
            if (needsOrder) this.issueMoveOrder(unit, targetX, targetY, 'evadingToRefinery');
        }

        if (unit.state !== 'evadingToRefinery') return false;

        const targetX = unit.returnRefinery ? unit.returnRefinery.tx + unit.returnRefinery.size / 2 - 0.5 : unit.x;
        const targetY = unit.returnRefinery ? unit.returnRefinery.ty + unit.returnRefinery.size / 2 - 0.5 : unit.y;
        let dist = Math.hypot(unit.x - targetX, unit.y - targetY);
        if (dist > 1.75) {
            const finished = this.moveUnitAlongPath(unit, dt);
            if (!finished) return true;
            dist = Math.hypot(unit.x - targetX, unit.y - targetY);
        }

        if (unit.cargo > 0 && unit.returnRefinery && dist <= 1.75) {
            unit.state = 'unloading';
            unit.unloadTimer += dt;
            if (unit.unloadTimer >= unit.unloadInterval) {
                unit.unloadTimer = 0;
                const amount = Math.min(unit.unloadRate, unit.cargo);
                unit.cargo -= amount;
                player.money += amount;
                this.recordOreDelivered(unit.owner, amount);
            }
            if (unit.cargo < 0) unit.cargo = 0;
        }

        const holdActive = (unit.evadeUntil || 0) > Date.now();
        if (this.getHarvesterThreat(unit) || holdActive) {
            unit.target = null;
            unit.path = null;
            unit.pathIdx = 0;
            unit.state = 'evadingToRefinery';
            return true;
        }

        unit.returnRefinery = null;
        unit.evadeUntil = 0;
        this.assignHarvesterJob(unit, player);
        return true;
    }

    updateHarvesterUnit(unit, player, dt) {
        if (unit.state === 'dead') {
            unit.deadTimer += dt;
            return;
        }

        if (this.updateHarvesterRetreat(unit, player, dt)) return;

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
                this.recordOreDelivered(unit.owner, amount);
            }
            if (unit.cargo <= 0) {
                unit.cargo = 0;
                unit.returnRefinery = null;
                this.assignHarvesterJob(unit, player);
            }
            return;
        }

        const ore = unit.oreTarget && unit.oreTarget.tile?.oreAmount > 0 ? unit.oreTarget : this.findNearestOreTile(unit, player, { refinery: unit.returnRefinery || this.findNearestRefinery(player, unit) });
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

    getAirfieldAnchor(airfield) {
        if (!airfield || airfield.type !== 'airfield' || airfield.hp <= 0 || !airfield.built) return null;
        return {
            x: airfield.tx + airfield.size / 2 - 0.5,
            y: airfield.ty + airfield.size / 2 - 0.5
        };
    }

    findNearestAirfield(player, unit) {
        if (!player || !unit) return null;
        const candidates = player.buildings.filter(building => building.type === 'airfield' && building.hp > 0 && building.built);
        if (candidates.length === 0) return null;

        if (unit.homeAirfield && candidates.includes(unit.homeAirfield)) {
            return unit.homeAirfield;
        }

        let best = null;
        let bestDist = Infinity;
        for (const airfield of candidates) {
            const anchor = this.getAirfieldAnchor(airfield);
            if (!anchor) continue;
            const dist = Math.hypot(unit.x - anchor.x, unit.y - anchor.y);
            if (dist < bestDist) {
                bestDist = dist;
                best = airfield;
            }
        }
        if (best) unit.homeAirfield = best;
        return best;
    }

    moveAirUnitToward(unit, targetX, targetY, dt) {
        const dx = targetX - unit.x;
        const dy = targetY - unit.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= 0.08) {
            unit.x = targetX;
            unit.y = targetY;
            return true;
        }
        const speed = unit.speed * dt / 1000;
        unit.x += (dx / dist) * Math.min(speed, dist);
        unit.y += (dy / dist) * Math.min(speed, dist);
        this.faceToward(unit, targetX, targetY);
        return dist <= 0.4;
    }

    sendAirUnitToBase(unit, player) {
        const airfield = this.findNearestAirfield(player, unit);
        if (!airfield) {
            unit.attackTarget = null;
            unit.target = null;
            unit.state = 'idle';
            return false;
        }
        const anchor = this.getAirfieldAnchor(airfield);
        if (!anchor) {
            unit.state = 'idle';
            return false;
        }
        unit.homeAirfield = airfield;
        unit.attackTarget = null;
        unit.target = anchor;
        unit.path = null;
        unit.pathIdx = 0;
        unit.state = 'returningToBase';
        return true;
    }

    updateAirUnit(unit, player, dt) {
        if (unit.state === 'dead') {
            unit.deadTimer += dt;
            return true;
        }

        const ammoCap = unit.ammoCapacity || 0;
        if (ammoCap <= 0) return false;

        if (unit.homeAirfield && (unit.homeAirfield.hp <= 0 || !unit.homeAirfield.built)) {
            unit.homeAirfield = null;
        }

        if ((unit.ammo <= 0 && unit.state !== 'returningToBase' && unit.state !== 'rearming') ||
            (unit.state === 'idle' && unit.ammo < ammoCap)) {
            this.sendAirUnitToBase(unit, player);
        }

        if (unit.state !== 'returningToBase' && unit.state !== 'rearming') {
            return false;
        }

        const airfield = this.findNearestAirfield(player, unit);
        if (!airfield) {
            unit.state = 'idle';
            unit.target = null;
            return true;
        }

        const anchor = this.getAirfieldAnchor(airfield);
        if (!anchor) {
            unit.state = 'idle';
            return true;
        }

        const landed = this.moveAirUnitToward(unit, anchor.x, anchor.y, dt);
        if (!landed) {
            unit.target = anchor;
            unit.state = 'returningToBase';
            return true;
        }

        unit.x = anchor.x;
        unit.y = anchor.y;
        unit.target = null;
        unit.attackTarget = null;
        unit.state = 'rearming';
        unit.reloadTimer += dt;
        if (unit.reloadTimer >= unit.reloadTime) {
            unit.reloadTimer = 0;
            unit.ammo = Math.min(ammoCap, unit.ammo + Math.max(1, unit.reloadAmount || 0));
        }
        if (unit.ammo >= ammoCap) {
            unit.state = 'idle';
        }
        return true;
    }

    hasPoweredBuilding(player, type) {
        return !!player?.buildings?.some(building => building.type === type && building.built && building.hp > 0);
    }

    hasOperationalRadar(player) {
        return this.hasPoweredBuilding(player, 'radarDome') && !POWER_SYSTEM.isLowPower(player);
    }

    updatePowerState(player) {
        if (!player) return;
        const status = POWER_SYSTEM.getStatusLabel(player);
        const display = document.getElementById('power-display');
        if (!display) return;
        const radarState = this.hasPoweredBuilding(player, 'radarDome')
            ? (this.hasOperationalRadar(player) ? 'RADAR ONLINE' : 'RADAR OFFLINE')
            : 'NO RADAR';
        display.textContent = `${status.text} • ${radarState}`;
        display.classList.toggle('low-power', status.lowPower);
        if (player === this.players[this.currentPlayer]) {
            if (status.lowPower && !player.lowPowerNotified) {
                this.eva('Warning: low power.');
                player.lowPowerNotified = true;
            }
            if (!status.lowPower) player.lowPowerNotified = false;
            this.updateSelectionInfo();
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
        const simDt = dt * this.gameSpeedMultiplier;
        this.elapsedMs += simDt;
        for (const player of this.players) {
            const startingMCV = player.units.find(unit => unit.type === 'mcv' && unit.isStartingMCV && unit.state !== 'dead');
            if (startingMCV && startingMCV.autoDeployAt !== null && this.elapsedMs >= startingMCV.autoDeployAt) {
                this.deployMCV(startingMCV, { auto: true });
                startingMCV.autoDeployAt = null;
            }
        }
        this.updateCamera(dt);
        this.updateBuildings(simDt);
        this.updateUnits(simDt);
        this.updateAutoAttack(simDt);
        this.updateProjectiles(simDt);
        this.updateEffects(simDt);
        this.updateFog();
        this.updatePowerState(this.players[this.currentPlayer]);
        this.updateAI(simDt);
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
                b.fireTimer = Math.max(0, (b.fireTimer || 0) - dt);
                if (!b.built) {
                    b.buildProgress += (dt / BUILD_TYPES[b.type].buildTime) * buildSpeed;
                    if (b.buildProgress >= 1) {
                        b.buildProgress = 1;
                        b.built = true;
                        this.recordBuildingConstructed(b.owner);
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

                if (b.type === 'serviceDepot' && b.built && b.hp > 0) {
                    const repairState = this.getServiceDepotRepairState(b);
                    b.repairingUnit = repairState?.unit || null;
                    if (repairState?.unit) {
                        const repairCost = dt * (def.repairCost || 0.03);
                        const repairAmount = dt * (def.repairRate || 0.05);
                        if (p.money >= repairCost) {
                            p.money -= repairCost;
                            repairState.unit.hp = Math.min(repairState.unit.maxHp, repairState.unit.hp + repairAmount);
                        }
                    }
                } else {
                    b.repairingUnit = null;
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

                if (this.isDefensiveBuilding(b)) {
                    if (this.isGarrisonBuilding(b)) {
                        this.refreshGarrisonBuildingStats(b);
                    }
                    const defensesPowered = !POWER_SYSTEM.isLowPower(p);
                    if (!defensesPowered) {
                        b.attackTarget = null;
                    } else {
                        const sourceAnchor = this.getEntityAnchor(b);
                        const targetAnchor = this.getEntityAnchor(b.attackTarget);
                        const targetDead = !b.attackTarget || b.attackTarget.state === 'dead' || (b.attackTarget.hp ?? 0) <= 0;
                        const targetInvalid = !this.canEntityTarget(b, b.attackTarget);
                        const targetOutOfSight = !sourceAnchor || !targetAnchor || Math.hypot(sourceAnchor.x - targetAnchor.x, sourceAnchor.y - targetAnchor.y) > b.sight + 0.5;
                        if (targetDead || targetInvalid || targetOutOfSight) {
                            b.attackTarget = this._findNearestEnemy(b, b.owner);
                        }
                        const activeTargetAnchor = this.getEntityAnchor(b.attackTarget);
                        if (sourceAnchor && activeTargetAnchor) {
                            const distance = Math.hypot(sourceAnchor.x - activeTargetAnchor.x, sourceAnchor.y - activeTargetAnchor.y);
                            if (distance <= b.range && b.fireTimer <= 0) {
                                b.fireTimer = b.fireRate;
                                this.fireAt(b, b.attackTarget);
                            }
                        }
                    }
                }

                if (b.hp <= 0) {
                    this.destroyBuildingGarrison(b, b._lastAttackerOwner ?? null, b._lastAttackerUnit || null);
                    this.markBuildingDestroyed(b, b._lastAttackerOwner ?? null, {
                        countAsLoss: !b._removedByOwner,
                        attackerUnit: b._lastAttackerUnit || null,
                    });
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
                if (u.role === 'engineer' && !u.transportTarget && u.state !== 'boardingTransport') {
                    this.updateEngineerUnit(u, dt);
                    continue;
                }
                if (u.state === 'garrisoning' || u.garrisonTarget) {
                    const building = u.garrisonTarget;
                    if (!building || !this.canGarrisonUnit(building, u)) {
                        u.garrisonTarget = null;
                        if (u.state === 'garrisoning') u.state = 'idle';
                        continue;
                    }
                    const anchorX = building.tx + building.size / 2 - 0.5;
                    const anchorY = building.ty + building.size / 2 - 0.5;
                    u.attackTarget = null;
                    if (Math.hypot(u.x - anchorX, u.y - anchorY) <= 0.9) {
                        this.garrisonUnit(building, u);
                    } else {
                        if (!u.target || !u.path || u.state !== 'garrisoning') {
                            this.issueMoveOrder(u, anchorX, anchorY, 'garrisoning');
                        }
                        this.moveUnitAlongPath(u, dt);
                    }
                    continue;
                }
                if (u.state === 'boardingTransport' || u.transportTarget) {
                    const carrier = u.transportTarget;
                    if (!carrier || !this.canTransportPassenger(carrier, u)) {
                        u.transportTarget = null;
                        u._transportBoardingAnchor = null;
                        if (u.state === 'boardingTransport') u.state = 'idle';
                        continue;
                    }
                    const dist = Math.hypot(u.x - carrier.x, u.y - carrier.y);
                    if (dist <= (carrier.transportPickupRange || 1.1)) {
                        this.loadPassengerIntoTransport(carrier, u);
                    } else {
                        const needsBoardingPath = !u.path || !u.path.length || !u._transportBoardingAnchor || Math.hypot(u._transportBoardingAnchor.x - carrier.x, u._transportBoardingAnchor.y - carrier.y) > 0.5;
                        if (needsBoardingPath) {
                            this.issueMoveOrder(u, carrier.x, carrier.y, 'boardingTransport');
                            u._transportBoardingAnchor = { x: carrier.x, y: carrier.y };
                        }
                        this.moveUnitAlongPath(u, dt);
                    }
                    continue;
                }
                if (u.state === 'loaded') {
                    continue;
                }

                if (u.state === 'dead') {
                    u.deadTimer += dt;
                    continue;
                }

                u.fireTimer = Math.max(0, u.fireTimer - dt);

                if (this.isAirUnit(u) && this.updateAirUnit(u, p, dt)) {
                    continue;
                }
                if (this.updateTransportUnit(u, dt)) {
                    continue;
                }

                if (u.state === 'moving' || u.state === 'patrolling' || u.state === 'loading' || u.state === 'unloadingPassengers' || (u.state === 'attacking' && u.attackTarget)) {
                    let targetX, targetY;

                    if (u.state === 'attacking' && u.attackTarget) {
                        const at = u.attackTarget;
                        const isGroundTarget = this.isGroundAttackTarget(at);
                        targetX = at.x !== undefined ? at.x : at.tx + 1;
                        targetY = at.y !== undefined ? at.y : at.ty + 1;

                        const dist = Math.hypot(u.x - targetX, u.y - targetY);
                        const invalidTarget = isGroundTarget
                            ? !this.canEntityTarget(u, at)
                            : ((at.hp !== undefined && at.hp <= 0) || at.state === 'dead' || !this.canEntityTarget(u, at));

                        if (invalidTarget) {
                            u.attackTarget = null;
                            if (!this.advancePatrolRoute(u)) {
                                u.state = 'idle';
                            }
                            continue;
                        }

                        if (dist <= u.range) {
                            u.state = 'attacking';
                            this.faceToward(u, targetX, targetY);

                            if (u.fireTimer <= 0) {
                                u.fireTimer = u.fireRate;
                                this.fireAt(u, at);
                                if (isGroundTarget) {
                                    u.attackTarget = null;
                                    u.state = 'idle';
                                }
                            }
                            if (isGroundTarget) {
                                continue;
                            }
                            continue;
                        }

                        // Retaliation: if being attacked by someone closer, switch to fight them
                        if (u._lastHitTime && Date.now() - u._lastHitTime < 3000) {
                            const nearbyAttacker = this._findNearestEnemy(u, u.owner, { mode: 'retaliate' });
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

                        if (!this.shouldUnitKeepPursuing(u, at)) {
                            u.attackTarget = null;
                            this.resumeUnitPostEngagement(u);
                            continue;
                        }

                        if (!this.isAirUnit(u)) {
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
                        } else {
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
                    } else if (u.state === 'moving' || u.state === 'patrolling') {
                        // While moving, check for enemies in attack range → auto-engage
                        const nearbyEnemy = u.forceMove ? null : this._findNearestEnemy(u, u.owner, { mode: 'moving' });
                        if (nearbyEnemy) {
                            const ed = Math.hypot(u.x - (nearbyEnemy.x !== undefined ? nearbyEnemy.x : nearbyEnemy.tx + 1),
                                                   u.y - (nearbyEnemy.y !== undefined ? nearbyEnemy.y : nearbyEnemy.ty + 1));
                            if (ed <= u.range) {
                                // Enemy in attack range → stop and engage
                                // Save move target so player can resume later
                                u._savedTarget = u.target;
                                u._savedPath = u.path;
                                u._savedPathIdx = u.pathIdx;
                                u._savedWaypointQueue = [...(u.waypointQueue || [])];
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

                    if (dist < 0.2 && (u.state === 'moving' || u.state === 'patrolling')) {
                        if (u.path && u.pathIdx < u.path.length - 1) {
                            u.pathIdx++;
                        } else if (u.state === 'patrolling' && u.patrolRoute?.length >= 2) {
                            this.advancePatrolRoute(u);
                        } else if (u.waypointQueue?.length) {
                            this.advanceQueuedMove(u);
                        } else {
                            u.state = 'idle';
                            u.target = null;
                            u.path = null;
                            u.forceMove = false;
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
                    if (!at || (at.hp !== undefined && at.hp <= 0) || at.state === 'dead' || !this.canEntityTarget(u, at)) {
                        u.attackTarget = null;
                        this.resumeUnitPostEngagement(u);
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
                    } else if (this.shouldUnitKeepPursuing(u, at)) {
                        // Enemy moved out of range — chase them if the current stance allows it
                        u.state = 'attacking';
                    } else {
                        u.attackTarget = null;
                        this.resumeUnitPostEngagement(u);
                    }
                    continue;
                }

                if (u.state === 'idle') {
                    u.frame = 0;
                }

                // Unit separation force to prevent stacking
                if (u.state !== 'dead' && !this.isAirUnit(u)) {
                    let pushX = 0, pushY = 0;
                    for (const p2 of this.players) {
                        for (const other of p2.units) {
                            if (other === u || other.state === 'dead' || this.isAirUnit(other)) continue;
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
                if (u.state !== 'idle' || u.hp <= 0 || u.state === 'dead' || !this.isCombatUnit(u)) continue;

                // Find nearest enemy in sight range
                const enemy = this._findNearestEnemy(u, pi, { mode: 'idle' });
                if (enemy) {
                    u.attackTarget = enemy;
                    u.state = 'attacking';
                }
            }
        }
    }

    _findNearestEnemy(unit, ownerIdx, options = {}) {
        const source = this.getEntityAnchor(unit);
        if (!source) return null;
        const searchRadius = options.searchRadius ?? this.getUnitAutoAcquireRadius(unit, options.mode || 'idle');
        let best = null, bestDist = searchRadius + 0.01;
        for (let pi = 0; pi < this.players.length; pi++) {
            if (pi === ownerIdx) continue;
            for (const eu of this.players[pi].units) {
                if (eu.state === 'dead' || eu.hp <= 0 || !this.canEntityTarget(unit, eu)) continue;
                const target = this.getEntityAnchor(eu);
                if (!target) continue;
                const d = Math.hypot(source.x - target.x, source.y - target.y);
                if (d < bestDist) { bestDist = d; best = eu; }
            }
            for (const eb of this.players[pi].buildings) {
                if (eb.hp <= 0 || !this.canEntityTarget(unit, eb)) continue;
                const target = this.getEntityAnchor(eb);
                if (!target) continue;
                const d = Math.hypot(source.x - target.x, source.y - target.y);
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
        const source = this.getEntityAnchor(u);
        const targetAnchor = this.getEntityAnchor(target);
        if (!source || !targetAnchor) return;
        const isGroundTarget = this.isGroundAttackTarget(target);
        if (this.isAirUnit(u) && u.ammoCapacity > 0) {
            if (u.ammo <= 0) return;
            u.ammo = Math.max(0, u.ammo - 1);
            if (u.ammo <= 0) {
                this.sendAirUnitToBase(u, this.players[u.owner]);
            }
        }
        const tx = targetAnchor.x;
        const ty = targetAnchor.y;

        if (u.directFire && !isGroundTarget) {
            const directDamage = this.getDamageAgainstTarget(u.damage, u.damageProfile, target);
            if (directDamage > 0) {
                target.hp -= directDamage;
                if (u.owner !== target.owner) this.grantVeterancy(u, directDamage);
                target._lastAttackerOwner = u.owner;
                target._lastAttackerUnit = u;
                target._lastHitTime = Date.now();
                if (target.hp <= 0) {
                    if (target.tx !== undefined) {
                        target.hp = Math.max(0, target.hp);
                    } else {
                        this.markUnitDestroyed(target, u.owner, u);
                    }
                }
            }
            this.effects.push({ type: 'hit', x: tx, y: ty, frame: 0, timer: 0 });
            return;
        }

        this.projectiles.push({
            x: source.x, y: source.y,
            tx, ty,
            speed: u.projectileSpeed || 8,
            damage: u.damage,
            damageProfile: u.damageProfile || null,
            weaponType: u.weaponType || 'rifle',
            owner: u.owner,
            attacker: u,
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
                            if (p.attacker && p.attacker.owner !== eu.owner) this.grantVeterancy(p.attacker, dmg);
                            // Record who attacked this unit (for retaliation)
                            eu._lastAttackerOwner = p.owner;
                            eu._lastAttackerUnit = p.attacker || null;
                            eu._lastHitTime = Date.now();
                            if (eu.hp <= 0) this.markUnitDestroyed(eu, p.owner, p.attacker || null);
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
                            if (p.attacker && p.attacker.owner !== eb.owner) this.grantVeterancy(p.attacker, dmg);
                            eb._lastAttackerOwner = p.owner;
                            eb._lastAttackerUnit = p.attacker || null;
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

    getAIThreatenedHarvesters(aiPlayer = this.players[1], enemyPlayer = this.players[0]) {
        if (!aiPlayer || !enemyPlayer) return [];
        const vulnerableTargets = [
            ...aiPlayer.units.filter(u => u.type === 'harvester' && u.state !== 'dead'),
            ...aiPlayer.buildings.filter(b => b.type === 'refinery' && b.built && b.hp > 0)
        ];
        const enemyCombatants = enemyPlayer.units.filter(u => this.isCombatUnit(u) && u.state !== 'dead');
        const threats = [];

        for (const target of vulnerableTargets) {
            const targetAnchor = this.getEntityAnchor(target);
            if (!targetAnchor) continue;
            const nearestEnemy = enemyCombatants
                .map(enemy => {
                    const anchor = this.getEntityAnchor(enemy);
                    if (!anchor) return null;
                    return {
                        enemy,
                        distance: Math.hypot(anchor.x - targetAnchor.x, anchor.y - targetAnchor.y)
                    };
                })
                .filter(Boolean)
                .sort((a, b) => a.distance - b.distance)[0];

            if (nearestEnemy && nearestEnemy.distance <= 8) {
                threats.push({
                    target,
                    enemy: nearestEnemy.enemy,
                    distance: nearestEnemy.distance,
                    priority: target.type === 'harvester' ? 2 : 1
                });
            }
        }

        return threats.sort((a, b) => b.priority - a.priority || a.distance - b.distance);
    }

    getAITargetPriorityDetails(aiPlayer = this.players[1], enemyPlayer = this.players[0]) {
        if (!aiPlayer || !enemyPlayer) return null;
        const candidates = [
            ...enemyPlayer.units.filter(u => u.state !== 'dead'),
            ...enemyPlayer.buildings.filter(b => b.built && b.hp > 0)
        ];
        if (candidates.length === 0) return null;

        const aiCombatUnits = aiPlayer.units.filter(unit => this.isCombatUnit(unit) && unit.state !== 'dead');
        const enemyPowerStats = POWER_SYSTEM.calculate(enemyPlayer);
        const enemyBuiltBuildings = enemyPlayer.buildings.filter(building => building.built && building.hp > 0);
        const enemyHeavyVehicleCount = enemyPlayer.units.filter(unit => unit.state !== 'dead' && (unit.armorType === 'heavy' || unit.type === 'apocalypseTank')).length;
        const enemyHarvesters = enemyPlayer.units.filter(unit => unit.state !== 'dead' && unit.role === 'harvester').length;
        const enemyAirfields = enemyBuiltBuildings.filter(building => building.type === 'airfield');
        const queuedHarriers = enemyAirfields.reduce((total, airfield) => {
            let queued = 0;
            if (airfield.training === 'harrier') queued += 1;
            if (Array.isArray(airfield.trainQueue)) {
                queued += airfield.trainQueue.filter(type => type === 'harrier').length;
            }
            return total + queued;
        }, 0);
        const liveHarriers = enemyPlayer.units.filter(unit => unit.state !== 'dead' && unit.type === 'harrier').length;

        const scoreTarget = target => {
            const isBuilding = target.tx !== undefined;
            const type = target.type || '';
            const role = target.role || '';
            const reasons = [];
            let score = isBuilding ? 20 : 10;

            if (type === 'harvester' || role === 'harvester') {
                score += 120;
                reasons.push('harvester-raiding');
            } else if (type === 'powerPlant') {
                score += 80;
            } else if (type === 'advancedPowerPlant') {
                score += 88;
            } else if (type === 'battleLab') {
                score += 85;
            } else if (type === 'warFactory') {
                score += 70;
            } else if (type === 'airfield') {
                score += 78;
            } else if (type === 'refinery') {
                score += 65;
            } else if (type === 'radarDome') {
                score += 45;
            } else if (type === 'barracks') {
                score += 35;
            } else if (type === 'apocalypseTank') {
                score += 55;
            } else if (type === 'apc') {
                score += 38;
            } else if (type === 'ifv') {
                score += 42;
            } else if (type === 'flakTrack') {
                score += 34;
            } else if (type === 'tank') {
                score += 30;
            } else if (role === 'engineer') {
                score += 40;
            } else if (target.damage > 0) {
                score += 25;
            }

            if (isBuilding) {
                const def = BUILD_TYPES[type] || {};
                const powerSupply = def.powerSupply || 0;
                const projectedProduced = enemyPowerStats.produced - powerSupply;
                const wouldTriggerLowPower = powerSupply > 0 && enemyPowerStats.consumed > 0 && projectedProduced < enemyPowerStats.consumed;
                const wouldCripplePowerMargin = powerSupply > 0 && enemyPowerStats.consumed > 0 && (projectedProduced - enemyPowerStats.consumed) <= 25;
                if (wouldTriggerLowPower) {
                    score += 120;
                    reasons.push('power-sabotage');
                } else if (wouldCripplePowerMargin) {
                    score += 55;
                    reasons.push('power-pressure');
                }

                if (type === 'battleLab') {
                    const enemyTechPayload = enemyHeavyVehicleCount + enemyAirfields.length + liveHarriers + queuedHarriers;
                    score += 30 + enemyTechPayload * 12;
                    reasons.push('tech-snipe');
                } else if (type === 'airfield') {
                    const airPayload = liveHarriers + queuedHarriers;
                    score += 40 + airPayload * 16;
                    reasons.push('air-snipe');
                } else if (type === 'warFactory' && enemyHeavyVehicleCount > 0) {
                    score += 35 + enemyHeavyVehicleCount * 10;
                    reasons.push('factory-bust');
                } else if (type === 'refinery' && enemyHarvesters > 0) {
                    score += 20 + enemyHarvesters * 8;
                    reasons.push('eco-pressure');
                }
            }

            const targetAnchor = this.getEntityAnchor(target);
            let nearestAIUnit = undefined;
            if (targetAnchor) {
                nearestAIUnit = aiCombatUnits
                    .map(unit => {
                        const anchor = this.getEntityAnchor(unit);
                        if (!anchor) return null;
                        return Math.hypot(anchor.x - targetAnchor.x, anchor.y - targetAnchor.y);
                    })
                    .filter(distance => distance !== null)
                    .sort((a, b) => a - b)[0];
                if (nearestAIUnit !== undefined) {
                    score -= nearestAIUnit * 2.5;
                }
            }

            const finishingBonus = Math.max(0, ((target.maxHp || target.hp || 0) - (target.hp || 0)) * 0.1);
            if (finishingBonus > 0) reasons.push('finish-off');
            score += finishingBonus;

            return {
                target,
                score,
                reasons,
                nearestDistance: nearestAIUnit ?? null,
                targetType: type || role || 'unknown'
            };
        };

        return candidates
            .map(scoreTarget)
            .sort((a, b) => b.score - a.score || (a.nearestDistance ?? Infinity) - (b.nearestDistance ?? Infinity))[0] || null;
    }

    getAIPriorityTarget(aiPlayer = this.players[1], enemyPlayer = this.players[0]) {
        return this.getAITargetPriorityDetails(aiPlayer, enemyPlayer)?.target || null;
    }

    issueAIAttackOrder(units, target) {
        if (!target) return;
        const anchor = this.getEntityAnchor(target);
        if (!anchor) return;
        for (const unit of units) {
            if (!unit || unit.state === 'dead' || !this.isCombatUnit(unit) || !this.canEntityTarget(unit, target)) continue;
            unit.attackTarget = target;
            unit.target = null;
            unit.state = 'attacking';
            unit.path = this.isAirUnit(unit) ? null : this.findPath(Math.floor(unit.x), Math.floor(unit.y), Math.floor(anchor.x), Math.floor(anchor.y));
            unit.pathIdx = 0;
        }
    }

    assignAIDefenders(aiPlayer, enemyPlayer, idleCombatUnits) {
        const threats = this.getAIThreatenedHarvesters(aiPlayer, enemyPlayer);
        if (threats.length === 0 || idleCombatUnits.length === 0) return [];

        const assignments = [];
        const available = [...idleCombatUnits];
        const engagedEnemies = new Set();
        for (const threat of threats) {
            if (available.length === 0) break;
            if (engagedEnemies.has(threat.enemy)) continue;
            const defenderCount = threat.target.type === 'harvester' ? 2 : 1;
            const targetAnchor = this.getEntityAnchor(threat.enemy);
            if (!targetAnchor) continue;
            const defenders = available
                .sort((a, b) => Math.hypot(a.x - targetAnchor.x, a.y - targetAnchor.y) - Math.hypot(b.x - targetAnchor.x, b.y - targetAnchor.y))
                .splice(0, Math.min(defenderCount, available.length));
            if (defenders.length === 0) continue;
            engagedEnemies.add(threat.enemy);
            this.issueAIAttackOrder(defenders, threat.enemy);
            defenders.forEach(unit => assignments.push(unit));
        }

        return assignments;
    }

    assignAIHarassers(aiPlayer, enemyPlayer, idleCombatUnits) {
        if (idleCombatUnits.length < 2) return [];
        const enemyHarvesters = enemyPlayer.units.filter(u => u.type === 'harvester' && u.state !== 'dead');
        if (enemyHarvesters.length === 0) return [];

        const target = enemyHarvesters
            .map(harvester => {
                const anchor = this.getEntityAnchor(harvester);
                if (!anchor) return null;
                const distance = idleCombatUnits
                    .map(unit => Math.hypot(unit.x - anchor.x, unit.y - anchor.y))
                    .sort((a, b) => a - b)[0];
                return { harvester, distance };
            })
            .filter(Boolean)
            .sort((a, b) => a.distance - b.distance)[0]?.harvester;
        if (!target) return [];

        const targetAnchor = this.getEntityAnchor(target);
        const harassers = [...idleCombatUnits]
            .sort((a, b) => Math.hypot(a.x - targetAnchor.x, a.y - targetAnchor.y) - Math.hypot(b.x - targetAnchor.x, b.y - targetAnchor.y))
            .slice(0, Math.min(2, idleCombatUnits.length));
        this.issueAIAttackOrder(harassers, target);
        return harassers;
    }

    assignAITransportAssault(aiPlayer, enemyPlayer, idleCombatUnits) {
        const apcs = aiPlayer.units.filter(unit =>
            unit.type === 'apc' &&
            unit.state !== 'dead' &&
            unit.state !== 'loading' &&
            unit.state !== 'unloadingPassengers' &&
            !unit.attackTarget
        );
        if (!apcs.length) return [];

        const target = this.getAIPriorityTarget(aiPlayer, enemyPlayer);
        const targetAnchor = this.getEntityAnchor(target);
        if (!targetAnchor) return [];

        const assignments = [];
        const availableInfantry = idleCombatUnits.filter(unit =>
            unit.tx === undefined &&
            this.isCombatUnit(unit) &&
            TRANSPORTABLE_INFANTRY_TYPES.has(unit.type)
        );

        for (const apc of apcs) {
            const distanceToTarget = Math.hypot(apc.x - targetAnchor.x, apc.y - targetAnchor.y);
            if (distanceToTarget < 8) continue;

            const pendingBoarders = aiPlayer.units.filter(unit => unit.transportTarget === apc && unit.state !== 'loaded');
            const minDropForce = Math.min(2, apc.passengerCapacity || 0);
            if (apc.passengers.length >= minDropForce || (apc.passengers.length > 0 && pendingBoarders.length === 0)) {
                apc.aiTransportAttackTarget = target;
                if (this.orderTransportUnload(apc, targetAnchor.x, targetAnchor.y)) {
                    assignments.push(apc, ...apc.passengers);
                }
                continue;
            }

            const freeSlots = Math.max(0, apc.passengerCapacity - apc.passengers.length - pendingBoarders.length);
            if (freeSlots <= 0 || availableInfantry.length === 0) continue;

            const boarders = [...availableInfantry]
                .sort((a, b) => Math.hypot(a.x - apc.x, a.y - apc.y) - Math.hypot(b.x - apc.x, b.y - apc.y))
                .slice(0, freeSlots);
            let issuedBoarding = false;
            for (const infantry of boarders) {
                if (!this.orderPassengerToBoard(infantry, apc)) continue;
                const index = availableInfantry.indexOf(infantry);
                if (index >= 0) availableInfantry.splice(index, 1);
                assignments.push(infantry);
                issuedBoarding = true;
            }
            if (issuedBoarding) {
                assignments.push(apc);
            }
        }

        return assignments;
    }

    updateSingleAI(aiIndex, dt) {
        const aiState = this.aiState?.[aiIndex];
        if (!aiState) return;
        aiState.timer += dt;
        if (aiState.timer < aiState.decisionInterval) return;
        aiState.timer = 0;
        aiState.decisionInterval = this.aiConfig.decisionMin + Math.random() * this.aiConfig.decisionRange;

        const ai = this.players[aiIndex];
        if (!ai || (ai.buildings.length === 0 && ai.units.length === 0)) return;
        const undeployedMcv = ai.units.find(unit => unit.type === 'mcv' && unit.state !== 'dead');
        if (undeployedMcv && this.deployMCV(undeployedMcv, { auto: true })) {
            return;
        }

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
            const b = this.createBuilding(type, pos.x, pos.y, aiIndex);
            b.built = false;
            b.buildProgress = 0;
            ai.buildings.push(b);
            return true;
        };

        if (POWER_SYSTEM.isLowPower(ai)) {
            const advancedPowerOnline = builtTypes.has('advancedPowerPlant');
            const advancedPowerReady = builtTypes.has('radarDome') && ai.money >= BUILD_TYPES.advancedPowerPlant.cost;
            if (!advancedPowerOnline && advancedPowerReady && tryBuild('advancedPowerPlant')) return;
            if (tryBuild('powerPlant')) return;
        }
        if (!builtTypes.has('refinery') && tryBuild('refinery')) return;
        if (!builtTypes.has('barracks') && tryBuild('barracks')) return;
        if (!builtTypes.has('radarDome') && tryBuild('radarDome')) return;
        if (!builtTypes.has('warFactory') && tryBuild('warFactory')) return;
        const wantsAirfieldFirst = this.aiConfig.prioritizeAirfield && !builtTypes.has('airfield');
        const wantsBattleLabFirst = this.aiConfig.prioritizeBattleLab && !builtTypes.has('battleLab');
        if (wantsAirfieldFirst && builtTypes.has('warFactory') && ai.money >= BUILD_TYPES.airfield.cost + 600 && tryBuild('airfield')) return;
        if (wantsBattleLabFirst && builtTypes.has('warFactory') && ai.money >= BUILD_TYPES.battleLab.cost && tryBuild('battleLab')) return;
        if (!builtTypes.has('airfield') && builtTypes.has('warFactory') && ai.money >= BUILD_TYPES.airfield.cost + 1000 && tryBuild('airfield')) return;
        if (!builtTypes.has('battleLab') && builtTypes.has('warFactory') && ai.money >= BUILD_TYPES.battleLab.cost && tryBuild('battleLab')) return;
        if (ai.buildings.filter(b => b.type === 'powerPlant' || b.type === 'advancedPowerPlant').length < this.aiConfig.desiredPowerPlants && ai.money > 2200 && tryBuild('powerPlant')) return;
        if (builtTypes.has('barracks') && ai.buildings.filter(b => b.type === 'pillbox' && b.hp > 0).length < this.aiConfig.desiredPillboxes && ai.money >= BUILD_TYPES.pillbox.cost && tryBuild('pillbox')) return;
        if (builtTypes.has('warFactory') && ai.buildings.filter(b => b.type === 'sentryGun' && b.hp > 0).length < this.aiConfig.desiredSentryGuns && ai.money >= BUILD_TYPES.sentryGun.cost && tryBuild('sentryGun')) return;

        const harvesters = ai.units.filter(u => u.type === 'harvester' && u.state !== 'dead').length;
        const refineries = ai.buildings.filter(b => b.type === 'refinery' && b.built && b.hp > 0).length;
        const warFactories = this.getProductionBuildings(ai, 'harvester');
        const barracks = this.getProductionBuildings(ai, 'soldier');
        const tankFactories = this.getProductionBuildings(ai, 'tank');
        const apcFactories = this.getProductionBuildings(ai, 'apc');
        const ifvFactories = this.getProductionBuildings(ai, 'ifv');
        const flakTrackFactories = this.getProductionBuildings(ai, 'flakTrack');
        const artilleryFactories = this.getProductionBuildings(ai, 'artillery');
        const apocalypseFactories = this.getProductionBuildings(ai, 'apocalypseTank');
        const airfields = this.getProductionBuildings(ai, 'harrier');
        const enemyPlayer = this.getClosestEnemyPlayer(ai);
        if (!enemyPlayer) return;
        const enemyHeavyUnits = enemyPlayer.units.filter(u => u.state !== 'dead' && u.armorType === 'heavy').length;
        const enemyAirUnits = enemyPlayer.units.filter(u => u.state !== 'dead' && this.isAirUnit(u)).length;
        const enemyAirPressure = this.getAirThreatPressure(enemyPlayer);
        const enemyBuildings = enemyPlayer.buildings.filter(b => b.built && b.hp > 0).length;
        const enemyDefenses = enemyPlayer.buildings.filter(b => b.built && b.hp > 0 && this.isDefensiveBuilding(b)).length;
        const enemyInfantryUnits = enemyPlayer.units.filter(u => u.state !== 'dead' && u.role !== 'harvester' && u.armorType !== 'heavy').length;

        if (warFactories.length > 0 && harvesters < Math.max(1, refineries) && ai.money >= UNIT_TYPES.harvester.cost) {
            const wf = warFactories.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            ai.money -= UNIT_TYPES.harvester.cost;
            if (!wf.training) wf.training = 'harvester';
            else wf.trainQueue.push('harvester');
            return;
        }

        const aiApcCount = ai.units.filter(u => u.state !== 'dead' && u.type === 'apc').length + this._getTotalTrainQueue(ai, 'apc');
        if (!builtTypes.has('radarDome') && apcFactories.length > 0 && ai.money >= UNIT_TYPES.apc.cost && enemyInfantryUnits >= 3 && aiApcCount < Math.max(1, Math.ceil(enemyInfantryUnits / 3))) {
            const wf = apcFactories.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            ai.money -= UNIT_TYPES.apc.cost;
            if (!wf.training) wf.training = 'apc';
            else wf.trainQueue.push('apc');
            return;
        }

        const aiIfvCount = this.getUnitCount(ai, 'ifv', { includeQueued: true });
        const aiFlakTrackCount = this.getUnitCount(ai, 'flakTrack', { includeQueued: true });
        const aiFlakCount = this.getUnitCount(ai, 'flakTrooper', { includeQueued: true });
        const aiPatriotCount = ai.buildings.filter(b => b.type === 'patriotBattery' && b.hp > 0).length;
        const antiAirCoverageScore = this.getAntiAirCoverageScore(ai);
        const antiAirEmergency = enemyAirPressure >= 2 && antiAirCoverageScore < (enemyAirPressure * 2);
        const desiredPatriotCount = (enemyAirPressure >= 5 ? 2 : (enemyAirPressure >= 3 ? 1 : 0)) + (this.aiConfig.buildOrder === 'fortified' ? 1 : 0);
        if (antiAirEmergency && builtTypes.has('radarDome') && ai.money >= BUILD_TYPES.patriotBattery.cost && aiPatriotCount < desiredPatriotCount && tryBuild('patriotBattery')) return;
        const desiredIfvCount = enemyAirPressure >= 4 ? 2 : (enemyAirPressure >= 2 ? 1 : 0);
        const desiredFlakTrackCount = enemyAirPressure >= 5 ? 2 : (enemyAirPressure >= 3 ? 1 : 0);
        const desiredFlakTrooperCount = enemyAirPressure >= 2 ? Math.max(2, enemyAirPressure) : 0;
        if (ifvFactories.length > 0 && ai.money >= UNIT_TYPES.ifv.cost && ((enemyAirUnits >= 1 && aiIfvCount < Math.max(1, enemyAirUnits)) || (antiAirEmergency && aiIfvCount < desiredIfvCount))) {
            const wf = ifvFactories.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            ai.money -= UNIT_TYPES.ifv.cost;
            if (!wf.training) wf.training = 'ifv';
            else wf.trainQueue.push('ifv');
            return;
        }

        if (flakTrackFactories.length > 0 && ai.money >= UNIT_TYPES.flakTrack.cost && ((enemyInfantryUnits >= 4 && aiFlakTrackCount < Math.max(1, Math.ceil(enemyInfantryUnits / 4))) || (antiAirEmergency && aiFlakTrackCount < desiredFlakTrackCount))) {
            const wf = flakTrackFactories.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            ai.money -= UNIT_TYPES.flakTrack.cost;
            if (!wf.training) wf.training = 'flakTrack';
            else wf.trainQueue.push('flakTrack');
            return;
        }

        const aiArtilleryCount = ai.units.filter(u => u.state !== 'dead' && u.type === 'artillery').length + this._getTotalTrainQueue(ai, 'artillery');
        const desiredArtilleryCount = Math.max(1, Math.ceil(enemyDefenses / 2) + this.aiConfig.desiredArtilleryBias);
        if (artilleryFactories.length > 0 && ai.money >= UNIT_TYPES.artillery.cost && (enemyDefenses >= 1 || enemyBuildings >= 6 || this.aiConfig.buildOrder === 'fortified') && aiArtilleryCount < desiredArtilleryCount) {
            const wf = artilleryFactories.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            ai.money -= UNIT_TYPES.artillery.cost;
            if (!wf.training) wf.training = 'artillery';
            else wf.trainQueue.push('artillery');
            return;
        }

        if ((antiAirEmergency || enemyAirPressure >= 2) && barracks.length > 0 && aiFlakCount < desiredFlakTrooperCount && ai.money >= UNIT_TYPES.flakTrooper.cost) {
            const bb = barracks.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            ai.money -= UNIT_TYPES.flakTrooper.cost;
            if (!bb.training) bb.training = 'flakTrooper';
            else bb.trainQueue.push('flakTrooper');
            return;
        }

        const aiHarrierCount = ai.units.filter(u => u.state !== 'dead' && u.type === 'harrier').length + this._getTotalTrainQueue(ai, 'harrier');
        const enemyEcoTargets = enemyPlayer.units.filter(u => u.state !== 'dead' && u.type === 'harvester').length + enemyPlayer.buildings.filter(b => b.built && b.hp > 0 && (b.type === 'refinery' || b.type === 'powerPlant')).length;
        const desiredHarrierCount = this.aiConfig.desiredHarriers;
        const shouldPrioritizeHarriers = !antiAirEmergency && airfields.length > 0 && ai.money >= UNIT_TYPES.harrier.cost && (enemyDefenses >= 1 || enemyEcoTargets >= 2 || enemyBuildings >= 5 || this.aiConfig.buildOrder === 'air') && aiHarrierCount < desiredHarrierCount;
        if (shouldPrioritizeHarriers) {
            const airfield = airfields.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            ai.money -= UNIT_TYPES.harrier.cost;
            if (!airfield.training) airfield.training = 'harrier';
            else airfield.trainQueue.push('harrier');
            return;
        }

        const aiApocalypseCount = ai.units.filter(u => u.state !== 'dead' && u.type === 'apocalypseTank').length + this._getTotalTrainQueue(ai, 'apocalypseTank');
        const wantsArmorBreakthrough = this.aiConfig.buildOrder === 'armor' || this.aiConfig.buildOrder === 'fortified';
        if (builtTypes.has('battleLab') && apocalypseFactories.length > 0 && ai.money >= UNIT_TYPES.apocalypseTank.cost && (enemyHeavyUnits >= 2 || enemyBuildings >= 5 || aiApocalypseCount < 1 || wantsArmorBreakthrough)) {
            const wf = apocalypseFactories.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            ai.money -= UNIT_TYPES.apocalypseTank.cost;
            if (!wf.training) wf.training = 'apocalypseTank';
            else wf.trainQueue.push('apocalypseTank');
            return;
        }

        if (tankFactories.length > 0 && ai.money >= UNIT_TYPES.tank.cost) {
            const wf = tankFactories.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            ai.money -= UNIT_TYPES.tank.cost;
            if (!wf.training) wf.training = 'tank';
            else wf.trainQueue.push('tank');
        }

        const aiRocketCount = ai.units.filter(u => u.state !== 'dead' && u.type === 'rocketInfantry').length + this._getTotalTrainQueue(ai, 'rocketInfantry');
        const aiSoldierCount = ai.units.filter(u => u.state !== 'dead' && u.type === 'soldier').length + this._getTotalTrainQueue(ai, 'soldier');
        const aiAttackDogCount = ai.units.filter(u => u.state !== 'dead' && u.type === 'attackDog').length + this._getTotalTrainQueue(ai, 'attackDog');

        if (barracks.length > 0) {
            const bb = barracks.sort((a, b) => this.getQueueLength(a) - this.getQueueLength(b))[0];
            let infantryChoice = 'soldier';
            if ((antiAirEmergency || enemyAirPressure >= 2) && aiFlakCount < desiredFlakTrooperCount && ai.money >= UNIT_TYPES.flakTrooper.cost) {
                infantryChoice = 'flakTrooper';
            } else if (enemyHeavyUnits > aiRocketCount && ai.money >= UNIT_TYPES.rocketInfantry.cost) {
                infantryChoice = 'rocketInfantry';
            } else if (enemyInfantryUnits >= 3 && aiAttackDogCount < Math.ceil(enemyInfantryUnits / 2) && ai.money >= UNIT_TYPES.attackDog.cost) {
                infantryChoice = 'attackDog';
            } else if (enemyInfantryUnits > aiFlakCount + 1 && ai.money >= UNIT_TYPES.flakTrooper.cost) {
                infantryChoice = 'flakTrooper';
            } else if (aiSoldierCount > 0 && aiSoldierCount % 3 === 0 && ai.money >= UNIT_TYPES.rocketInfantry.cost) {
                infantryChoice = 'rocketInfantry';
            } else if (aiSoldierCount > 1 && aiSoldierCount % 2 === 0 && ai.money >= UNIT_TYPES.flakTrooper.cost) {
                infantryChoice = 'flakTrooper';
            } else if (aiSoldierCount > 0 && aiSoldierCount % 4 === 0 && ai.money >= UNIT_TYPES.attackDog.cost) {
                infantryChoice = 'attackDog';
            } else if (ai.money < Math.min(UNIT_TYPES.soldier.cost, UNIT_TYPES.attackDog.cost)) {
                infantryChoice = null;
            }

            if (infantryChoice) {
                ai.money -= UNIT_TYPES[infantryChoice].cost;
                if (!bb.training) bb.training = infantryChoice;
                else bb.trainQueue.push(infantryChoice);
            }
        }

        let idleCombatUnits = ai.units.filter(u => this.isCombatUnit(u) && u.state === 'idle');
        const assignedDefenders = this.assignAIDefenders(ai, enemyPlayer, idleCombatUnits);
        if (assignedDefenders.length > 0) {
            const defenderSet = new Set(assignedDefenders);
            idleCombatUnits = idleCombatUnits.filter(unit => !defenderSet.has(unit));
        }

        const assignedTransportAssault = this.assignAITransportAssault(ai, enemyPlayer, idleCombatUnits);
        if (assignedTransportAssault.length > 0) {
            const transportSet = new Set(assignedTransportAssault);
            idleCombatUnits = idleCombatUnits.filter(unit => !transportSet.has(unit));
        }

        const assignedHarassers = this.assignAIHarassers(ai, enemyPlayer, idleCombatUnits);
        if (assignedHarassers.length > 0) {
            const harasserSet = new Set(assignedHarassers);
            idleCombatUnits = idleCombatUnits.filter(unit => !harasserSet.has(unit));
        }

        if (idleCombatUnits.length >= this.aiConfig.attackThreshold) {
            const target = this.getAIPriorityTarget(ai, enemyPlayer);
            if (target) {
                this.issueAIAttackOrder(idleCombatUnits, target);
            }
        }
    }

    updateAI(dt) {
        for (let aiIndex = 1; aiIndex < this.players.length; aiIndex++) {
            if (!this.players[aiIndex]?.isAI) continue;
            this.updateSingleAI(aiIndex, dt);
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

        const playerAlive = this.hasLivingBase(this.players[this.currentPlayer]);
        if (!playerAlive) {
            this.finishMatch(this.currentPlayer);
            return;
        }

        const livingAIs = this.players.filter((player, index) => index !== this.currentPlayer && player?.isAI && this.hasLivingBase(player));
        if (livingAIs.length === 0) {
            this.finishMatch(1);
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
            const isPatrol = overlay.kind === 'patrol';
            const color = isAttack ? '#ff5a36' : (isPatrol ? '#66e0ff' : '#00ff88');
            this._drawOverlayPath(ctx, overlay.path, {
                color,
                dashed: true,
                width: isPatrol ? 2 : 1.5,
                alpha: 0.75
            });
            this._drawOverlayMarker(ctx, overlay.target, {
                color,
                label: isAttack ? 'ATTACK' : (isPatrol ? 'PATROL' : 'MOVE'),
                style: isAttack ? 'crosshair' : 'ring',
                alpha: 0.85
            });
        }

        const engagementOverlays = this.getSelectedEngagementOverlays();
        for (const overlay of engagementOverlays.slice(0, 10)) {
            const isAntiAir = overlay.kind === 'anti-air-lock';
            const isAirstrike = overlay.kind === 'airstrike';
            this._drawOverlayPath(ctx, [overlay.source, overlay.target], {
                color: isAntiAir ? '#66ccff' : (isAirstrike ? '#ffd36b' : '#ff5a36'),
                dashed: true,
                width: isAirstrike ? 2.5 : 2,
                alpha: 0.9
            });
            this._drawOverlayMarker(ctx, overlay.target, {
                color: isAntiAir ? '#66ccff' : (isAirstrike ? '#ffd36b' : '#ff5a36'),
                label: overlay.label,
                style: isAntiAir ? 'diamond' : 'crosshair',
                alpha: 0.95,
                radius: isAirstrike ? 12 : 10,
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
        const radarOffline = !this.hasOperationalRadar(ownP);

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
            const selectedUnit = this.selected.length === 1 && this.selected[0]?.tx === undefined ? this.selected[0] : null;
            if (action === 'stop') {
                this.stopSelectedUnits();
                return;
            }
            if (action === 'scatter') {
                this.scatterSelectedUnits();
                return;
            }
            if (action === 'patrol') {
                this.togglePatrolMode();
                return;
            }
            if (action === 'force-move') {
                this.toggleForceMoveMode();
                return;
            }
            if (action === 'force-fire') {
                this.toggleForceFireMode();
                return;
            }
            if (action.startsWith('stance-')) {
                this.setSelectedUnitStance(action.replace('stance-', ''));
                return;
            }
            if (action === 'deploy') {
                if (selectedUnit?.type === 'mcv') this.deployMCV(selectedUnit);
                return;
            }
            if (action === 'unload') {
                if (this.isTransportUnit(selectedUnit) && selectedUnit.passengers.length) {
                    this.unloadTransport(selectedUnit, selectedUnit.x, selectedUnit.y);
                    selectedUnit.state = 'idle';
                    this.eva('APC unloading passengers.');
                    this.updateSelectionInfo();
                }
                return;
            }
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
            } else if (action === 'eject-garrison') {
                const ejected = this.ejectGarrison(building);
                if (ejected > 0) {
                    this.eva(`${this.getDisplayName(building.type)} ejected ${ejected} infantry.`);
                    this.updateSelectionInfo();
                }
            }
        });
    }

    updateUI() {
        const activeTab = document.querySelector('.build-tab.active')?.dataset.tab || 'buildings';
        const container = document.getElementById('build-items');
        container.innerHTML = '';
        const p = this.players[this.currentPlayer];

        if (activeTab === 'buildings') {
            ['powerPlant', 'advancedPowerPlant', 'refinery', 'serviceDepot', 'barracks', 'radarDome', 'warFactory', 'airfield', 'battleLab', 'pillbox', 'sentryGun', 'patriotBattery', 'battleBunker', 'sandbagWall'].forEach(type => {
                const def = BUILD_TYPES[type];
                this.addBuildItem(container, type, def.name, def.cost, def.description, false);
            });
        } else {
            ['soldier', 'attackDog', 'rocketInfantry', 'flakTrooper', 'engineer', 'harvester', 'tank', 'apc', 'ifv', 'flakTrack', 'artillery', 'harrier', 'apocalypseTank', 'mcv'].forEach(type => {
                const def = UNIT_TYPES[type];
                const description = type === 'engineer'
                    ? 'Captures enemy buildings on contact.'
                    : (type === 'attackDog' ? 'Melee anti-infantry interceptor.' : def.role);
                this.addBuildItem(container, type, def.name, def.cost, description, true);
            });
        }

        this.updateSelectionInfo();
        this._updateQueueBadge();
        this.updatePowerState(p);
    }

    addBuildItem(container, type, name, cost, desc, isUnit = false) {
        const p = this.players[this.currentPlayer];
        const sourceDef = isUnit ? UNIT_TYPES[type] : BUILD_TYPES[type];
        const prereqSummary = this.getPrerequisiteSummary(p, sourceDef.prerequisites || []);
        const { missing, nextUnlock, chainLabel } = prereqSummary;
        const div = document.createElement('div');
        const locked = missing.length > 0;
        const affordable = p.money >= cost;
        div.className = 'build-item' + (!affordable ? ' disabled' : '') + (locked ? ' locked' : '');
        div.dataset.type = type;
        div.dataset.lockedReason = locked ? missing.join(', ') : '';
        div.title = chainLabel || `${name} ready`;

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

        const techEl = document.createElement('div');
        techEl.className = 'item-tech-chain';
        techEl.textContent = chainLabel || 'No tech prerequisites';
        div.appendChild(techEl);

        const statusEl = document.createElement('div');
        statusEl.className = 'item-status';
        if (locked) {
            statusEl.textContent = `Next: ${nextUnlock} • Missing ${missing.length}`;
        } else if (!affordable) {
            statusEl.textContent = 'Insufficient funds';
        } else {
            statusEl.textContent = chainLabel ? 'Tech ready' : 'Ready';
            statusEl.classList.add('ready');
        }
        div.appendChild(statusEl);

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
            if (locked) {
                this.eva(`${name} locked. Next: ${nextUnlock}. Missing: ${missing.join(', ')}.`);
                return;
            }
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
                const veterancyBits = [];
                if (s.role === 'harvester') extras.push(`ORE: ${Math.floor(s.cargo)}/${s.cargoCapacity}`);
                else if (this.isTransportUnit(s)) {
                    extras.push(`CARGO: ${s.passengers.length}/${s.passengerCapacity}`);
                    if (s.passengers.length) {
                        extras.push(`LOADED: ${s.passengers.map(passenger => this.getDisplayName(passenger.type)).join(', ')}`);
                    }
                } else if (s.type === 'mcv') {
                    extras.push(this.canDeployMCV(s) ? 'DEPLOY READY' : 'DEPLOY BLOCKED');
                    extras.push('D / Deploy button');
                } else if (s.role === 'engineer') {
                    extras.push('CAPTURE: enemy buildings');
                    if (s.captureTarget && s.captureTarget.hp > 0) {
                        extras.push(`TARGET: ${this.getDisplayName(s.captureTarget.type)}`);
                    }
                } else if (this.isAirUnit(s) && s.ammoCapacity > 0) {
                    extras.push(`AMMO: ${s.ammo}/${s.ammoCapacity}`);
                    extras.push(`DMG: ${s.damage} | RNG: ${s.range}`);
                    if (s.attackTarget) {
                        extras.push(`STRIKE: ${this.getDisplayName(s.attackTarget.type)}`);
                    }
                    if (s.state === 'returningToBase') {
                        extras.push(`STATUS: RTB ${s.homeAirfield ? `→ ${this.getDisplayName(s.homeAirfield.type)}` : ''}`.trim());
                    } else if (s.state === 'rearming') {
                        extras.push(`STATUS: Rearming ${s.homeAirfield ? `@ ${this.getDisplayName(s.homeAirfield.type)}` : ''}`.trim());
                    }
                } else {
                    extras.push(`DMG: ${s.damage} | RNG: ${s.range}`);
                    if (this.canServiceDepotRepairUnit(s)) {
                        const depot = this.players[s.owner]?.buildings.find(building => building.type === 'serviceDepot' && building.repairingUnit === s);
                        if (depot) {
                            extras.push(`SERVICE DEPOT: ${Math.round(depot.tx + depot.size / 2 - 0.5)}, ${Math.round(depot.ty + depot.size / 2 - 0.5)}`);
                        }
                    }
                    if (s.canAttackAir && s.attackTarget && this.isAirUnit(s.attackTarget)) {
                        extras.push(`AA LOCK: ${this.getDisplayName(s.attackTarget.type)}`);
                    }
                }
                if (this.isCombatUnit(s)) {
                    veterancyBits.push(`RANK: ${this.getVeterancyLabel(s.veterancyRank)}`);
                    veterancyBits.push(`XP: ${Math.floor(s.veterancyXp || 0)}/${VETERANCY_THRESHOLDS.elite}`);
                }
                const deployButton = s.type === 'mcv'
                    ? `<button class="selection-action" data-action="deploy" ${this.canDeployMCV(s) ? '' : 'disabled'}>Deploy MCV</button>`
                    : '';
                const stanceButtons = this.canUnitReceiveCommand(s)
                    ? UNIT_STANCE_ORDER.map(stance => `<button class="selection-action ${s.stance === stance ? 'active' : ''}" data-action="stance-${stance}">${UNIT_STANCE_PROFILES[stance].label}</button>`).join('')
                    : '';
                const commandButtons = this.canUnitReceiveCommand(s)
                    ? `<button class="selection-action" data-action="stop">Stop</button><button class="selection-action" data-action="scatter">Scatter</button>${this.canUnitForceFire(s) ? `<button class="selection-action ${this.commandMode === 'set-force-fire' ? 'active' : ''}" data-action="force-fire">${this.commandMode === 'set-force-fire' ? 'Placing Force Fire' : 'Force Fire'}</button>` : ''}<button class="selection-action ${this.commandMode === 'set-force-move' ? 'active' : ''}" data-action="force-move">${this.commandMode === 'set-force-move' ? 'Placing Force Move' : 'Force Move'}</button><button class="selection-action ${this.commandMode === 'set-patrol' ? 'active' : ''}" data-action="patrol">${this.commandMode === 'set-patrol' ? 'Placing Patrol' : 'Patrol'}</button>${stanceButtons}`
                    : '';
                const unloadButton = this.isTransportUnit(s)
                    ? `<button class="selection-action" data-action="unload" ${s.passengers.length ? '' : 'disabled'}>Unload APC</button>`
                    : '';
                info.innerHTML = `<div style="color:#00ff88">${this.getDisplayName(s.type)}</div>
                    <div>HP: ${Math.floor(s.hp)}/${s.maxHp}</div>
                    <div>${[...extras, `STANCE: ${this.getUnitStanceLabel(s).toUpperCase()}`, ...(this.isGroundAttackTarget(s.attackTarget) ? ['ORDER: FORCE FIRE'] : []), ...(s.forceMove ? ['ORDER: FORCE MOVE'] : []), ...(s.waypointQueue?.length ? [`WAYPOINTS: ${s.waypointQueue.length} queued`] : []), ...(s.patrolRoute?.length === 2 ? [`PATROL: ${Math.round(s.patrolRoute[0].x)}, ${Math.round(s.patrolRoute[0].y)} ⇄ ${Math.round(s.patrolRoute[1].x)}, ${Math.round(s.patrolRoute[1].y)}`] : [])].join(' | ')}</div>
                    ${veterancyBits.length ? `<div style="color:#ffd36b">${veterancyBits.join(' | ')}</div>` : ''}
                    <div style="color:#666;font-size:9px">${s.state}</div>
                    ${(deployButton || unloadButton || commandButtons) ? `<div class="selection-actions">${deployButton}${unloadButton}${commandButtons}</div><div class="selection-hint">${this.commandMode === 'set-patrol' ? 'Right-click any visible tile to place the patrol turn-around point.' : (this.commandMode === 'set-force-move' ? 'Right-click any tile or enemy to move through without auto-engaging.' : (this.commandMode === 'set-force-fire' ? 'Right-click any ground position to barrage that tile. Ctrl+right-click also force-fires instantly.' : 'Stop cancels the current order. Scatter sends the selection to nearby offsets. Shift+right-click queues waypoints. Force Fire barrages a ground tile. Force Move ignores en-route auto-engage until arrival. Patrol loops between the current position and a chosen tile. Stances: Guard / Aggressive / Hold Ground. Hotkeys: S / X / C / F / P / G / A / H.'))}</div>` : ''}`;
            } else {
                const def = BUILD_TYPES[s.type];
                const statusBits = [];
                if (s.training) statusBits.push(`Producing: ${this.getDisplayName(s.training)} ${Math.floor(s.trainProgress * 100)}%`);
                if (!s.built) statusBits.push(`Building: ${Math.floor(s.buildProgress * 100)}%`);
                if (def.powerSupply) statusBits.push(`Power +${def.powerSupply}`);
                if (def.powerDrain) statusBits.push(`Drain ${def.powerDrain}`);
                if (def.providesRadar) statusBits.push(this.hasOperationalRadar(this.players[s.owner]) ? 'Radar online' : 'Radar offline');
                if (this.isDefensiveBuilding(s)) statusBits.push(`DMG ${s.damage} | RNG ${s.range}`);
                if (this.isGarrisonBuilding(s)) statusBits.push(`GARRISON ${s.garrisonedUnits.length}/${s.garrisonCapacity}`);
                if (s.type === 'serviceDepot') {
                    const repairState = this.getServiceDepotRepairState(s);
                    statusBits.push(repairState ? `Servicing: ${repairState.label}` : 'Pad idle');
                }
                if (s.canAttackAir && s.attackTarget && this.isAirUnit(s.attackTarget)) statusBits.push(`AA LOCK: ${this.getDisplayName(s.attackTarget.type)}`);
                if (this.isDefensiveBuilding(s) && POWER_SYSTEM.isLowPower(this.players[s.owner])) statusBits.push('Weapons offline');
                if (s.repairing) statusBits.push('Repairing');
                if (s.rallyPoint && this.canSetRallyPoint(s)) statusBits.push(`Rally: ${Math.round(s.rallyPoint.x)}, ${Math.round(s.rallyPoint.y)}`);
                const canRepair = this.canRepairBuilding(this.players[s.owner], s);
                const rallyButton = this.canSetRallyPoint(s)
                    ? `<button class="selection-action ${this.commandMode === 'set-rally' ? 'active' : ''}" data-action="rally">${this.commandMode === 'set-rally' ? 'Placing Rally' : 'Set Rally'}</button>`
                    : '';
                const repairButton = `<button class="selection-action" data-action="repair" ${(!canRepair && !s.repairing) ? 'disabled' : ''}>${s.repairing ? 'Stop Repair' : 'Repair'}</button>`;
                const sellButton = `<button class="selection-action danger" data-action="sell">Sell</button>`;
                const ejectButton = this.isGarrisonBuilding(s)
                    ? `<button class="selection-action" data-action="eject-garrison" ${s.garrisonedUnits.length ? '' : 'disabled'}>Eject Garrison</button>`
                    : '';
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
                    <div class="selection-actions">${repairButton}${sellButton}${ejectButton}${cancelBuildButton}${cancelCurrentButton}${cancelQueueButton}${rallyButton}</div>`;
            }
        } else {
            const units = this.selected.filter(u => u.tx === undefined);
            const commandableUnits = units.filter(u => this.canUnitReceiveCommand(u));
            const harvesters = units.filter(u => u.role === 'harvester').length;
            const fighters = units.length - harvesters;
            const veterans = units.filter(u => u.veterancyRank === 'veteran').length;
            const elites = units.filter(u => u.veterancyRank === 'elite').length;
            const stanceSummary = new Set(commandableUnits.map(unit => this.getUnitStanceLabel(unit)));
            const stanceLabel = stanceSummary.size === 1 ? [...stanceSummary][0] : 'Mixed';
            const stanceButtons = commandableUnits.length
                ? UNIT_STANCE_ORDER.map(stance => `<button class="selection-action ${stanceSummary.size === 1 && commandableUnits[0].stance === stance ? 'active' : ''}" data-action="stance-${stance}">${UNIT_STANCE_PROFILES[stance].label}</button>`).join('')
                : '';
            info.innerHTML = `<div style="color:#00ff88">${units.length} units selected</div>
                <div>${fighters} combat | ${harvesters} harvesters</div>
                <div style="color:#ffd36b">${veterans} veteran | ${elites} elite</div>
                <div>Stance: ${stanceLabel}</div>
                <div style="color:#666;font-size:9px">Right-click commands apply to combat units only</div>
                ${commandableUnits.length ? `<div class="selection-actions"><button class="selection-action" data-action="stop">Stop</button><button class="selection-action" data-action="scatter">Scatter</button>${commandableUnits.some(unit => this.canUnitForceFire(unit)) ? `<button class="selection-action ${this.commandMode === 'set-force-fire' ? 'active' : ''}" data-action="force-fire">${this.commandMode === 'set-force-fire' ? 'Placing Force Fire' : 'Force Fire'}</button>` : ''}<button class="selection-action ${this.commandMode === 'set-force-move' ? 'active' : ''}" data-action="force-move">${this.commandMode === 'set-force-move' ? 'Placing Force Move' : 'Force Move'}</button><button class="selection-action ${this.commandMode === 'set-patrol' ? 'active' : ''}" data-action="patrol">${this.commandMode === 'set-patrol' ? 'Placing Patrol' : 'Patrol'}</button>${stanceButtons}</div><div class="selection-hint">${this.commandMode === 'set-patrol' ? 'Right-click any visible tile to place the patrol turn-around point.' : (this.commandMode === 'set-force-move' ? 'Right-click any tile or enemy to move through without auto-engaging.' : (this.commandMode === 'set-force-fire' ? 'Right-click any ground position to barrage that tile. Ctrl+right-click also force-fires instantly.' : 'Stop cancels the current order. Scatter fans the group into nearby positions. Shift+right-click queues waypoints. Force Fire barrages a ground tile. Force Move ignores en-route auto-engage until arrival. Patrol loops between the current position and a chosen tile. Stances: Guard / Aggressive / Hold Ground. Hotkeys: S / X / C / F / P / G / A / H.'))}</div>` : ''}`;
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

function bindMatchSummaryControls() {
    const overlay = document.getElementById('match-summary-overlay');
    const restartButton = document.getElementById('match-summary-restart');
    const setupButton = document.getElementById('match-summary-setup');
    if (!overlay || !restartButton || !setupButton) return;

    restartButton.addEventListener('click', () => {
        sessionStorage.setItem(MATCH_PANEL_COLLAPSED_KEY, '1');
        window.location.reload();
    });

    setupButton.addEventListener('click', () => {
        sessionStorage.removeItem(MATCH_PANEL_COLLAPSED_KEY);
        window.location.reload();
    });
}

function bindSkirmishSetupPanel() {
    const overlay = document.getElementById('skirmish-setup-overlay');
    const startButton = document.getElementById('skirmish-start-button');
    const controls = {
        startingCredits: document.getElementById('setup-starting-credits'),
        map: document.getElementById('setup-map'),
        playerFaction: document.getElementById('setup-player-faction'),
        aiDifficulty: document.getElementById('setup-ai-difficulty'),
        aiPlayers: document.getElementById('setup-ai-players'),
        aiBuildOrder: document.getElementById('setup-ai-build-order'),
        gameSpeed: document.getElementById('setup-game-speed'),
    };
    if (!overlay || !startButton || Object.values(controls).some(control => !control)) return;

    const applyControls = config => {
        const normalized = normalizeMatchConfig(config);
        controls.startingCredits.value = String(normalized.startingCredits);
        controls.map.value = normalized.map;
        controls.playerFaction.value = normalized.playerFaction;
        controls.aiDifficulty.value = normalized.aiDifficulty;
        controls.aiPlayers.value = String(normalized.aiPlayers);
        controls.aiBuildOrder.value = normalized.aiBuildOrder;
        controls.gameSpeed.value = normalized.gameSpeed;
        updateSetupBriefing(normalized);
    };

    const readControls = () => normalizeMatchConfig({
        startingCredits: controls.startingCredits.value,
        map: controls.map.value,
        playerFaction: controls.playerFaction.value,
        aiDifficulty: controls.aiDifficulty.value,
        aiPlayers: controls.aiPlayers.value,
        aiBuildOrder: controls.aiBuildOrder.value,
        gameSpeed: controls.gameSpeed.value,
    });

    applyControls(getStoredMatchConfig());
    Object.values(controls).forEach(control => control.addEventListener('change', () => {
        const config = readControls();
        persistMatchConfig(config);
        updateSetupBriefing(config);
        overlay.classList.remove('hidden');
        sessionStorage.removeItem(MATCH_PANEL_COLLAPSED_KEY);
    }));

    startButton.addEventListener('click', () => {
        persistMatchConfig(readControls());
        sessionStorage.setItem(MATCH_PANEL_COLLAPSED_KEY, '1');
        window.location.reload();
    });

    if (sessionStorage.getItem(MATCH_PANEL_COLLAPSED_KEY) === '1') {
        overlay.classList.add('hidden');
    }
}

window.GameState = GameState;

// Start the game!
window.addEventListener('DOMContentLoaded', () => {
    const storedConfig = getStoredMatchConfig();
    persistMatchConfig(storedConfig);
    bindSkirmishSetupPanel();
    bindMatchSummaryControls();
    window.game = new GameState(storedConfig);
});
