import * as THREE from 'three';

export class Car {
    constructor(scene, isPlayer, environment, stats = null, assetLoader = null) {
        this.scene = scene;
        this.isPlayer = isPlayer;
        this.environment = environment;
        this.mesh = null;
        this.stats = stats || { speed: 1, accel: 1, nitro: 1, handling: 1 };
        this.assetLoader = assetLoader;

        // State
        const startZ = 0;
        const startCurveX = environment ? environment.getCurveX(startZ) : 0;
        this.position = new THREE.Vector3(startCurveX + (isPlayer ? -3 : 3), 0.5, startZ);

        this.speed = 0;
        this.velocity = new THREE.Vector3();
        this.laneX = isPlayer ? -3 : 3;
        this.rotationY = 0;
        this.eliminated = false;
        this.animalHits = 0; // Track hits 0, 1, 2

        // Realistic Physics Stats based on Upgrades
        this.accelPower = 18 + (this.stats.accel * 4);
        this.breakingPower = 65;
        this.drag = 0.982 + (this.stats.handling * 0.001);
        this.maxSpeedBase = 45 + (this.stats.speed * 5);
        this.steerPower = 1.6 + (this.stats.handling * 0.2);
        this.driftFactor = 0.45 + (this.stats.handling * 0.05);

        this.nitro = 50 + (this.stats.nitro * 5);
        this.maxNitro = 100 + (this.stats.nitro * 10);
        this.nitroPower = 40 + (this.stats.nitro * 5);

        this.init();
    }

    init() {
        const modelName = this.isPlayer ? 'car_player' : 'car_ai';
        const customModel = this.assetLoader ? this.assetLoader.getAsset(modelName) : null;

        if (customModel) {
            this.mesh = customModel.clone();
            this.wheels = [];
            this.mesh.traverse(n => {
                if (n.name.toLowerCase().includes('wheel')) this.wheels.push(n);
            });
        } else {
            // Placeholder High-Quality Mesh
            const group = new THREE.Group();
            const bodyGeo = new THREE.BoxGeometry(2, 1, 4);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: this.isPlayer ? 0xff3333 : 0x3333ff,
                metalness: 0.8,
                roughness: 0.2
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.5;
            body.castShadow = true;
            group.add(body);

            this.wheels = [];
            const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 12);
            const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
            for (let i = 0; i < 4; i++) {
                const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(i < 2 ? -1.1 : 1.1, 0, i % 2 === 0 ? 1.5 : -1.5);
                group.add(wheel);
                this.wheels.push(wheel);
            }
            this.mesh = group;
        }

        this.createPanda();
        this.scene.add(this.mesh);
    }

    createPanda() {
        // High-quality placeholder panda driver
        const pandaGroup = new THREE.Group();

        // Body
        const bodyGeo = new THREE.SphereGeometry(0.5, 12, 12);
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

        const body = new THREE.Mesh(bodyGeo, whiteMat);
        pandaGroup.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), whiteMat);
        head.position.y = 0.6;
        pandaGroup.add(head);

        // Ears
        const earGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const lEar = new THREE.Mesh(earGeo, blackMat);
        lEar.position.set(0.25, 0.9, 0);
        head.add(lEar);
        const rEar = new THREE.Mesh(earGeo, blackMat);
        rEar.position.set(-0.25, 0.9, 0);
        head.add(rEar);

        // Eyes (Black patches)
        const eyePatchGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const lEye = new THREE.Mesh(eyePatchGeo, blackMat);
        lEye.position.set(0.15, 0.65, 0.3);
        lEye.scale.set(1.2, 1.5, 0.5);
        head.add(lEye);
        const rEye = new THREE.Mesh(eyePatchGeo, blackMat);
        rEye.position.set(-0.15, 0.65, 0.3);
        rEye.scale.set(1.2, 1.5, 0.5);
        head.add(rEye);

        // Position panda in driver seat
        pandaGroup.position.set(0.4, 0.8, 0);
        pandaGroup.rotation.y = Math.PI; // Face forward
        this.mesh.add(pandaGroup);
    }

    // ... init remains same ...

    update(dt, input, obstacles, playerCar = null) {
        if (this.eliminated) return;
        if (dt <= 0 || dt > 0.1) dt = 1 / 60;

        if (this.isPlayer) {
            this.handlePlayerInput(dt, input);
        } else {
            this.handleAI(dt, obstacles, playerCar);
        }

        // Apply Friction/Drag
        this.speed *= this.drag;
        if (Math.abs(this.speed) < 0.1) this.speed = 0;

        // Move forward relative to road curve
        this.position.z -= this.speed * dt;

        // Steer relative to curve center
        const curveX = this.environment ? this.environment.getCurveX(this.position.z) : 0;
        const targetX = curveX + this.laneX;
        const xErr = targetX - this.position.x;

        // Smoother steer interpolation
        this.position.x += xErr * 4 * dt;
        this.laneX = Math.max(-15, Math.min(15, this.laneX));

        // Rotation and Orientation
        const lookAheadZ = this.position.z - 5;
        const lookAheadX = this.environment ? this.environment.getCurveX(lookAheadZ) + this.laneX : targetX;

        // Tilt mesh slightly when steering (visual polish)
        const tilt = -xErr * 0.15;
        this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, tilt, 0.1);

        this.mesh.lookAt(lookAheadX, 0.5, lookAheadZ);
        this.mesh.position.copy(this.position);

        // Wheel spin
        const spinAmt = this.speed * dt * 4;
        this.wheels.forEach(w => { w.rotation.x += spinAmt; });
    }

    handlePlayerInput(dt, input) {
        if (!input) return;

        // Acceleration
        if (input.keys.forward) {
            this.speed += this.accelPower * dt;
        } else if (input.keys.backward) {
            this.speed -= this.breakingPower * dt;
        }

        // Handbrake
        if (input.keys.brake) {
            this.speed *= 0.95;
        }

        // Nitro
        let currentMax = this.maxSpeedBase;
        if (input.keys.nitro && this.nitro > 0) {
            this.speed += this.accelPower * 2 * dt;
            currentMax *= 1.6;
            this.nitro -= 30 * dt;
        }

        // Clamp speed
        this.speed = Math.max(-10, Math.min(currentMax, this.speed));

        // Steering
        let steerFactor = input.keys.brake ? 1.5 : 1.0;
        if (input.keys.left) {
            this.laneX -= this.steerPower * (this.speed / 20 + 0.5) * steerFactor * 15 * dt;
        }
        if (input.keys.right) {
            this.laneX += this.steerPower * (this.speed / 20 + 0.5) * steerFactor * 15 * dt;
        }
    }

    handleAI(dt, obstacles, playerCar) {
        if (!this.aiState) {
            this.aiState = {
                targetLane: this.laneX,
                pathScanDist: 150, // Scan further ahead
                lastDecisionZ: 0
            };
        }

        // 1. Pro-Level Speed & Aggression
        let baseMax = 58 + (this.stats.speed * 3); // Significant speed boost

        // Rubber banding: Stay extremely close to player regardless of upgrades
        if (playerCar && !playerCar.eliminated) {
            const zDiff = playerCar.position.z - this.position.z;
            if (zDiff < -40) baseMax += 25; // Catch up instantly
            if (zDiff > 100) baseMax -= 10; // Wait slightly but stay in sight
        }

        // 2. High-Resolution Pathfinding (Esports Professional Logic)
        // Scan 7 virtual lanes for pixel-perfect positioning
        const roadLanes = [-15, -10, -5, 0, 5, 10, 15];
        let bestLane = this.laneX;
        let bestScore = -Infinity;

        roadLanes.forEach(lx => {
            let score = 0;
            // High priority on staying near the center unless danger is present
            score -= Math.abs(lx) * 0.1;
            // Slight bias towards current position for stability
            score -= Math.abs(lx - this.laneX) * 0.5;

            // Evaluate obstacles with deep future prediction
            obstacles?.forEach(obs => {
                const dz = obs.position.z - this.position.z;
                // Look ahead up to 150 meters
                if (dz < -1 && dz > -this.aiState.pathScanDist) {
                    const roadXAtObs = this.environment.getCurveX(obs.position.z);
                    const absoluteTargetX = roadXAtObs + lx;
                    const dx = Math.abs(obs.position.x - absoluteTargetX);

                    // Critical danger zone
                    if (dx < 6) {
                        // The closer the obstacle, the more we penalize this lane
                        const proximityWeight = (this.aiState.pathScanDist - Math.abs(dz)) / this.aiState.pathScanDist;
                        score -= 5000 * (1.0 - dx / 6) * proximityWeight;
                    }
                }
            });

            if (score > bestScore) {
                bestScore = score;
                bestLane = lx;
            }
        });

        this.aiState.targetLane = bestLane;

        // 3. Precision Steering (High agility)
        const laneDiff = this.aiState.targetLane - this.laneX;
        // Fast reaction: Move up to 40 units per second for dodging
        const steerSpeed = Math.abs(laneDiff) > 5 ? 45 : 25;
        this.laneX += Math.sign(laneDiff) * Math.min(Math.abs(laneDiff), steerSpeed * dt);

        // 4. Pro Boost Management
        if (this.nitro > 10) {
            // Only boost if path is clear for 100m in the target lane
            const isPathClear = !obstacles?.some(obs => {
                const dz = obs.position.z - this.position.z;
                if (dz < -5 && dz > -100) {
                    const dx = Math.abs(obs.position.x - (this.environment.getCurveX(obs.position.z) + this.laneX));
                    return dx < 5;
                }
                return false;
            });

            if (isPathClear && (this.speed < baseMax || Math.random() < 0.05)) {
                this.speed += this.accelPower * 2.5 * dt;
                baseMax *= 1.5;
                this.nitro -= 20 * dt;
            }
        }

        // Apply Pro Acceleration
        if (this.speed < baseMax) {
            this.speed += this.accelPower * 1.5 * dt;
        } else {
            this.speed *= 0.995;
        }

        // 5. Tactical Nudging
        if (playerCar && !playerCar.eliminated) {
            const dz = playerCar.position.z - this.position.z;
            const dx = playerCar.position.x - this.position.x;
            if (Math.abs(dz) < 10 && Math.abs(dx) < 6) {
                // If AI is overtaking, slightly nudge player to disrupt them
                this.laneX += Math.sign(dx) * 8 * dt;
            }
        }

        this.laneX = Math.max(-15, Math.min(15, this.laneX));
    }

    eliminate() {
        this.eliminated = true;
        this.speed = 0;
    }

    getSpeedKmh() {
        return Math.floor(this.speed * 3.6);
    }

    destroy() {
        if (this.mesh) this.scene.remove(this.mesh);
    }
}
