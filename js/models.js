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

    createPowerPlant(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(1.9, 0.14, 1.9),
            this._mat(0x6d6d72, { roughness: 0.85, metalness: 0.15 })
        );
        base.position.y = 0.07;
        group.add(base);

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.8, 1.1),
            this._mat(0x707883, { roughness: 0.65, metalness: 0.25 })
        );
        body.position.set(0, 0.5, 0.1);
        body.castShadow = true;
        group.add(body);

        const reactor = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.34, 0.9, 10),
            this._mat(0x98a0a8, { roughness: 0.45, metalness: 0.55, emissive: fc, emissiveIntensity: 0.12 })
        );
        reactor.position.set(0.42, 0.6, -0.35);
        reactor.castShadow = true;
        group.add(reactor);

        const coil = new THREE.Mesh(
            new THREE.TorusGeometry(0.18, 0.035, 6, 16),
            this._mat(fc, { roughness: 0.4, metalness: 0.6, emissive: fc, emissiveIntensity: 0.25 })
        );
        coil.rotation.x = Math.PI / 2;
        coil.position.set(0.42, 0.92, -0.35);
        group.add(coil);

        const vent1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.1, 0.9, 8),
            this._mat(0x55585e, { metalness: 0.45 })
        );
        vent1.position.set(-0.42, 0.78, -0.42);
        group.add(vent1);

        const vent2 = vent1.clone();
        vent2.position.z = 0.3;
        group.add(vent2);

        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(1.24, 0.08, 0.08),
            this._mat(fc, { roughness: 0.45 })
        );
        stripe.position.set(0, 0.55, 0.56);
        group.add(stripe);

        group.userData.modelType = 'powerPlant';
        group.userData.factionColor = fc;
        return group;
    }

    createAdvancedPowerPlant(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = this.createPowerPlant(fc);
        group.userData.modelType = 'advancedPowerPlant';

        const dome = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.48, 0.5, 12),
            this._mat(0x9fb3c8, { roughness: 0.28, metalness: 0.7, emissive: 0x3aa6ff, emissiveIntensity: 0.22 })
        );
        dome.position.set(-0.28, 0.86, 0.08);
        dome.castShadow = true;
        group.add(dome);

        const cap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24, 0.3, 0.18, 10),
            this._mat(fc, { roughness: 0.32, metalness: 0.78, emissive: fc, emissiveIntensity: 0.38 })
        );
        cap.position.set(-0.28, 1.18, 0.08);
        cap.castShadow = true;
        group.add(cap);

        const energyRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.34, 0.05, 10, 24),
            this._mat(0x55d5ff, { roughness: 0.18, metalness: 0.9, emissive: 0x49c9ff, emissiveIntensity: 0.42 })
        );
        energyRing.rotation.x = Math.PI / 2;
        energyRing.position.set(-0.28, 0.94, 0.08);
        group.add(energyRing);

        const stackLeft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.11, 1.05, 10),
            this._mat(0x46515d, { roughness: 0.4, metalness: 0.55 })
        );
        stackLeft.position.set(0.5, 0.92, 0.42);
        stackLeft.castShadow = true;
        group.add(stackLeft);

        const stackRight = stackLeft.clone();
        stackRight.position.z = -0.06;
        group.add(stackRight);

        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(1.35, 0.08, 0.1),
            this._mat(0x55d5ff, { roughness: 0.28, metalness: 0.72, emissive: 0x2da4ff, emissiveIntensity: 0.28 })
        );
        stripe.position.set(0, 0.82, 0.6);
        group.add(stripe);

        return group;
    }

    createRadarDome(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();

        const slab = new THREE.Mesh(
            new THREE.BoxGeometry(1.9, 0.12, 1.9),
            this._mat(0x666a70, { roughness: 0.9, metalness: 0.1 })
        );
        slab.position.y = 0.06;
        group.add(slab);

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.62, 1.2),
            this._mat(0x56606a, { roughness: 0.68, metalness: 0.24 })
        );
        body.position.set(0, 0.35, 0);
        body.castShadow = true;
        group.add(body);

        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(0.42, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
            this._mat(0x86c9dd, { roughness: 0.18, metalness: 0.35, emissive: 0x2b93aa, emissiveIntensity: 0.18 })
        );
        dome.position.set(0, 0.7, 0);
        dome.castShadow = true;
        group.add(dome);

        const collar = new THREE.Mesh(
            new THREE.TorusGeometry(0.46, 0.05, 8, 20),
            this._mat(fc, { roughness: 0.35, metalness: 0.45, emissive: fc, emissiveIntensity: 0.12 })
        );
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0, 0.61, 0);
        group.add(collar);

        const mast = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.08, 0.95, 10),
            this._mat(0x7b838b, { roughness: 0.45, metalness: 0.45 })
        );
        mast.position.set(-0.45, 0.62, -0.35);
        mast.castShadow = true;
        group.add(mast);

        const dish = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
            this._mat(0xb7bec5, { roughness: 0.3, metalness: 0.5, emissive: fc, emissiveIntensity: 0.06 })
        );
        dish.rotation.x = -Math.PI / 2.4;
        dish.rotation.z = Math.PI / 4;
        dish.position.set(-0.45, 1.08, -0.35);
        dish.castShadow = true;
        group.add(dish);

        const emitter = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8),
            this._mat(fc, { roughness: 0.3, metalness: 0.55, emissive: fc, emissiveIntensity: 0.25 })
        );
        emitter.rotation.z = Math.PI / 4;
        emitter.position.set(-0.32, 1.02, -0.22);
        group.add(emitter);

        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(1.26, 0.08, 0.1),
            this._mat(fc, { roughness: 0.4, metalness: 0.28 })
        );
        stripe.position.set(0, 0.38, 0.56);
        group.add(stripe);

        group.userData.modelType = 'radarDome';
        group.userData.factionColor = fc;
        return group;
    }

    createWarFactory(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();

        const slab = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 0.12, 2.8),
            this._mat(0x6c6d72, { roughness: 0.9, metalness: 0.1 })
        );
        slab.position.y = 0.06;
        group.add(slab);

        const hall = new THREE.Mesh(
            new THREE.BoxGeometry(2.3, 0.95, 2.0),
            this._mat(0x5a656e, { roughness: 0.7, metalness: 0.25 })
        );
        hall.position.set(0, 0.56, 0);
        hall.castShadow = true;
        group.add(hall);

        const bayDoor = new THREE.Mesh(
            new THREE.BoxGeometry(0.95, 0.7, 0.08),
            this._mat(0x2b3138, { roughness: 0.55, metalness: 0.45 })
        );
        bayDoor.position.set(0, 0.42, 1.04);
        group.add(bayDoor);

        const gantry = new THREE.Mesh(
            new THREE.BoxGeometry(2.45, 0.18, 0.3),
            this._mat(fc, { roughness: 0.45, metalness: 0.3 })
        );
        gantry.position.set(0, 1.05, 0.95);
        group.add(gantry);

        const stack = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.18, 1.2, 10),
            this._mat(0x6d7278, { roughness: 0.5, metalness: 0.45 })
        );
        stack.position.set(-0.95, 0.82, -0.7);
        group.add(stack);

        const craneArm = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.14, 1.5),
            this._mat(0x84898f, { roughness: 0.55, metalness: 0.4 })
        );
        craneArm.position.set(0.95, 1.0, -0.1);
        craneArm.rotation.y = 0.2;
        group.add(craneArm);

        group.userData.modelType = 'warFactory';
        group.userData.factionColor = fc;
        return group;
    }

    createBattleLab(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();

        const slab = new THREE.Mesh(
            new THREE.BoxGeometry(2.86, 0.14, 2.86),
            this._mat(0x6b7078, { roughness: 0.88, metalness: 0.12 })
        );
        slab.position.y = 0.07;
        group.add(slab);

        const core = new THREE.Mesh(
            new THREE.BoxGeometry(1.9, 0.9, 1.9),
            this._mat(0x55606b, { roughness: 0.62, metalness: 0.28 })
        );
        core.position.set(0, 0.54, 0);
        core.castShadow = true;
        group.add(core);

        const sideWing = new THREE.Mesh(
            new THREE.BoxGeometry(0.52, 0.55, 1.7),
            this._mat(0x78818a, { roughness: 0.54, metalness: 0.3 })
        );
        sideWing.position.set(-1.02, 0.34, 0);
        sideWing.castShadow = true;
        group.add(sideWing);
        const sideWing2 = sideWing.clone();
        sideWing2.position.x = 1.02;
        group.add(sideWing2);

        const reactor = new THREE.Mesh(
            new THREE.CylinderGeometry(0.44, 0.44, 0.82, 16),
            this._mat(0x91d2f1, { roughness: 0.18, metalness: 0.48, emissive: 0x2c8bc0, emissiveIntensity: 0.28 })
        );
        reactor.position.set(0, 1.08, 0);
        reactor.castShadow = true;
        group.add(reactor);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.58, 0.06, 10, 20),
            this._mat(fc, { roughness: 0.35, metalness: 0.45, emissive: fc, emissiveIntensity: 0.16 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, 1.06, 0);
        group.add(ring);

        const tower = new THREE.Mesh(
            new THREE.BoxGeometry(0.38, 1.1, 0.38),
            this._mat(0x7d868f, { roughness: 0.45, metalness: 0.38 })
        );
        tower.position.set(0.96, 0.78, -0.92);
        tower.castShadow = true;
        group.add(tower);

        const antenna = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.72, 8),
            this._mat(fc, { roughness: 0.38, metalness: 0.5, emissive: fc, emissiveIntensity: 0.18 })
        );
        antenna.position.set(0.96, 1.62, -0.92);
        group.add(antenna);

        const dish = new THREE.Mesh(
            new THREE.SphereGeometry(0.24, 12, 10, 0, Math.PI),
            this._mat(0xc3cad1, { roughness: 0.28, metalness: 0.55, emissive: fc, emissiveIntensity: 0.08 })
        );
        dish.rotation.x = Math.PI / 2;
        dish.position.set(0.96, 1.94, -0.92);
        group.add(dish);
        group.userData.dish = dish;

        const frontDoor = new THREE.Mesh(
            new THREE.BoxGeometry(0.72, 0.48, 0.08),
            this._mat(0x252a30, { roughness: 0.55, metalness: 0.48 })
        );
        frontDoor.position.set(0, 0.36, 0.96);
        group.add(frontDoor);

        const glowStrip = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.08, 0.08),
            this._mat(fc, { roughness: 0.34, metalness: 0.48, emissive: fc, emissiveIntensity: 0.24 })
        );
        glowStrip.position.set(0, 0.72, 0.99);
        group.add(glowStrip);

        group.userData.modelType = 'battleLab';
        group.userData.factionColor = fc;
        return group;
    }

    createPillbox(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();

        const slab = new THREE.Mesh(
            new THREE.BoxGeometry(0.92, 0.12, 0.92),
            this._mat(0x6f6a63, { roughness: 0.92, metalness: 0.08 })
        );
        slab.position.y = 0.06;
        group.add(slab);

        const bunker = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.42, 0.42, 8),
            this._mat(0x8f7d6c, { roughness: 0.88, metalness: 0.06 })
        );
        bunker.position.y = 0.27;
        bunker.castShadow = true;
        group.add(bunker);

        const hatch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.2, 0.06, 10),
            this._mat(0x45484c, { roughness: 0.42, metalness: 0.52 })
        );
        hatch.position.y = 0.48;
        group.add(hatch);

        const slit = new THREE.Mesh(
            new THREE.BoxGeometry(0.34, 0.08, 0.08),
            this._mat(0x1e1f22, { roughness: 0.95, metalness: 0.02 })
        );
        slit.position.set(0, 0.28, 0.34);
        group.add(slit);

        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8),
            this._mat(0x2a2c30, { roughness: 0.45, metalness: 0.55 })
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.28, 0.5);
        barrel.castShadow = true;
        group.add(barrel);

        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.72, 0.06, 0.06),
            this._mat(fc, { roughness: 0.45, metalness: 0.25 })
        );
        stripe.position.set(0, 0.16, -0.28);
        group.add(stripe);

        group.userData.modelType = 'pillbox';
        group.userData.factionColor = fc;
        return group;
    }

    createSentryGun(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.96, 0.16, 0.96),
            this._mat(0x65686c, { roughness: 0.82, metalness: 0.12 })
        );
        base.position.y = 0.08;
        group.add(base);

        const pedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.18, 0.3, 10),
            this._mat(0x868c93, { roughness: 0.55, metalness: 0.35 })
        );
        pedestal.position.y = 0.26;
        pedestal.castShadow = true;
        group.add(pedestal);

        const turret = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.26, 0.18, 12),
            this._mat(fc, { roughness: 0.45, metalness: 0.4 })
        );
        turret.position.y = 0.42;
        turret.castShadow = true;
        group.add(turret);

        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.06, 0.56, 8),
            this._mat(0x31343a, { roughness: 0.42, metalness: 0.58 })
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.43, 0.34);
        barrel.castShadow = true;
        group.add(barrel);

        const ammoRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.26, 0.04, 8, 18),
            this._mat(fc, { roughness: 0.35, metalness: 0.5, emissive: fc, emissiveIntensity: 0.08 })
        );
        ammoRing.rotation.x = Math.PI / 2;
        ammoRing.position.y = 0.25;
        group.add(ammoRing);

        group.userData.modelType = 'sentryGun';
        group.userData.factionColor = fc;
        return group;
    }

    createBattleBunker(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();

        const slab = new THREE.Mesh(
            new THREE.BoxGeometry(0.98, 0.12, 0.98),
            this._mat(0x726860, { roughness: 0.9, metalness: 0.08 })
        );
        slab.position.y = 0.06;
        group.add(slab);

        const shell = new THREE.Mesh(
            new THREE.BoxGeometry(0.82, 0.46, 0.82),
            this._mat(0x8f7c68, { roughness: 0.86, metalness: 0.05 })
        );
        shell.position.y = 0.29;
        shell.castShadow = true;
        group.add(shell);

        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.08, 0.9),
            this._mat(0x4b4f53, { roughness: 0.5, metalness: 0.42 })
        );
        roof.position.y = 0.56;
        roof.castShadow = true;
        group.add(roof);

        const slit = new THREE.Mesh(
            new THREE.BoxGeometry(0.54, 0.1, 0.1),
            this._mat(0x17181b, { roughness: 0.95, metalness: 0.02 })
        );
        slit.position.set(0, 0.32, 0.42);
        group.add(slit);

        const hatch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.14, 0.05, 10),
            this._mat(fc, { roughness: 0.38, metalness: 0.48, emissive: fc, emissiveIntensity: 0.12 })
        );
        hatch.rotation.x = Math.PI / 2;
        hatch.position.set(0.22, 0.6, -0.1);
        group.add(hatch);

        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.62, 0.06, 0.06),
            this._mat(fc, { roughness: 0.4, metalness: 0.24 })
        );
        stripe.position.set(0, 0.18, -0.3);
        group.add(stripe);

        group.userData.modelType = 'battleBunker';
        group.userData.factionColor = fc;
        return group;
    }

    createSandbagWall(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();
        const baseMat = this._mat(0x8c7758, { roughness: 0.96, metalness: 0.02 });
        const trimMat = this._mat(fc, { roughness: 0.45, metalness: 0.18 });

        const slab = new THREE.Mesh(
            new THREE.BoxGeometry(0.94, 0.06, 0.94),
            this._mat(0x6a655f, { roughness: 0.95, metalness: 0.04 })
        );
        slab.position.y = 0.03;
        group.add(slab);

        const rowOffsets = [-0.18, 0, 0.18];
        rowOffsets.forEach((z, rowIndex) => {
            for (let i = -2; i <= 2; i++) {
                const bag = new THREE.Mesh(
                    new THREE.SphereGeometry(0.12, 10, 8),
                    baseMat
                );
                bag.scale.set(1.25, 0.72, 0.9);
                bag.position.set(i * 0.18 + (rowIndex % 2 === 0 ? 0 : 0.08), 0.12 + rowIndex * 0.07, z);
                bag.castShadow = true;
                group.add(bag);
            }
        });

        const cap = new THREE.Mesh(
            new THREE.BoxGeometry(0.82, 0.06, 0.14),
            trimMat
        );
        cap.position.set(0, 0.34, 0);
        group.add(cap);

        const postL = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8),
            this._mat(0x43464a, { roughness: 0.58, metalness: 0.35 })
        );
        postL.position.set(-0.34, 0.22, 0);
        postL.castShadow = true;
        group.add(postL);
        const postR = postL.clone();
        postR.position.x = 0.34;
        group.add(postR);

        group.userData.modelType = 'sandbagWall';
        group.userData.factionColor = fc;
        return group;
    }

    createConstructionYard(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();
        const concrete = this._mat(0x8b8f96, { roughness: 0.92, metalness: 0.08 });
        const steel = this._mat(0x626a74, { roughness: 0.55, metalness: 0.35 });
        const accent = this._mat(fc, { roughness: 0.45, metalness: 0.3 });

        const base = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 2.7), concrete);
        base.position.y = 0.08;
        base.receiveShadow = true;
        group.add(base);

        const platform = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.1, 2.15), this._mat(0xa7adb4, { roughness: 0.8 }));
        platform.position.y = 0.19;
        group.add(platform);

        const commandCore = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.55, 1.1), steel);
        commandCore.position.set(0, 0.47, -0.15);
        commandCore.castShadow = true;
        group.add(commandCore);

        const frontGate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.34, 0.32), this._mat(0x49515a, { roughness: 0.6 }));
        frontGate.position.set(0, 0.31, 1.02);
        group.add(frontGate);

        const sideBayL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 1.55), steel);
        sideBayL.position.set(-0.88, 0.36, 0.12);
        sideBayL.castShadow = true;
        group.add(sideBayL);
        const sideBayR = sideBayL.clone();
        sideBayR.position.x = 0.88;
        group.add(sideBayR);

        const tower = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.42), this._mat(0x737d88, { roughness: 0.5, metalness: 0.35 }));
        tower.position.set(0.88, 0.78, -0.82);
        tower.castShadow = true;
        group.add(tower);

        const dishMount = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8), this._mat(0x40464d, { metalness: 0.45 }));
        dishMount.position.set(0.88, 1.28, -0.82);
        group.add(dishMount);
        const dish = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10, 0, Math.PI), accent);
        dish.rotation.x = Math.PI / 2;
        dish.position.set(0.88, 1.42, -0.82);
        group.add(dish);
        group.userData.dish = dish;

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), accent);
        stripe.position.set(0, 0.58, -1.12);
        group.add(stripe);

        const padLight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.22), this._mat(0x89d7ff, { emissive: 0x3aa6ff, emissiveIntensity: 0.35 }));
        padLight.position.set(-0.8, 0.24, 0.78);
        group.add(padLight);
        const padLight2 = padLight.clone();
        padLight2.position.x = 0.8;
        group.add(padLight2);

        group.userData.modelType = 'constructionYard';
        group.userData.factionColor = fc;
        return group;
    }

    createMCV(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();
        const hullMat = this._mat(0x67707b, { roughness: 0.55, metalness: 0.35 });
        const treadMat = this._mat(0x25292f, { roughness: 0.8, metalness: 0.15 });
        const accent = this._mat(fc, { roughness: 0.45, metalness: 0.3 });

        const hull = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.26, 1.2), hullMat);
        hull.position.y = 0.22;
        hull.castShadow = true;
        group.add(hull);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.3, 0.34), this._mat(0x8f98a1, { roughness: 0.45, metalness: 0.3 }));
        cabin.position.set(0, 0.44, -0.22);
        group.add(cabin);

        const bay = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.26, 0.42), accent);
        bay.position.set(0, 0.42, 0.24);
        group.add(bay);

        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 8), this._mat(0x40464d, { metalness: 0.45 }));
        mast.position.set(0.28, 0.56, 0.08);
        group.add(mast);

        const dish = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI), accent);
        dish.rotation.x = Math.PI / 2;
        dish.position.set(0.28, 0.67, 0.08);
        group.add(dish);
        group.userData.dish = dish;

        for (const x of [-0.44, 0.44]) {
            const tread = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.28), treadMat);
            tread.position.set(x, 0.1, 0);
            group.add(tread);
        }

        const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.28), this._mat(0x505861, { roughness: 0.55, metalness: 0.25 }));
        ramp.position.set(0, 0.12, 0.74);
        ramp.rotation.x = -0.25;
        group.add(ramp);

        group.userData.modelType = 'mcv';
        group.userData.factionColor = fc;
        return group;
    }

    createHarvester(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();
        const chassisMat = this._mat(0x59616d, { roughness: 0.55, metalness: 0.4 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.9), chassisMat);
        body.position.y = 0.2;
        body.castShadow = true;
        group.add(body);

        const cab = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.24, 0.26),
            this._mat(0x89939d, { roughness: 0.45, metalness: 0.35 })
        );
        cab.position.set(0, 0.34, -0.18);
        group.add(cab);

        const hopper = new THREE.Mesh(
            new THREE.BoxGeometry(0.44, 0.26, 0.38),
            this._mat(fc, { roughness: 0.45, metalness: 0.3 })
        );
        hopper.position.set(0, 0.34, 0.22);
        group.add(hopper);
        group.userData.cargoPod = hopper;

        for (const x of [-0.26, 0.26]) {
            for (const z of [-0.28, 0.28]) {
                const wheel = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10),
                    this._mat(0x252525, { roughness: 0.85 })
                );
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(x, 0.12, z);
                group.add(wheel);
            }
        }

        const drill = new THREE.Mesh(
            new THREE.ConeGeometry(0.08, 0.24, 6),
            this._mat(0xb48d22, { roughness: 0.35, metalness: 0.65 })
        );
        drill.rotation.x = Math.PI / 2;
        drill.position.set(0, 0.18, 0.56);
        group.add(drill);

        group.userData.modelType = 'harvester';
        group.userData.factionColor = fc;
        return group;
    }

    createTank(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();
        const hullMat = this._mat(0x65707a, { roughness: 0.55, metalness: 0.35 });

        const hull = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 1.05), hullMat);
        hull.position.y = 0.18;
        hull.castShadow = true;
        group.add(hull);

        const turret = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24, 0.28, 0.18, 12),
            this._mat(fc, { roughness: 0.45, metalness: 0.35 })
        );
        turret.position.y = 0.34;
        turret.castShadow = true;
        group.add(turret);
        group.userData.turret = turret;

        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.05, 0.82, 8),
            this._mat(0x383d44, { roughness: 0.45, metalness: 0.55 })
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.34, 0.48);
        barrel.castShadow = true;
        group.add(barrel);
        group.userData.barrel = barrel;

        const treadLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.12), this._mat(0x22262d, { roughness: 0.8 }));
        treadLeft.position.set(-0.38, 0.1, 0);
        group.add(treadLeft);
        const treadRight = treadLeft.clone();
        treadRight.position.x = 0.38;
        group.add(treadRight);

        const muzzleFlash = new THREE.PointLight(0xffaa00, 0, 2.2);
        muzzleFlash.position.set(0, 0.38, 0.92);
        group.add(muzzleFlash);
        group.userData.muzzleFlash = muzzleFlash;

        group.userData.modelType = 'tank';
        group.userData.factionColor = fc;
        return group;
    }

    createArtillery(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();
        const chassisMat = this._mat(0x606872, { roughness: 0.56, metalness: 0.34 });
        const launcherMat = this._mat(fc, { roughness: 0.4, metalness: 0.36 });

        const hull = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 1.04), chassisMat);
        hull.position.y = 0.18;
        hull.castShadow = true;
        group.add(hull);

        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.3), this._mat(0x98a1aa, { roughness: 0.42, metalness: 0.28 }));
        cab.position.set(0, 0.34, -0.24);
        cab.castShadow = true;
        group.add(cab);

        const launcherBase = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.5), launcherMat);
        launcherBase.position.set(0, 0.34, 0.08);
        launcherBase.castShadow = true;
        group.add(launcherBase);

        const rack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.74), this._mat(0x454b53, { roughness: 0.42, metalness: 0.48 }));
        rack.position.set(0, 0.52, 0.16);
        rack.rotation.x = -0.35;
        rack.castShadow = true;
        group.add(rack);
        group.userData.turret = rack;

        for (const x of [-0.12, 0.12]) {
            const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.82, 8), this._mat(0x2d3138, { roughness: 0.34, metalness: 0.62 }));
            tube.rotation.x = Math.PI / 2 - 0.32;
            tube.position.set(x, 0.61, 0.43);
            tube.castShadow = true;
            group.add(tube);
        }

        for (const x of [-0.32, 0.32]) {
            const tread = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 1.12), this._mat(0x22262d, { roughness: 0.82 }));
            tread.position.set(x, 0.09, 0);
            group.add(tread);
        }

        const stabilizer = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.14), this._mat(0x444a52, { roughness: 0.55, metalness: 0.22 }));
        stabilizer.position.set(0, 0.08, 0.58);
        group.add(stabilizer);

        const muzzleFlash = new THREE.PointLight(0xffaa00, 0, 2.8);
        muzzleFlash.position.set(0, 0.72, 0.98);
        group.add(muzzleFlash);
        group.userData.muzzleFlash = muzzleFlash;

        group.userData.modelType = 'artillery';
        group.userData.factionColor = fc;
        return group;
    }

    createFlakTrack(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();
        const hullMat = this._mat(0x5f6670, { roughness: 0.58, metalness: 0.34 });
        const accentMat = this._mat(fc, { roughness: 0.42, metalness: 0.4, emissive: fc, emissiveIntensity: 0.08 });

        const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.18, 1.08), hullMat);
        lowerHull.position.y = 0.16;
        lowerHull.castShadow = true;
        group.add(lowerHull);

        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.24, 0.34), this._mat(0x8e979f, { roughness: 0.44, metalness: 0.28 }));
        cab.position.set(0, 0.34, -0.16);
        cab.castShadow = true;
        group.add(cab);

        const bed = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.5), this._mat(0x4a525b, { roughness: 0.48, metalness: 0.32 }));
        bed.position.set(0, 0.29, 0.18);
        bed.castShadow = true;
        group.add(bed);

        const turret = new THREE.Group();
        turret.position.set(0, 0.44, 0.16);
        group.add(turret);
        group.userData.turret = turret;

        const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.14, 10), accentMat);
        turretBase.castShadow = true;
        turret.add(turretBase);

        const shield = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.08), this._mat(0x69727c, { roughness: 0.5, metalness: 0.4 }));
        shield.position.set(0, 0.08, 0.12);
        shield.castShadow = true;
        turret.add(shield);

        for (const x of [-0.12, 0, 0.12]) {
            const barrel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.028, 0.034, 0.72, 8),
                this._mat(0x2f343b, { roughness: 0.36, metalness: 0.64 })
            );
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(x, 0.04, 0.38);
            barrel.castShadow = true;
            turret.add(barrel);
        }

        const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.18), this._mat(0x7f8891, { roughness: 0.45, metalness: 0.36 }));
        ammoBox.position.set(-0.18, 0.04, -0.04);
        ammoBox.castShadow = true;
        turret.add(ammoBox);

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.06, 0.08), accentMat);
        stripe.position.set(0, 0.27, -0.42);
        group.add(stripe);

        for (const x of [-0.34, 0.34]) {
            const wheelWell = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.94), this._mat(0x23272d, { roughness: 0.82 }));
            wheelWell.position.set(x, 0.08, 0.02);
            group.add(wheelWell);
        }

        for (const x of [-0.34, 0.34]) {
            for (const z of [-0.34, 0.34]) {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), this._mat(0x17191d, { roughness: 0.9 }));
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(x, 0.11, z);
                group.add(wheel);
            }
        }

        const muzzleFlash = new THREE.PointLight(0xffcc55, 0, 2.4);
        muzzleFlash.position.set(0, 0.5, 0.92);
        group.add(muzzleFlash);
        group.userData.muzzleFlash = muzzleFlash;

        group.userData.modelType = 'flakTrack';
        group.userData.factionColor = fc;
        return group;
    }

    createAPC(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();
        const hullMat = this._mat(0x6a737e, { roughness: 0.52, metalness: 0.34 });
        const accentMat = this._mat(fc, { roughness: 0.4, metalness: 0.42, emissive: fc, emissiveIntensity: 0.08 });

        const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.2, 1.12), hullMat);
        lowerHull.position.y = 0.17;
        lowerHull.castShadow = true;
        group.add(lowerHull);

        const upperHull = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.74), this._mat(0x848d96, { roughness: 0.44, metalness: 0.28 }));
        upperHull.position.set(0, 0.34, -0.02);
        upperHull.castShadow = true;
        group.add(upperHull);

        const cabinStripe = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.08), accentMat);
        cabinStripe.position.set(0, 0.3, -0.4);
        cabinStripe.castShadow = true;
        group.add(cabinStripe);

        const turret = new THREE.Group();
        turret.position.set(0, 0.44, 0.16);
        group.add(turret);
        group.userData.turret = turret;

        const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.16, 10), accentMat);
        turretBase.castShadow = true;
        turret.add(turretBase);

        const turretShield = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.12), this._mat(0x555d66, { roughness: 0.5, metalness: 0.35 }));
        turretShield.position.set(0, 0.06, 0.1);
        turretShield.castShadow = true;
        turret.add(turretShield);

        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.04, 0.74, 8),
            this._mat(0x2f343b, { roughness: 0.36, metalness: 0.64 })
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.04, 0.42);
        barrel.castShadow = true;
        turret.add(barrel);
        group.userData.barrel = barrel;

        const rearDoor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.08), this._mat(0x444c55, { roughness: 0.58, metalness: 0.22 }));
        rearDoor.position.set(0, 0.24, 0.54);
        rearDoor.castShadow = true;
        group.add(rearDoor);

        for (const x of [-0.36, 0.36]) {
            const track = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.16, 1.18), this._mat(0x20242a, { roughness: 0.84 }));
            track.position.set(x, 0.1, 0);
            group.add(track);
        }

        const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.12), this._mat(0x2d3138, { roughness: 0.48, metalness: 0.52 }));
        frontBumper.position.set(0, 0.12, -0.56);
        group.add(frontBumper);

        const muzzleFlash = new THREE.PointLight(0xffcc66, 0, 2.3);
        muzzleFlash.position.set(0, 0.5, 0.88);
        group.add(muzzleFlash);
        group.userData.muzzleFlash = muzzleFlash;

        group.userData.modelType = 'apc';
        group.userData.factionColor = fc;
        return group;
    }

    createIFV(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();
        const hullMat = this._mat(0x5f6973, { roughness: 0.54, metalness: 0.34 });
        const accentMat = this._mat(fc, { roughness: 0.4, metalness: 0.42, emissive: fc, emissiveIntensity: 0.09 });

        const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 1.04), hullMat);
        lowerHull.position.y = 0.16;
        lowerHull.castShadow = true;
        group.add(lowerHull);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.2, 0.48), this._mat(0x8a949d, { roughness: 0.42, metalness: 0.28 }));
        cabin.position.set(0, 0.31, -0.1);
        cabin.castShadow = true;
        group.add(cabin);

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.08), accentMat);
        stripe.position.set(0, 0.28, -0.38);
        stripe.castShadow = true;
        group.add(stripe);

        const turret = new THREE.Group();
        turret.position.set(0, 0.42, 0.12);
        group.add(turret);
        group.userData.turret = turret;

        const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.12, 10), accentMat);
        mount.castShadow = true;
        turret.add(mount);

        const launcher = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.34), this._mat(0x4d5660, { roughness: 0.46, metalness: 0.36 }));
        launcher.position.set(0, 0.08, 0.12);
        launcher.castShadow = true;
        turret.add(launcher);

        for (const x of [-0.08, 0.08]) {
            const missileTube = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.046, 0.62, 8),
                this._mat(0x2e333a, { roughness: 0.34, metalness: 0.64 })
            );
            missileTube.rotation.x = Math.PI / 2;
            missileTube.position.set(x, 0.02, 0.34);
            missileTube.castShadow = true;
            turret.add(missileTube);
        }

        const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.08), this._mat(0xa9d7ff, { roughness: 0.2, metalness: 0.15, emissive: 0x66bbff, emissiveIntensity: 0.22 }));
        sensor.position.set(0, 0.16, -0.02);
        sensor.castShadow = true;
        turret.add(sensor);

        for (const x of [-0.34, 0.34]) {
            const wheelWell = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.92), this._mat(0x24282e, { roughness: 0.82 }));
            wheelWell.position.set(x, 0.08, 0.02);
            group.add(wheelWell);
        }

        for (const x of [-0.34, 0.34]) {
            for (const z of [-0.32, 0.02, 0.36]) {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), this._mat(0x17191d, { roughness: 0.9 }));
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(x, 0.1, z);
                group.add(wheel);
            }
        }

        const rearStorage = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.18), this._mat(0x444d56, { roughness: 0.56, metalness: 0.24 }));
        rearStorage.position.set(0, 0.22, 0.44);
        rearStorage.castShadow = true;
        group.add(rearStorage);

        const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.12), this._mat(0x2c3138, { roughness: 0.48, metalness: 0.5 }));
        bumper.position.set(0, 0.1, -0.54);
        group.add(bumper);

        const muzzleFlash = new THREE.PointLight(0xffcc66, 0, 2.4);
        muzzleFlash.position.set(0, 0.5, 0.86);
        group.add(muzzleFlash);
        group.userData.muzzleFlash = muzzleFlash;

        group.userData.modelType = 'ifv';
        group.userData.factionColor = fc;
        return group;
    }

    createApocalypseTank(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();
        const hullMat = this._mat(0x5f6974, { roughness: 0.5, metalness: 0.4 });

        const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.24, 1.38), hullMat);
        lowerHull.position.y = 0.2;
        lowerHull.castShadow = true;
        group.add(lowerHull);

        const upperHull = new THREE.Mesh(
            new THREE.BoxGeometry(0.82, 0.22, 0.82),
            this._mat(0x7d8791, { roughness: 0.46, metalness: 0.34 })
        );
        upperHull.position.set(0, 0.38, -0.04);
        upperHull.castShadow = true;
        group.add(upperHull);

        const turret = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.38, 0.22, 14),
            this._mat(fc, { roughness: 0.42, metalness: 0.38 })
        );
        turret.position.y = 0.48;
        turret.castShadow = true;
        group.add(turret);
        group.userData.turret = turret;

        const barrelLeft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.06, 0.96, 8),
            this._mat(0x333941, { roughness: 0.4, metalness: 0.6 })
        );
        barrelLeft.rotation.x = Math.PI / 2;
        barrelLeft.position.set(-0.12, 0.48, 0.54);
        barrelLeft.castShadow = true;
        group.add(barrelLeft);

        const barrelRight = barrelLeft.clone();
        barrelRight.position.x = 0.12;
        group.add(barrelRight);
        group.userData.barrel = barrelRight;

        const missilePod = new THREE.Mesh(
            new THREE.BoxGeometry(0.26, 0.18, 0.34),
            this._mat(0x9aa2aa, { roughness: 0.36, metalness: 0.42 })
        );
        missilePod.position.set(0, 0.58, -0.38);
        missilePod.castShadow = true;
        group.add(missilePod);

        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.92, 0.08, 0.08),
            this._mat(fc, { roughness: 0.32, metalness: 0.46, emissive: fc, emissiveIntensity: 0.12 })
        );
        stripe.position.set(0, 0.34, -0.58);
        group.add(stripe);

        const treadLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 1.48), this._mat(0x20242a, { roughness: 0.82 }));
        treadLeft.position.set(-0.48, 0.1, 0);
        group.add(treadLeft);
        const treadRight = treadLeft.clone();
        treadRight.position.x = 0.48;
        group.add(treadRight);

        const muzzleFlash = new THREE.PointLight(0xffaa00, 0, 2.6);
        muzzleFlash.position.set(0, 0.54, 1.02);
        group.add(muzzleFlash);
        group.userData.muzzleFlash = muzzleFlash;

        group.userData.modelType = 'apocalypseTank';
        group.userData.factionColor = fc;
        return group;
    }

    createAirfield(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();

        const slab = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 0.08, 2.0),
            this._mat(0x666a70, { roughness: 0.9, metalness: 0.1 })
        );
        slab.position.y = 0.04;
        slab.receiveShadow = true;
        group.add(slab);

        const runway = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.02, 1.7),
            this._mat(0x2f3338, { roughness: 0.95, metalness: 0.05 })
        );
        runway.position.y = 0.09;
        group.add(runway);

        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.03, 1.4),
            this._mat(fc, { roughness: 0.45, metalness: 0.25, emissive: fc, emissiveIntensity: 0.1 })
        );
        stripe.position.set(0, 0.1, 0);
        group.add(stripe);

        const tower = new THREE.Mesh(
            new THREE.BoxGeometry(0.34, 0.85, 0.34),
            this._mat(0x88919a, { roughness: 0.5, metalness: 0.28 })
        );
        tower.position.set(-0.65, 0.48, -0.55);
        tower.castShadow = true;
        group.add(tower);

        const towerTop = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.2, 0.5),
            this._mat(0xaab3bb, { roughness: 0.4, metalness: 0.35 })
        );
        towerTop.position.set(-0.65, 0.96, -0.55);
        towerTop.castShadow = true;
        group.add(towerTop);

        const hangar = new THREE.Mesh(
            new THREE.BoxGeometry(0.92, 0.42, 0.62),
            this._mat(0x59616b, { roughness: 0.62, metalness: 0.24 })
        );
        hangar.position.set(0.45, 0.25, -0.45);
        hangar.castShadow = true;
        group.add(hangar);

        const door = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.24),
            this._mat(0x2d3136, { roughness: 0.92, metalness: 0.08 })
        );
        door.position.set(0.45, 0.22, -0.14);
        group.add(door);

        for (const x of [-0.55, -0.1, 0.35, 0.8]) {
            const light = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8),
                this._mat(0x66d7ff, { emissive: 0x66d7ff, emissiveIntensity: 0.6, roughness: 0.2 })
            );
            light.position.set(x, 0.11, 0.78);
            group.add(light);
        }

        group.userData.modelType = 'airfield';
        group.userData.factionColor = fc;
        return group;
    }

    createHarrier(factionColor) {
        const fc = this._factionColor(factionColor);
        const group = new THREE.Group();

        const fuselage = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.13, 1.18, 12),
            this._mat(0x7c8792, { roughness: 0.42, metalness: 0.46 })
        );
        fuselage.rotation.x = Math.PI / 2;
        fuselage.position.y = 0.08;
        fuselage.castShadow = true;
        group.add(fuselage);

        const nose = new THREE.Mesh(
            new THREE.ConeGeometry(0.09, 0.26, 12),
            this._mat(0xb0bbc4, { roughness: 0.35, metalness: 0.38 })
        );
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, 0.08, 0.72);
        nose.castShadow = true;
        group.add(nose);

        const cockpit = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.12, 0.2),
            this._mat(0x4cb8ff, { emissive: 0x2f8bcc, emissiveIntensity: 0.2, roughness: 0.18, metalness: 0.3 })
        );
        cockpit.position.set(0, 0.16, 0.18);
        cockpit.castShadow = true;
        group.add(cockpit);

        const wingLeft = new THREE.Mesh(
            new THREE.BoxGeometry(0.92, 0.04, 0.28),
            this._mat(fc, { roughness: 0.38, metalness: 0.44, emissive: fc, emissiveIntensity: 0.08 })
        );
        wingLeft.position.set(-0.38, 0.08, 0.05);
        wingLeft.rotation.z = 0.08;
        wingLeft.castShadow = true;
        group.add(wingLeft);
        const wingRight = wingLeft.clone();
        wingRight.position.x = 0.38;
        wingRight.rotation.z = -0.08;
        group.add(wingRight);

        const tail = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.28, 0.2),
            this._mat(0x6f7882, { roughness: 0.46, metalness: 0.4 })
        );
        tail.position.set(0, 0.22, -0.42);
        tail.castShadow = true;
        group.add(tail);

        for (const x of [-0.22, 0.22]) {
            const rocketPod = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 0.08, 0.36),
                this._mat(0x434850, { roughness: 0.5, metalness: 0.42 })
            );
            rocketPod.position.set(x, -0.02, 0.08);
            rocketPod.castShadow = true;
            group.add(rocketPod);
        }

        const engineGlow = new THREE.PointLight(0x66d7ff, 0.9, 2.5);
        engineGlow.position.set(0, 0.08, -0.7);
        group.add(engineGlow);
        group.userData.muzzleFlash = engineGlow;

        group.userData.modelType = 'harrier';
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
        const group = new THREE.Group();

        // Ground circle (filled, semi-transparent)
        const discGeo = new THREE.CircleGeometry(radius, 32);
        const discMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.rotation.x = -Math.PI / 2;
        disc.position.y = 0.01;
        group.add(disc);

        // Bright outer ring
        const ringGeo = new THREE.RingGeometry(radius - 0.06, radius, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        group.add(ring);

        group.userData.ringMat = ringMat;
        group.userData.discMat = discMat;
        return group;
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
