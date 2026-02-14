import * as THREE from 'three';

export class Car {
    constructor(scene, isPlayer) {
        this.scene = scene;
        this.isPlayer = isPlayer;
        this.mesh = null;

        // State
        this.position = new THREE.Vector3(isPlayer ? -3 : 3, 0.5, 0);
        this.speed = 0;
        this.laneX = isPlayer ? -3 : 3; // Target lane position
        this.eliminated = false;

        // Stats
        this.maxSpeed = 45;
        this.acceleration = 18;
        this.baseSpeed = 25; // Auto-forward speed
        this.steerSpeed = 15;
        this.nitro = 50;
        this.maxNitro = 100;

        this.init();
    }

    init() {
        const group = new THREE.Group();
        const mainColor = this.isPlayer ? 0xff2222 : 0x2244ff;
        const roofColor = this.isPlayer ? 0xdd1111 : 0x1133cc;

        // Body
        const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: mainColor, metalness: 0.4, roughness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.4;
        body.castShadow = true;
        group.add(body);

        // Roof
        const roofGeo = new THREE.BoxGeometry(1.6, 0.55, 2);
        const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, metalness: 0.3, roughness: 0.5 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 1.05;
        roof.position.z = -0.1;
        roof.castShadow = true;
        group.add(roof);

        // Windshield
        const windGeo = new THREE.BoxGeometry(1.4, 0.45, 0.08);
        const windMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 });
        const w = new THREE.Mesh(windGeo, windMat);
        w.position.set(0, 0.95, -1.1);
        group.add(w);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 10);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        this.wheels = [];
        [[-1, 0.28, 1.1], [1, 0.28, 1.1], [-1, 0.28, -1.1], [1, 0.28, -1.1]].forEach(p => {
            const wh = new THREE.Mesh(wheelGeo, wheelMat);
            wh.rotation.z = Math.PI / 2;
            wh.position.set(p[0], p[1], p[2]);
            group.add(wh);
            this.wheels.push(wh);
        });

        // Headlights
        const lgGeo = new THREE.SphereGeometry(0.12, 6, 6);
        const lgMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffcc, emissiveIntensity: 0.6 });
        [[-0.6, 0.45, -2], [0.6, 0.45, -2]].forEach(p => {
            const l = new THREE.Mesh(lgGeo, lgMat);
            l.position.set(p[0], p[1], p[2]);
            group.add(l);
        });

        // Panda driver (placeholder)
        const pandaHead = new THREE.SphereGeometry(0.32, 10, 10);
        const pandaMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const head = new THREE.Mesh(pandaHead, pandaMat);
        head.position.set(0, 1.3, -0.1);
        group.add(head);

        // Panda ears
        const earGeo = new THREE.SphereGeometry(0.12, 6, 6);
        const earMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        [[-0.22, 1.55, -0.1], [0.22, 1.55, -0.1]].forEach(p => {
            const ear = new THREE.Mesh(earGeo, earMat);
            ear.position.set(p[0], p[1], p[2]);
            group.add(ear);
        });

        // Eye patches
        const patchGeo = new THREE.SphereGeometry(0.09, 6, 6);
        const patchMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        [[-0.12, 1.32, -0.35], [0.12, 1.32, -0.35]].forEach(p => {
            const patch = new THREE.Mesh(patchGeo, patchMat);
            patch.position.set(p[0], p[1], p[2]);
            group.add(patch);
        });

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    update(dt, input, obstacles) {
        if (this.eliminated) return;
        if (dt <= 0 || dt > 0.1) dt = 1 / 60;

        if (this.isPlayer) {
            this.updatePlayer(dt, input);
        } else {
            this.updateAI(dt, obstacles);
        }

        // Move forward
        this.position.z -= this.speed * dt;

        // Steer toward target lane
        const laneErr = this.laneX - this.position.x;
        this.position.x += laneErr * 5 * dt;

        // Clamp X to road bounds (-12 to 12)
        this.position.x = Math.max(-12, Math.min(12, this.position.x));

        // Always on ground
        this.position.y = 0.5;

        // Sync mesh
        this.mesh.position.copy(this.position);

        // Wheel spin
        const spinAmt = this.speed * dt * 4;
        this.wheels.forEach(w => { w.rotation.x += spinAmt; });
    }

    updatePlayer(dt, input) {
        if (!input) return;

        // Speed control
        if (input.keys.forward) {
            this.speed += this.acceleration * dt;
        } else if (input.keys.backward) {
            this.speed -= this.acceleration * 1.5 * dt;
        } else {
            // Auto-drive at base speed
            if (this.speed < this.baseSpeed) {
                this.speed += this.acceleration * 0.5 * dt;
            } else {
                this.speed *= 0.995;
            }
        }

        // Nitro
        if (input.keys.nitro && this.nitro > 0) {
            this.speed += this.acceleration * 2 * dt;
            this.nitro -= 25 * dt;
            if (this.nitro < 0) this.nitro = 0;
        }

        // Clamp speed
        this.speed = Math.max(5, Math.min(this.maxSpeed * (input.keys.nitro ? 1.5 : 1), this.speed));

        // Steering
        if (input.keys.left) {
            this.laneX -= this.steerSpeed * dt;
        }
        if (input.keys.right) {
            this.laneX += this.steerSpeed * dt;
        }
        this.laneX = Math.max(-12, Math.min(12, this.laneX));
    }

    updateAI(dt, obstacles) {
        // AI at competitive speed
        if (this.speed < this.baseSpeed * 1.05) {
            this.speed += this.acceleration * 0.4 * dt;
        }
        this.speed = Math.max(this.baseSpeed * 0.9, Math.min(this.maxSpeed * 0.95, this.speed));

        // Avoid obstacles
        if (obstacles && obstacles.length > 0) {
            for (const obs of obstacles) {
                const dz = obs.position.z - this.position.z;
                const dx = obs.position.x - this.position.x;

                // Only react to obstacles ahead and close
                if (dz < 0 && dz > -40 && Math.abs(dx) < 4) {
                    // Steer away
                    if (dx > 0) {
                        this.laneX -= this.steerSpeed * 0.8 * dt;
                    } else {
                        this.laneX += this.steerSpeed * 0.8 * dt;
                    }
                }
            }
        }

        // Slight random weaving for realism
        this.laneX += (Math.sin(Date.now() * 0.001) * 0.5) * dt;
        this.laneX = Math.max(-10, Math.min(10, this.laneX));
    }

    eliminate() {
        this.eliminated = true;
        this.speed = 0;
    }

    getSpeedKmh() {
        return Math.floor(Math.abs(this.speed) * 3.6);
    }

    destroy() {
        if (this.mesh) this.scene.remove(this.mesh);
    }
}
