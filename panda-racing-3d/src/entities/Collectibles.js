import * as THREE from 'three';

export class Collectibles {
    constructor(scene) {
        this.scene = scene;
        this.items = [];
        this.lastSpawnZ = 0;
        this.spawnAhead = 400;
        this.cleanBehind = 100;
    }

    update(dt, playerZ) {
        // Spawn nitro bottles ahead
        while (this.lastSpawnZ > playerZ - this.spawnAhead) {
            if (Math.random() > 0.7) {
                this.spawnNitro(this.lastSpawnZ);
            }
            this.lastSpawnZ -= 80; // Sparse spawns
        }

        // Update items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];

            // Animation: Spin and float
            item.mesh.rotation.y += dt * 3;
            item.mesh.position.y = 1.0 + Math.sin(Date.now() * 0.005) * 0.2;

            // Clean up
            if (item.mesh.position.z > playerZ + this.cleanBehind) {
                this.scene.remove(item.mesh);
                this.items.splice(i, 1);
            }
        }
    }

    spawnNitro(z) {
        const group = new THREE.Group();

        // Bottle Shape
        const bodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x00ccff,
            emissive: 0x004466,
            metalness: 0.9,
            roughness: 0.1
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // Cap
        const capGeo = new THREE.CylinderGeometry(0.15, 0.4, 0.3, 8);
        const capMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 0.75;
        group.add(cap);

        // Glow
        const light = new THREE.PointLight(0x00ccff, 1, 5);
        light.position.y = 0.5;
        group.add(light);

        // Position on road (random lane)
        const curveX = this.getCurveX(z);
        const lx = curveX + (Math.random() - 0.5) * 20;

        group.position.set(lx, 1, z);
        this.scene.add(group);
        this.items.push({ mesh: group, type: 'nitro' });
    }

    checkCollision(carPos) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            const dx = carPos.x - item.mesh.position.x;
            const dz = carPos.z - item.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 2.5) {
                this.scene.remove(item.mesh);
                this.items.splice(i, 1);
                return item.type;
            }
        }
        return null;
    }

    // Reference to curve (should be synced with Environment)
    getCurveX(z) {
        return Math.sin(z * 0.01) * 25 + Math.cos(z * 0.004) * 50;
    }

    destroy() {
        this.items.forEach(i => this.scene.remove(i.mesh));
        this.items = [];
    }
}
