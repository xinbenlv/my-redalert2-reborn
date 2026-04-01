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

                // Add ore crystals
                if (tile.type === 'ore') {
                    const crystal = this.models.createOreCrystal();
                    crystal.position.set(x * this.tileSize, 0, y * this.tileSize);
                    this.scene.add(crystal);
                    this.oreCrystals.push(crystal);
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

    // ==================== BUILDING MANAGEMENT ====================

    addBuilding(building, factionColor) {
        if (this.buildingMeshes.has(building)) return;

        let mesh;
        if (building.type === 'refinery') {
            mesh = this.models.createRefinery(factionColor);
        } else if (building.type === 'barracks') {
            mesh = this.models.createBarracks(factionColor);
        }

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
        if (unit.type === 'soldier') {
            mesh = this.models.createSoldier(factionColor);
        }
        if (!mesh) return;

        mesh.position.set(
            unit.x * this.tileSize,
            0,
            unit.y * this.tileSize
        );

        this.scene.add(mesh);
        this.unitMeshes.set(unit, mesh);
    }

    updateUnit(unit, dt) {
        let mesh = this.unitMeshes.get(unit);
        if (!mesh) return;

        // Position
        mesh.position.set(
            unit.x * this.tileSize,
            0,
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
        } else if (unit.state === 'moving') {
            unit._walkPhase = (unit._walkPhase || 0) + dt * 0.008;
            this.models.animateSoldierWalk(mesh, unit._walkPhase);
            this.models.flashMuzzle(mesh, false);
        } else if (unit.state === 'attacking') {
            this.models.animateSoldierAttack(mesh);
            // Flash muzzle briefly when firing
            const flashing = unit.fireTimer > unit.fireRate - 100;
            this.models.flashMuzzle(mesh, flashing);
        } else {
            this.models.animateSoldierIdle(mesh);
            this.models.flashMuzzle(mesh, false);
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
                const ring = this.models.createSelectionRing(0.8, playerColor);
                ring.position.copy(pos);
                this.scene.add(ring);
                this.selectionRings.push(ring);
            } else {
                pos = new THREE.Vector3(entity.x * this.tileSize, 0, entity.y * this.tileSize);
                const ring = this.models.createSelectionRing(0.2, playerColor);
                ring.position.copy(pos);
                this.scene.add(ring);
                this.selectionRings.push(ring);
            }
        }
    }

    // ==================== BUILDING PLACEMENT PREVIEW ====================

    showPlacementPreview(type, tx, ty, factionColor) {
        if (!this._placementPreview) {
            if (type === 'refinery') {
                this._placementPreview = this.models.createRefinery(factionColor);
            } else {
                this._placementPreview = this.models.createBarracks(factionColor);
            }
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
        // Remove old bars
        if (this._healthBars) {
            for (const bar of this._healthBars) {
                this.scene.remove(bar);
            }
        }
        this._healthBars = [];

        for (const p of players) {
            for (const b of p.buildings) {
                if (b.hp < b.maxHp) {
                    const bar = this.models.createHealthBar();
                    const cx = b.tx + b.size / 2 - 0.5;
                    const cy = b.ty + b.size / 2 - 0.5;
                    bar.position.set(cx * this.tileSize, 1.8, cy * this.tileSize);
                    bar.lookAt(this.camera.position);

                    const ratio = b.hp / b.maxHp;
                    bar.userData.fill.scale.x = ratio;
                    bar.userData.fill.position.x = -(1 - ratio) * 0.2;
                    bar.userData.fill.material.color.setHex(ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000);

                    this.scene.add(bar);
                    this._healthBars.push(bar);
                }

                // Training bar
                if (b.training) {
                    const bar = this.models.createHealthBar();
                    const cx = b.tx + b.size / 2 - 0.5;
                    const cy = b.ty + b.size / 2 - 0.5;
                    bar.position.set(cx * this.tileSize, 1.6, cy * this.tileSize);
                    bar.lookAt(this.camera.position);
                    bar.userData.fill.scale.x = b.trainProgress;
                    bar.userData.fill.position.x = -(1 - b.trainProgress) * 0.2;
                    bar.userData.fill.material.color.setHex(0x00aaff);
                    this.scene.add(bar);
                    this._healthBars.push(bar);
                }
            }

            for (const u of p.units) {
                if (u.state !== 'dead' && u.hp < u.maxHp) {
                    const bar = this.models.createHealthBar();
                    bar.position.set(u.x * this.tileSize, 0.55, u.y * this.tileSize);
                    bar.lookAt(this.camera.position);
                    bar.scale.setScalar(0.5);

                    const ratio = u.hp / u.maxHp;
                    bar.userData.fill.scale.x = ratio;
                    bar.userData.fill.position.x = -(1 - ratio) * 0.2;
                    bar.userData.fill.material.color.setHex(ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000);

                    this.scene.add(bar);
                    this._healthBars.push(bar);
                }
            }
        }
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
        if (type === 'refinery') {
            model = this.models.createRefinery(factionColor);
        } else if (type === 'barracks') {
            model = this.models.createBarracks(factionColor);
        } else if (type === 'soldier') {
            model = this.models.createSoldier(factionColor);
            model.scale.setScalar(4); // scale up soldier to fill icon
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
        const ndc = new THREE.Vector2(
            (px / window.innerWidth) * 2 - 1,
            -(py / window.innerHeight) * 2 + 1
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
        return {
            x: (worldPos.x + 1) / 2 * window.innerWidth,
            y: (-worldPos.y + 1) / 2 * window.innerHeight
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
