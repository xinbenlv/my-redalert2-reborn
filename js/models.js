// =====================================================
// RED ALERT 2: REBORN — Procedural 3D Models (Three.js)
// Soviet faction buildings and units
// =====================================================

class ModelFactory {
    constructor() {
        this.cache = {};
    }

    // ==================== MATERIALS ====================

    _mat(color, opts = {}) {
        return new THREE.MeshStandardMaterial({
            color,
            roughness: opts.roughness !== undefined ? opts.roughness : 0.7,
            metalness: opts.metalness !== undefined ? opts.metalness : 0.3,
            emissive: opts.emissive || 0x000000,
            emissiveIntensity: opts.emissiveIntensity || 0,
            flatShading: true,
            ...opts
        });
    }

    _factionColor(color) {
        if (!color) return 0xcc2222;
        if (typeof color === 'string') return parseInt(color.replace('#', ''), 16);
        return color;
    }

    // ==================== SOVIET REFINERY ====================

    createRefinery(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();

        // Concrete base slab
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 0.15, 2.0),
            this._mat(0x888888, { roughness: 0.9, metalness: 0.1 })
        );
        base.position.y = 0.075;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // Floor detail - darker concrete pad
        const pad = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.02, 1.8),
            this._mat(0x666666, { roughness: 0.95 })
        );
        pad.position.y = 0.16;
        pad.receiveShadow = true;
        group.add(pad);

        // Storage tank 1 (left)
        const tankMat = this._mat(0x999999, { roughness: 0.4, metalness: 0.6 });
        const tank1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 1.0, 12),
            tankMat
        );
        tank1.position.set(-0.4, 0.65, -0.2);
        tank1.castShadow = true;
        group.add(tank1);

        // Tank 1 top cap
        const cap1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.35, 0.1, 12),
            this._mat(0x777777, { metalness: 0.5 })
        );
        cap1.position.set(-0.4, 1.2, -0.2);
        group.add(cap1);

        // Storage tank 2 (right)
        const tank2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.85, 12),
            tankMat
        );
        tank2.position.set(0.4, 0.575, 0.2);
        tank2.castShadow = true;
        group.add(tank2);

        // Tank 2 top cap
        const cap2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.3, 0.08, 12),
            this._mat(0x777777, { metalness: 0.5 })
        );
        cap2.position.set(0.4, 1.05, 0.2);
        group.add(cap2);

        // Faction-colored stripes on tanks
        const stripeMat = this._mat(fc, { roughness: 0.5, metalness: 0.4 });
        const stripe1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.355, 0.355, 0.08, 12),
            stripeMat
        );
        stripe1.position.set(-0.4, 0.85, -0.2);
        group.add(stripe1);

        const stripe2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.305, 0.305, 0.08, 12),
            stripeMat
        );
        stripe2.position.set(0.4, 0.75, 0.2);
        group.add(stripe2);

        // Faction accent band on base
        const baseBand = new THREE.Mesh(
            new THREE.BoxGeometry(2.02, 0.06, 0.06),
            this._mat(fc, { roughness: 0.5 })
        );
        baseBand.position.set(0, 0.17, 1.0);
        group.add(baseBand);

        // Pipe network connecting tanks
        const pipeMat = this._mat(0x555555, { roughness: 0.3, metalness: 0.7 });

        // Horizontal pipe between tanks
        const pipe1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6),
            pipeMat
        );
        pipe1.rotation.z = Math.PI / 2;
        pipe1.rotation.y = Math.PI / 4;
        pipe1.position.set(0, 0.5, 0);
        pipe1.castShadow = true;
        group.add(pipe1);

        // Vertical pipe on tank 1
        const pipe2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.6, 6),
            pipeMat
        );
        pipe2.position.set(-0.4, 0.45, 0.15);
        group.add(pipe2);

        // Conveyor belt arm (angled box from ground to tank)
        const conveyorMat = this._mat(0x444444, { metalness: 0.5 });
        const conveyor = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.8, 0.15),
            conveyorMat
        );
        conveyor.position.set(0.7, 0.45, -0.5);
        conveyor.rotation.z = -0.4;
        conveyor.castShadow = true;
        group.add(conveyor);

        // Conveyor belt surface
        const beltMat = this._mat(0x333333, { roughness: 0.9 });
        const belt = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.82, 0.12),
            beltMat
        );
        belt.position.set(0.7, 0.45, -0.5);
        belt.rotation.z = -0.4;
        group.add(belt);

        // Chimney stack
        const chimney = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8),
            this._mat(0x666666, { metalness: 0.4 })
        );
        chimney.position.set(-0.6, 1.5, -0.6);
        chimney.castShadow = true;
        group.add(chimney);

        // Chimney rim
        const chimneyRim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.09, 0.06, 8),
            this._mat(0x555555, { metalness: 0.5 })
        );
        chimneyRim.position.set(-0.6, 1.88, -0.6);
        group.add(chimneyRim);

        // Smoke particles (will be animated)
        group.userData.smokeOrigin = new THREE.Vector3(-0.6, 1.9, -0.6);
        group.userData.smokeParticles = this._createSmokeParticles();
        group.userData.smokeParticles.position.copy(group.userData.smokeOrigin);
        group.add(group.userData.smokeParticles);

        // Small control box
        const controlBox = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 0.3, 0.2),
            this._mat(0x444444)
        );
        controlBox.position.set(0.6, 0.3, 0.6);
        controlBox.castShadow = true;
        group.add(controlBox);

        // Control panel screen (emissive)
        const screen = new THREE.Mesh(
            new THREE.PlaneGeometry(0.15, 0.1),
            this._mat(0x00ff44, { emissive: 0x00ff44, emissiveIntensity: 0.5, roughness: 0.2 })
        );
        screen.position.set(0.475, 0.35, 0.6);
        screen.rotation.y = -Math.PI / 2;
        group.add(screen);

        group.userData.modelType = 'refinery';
        group.userData.factionColor = fc;
        return group;
    }

    _createSmokeParticles() {
        const count = 20;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.1;
            positions[i * 3 + 1] = Math.random() * 0.8;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
            sizes[i] = Math.random() * 3 + 1;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: 0x888888,
            size: 0.08,
            transparent: true,
            opacity: 0.3,
            sizeAttenuation: true,
            depthWrite: false
        });

        return new THREE.Points(geometry, material);
    }

    // ==================== SOVIET BARRACKS ====================

    createBarracks(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();

        // Main building body
        const bodyMat = this._mat(0x4a5d3a, { roughness: 0.8, metalness: 0.2 });
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.8, 1.4),
            bodyMat
        );
        body.position.y = 0.4;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Sloped roof
        const roofShape = new THREE.Shape();
        roofShape.moveTo(-0.9, 0);
        roofShape.lineTo(0.9, 0);
        roofShape.lineTo(0.7, 0.4);
        roofShape.lineTo(-0.7, 0.4);
        roofShape.closePath();

        const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
            depth: 1.5,
            bevelEnabled: false
        });
        const roof = new THREE.Mesh(
            roofGeo,
            this._mat(0x3a4d2a, { roughness: 0.85 })
        );
        roof.rotation.y = Math.PI / 2;
        roof.position.set(-0.75, 0.8, -0.8);
        roof.castShadow = true;
        group.add(roof);

        // Faction-colored roof accent stripe
        const roofStripe = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.03, 0.15),
            this._mat(fc, { roughness: 0.5, metalness: 0.4 })
        );
        roofStripe.position.set(0, 1.18, 0);
        group.add(roofStripe);

        // Guard tower on corner
        const tower = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 1.2, 0.3),
            this._mat(0x5a6d4a, { roughness: 0.75 })
        );
        tower.position.set(0.65, 0.6, -0.55);
        tower.castShadow = true;
        group.add(tower);

        // Tower platform
        const platform = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.05, 0.5),
            this._mat(0x444444, { metalness: 0.4 })
        );
        platform.position.set(0.65, 1.22, -0.55);
        platform.castShadow = true;
        group.add(platform);

        // Tower railing
        const railMat = this._mat(0x555555, { metalness: 0.5 });
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.015, 0.2, 4),
                railMat
            );
            post.position.set(
                0.65 + Math.cos(angle) * 0.22,
                1.35,
                -0.55 + Math.sin(angle) * 0.22
            );
            group.add(post);
        }

        // Sandbag walls around perimeter
        const sandbagMat = this._mat(0xb8a07a, { roughness: 0.95, metalness: 0.05 });
        const sandbagPositions = [
            [-0.9, 0, 0.8], [0.9, 0, 0.8], [-0.9, 0, -0.8], [0.9, 0, -0.8],
            [0, 0, 0.85], [-0.5, 0, 0.85], [0.5, 0, 0.85],
            [-0.95, 0, 0], [-0.95, 0, 0.4], [-0.95, 0, -0.4]
        ];
        for (const [sx, sy, sz] of sandbagPositions) {
            const bag = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.12, 0.15),
                sandbagMat
            );
            bag.position.set(sx, 0.06 + sy, sz);
            bag.rotation.y = Math.random() * 0.3;
            bag.castShadow = true;
            group.add(bag);

            // Stack second row on some
            if (Math.abs(sx) > 0.8 || Math.abs(sz) > 0.8) {
                const bag2 = new THREE.Mesh(
                    new THREE.BoxGeometry(0.18, 0.11, 0.14),
                    sandbagMat
                );
                bag2.position.set(sx + 0.02, 0.18, sz - 0.02);
                bag2.rotation.y = Math.random() * 0.4 - 0.2;
                bag2.castShadow = true;
                group.add(bag2);
            }
        }

        // Door opening (dark inset on front face)
        const door = new THREE.Mesh(
            new THREE.PlaneGeometry(0.3, 0.5),
            this._mat(0x1a1a1a, { roughness: 0.9 })
        );
        door.position.set(0, 0.35, 0.701);
        group.add(door);

        // Door frame with faction color
        const frameMat = this._mat(fc, { roughness: 0.6 });
        const frameTop = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.04, 0.04),
            frameMat
        );
        frameTop.position.set(0, 0.62, 0.71);
        group.add(frameTop);

        // Windows (emissive blue tint)
        const windowMat = this._mat(0x446688, {
            emissive: 0x446688,
            emissiveIntensity: 0.3,
            roughness: 0.2,
            metalness: 0.8
        });
        const windowPositions = [
            [-0.4, 0.55, 0.701], [0.4, 0.55, 0.701],
            [-0.4, 0.55, -0.701], [0.4, 0.55, -0.701],
        ];
        for (const [wx, wy, wz] of windowPositions) {
            const win = new THREE.Mesh(
                new THREE.PlaneGeometry(0.15, 0.12),
                windowMat
            );
            win.position.set(wx, wy, wz);
            if (wz < 0) win.rotation.y = Math.PI;
            group.add(win);
        }

        // Soviet flag on flagpole
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 1.0, 4),
            this._mat(0x888888, { metalness: 0.6 })
        );
        pole.position.set(-0.65, 1.3, 0.55);
        group.add(pole);

        // Flag (plane with faction color)
        const flagGeo = new THREE.PlaneGeometry(0.35, 0.2, 8, 4);
        const flag = new THREE.Mesh(
            flagGeo,
            this._mat(fc, { roughness: 0.8, side: THREE.DoubleSide })
        );
        flag.position.set(-0.47, 1.7, 0.55);
        group.add(flag);
        group.userData.flag = flag;

        group.userData.modelType = 'barracks';
        group.userData.factionColor = fc;
        return group;
    }

    // ==================== SOVIET SOLDIER ====================

    createSoldier(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();

        const skinMat = this._mat(0xd4a574, { roughness: 0.8, metalness: 0.1 });
        // Uniform color: darken the faction color for the uniform
        const r = ((fc >> 16) & 0xff) / 255;
        const g = ((fc >> 8) & 0xff) / 255;
        const b = (fc & 0xff) / 255;
        const uniformHex = new THREE.Color(r * 0.5, g * 0.5, b * 0.5);
        const uniformMat = this._mat(uniformHex, { roughness: 0.75 });
        const bootMat = this._mat(0x2a2a2a, { roughness: 0.8 });
        const helmetMat = this._mat(0x3a4a3a, { roughness: 0.6, metalness: 0.3 });

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 8, 6),
            skinMat
        );
        head.position.y = 0.38;
        head.castShadow = true;
        group.add(head);

        // Helmet
        const helmet = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
            helmetMat
        );
        helmet.position.y = 0.4;
        helmet.castShadow = true;
        group.add(helmet);

        // Helmet faction stripe
        const helmetStripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.015, 0.015),
            this._mat(fc, { roughness: 0.5 })
        );
        helmetStripe.position.set(0, 0.43, 0.06);
        group.add(helmetStripe);

        // Torso
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.14, 0.08),
            uniformMat
        );
        torso.position.y = 0.26;
        torso.castShadow = true;
        group.add(torso);

        // Faction shoulder patches
        const patchMat = this._mat(fc, { roughness: 0.5 });
        const leftPatch = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, 0.04, 0.085),
            patchMat
        );
        leftPatch.position.set(-0.065, 0.31, 0);
        group.add(leftPatch);
        const rightPatch = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, 0.04, 0.085),
            patchMat
        );
        rightPatch.position.set(0.065, 0.31, 0);
        group.add(rightPatch);

        // Left arm
        const leftArm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.12, 5),
            uniformMat
        );
        leftArm.position.set(-0.08, 0.24, 0);
        leftArm.castShadow = true;
        group.add(leftArm);
        group.userData.leftArm = leftArm;

        // Right arm (holds rifle)
        const rightArm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.12, 5),
            uniformMat
        );
        rightArm.position.set(0.08, 0.24, 0);
        rightArm.castShadow = true;
        group.add(rightArm);
        group.userData.rightArm = rightArm;

        // Left leg
        const leftLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.02, 0.14, 5),
            uniformMat
        );
        leftLeg.position.set(-0.035, 0.1, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);
        group.userData.leftLeg = leftLeg;

        // Right leg
        const rightLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.02, 0.14, 5),
            uniformMat
        );
        rightLeg.position.set(0.035, 0.1, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);
        group.userData.rightLeg = rightLeg;

        // Boots
        const leftBoot = new THREE.Mesh(
            new THREE.BoxGeometry(0.035, 0.04, 0.05),
            bootMat
        );
        leftBoot.position.set(-0.035, 0.02, 0.005);
        group.add(leftBoot);
        group.userData.leftBoot = leftBoot;

        const rightBoot = new THREE.Mesh(
            new THREE.BoxGeometry(0.035, 0.04, 0.05),
            bootMat
        );
        rightBoot.position.set(0.035, 0.02, 0.005);
        group.add(rightBoot);
        group.userData.rightBoot = rightBoot;

        // Rifle
        const rifle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4),
            this._mat(0x3a2a1a, { roughness: 0.8 })
        );
        rifle.rotation.x = -0.3;
        rifle.position.set(0.1, 0.28, 0.06);
        rifle.castShadow = true;
        group.add(rifle);
        group.userData.rifle = rifle;

        // Muzzle flash light (initially off)
        const muzzleFlash = new THREE.PointLight(0xffaa00, 0, 1.5);
        muzzleFlash.position.set(0.12, 0.35, 0.14);
        group.add(muzzleFlash);
        group.userData.muzzleFlash = muzzleFlash;

        group.userData.modelType = 'soldier';
        group.userData.factionColor = fc;
        return group;
    }

    // ==================== ORE CRYSTALS ====================

    createOreCrystal() {
        const group = new THREE.Group();
        const crystalMat = this._mat(0xddaa00, {
            roughness: 0.3,
            metalness: 0.6,
            emissive: 0xaa7700,
            emissiveIntensity: 0.15
        });

        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const h = 0.08 + Math.random() * 0.12;
            const crystal = new THREE.Mesh(
                new THREE.ConeGeometry(0.03 + Math.random() * 0.02, h, 5),
                crystalMat
            );
            crystal.position.set(
                (Math.random() - 0.5) * 0.5,
                h / 2,
                (Math.random() - 0.5) * 0.5
            );
            crystal.rotation.x = (Math.random() - 0.5) * 0.3;
            crystal.rotation.z = (Math.random() - 0.5) * 0.3;
            crystal.castShadow = true;
            group.add(crystal);
        }

        group.userData.modelType = 'ore';
        return group;
    }

    // ==================== PROJECTILE ====================

    createBulletTracer() {
        const group = new THREE.Group();
        const bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.02, 4, 4),
            this._mat(0xffff00, { emissive: 0xffaa00, emissiveIntensity: 1.0 })
        );
        group.add(bullet);

        const light = new THREE.PointLight(0xffaa00, 0.5, 0.5);
        group.add(light);

        group.userData.modelType = 'bullet';
        return group;
    }

    // ==================== EXPLOSION EFFECT ====================

    createExplosion() {
        const group = new THREE.Group();

        // Core flash
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 8, 6),
            new THREE.MeshBasicMaterial({
                color: 0xff6600,
                transparent: true,
                opacity: 0.9
            })
        );
        group.add(core);
        group.userData.core = core;

        // Outer glow
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 6),
            new THREE.MeshBasicMaterial({
                color: 0xff3300,
                transparent: true,
                opacity: 0.4
            })
        );
        group.add(glow);
        group.userData.glow = glow;

        // Light
        const light = new THREE.PointLight(0xff6600, 2, 3);
        group.add(light);
        group.userData.light = light;

        group.userData.modelType = 'explosion';
        return group;
    }

    // ==================== SELECTION RING ====================

    createSelectionRing(radius, color) {
        const ringColor = color ? this._factionColor(color) : 0x00ff88;
        const geo = new THREE.RingGeometry(radius - 0.02, radius, 24);
        const mat = new THREE.MeshBasicMaterial({
            color: ringColor,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        return ring;
    }

    // ==================== HEALTH BAR (3D billboard) ====================

    createHealthBar() {
        const group = new THREE.Group();

        const bgGeo = new THREE.PlaneGeometry(0.4, 0.04);
        const bg = new THREE.Mesh(bgGeo, new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        }));
        group.add(bg);
        group.userData.bg = bg;

        const fillGeo = new THREE.PlaneGeometry(0.4, 0.04);
        const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.DoubleSide
        }));
        group.add(fill);
        group.userData.fill = fill;

        group.userData.modelType = 'healthBar';
        return group;
    }

    // ==================== ANIMATION HELPERS ====================

    animateSmoke(smokePoints, dt) {
        if (!smokePoints) return;
        const positions = smokePoints.geometry.attributes.position.array;
        for (let i = 0; i < positions.length / 3; i++) {
            positions[i * 3 + 1] += dt * 0.0003; // rise
            positions[i * 3] += (Math.random() - 0.5) * dt * 0.0001; // drift
            positions[i * 3 + 2] += (Math.random() - 0.5) * dt * 0.0001;

            // Reset particles that go too high
            if (positions[i * 3 + 1] > 0.8) {
                positions[i * 3] = (Math.random() - 0.5) * 0.1;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
            }
        }
        smokePoints.geometry.attributes.position.needsUpdate = true;
    }

    animateFlag(flag, time) {
        if (!flag) return;
        const geo = flag.geometry;
        const positions = geo.attributes.position.array;
        const original = geo.userData.original;
        if (!original) {
            geo.userData.original = new Float32Array(positions);
            return;
        }
        for (let i = 0; i < positions.length / 3; i++) {
            const x = original[i * 3];
            const wave = Math.sin(time * 3 + x * 8) * 0.02 * (x + 0.2);
            positions[i * 3 + 2] = original[i * 3 + 2] + wave;
        }
        geo.attributes.position.needsUpdate = true;
    }

    animateSoldierWalk(group, walkPhase) {
        const { leftLeg, rightLeg, leftBoot, rightBoot, leftArm, rightArm } = group.userData;
        const swing = Math.sin(walkPhase) * 0.4;

        if (leftLeg) leftLeg.rotation.x = swing;
        if (rightLeg) rightLeg.rotation.x = -swing;
        if (leftBoot) leftBoot.position.z = 0.005 + Math.sin(walkPhase) * 0.02;
        if (rightBoot) rightBoot.position.z = 0.005 - Math.sin(walkPhase) * 0.02;
        if (leftArm) leftArm.rotation.x = -swing * 0.5;
        if (rightArm) rightArm.rotation.x = swing * 0.5;
    }

    animateSoldierIdle(group) {
        const { leftLeg, rightLeg, leftBoot, rightBoot, leftArm, rightArm } = group.userData;
        if (leftLeg) leftLeg.rotation.x = 0;
        if (rightLeg) rightLeg.rotation.x = 0;
        if (leftBoot) leftBoot.position.z = 0.005;
        if (rightBoot) rightBoot.position.z = 0.005;
        if (leftArm) leftArm.rotation.x = 0;
        if (rightArm) rightArm.rotation.x = 0;
    }

    animateSoldierAttack(group) {
        const { rightArm, rifle } = group.userData;
        if (rightArm) rightArm.rotation.x = -0.6;
        if (rifle) rifle.rotation.x = -0.6;
    }

    flashMuzzle(group, on) {
        const { muzzleFlash } = group.userData;
        if (muzzleFlash) {
            muzzleFlash.intensity = on ? 3 : 0;
        }
    }
}
