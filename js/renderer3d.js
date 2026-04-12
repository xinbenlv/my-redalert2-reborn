// =====================================================
// RED ALERT 2: REBORN — Three.js 3D Renderer
// Isometric camera, terrain, fog of war, lighting
// =====================================================

class Renderer3D {
    constructor(containerWidth, containerHeight) {
        this.models = new ModelFactory();

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.domElement = this.renderer.domElement;
        this.domElement.id = 'gameCanvas';

        // Isometric orthographic camera
        this.frustumSize = 18;
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.OrthographicCamera(
            -this.frustumSize * aspect / 2,
            this.frustumSize * aspect / 2,
            this.frustumSize / 2,
            -this.frustumSize / 2,
            0.1, 200
        );

        // Classic isometric rotation
        this.camera.rotation.order = 'YXZ';
        this.camera.rotateY(Math.PI / 4);
        this.camera.rotateX(Math.atan(-1 / Math.sqrt(2)));

        // Camera target (world position we look at)
        this.camTarget = new THREE.Vector3(10, 0, 10);
        this._updateCameraPosition();

        // Lights
        this._setupLights();

        // Terrain
        this.tileSize = 1.0; // 1 unit = 1 tile
        this.tileMeshes = [];
        this.oreCrystals = [];
        this.waterTiles = [];

        // 3D object pools
        this.buildingMeshes = new Map(); // building ref -> THREE.Group
        this.unitMeshes = new Map();     // unit ref -> THREE.Group
        this.projectileMeshes = new Map();
        this.effectMeshes = [];
        this.selectionRings = [];

        // Fog overlay
        this.fogMeshes = [];

        // Time tracking for animations
        this.time = 0;

        // Icon renderer for build menu
        this._iconRenderer = null;
        this._iconScene = null;
        this._iconCamera = null;
        this._iconCache = {};
    }

    _setupLights() {
        // Sun (directional)
        const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
        sun.position.set(20, 30, 10);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 80;
        sun.shadow.camera.left = -30;
        sun.shadow.camera.right = 30;
        sun.shadow.camera.top = 30;
        sun.shadow.camera.bottom = -30;
        sun.shadow.bias = -0.001;
        this.scene.add(sun);
        this.sunLight = sun;

        // Ambient fill
        const ambient = new THREE.AmbientLight(0x334466, 0.6);
        this.scene.add(ambient);

        // Hemisphere for sky-ground color variation
        const hemi = new THREE.HemisphereLight(0x88aacc, 0x443322, 0.3);
        this.scene.add(hemi);
    }

    // ==================== TERRAIN ====================

    buildTerrain(map, mapSize) {
        this.mapSize = mapSize;

        // Create individual tile meshes
        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                const tile = map[y][x];
                const mesh = this._createTileMesh(tile, x, y);
                mesh.position.set(x * this.tileSize, 0, y * this.tileSize);
                mesh.receiveShadow = true;
                this.scene.add(mesh);
                this.tileMeshes.push({ mesh, x, y, tile });

                // Add ore/gem crystals
                if (tile.type === 'ore' || tile.type === 'gems') {
                    const crystal = this.models.createOreCrystal(tile.type);
                    crystal.position.set(x * this.tileSize, 0, y * this.tileSize);
                    this.scene.add(crystal);
                    this.oreCrystals.push({ mesh: crystal, x, y, tile });
                } else {
                    this.oreCrystals.push(null);
                }
            }
        }

        // Build fog overlay meshes
        this._buildFogOverlay(mapSize);
    }

    _createTileMesh(tile, x, y) {
        const geo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
        geo.rotateX(-Math.PI / 2);

        let color;
        const variant = tile.variant || 0;
        const rng = ((x * 7 + y * 13) % 100) / 100;

        if (tile.type === 'grass') {
            const g = 0.35 + rng * 0.15;
            color = new THREE.Color(0.18 + rng * 0.05, g, 0.12 + rng * 0.04);
        } else if (tile.type === 'water') {
            color = new THREE.Color(0.05, 0.18 + rng * 0.08, 0.35 + rng * 0.1);
            this.waterTiles.push({ geo, x, y });
        } else if (tile.type === 'ore') {
            color = new THREE.Color(0.35 + rng * 0.1, 0.28 + rng * 0.08, 0.12);
        } else if (tile.type === 'gems') {
            color = new THREE.Color(0.08 + rng * 0.04, 0.26 + rng * 0.08, 0.26 + rng * 0.12);
        }

        const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: tile.type === 'water' ? 0.1 : 0.85,
            metalness: tile.type === 'water' ? 0.3 : 0.05,
            flatShading: true
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData.tileType = tile.type;
        return mesh;
    }

    _buildFogOverlay(mapSize) {
        for (let y = 0; y < mapSize; y++) {
            this.fogMeshes[y] = [];
            for (let x = 0; x < mapSize; x++) {
                const geo = new THREE.PlaneGeometry(this.tileSize * 1.01, this.tileSize * 1.01);
                geo.rotateX(-Math.PI / 2);
                const mat = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.85,
                    depthWrite: false
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(x * this.tileSize, 0.05, y * this.tileSize);
                mesh.renderOrder = 1;
                this.scene.add(mesh);
                this.fogMeshes[y][x] = mesh;
            }
        }
    }

    // ==================== FOG OF WAR ====================

    updateFog(fog, mapSize) {
        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                const level = fog[y][x];
                const mesh = this.fogMeshes[y]?.[x];
                if (!mesh) continue;

                if (level === 0) {
                    mesh.material.opacity = 0.85;
                    mesh.visible = true;
                } else if (level === 1) {
                    mesh.material.opacity = 0.4;
                    mesh.visible = true;
                } else {
                    mesh.visible = false;
                }
            }
        }
    }

    // ==================== WATER ANIMATION ====================

    animateWater(time) {
        for (const wt of this.waterTiles) {
            const idx = wt.y * this.mapSize + wt.x;
            const tileMesh = this.tileMeshes[idx];
            if (!tileMesh) continue;
            const positions = tileMesh.mesh.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                const px = positions[i * 3];
                const pz = positions[i * 3 + 2];
                positions[i * 3 + 1] = Math.sin(time * 2 + px * 3 + pz * 3 + wt.x + wt.y) * 0.02;
            }
            tileMesh.mesh.geometry.attributes.position.needsUpdate = true;
        }
    }

    syncResourceTiles(map) {
        for (let i = 0; i < this.tileMeshes.length; i++) {
            const tileEntry = this.tileMeshes[i];
            const crystalEntry = this.oreCrystals[i];
            if (!tileEntry) continue;
            const tile = map[tileEntry.y]?.[tileEntry.x];
            if (!tile) continue;
            if (tileEntry.mesh.userData.tileType !== tile.type) {
                const nextMesh = this._createTileMesh(tile, tileEntry.x, tileEntry.y);
                nextMesh.position.copy(tileEntry.mesh.position);
                nextMesh.receiveShadow = true;
                this.scene.remove(tileEntry.mesh);
                this.scene.add(nextMesh);
                tileEntry.mesh = nextMesh;
            }
            if (crystalEntry?.mesh) {
                crystalEntry.mesh.visible = tile.type === 'ore' || tile.type === 'gems';
                if (crystalEntry.mesh.visible && crystalEntry.mesh.userData.resourceType !== tile.type) {
                    this.scene.remove(crystalEntry.mesh);
                    const replacement = this.models.createOreCrystal(tile.type);
                    replacement.position.copy(crystalEntry.mesh.position);
                    this.scene.add(replacement);
                    crystalEntry.mesh = replacement;
                }
            }
        }
    }

    // ==================== BUILDING MANAGEMENT ====================

    addBuilding(building, factionColor) {
        if (this.buildingMeshes.has(building)) return;

        let mesh;
        if (building.type === 'constructionYard') mesh = this.models.createConstructionYard(factionColor);
        else if (building.type === 'refinery') mesh = this.models.createRefinery(factionColor);
        else if (building.type === 'barracks') mesh = this.models.createBarracks(factionColor);
        else if (building.type === 'powerPlant') mesh = this.models.createPowerPlant(factionColor);
        else if (building.type === 'advancedPowerPlant') mesh = this.models.createAdvancedPowerPlant(factionColor);
        else if (building.type === 'radarDome') mesh = this.models.createRadarDome(factionColor);
        else if (building.type === 'warFactory') mesh = this.models.createWarFactory(factionColor);
        else if (building.type === 'battleLab') mesh = this.models.createBattleLab(factionColor);
        else if (building.type === 'airfield') mesh = this.models.createAirfield(factionColor);
        else if (building.type === 'serviceDepot') mesh = this.models.createServiceDepot(factionColor);
        else if (building.type === 'pillbox') mesh = this.models.createPillbox(factionColor);
        else if (building.type === 'sentryGun') mesh = this.models.createSentryGun(factionColor);
        else if (building.type === 'patriotBattery') mesh = this.models.createPatriotBattery(factionColor);
        else if (building.type === 'battleBunker') mesh = this.models.createBattleBunker(factionColor);
        else if (building.type === 'civilianBlock') mesh = this.models.createCivilianBlock(factionColor);
        else if (building.type === 'civilianTower') mesh = this.models.createCivilianTower(factionColor);
        else if (building.type === 'sandbagWall') mesh = this.models.createSandbagWall(factionColor);

        if (!mesh) return;

        // Position at center of building footprint
        const cx = building.tx + building.size / 2 - 0.5;
        const cy = building.ty + building.size / 2 - 0.5;
        mesh.position.set(cx * this.tileSize, 0, cy * this.tileSize);
        mesh.castShadow = true;

        this.scene.add(mesh);
        this.buildingMeshes.set(building, mesh);
    }

    updateBuilding(building) {
        const mesh = this.buildingMeshes.get(building);
        if (!mesh) return;

        // Build progress: scale Y up during construction
        if (!building.built) {
            const s = 0.3 + building.buildProgress * 0.7;
            mesh.scale.set(1, s, 1);
            mesh.position.y = 0;
        } else {
            mesh.scale.set(1, 1, 1);
        }
    }

    removeBuilding(building) {
        const mesh = this.buildingMeshes.get(building);
        if (mesh) {
            this.scene.remove(mesh);
            this.buildingMeshes.delete(building);
        }
    }

    // ==================== UNIT MANAGEMENT ====================

    addUnit(unit, factionColor) {
        if (this.unitMeshes.has(unit)) return;

        let mesh;
        if (unit.type === 'soldier' || unit.type === 'attackDog' || unit.type === 'rocketInfantry' || unit.type === 'flakTrooper' || unit.type === 'engineer' || unit.type === 'gi' || unit.type === 'teslaTrooper') mesh = this.models.createSoldier(factionColor);
        else if (unit.type === 'harvester') mesh = this.models.createHarvester(factionColor);
        else if (unit.type === 'mcv') mesh = this.models.createMCV(factionColor);
        else if (unit.type === 'tank') mesh = this.models.createTank(factionColor);
        else if (unit.type === 'apc') mesh = this.models.createAPC(factionColor);
        else if (unit.type === 'ifv') mesh = this.models.createIFV(factionColor);
        else if (unit.type === 'flakTrack') mesh = this.models.createFlakTrack(factionColor);
        else if (unit.type === 'artillery') mesh = this.models.createArtillery(factionColor);
        else if (unit.type === 'apocalypseTank') mesh = this.models.createApocalypseTank(factionColor);
        else if (unit.type === 'prismTank') mesh = this.models.createPrismTank(factionColor);
        else if (unit.type === 'harrier') mesh = this.models.createHarrier(factionColor);
        else if (unit.type === 'transportHeli') mesh = this.models.createTransportHeli(factionColor);
        else if (unit.type === 'kirov') mesh = this.models.createKirov(factionColor);
        if (!mesh) return;

        mesh.position.set(
            unit.x * this.tileSize,
            unit.altitude || 0,
            unit.y * this.tileSize
        );

        this.scene.add(mesh);
        if (unit.state === 'loaded') mesh.visible = false;
        this.unitMeshes.set(unit, mesh);
    }

    updateUnit(unit, dt) {
        let mesh = this.unitMeshes.get(unit);
        if (!mesh) return;

        if (unit.state === 'loaded') {
            mesh.visible = false;
            return;
        }
        mesh.visible = true;

        // Position
        mesh.position.set(
            unit.x * this.tileSize,
            unit.altitude || 0,
            unit.y * this.tileSize
        );

        // Direction (8 directions mapped to Y rotation)
        const dirAngles = [
            Math.PI,        // 0: N (away from camera)
            Math.PI * 0.75, // 1: NE
            Math.PI * 0.5,  // 2: E
            Math.PI * 0.25, // 3: SE
            0,              // 4: S (toward camera)
            -Math.PI * 0.25,// 5: SW
            -Math.PI * 0.5, // 6: W
            -Math.PI * 0.75 // 7: NW
        ];
        mesh.rotation.y = dirAngles[unit.dir] || 0;

        // Animation
        if (unit.state === 'dead') {
            mesh.rotation.x = Math.PI / 2 * Math.min(1, unit.deadTimer / 500);
            mesh.position.y = -0.05;
            const alpha = Math.max(0, 1 - unit.deadTimer / 2500);
            mesh.traverse(child => {
                if (child.material) {
                    child.material.transparent = true;
                    child.material.opacity = alpha;
                }
            });
            this.models.flashMuzzle(mesh, false);
        } else if (unit.type === 'soldier' || unit.type === 'attackDog' || unit.type === 'rocketInfantry' || unit.type === 'flakTrooper' || unit.type === 'engineer' || unit.type === 'gi' || unit.type === 'teslaTrooper') {
            mesh.rotation.x = 0;
            mesh.scale.y = unit.isDeployed ? 0.58 : 1;
            mesh.scale.x = mesh.scale.z = unit.isDeployed ? 1.08 : 1;
            if (unit.state === 'moving' || unit.state === 'capturing') {
                unit._walkPhase = (unit._walkPhase || 0) + dt * 0.008;
                this.models.animateSoldierWalk(mesh, unit._walkPhase);
                this.models.flashMuzzle(mesh, false);
            } else if (unit.state === 'attacking' || unit.state === 'engaging') {
                this.models.animateSoldierAttack(mesh);
                const flashing = unit.fireRate > 0 && unit.fireTimer > unit.fireRate - 100;
                this.models.flashMuzzle(mesh, flashing);
            } else {
                this.models.animateSoldierIdle(mesh);
                this.models.flashMuzzle(mesh, false);
            }
        } else if (unit.type === 'tank' || unit.type === 'apc' || unit.type === 'ifv' || unit.type === 'flakTrack' || unit.type === 'artillery' || unit.type === 'apocalypseTank' || unit.type === 'prismTank') {
            mesh.rotation.x = 0;
            const flashing = unit.fireRate > 0 && unit.fireTimer > unit.fireRate - 120;
            this.models.flashMuzzle(mesh, flashing);
            if (mesh.userData.turret) {
                const wobble = unit.type === 'artillery' ? 0.025 : (unit.type === 'apocalypseTank' ? 0.03 : (unit.type === 'prismTank' ? 0.022 : (unit.type === 'flakTrack' ? 0.035 : (unit.type === 'ifv' ? 0.032 : (unit.type === 'apc' ? 0.028 : 0.02)))));
                mesh.userData.turret.rotation.y = Math.sin(this.time * 0.8 + unit.x) * wobble;
            }
        } else if (unit.type === 'harrier' || unit.type === 'transportHeli' || unit.type === 'kirov') {
            const isKirov = unit.type === 'kirov';
            const isTransportHeli = unit.type === 'transportHeli';
            mesh.rotation.x = Math.sin(this.time * (isKirov ? 2.2 : (isTransportHeli ? 3.4 : 5)) + unit.x * 0.7) * (isKirov ? 0.035 : (isTransportHeli ? 0.045 : 0.08));
            mesh.position.y = (unit.altitude || (isKirov ? 1.45 : (isTransportHeli ? 1.25 : 1.1))) + Math.sin(this.time * (isKirov ? 2.6 : (isTransportHeli ? 3.1 : 4)) + unit.y) * (isKirov ? 0.03 : (isTransportHeli ? 0.045 : 0.06));
            if (isTransportHeli) {
                if (mesh.userData.rotor) mesh.userData.rotor.rotation.y += dt * 0.028;
                if (mesh.userData.tailRotor) mesh.userData.tailRotor.rotation.x += dt * 0.05;
            }
            const flashing = unit.fireRate > 0 && unit.fireTimer > unit.fireRate - (isKirov ? 220 : 160);
            this.models.flashMuzzle(mesh, flashing);
        } else if (unit.type === 'harvester') {
            mesh.rotation.x = 0;
            this.models.flashMuzzle(mesh, false);
            if (mesh.userData.cargoPod && unit.cargoCapacity) {
                const fill = Math.max(0.35, 0.35 + (unit.cargo || 0) / unit.cargoCapacity * 0.65);
                mesh.userData.cargoPod.scale.y = fill;
                mesh.userData.cargoPod.position.y = 0.21 + fill * 0.13;
            }
        } else if (unit.type === 'mcv') {
            mesh.rotation.x = 0;
            this.models.flashMuzzle(mesh, false);
            if (mesh.userData.dish) {
                mesh.userData.dish.rotation.y += dt * 0.0012;
            }
        }
    }

    setUnitVisible(unit, visible) {
        const mesh = this.unitMeshes.get(unit);
        if (mesh) mesh.visible = visible;
    }

    setBuildingVisible(building, visible) {
        const mesh = this.buildingMeshes.get(building);
        if (mesh) mesh.visible = visible;
    }

    removeUnit(unit) {
        const mesh = this.unitMeshes.get(unit);
        if (mesh) {
            this.scene.remove(mesh);
            this.unitMeshes.delete(unit);
        }
    }

    // ==================== PROJECTILES ====================

    addProjectile(proj) {
        if (this.projectileMeshes.has(proj)) return;
        const mesh = this.models.createBulletTracer();
        mesh.position.set(proj.x * this.tileSize, 0.25, proj.y * this.tileSize);
        this.scene.add(mesh);
        this.projectileMeshes.set(proj, mesh);
    }

    updateProjectile(proj) {
        const mesh = this.projectileMeshes.get(proj);
        if (!mesh) {
            this.addProjectile(proj);
            return;
        }
        mesh.position.set(proj.x * this.tileSize, 0.25, proj.y * this.tileSize);
    }

    removeProjectile(proj) {
        const mesh = this.projectileMeshes.get(proj);
        if (mesh) {
            this.scene.remove(mesh);
            this.projectileMeshes.delete(proj);
        }
    }

    // ==================== EFFECTS ====================

    addEffect(effect) {
        const mesh = this.models.createExplosion();
        const scale = effect.big ? 2 : 1;
        mesh.scale.setScalar(scale);
        mesh.position.set(effect.x * this.tileSize, 0.3, effect.y * this.tileSize);
        this.scene.add(mesh);
        this.effectMeshes.push({ mesh, effect });
    }

    updateEffects() {
        for (let i = this.effectMeshes.length - 1; i >= 0; i--) {
            const em = this.effectMeshes[i];
            const progress = em.effect.frame / 6;

            if (em.mesh.userData.core) {
                em.mesh.userData.core.material.opacity = Math.max(0, 0.9 - progress);
                em.mesh.userData.core.scale.setScalar(1 + progress * 2);
            }
            if (em.mesh.userData.glow) {
                em.mesh.userData.glow.material.opacity = Math.max(0, 0.4 - progress * 0.5);
                em.mesh.userData.glow.scale.setScalar(1 + progress * 3);
            }
            if (em.mesh.userData.light) {
                em.mesh.userData.light.intensity = Math.max(0, 2 - progress * 3);
            }

            if (em.effect.frame >= 6) {
                this.scene.remove(em.mesh);
                this.effectMeshes.splice(i, 1);
            }
        }
    }

    // ==================== SELECTION ====================

    updateSelection(selected, playerColor) {
        // Remove old rings
        for (const ring of this.selectionRings) {
            this.scene.remove(ring);
        }
        this.selectionRings = [];

        for (const entity of selected) {
            const isBuilding = entity.tx !== undefined;
            let pos;
            if (isBuilding) {
                const cx = entity.tx + entity.size / 2 - 0.5;
                const cy = entity.ty + entity.size / 2 - 0.5;
                pos = new THREE.Vector3(cx * this.tileSize, 0, cy * this.tileSize);
                const ring = this.models.createSelectionRing(1.2, playerColor);
                ring.position.copy(pos);
                this.scene.add(ring);
                this.selectionRings.push(ring);
            } else {
                pos = new THREE.Vector3(entity.x * this.tileSize, 0, entity.y * this.tileSize);
                const ring = this.models.createSelectionRing(0.35, playerColor);
                ring.position.copy(pos);
                this.scene.add(ring);
                this.selectionRings.push(ring);
            }
        }

        // Animate selection ring pulsing
        const pulse = 0.7 + Math.sin(this.time * 5) * 0.3;
        for (const ring of this.selectionRings) {
            if (ring.userData.ringMat) ring.userData.ringMat.opacity = pulse;
        }
    }

    // ==================== BUILDING PLACEMENT PREVIEW ====================

    showPlacementPreview(type, tx, ty, factionColor) {
        if (!this._placementPreview) {
            if (type === 'refinery') this._placementPreview = this.models.createRefinery(factionColor);
            else if (type === 'barracks') this._placementPreview = this.models.createBarracks(factionColor);
            else if (type === 'powerPlant') this._placementPreview = this.models.createPowerPlant(factionColor);
            else if (type === 'advancedPowerPlant') this._placementPreview = this.models.createAdvancedPowerPlant(factionColor);
            else if (type === 'radarDome') this._placementPreview = this.models.createRadarDome(factionColor);
            else if (type === 'warFactory') this._placementPreview = this.models.createWarFactory(factionColor);
            else if (type === 'battleLab') this._placementPreview = this.models.createBattleLab(factionColor);
            else if (type === 'serviceDepot') this._placementPreview = this.models.createServiceDepot(factionColor);
            else if (type === 'pillbox') this._placementPreview = this.models.createPillbox(factionColor);
            else if (type === 'sentryGun') this._placementPreview = this.models.createSentryGun(factionColor);
            else if (type === 'patriotBattery') this._placementPreview = this.models.createPatriotBattery(factionColor);
            else if (type === 'sandbagWall') this._placementPreview = this.models.createSandbagWall(factionColor);
            this._placementPreview.traverse(child => {
                if (child.material) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                }
            });
            this._placementPreviewType = type;
            this.scene.add(this._placementPreview);
        }

        // Recreate if type changed
        if (this._placementPreviewType !== type) {
            this.hidePlacementPreview();
            this.showPlacementPreview(type, tx, ty, factionColor);
            return;
        }

        const size = BUILD_TYPES[type].size;
        const cx = tx + size / 2 - 0.5;
        const cy = ty + size / 2 - 0.5;
        this._placementPreview.position.set(cx * this.tileSize, 0, cy * this.tileSize);
    }

    hidePlacementPreview() {
        if (this._placementPreview) {
            this.scene.remove(this._placementPreview);
            this._placementPreview = null;
            this._placementPreviewType = null;
        }
    }

    // ==================== HEALTH BARS ====================

    updateHealthBars(players) {
        // No-op: health bars are now drawn as 2D overlay
    }

    // Draw health bars as 2D overlay on a canvas context
    drawHealthBars2D(ctx, players, selectedSet) {
        for (const p of players) {
            for (const b of p.buildings) {
                // Show health bar if damaged or selected
                if (b.hp < b.maxHp || selectedSet.has(b)) {
                    const cx = b.tx + b.size / 2 - 0.5;
                    const cy = b.ty + b.size / 2 - 0.5;
                    const screen = this.tileToScreen(cx, cy);
                    const ratio = b.hp / b.maxHp;
                    this._drawBar2D(ctx, screen.x, screen.y - 30, 40, 6, ratio);
                }

                // Training bar
                if (b.training) {
                    const cx = b.tx + b.size / 2 - 0.5;
                    const cy = b.ty + b.size / 2 - 0.5;
                    const screen = this.tileToScreen(cx, cy);
                    this._drawBar2D(ctx, screen.x, screen.y - 20, 40, 4, b.trainProgress, '#00aaff');
                }
            }

            for (const u of p.units) {
                if (u.state === 'dead' || u.state === 'loaded') continue;
                const screen = this.tileToScreen(u.x, u.y);
                if (u.hp < u.maxHp || selectedSet.has(u)) {
                    const ratio = u.hp / u.maxHp;
                    this._drawBar2D(ctx, screen.x, screen.y - 18, 24, 5, ratio);
                }
                if (u.veterancyRank === 'veteran' || u.veterancyRank === 'elite') {
                    this._drawVeterancyBadge2D(ctx, screen.x, screen.y - 27, u.veterancyRank);
                }
            }
        }
    }

    _drawBar2D(ctx, cx, cy, width, height, ratio, overrideColor) {
        const x = cx - width / 2;
        const y = cy - height / 2;

        // Dark background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x - 1, y - 1, width + 2, height + 2);

        // White border
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);

        // Fill color
        let color = overrideColor;
        if (!color) {
            if (ratio > 0.6) color = '#00ff44';
            else if (ratio > 0.3) color = '#ffdd00';
            else color = '#ff2200';
        }
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width * ratio, height);
    }

    _drawVeterancyBadge2D(ctx, cx, cy, rank) {
        const glyph = rank === 'elite' ? '★★' : '★';
        ctx.save();
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rank === 'elite' ? '#8bdcff' : '#ffd36b';
        ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.lineWidth = 3;
        ctx.strokeText(glyph, cx, cy);
        ctx.fillText(glyph, cx, cy);
        ctx.restore();
    }

    // ==================== BUILD MENU ICON RENDERER ====================

    renderBuildIcon(type, factionColor, size) {
        size = size || 64;
        const cacheKey = type + '_' + (factionColor || 'default') + '_' + size;
        if (this._iconCache[cacheKey]) return this._iconCache[cacheKey];

        // Create offscreen renderer if needed
        if (!this._iconRenderer) {
            this._iconRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this._iconRenderer.setSize(size, size);
            this._iconRenderer.setPixelRatio(1);

            this._iconScene = new THREE.Scene();

            // Lights for icon scene
            const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
            sun.position.set(3, 5, 2);
            this._iconScene.add(sun);
            const ambient = new THREE.AmbientLight(0x445566, 0.8);
            this._iconScene.add(ambient);
            const hemi = new THREE.HemisphereLight(0x88aacc, 0x443322, 0.3);
            this._iconScene.add(hemi);

            // Isometric ortho camera for icons
            const s = 1.8;
            this._iconCamera = new THREE.OrthographicCamera(-s, s, s, -s, 0.1, 50);
            this._iconCamera.rotation.order = 'YXZ';
            this._iconCamera.rotateY(Math.PI / 4);
            this._iconCamera.rotateX(Math.atan(-1 / Math.sqrt(2)));
            this._iconCamera.position.set(5, 5, 5);
        }

        this._iconRenderer.setSize(size, size);

        // Clear old children from icon scene (keep lights)
        const toRemove = [];
        this._iconScene.children.forEach(c => {
            if (!c.isLight) toRemove.push(c);
        });
        toRemove.forEach(c => this._iconScene.remove(c));

        // Create model
        let model;
        if (type === 'constructionYard') model = this.models.createConstructionYard(factionColor);
        else if (type === 'refinery') model = this.models.createRefinery(factionColor);
        else if (type === 'barracks') model = this.models.createBarracks(factionColor);
        else if (type === 'powerPlant') model = this.models.createPowerPlant(factionColor);
        else if (type === 'advancedPowerPlant') model = this.models.createAdvancedPowerPlant(factionColor);
        else if (type === 'radarDome') model = this.models.createRadarDome(factionColor);
        else if (type === 'warFactory') model = this.models.createWarFactory(factionColor);
        else if (type === 'battleLab') model = this.models.createBattleLab(factionColor);
        else if (type === 'airfield') model = this.models.createAirfield(factionColor);
        else if (type === 'serviceDepot') model = this.models.createServiceDepot(factionColor);
        else if (type === 'pillbox') model = this.models.createPillbox(factionColor);
        else if (type === 'sentryGun') model = this.models.createSentryGun(factionColor);
        else if (type === 'patriotBattery') model = this.models.createPatriotBattery(factionColor);
        else if (type === 'battleBunker') model = this.models.createBattleBunker(factionColor);
        else if (type === 'civilianBlock') model = this.models.createCivilianBlock(factionColor);
        else if (type === 'civilianTower') model = this.models.createCivilianTower(factionColor);
        else if (type === 'sandbagWall') model = this.models.createSandbagWall(factionColor);
        else if (type === 'soldier' || type === 'attackDog' || type === 'rocketInfantry' || type === 'flakTrooper' || type === 'engineer' || type === 'gi' || type === 'teslaTrooper') {
            model = this.models.createSoldier(factionColor);
            model.scale.setScalar(4);
        } else if (type === 'harvester') {
            model = this.models.createHarvester(factionColor);
            model.scale.setScalar(2.5);
        } else if (type === 'mcv') {
            model = this.models.createMCV(factionColor);
            model.scale.setScalar(2.3);
        } else if (type === 'tank') {
            model = this.models.createTank(factionColor);
            model.scale.setScalar(2.3);
        } else if (type === 'apc') {
            model = this.models.createAPC(factionColor);
            model.scale.setScalar(2.25);
        } else if (type === 'ifv') {
            model = this.models.createIFV(factionColor);
            model.scale.setScalar(2.25);
        } else if (type === 'flakTrack') {
            model = this.models.createFlakTrack(factionColor);
            model.scale.setScalar(2.25);
        } else if (type === 'artillery') {
            model = this.models.createArtillery(factionColor);
            model.scale.setScalar(2.2);
        } else if (type === 'apocalypseTank') {
            model = this.models.createApocalypseTank(factionColor);
            model.scale.setScalar(2.15);
        } else if (type === 'prismTank') {
            model = this.models.createPrismTank(factionColor);
            model.scale.setScalar(2.1);
        } else if (type === 'harrier') {
            model = this.models.createHarrier(factionColor);
            model.scale.setScalar(2.25);
            model.rotation.x = -0.28;
        } else if (type === 'kirov') {
            model = this.models.createKirov(factionColor);
            model.scale.setScalar(1.65);
            model.rotation.x = -0.12;
        }

        if (model) {
            this._iconScene.add(model);
        }

        this._iconRenderer.render(this._iconScene, this._iconCamera);

        // Copy to a canvas we can use as an image
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this._iconRenderer.domElement, 0, 0);

        this._iconCache[cacheKey] = canvas;
        return canvas;
    }

    // ==================== CAMERA ====================

    setCameraTarget(tx, ty) {
        this.camTarget.set(tx * this.tileSize, 0, ty * this.tileSize);
        this._updateCameraPosition();
    }

    _updateCameraPosition() {
        const offset = new THREE.Vector3(20, 20, 20);
        this.camera.position.copy(this.camTarget).add(offset);
        this.camera.lookAt(this.camTarget);
        // Re-apply isometric rotation
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.set(0, 0, 0);
        this.camera.rotateY(Math.PI / 4);
        this.camera.rotateX(Math.atan(-1 / Math.sqrt(2)));
        this.camera.position.copy(this.camTarget).add(offset);

        // Update shadow camera to follow
        if (this.sunLight) {
            this.sunLight.position.set(
                this.camTarget.x + 20,
                30,
                this.camTarget.z + 10
            );
            this.sunLight.target.position.copy(this.camTarget);
            this.sunLight.target.updateMatrixWorld();
        }
    }

    zoom(delta) {
        this.frustumSize = Math.max(6, Math.min(40, this.frustumSize + delta));
        this._updateProjection();
    }

    _updateProjection() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera.left = -this.frustumSize * aspect / 2;
        this.camera.right = this.frustumSize * aspect / 2;
        this.camera.top = this.frustumSize / 2;
        this.camera.bottom = -this.frustumSize / 2;
        this.camera.updateProjectionMatrix();
    }

    // ==================== COORDINATE CONVERSION ====================

    // Convert screen pixel to tile coordinate using raycasting
    screenToTile(px, py) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((px - rect.left) / rect.width) * 2 - 1,
            -((py - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, this.camera);

        // Intersect with ground plane (y=0)
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, intersection);

        if (intersection) {
            return {
                x: Math.floor(intersection.x / this.tileSize + 0.5),
                y: Math.floor(intersection.z / this.tileSize + 0.5)
            };
        }
        return { x: 0, y: 0 };
    }

    // Tile to screen position for UI overlay purposes
    tileToScreen(tx, ty) {
        const worldPos = new THREE.Vector3(tx * this.tileSize, 0, ty * this.tileSize);
        worldPos.project(this.camera);
        const rect = this.renderer.domElement.getBoundingClientRect();
        return {
            x: (worldPos.x + 1) / 2 * rect.width + rect.left,
            y: (-worldPos.y + 1) / 2 * rect.height + rect.top
        };
    }

    // ==================== RESIZE ====================

    resize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this._updateProjection();
    }

    // ==================== RENDER ====================

    render(dt) {
        this.time += dt * 0.001;

        // Animate water
        this.animateWater(this.time);

        // Animate building effects
        for (const [building, mesh] of this.buildingMeshes) {
            if (mesh.userData.smokeParticles && building.built) {
                this.models.animateSmoke(mesh.userData.smokeParticles, dt);
            }
            if (mesh.userData.flag) {
                this.models.animateFlag(mesh.userData.flag, this.time);
            }
        }

        // Update effects
        this.updateEffects();

        this.renderer.render(this.scene, this.camera);
    }

    // ==================== CLEANUP ====================

    cleanupDeadUnits(players) {
        for (const p of players) {
            for (const [unit, mesh] of this.unitMeshes) {
                if (unit.state === 'dead' && unit.deadTimer > 2500) {
                    this.scene.remove(mesh);
                    this.unitMeshes.delete(unit);
                }
            }
        }
    }
}
