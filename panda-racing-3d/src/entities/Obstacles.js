import * as THREE from 'three';

export class Obstacles {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = []; // { mesh, position, radius }
        this.spawnTimer = 0;
        this.totalDistance = 0;
    }

    update(dt, playerZ, distance) {
        this.totalDistance = distance;
        this.spawnTimer += dt;

        // Dynamic spawn rate based on distance
        let spawnInterval;
        if (distance < 500) {
            spawnInterval = 1.8; // Few obstacles
        } else if (distance < 1500) {
            spawnInterval = 1.0; // Moderate
        } else if (distance < 3000) {
            spawnInterval = 0.6; // Dense
        } else {
            spawnInterval = 0.35; // Very dense
        }

        // Spawn new obstacles ahead
        if (this.spawnTimer >= spawnInterval) {
            this.spawnTimer = 0;
            this.spawnObstacle(playerZ);
        }

        // Remove obstacles that are far behind
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            if (this.obstacles[i].position.z > playerZ + 50) {
                this.scene.remove(this.obstacles[i].mesh);
                this.obstacles.splice(i, 1);
            }
        }
    }

    spawnObstacle(playerZ) {
        const x = (Math.random() - 0.5) * 24; // Road width -12 to 12
        const z = playerZ - 120 - Math.random() * 80; // Ahead of player

        const type = Math.random();

        if (type < 0.35) {
            this.createRock(x, z);
        } else if (type < 0.6) {
            this.createLog(x, z);
        } else if (type < 0.8) {
            this.createBarrel(x, z);
        } else {
            this.createBoulder(x, z);
        }
    }

    createRock(x, z) {
        const size = 0.8 + Math.random() * 1.0;
        const geo = new THREE.DodecahedronGeometry(size, 0);
        const shade = 0x555555 + Math.floor(Math.random() * 0x333333);
        const mat = new THREE.MeshStandardMaterial({ color: shade, roughness: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, size * 0.4, z);
        mesh.rotation.set(Math.random(), Math.random(), Math.random());
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.obstacles.push({ mesh, position: mesh.position, radius: size + 0.3, type: 'rock' });
    }

    createLog(x, z) {
        const length = 2 + Math.random() * 3;
        const geo = new THREE.CylinderGeometry(0.4, 0.4, length, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x6b3a1f, roughness: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, 0.4, z);
        mesh.rotation.z = Math.PI / 2;
        mesh.rotation.y = Math.random() * Math.PI;
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.obstacles.push({ mesh, position: mesh.position, radius: 1.2, type: 'log' });
    }

    createBarrel(x, z) {
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 1.1, 10);
        const mat = new THREE.MeshStandardMaterial({ color: 0xcc6600 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, 0.55, z);
        mesh.castShadow = true;
        this.scene.add(mesh);

        // Stripe
        const sg = new THREE.CylinderGeometry(0.52, 0.52, 0.25, 10);
        const sm = new THREE.MeshStandardMaterial({ color: 0xff8800 });
        const stripe = new THREE.Mesh(sg, sm);
        stripe.position.y = 0.2;
        mesh.add(stripe);

        this.obstacles.push({ mesh, position: mesh.position, radius: 0.8, type: 'barrel' });
    }

    createBoulder(x, z) {
        const size = 1.5 + Math.random() * 1.5;
        const geo = new THREE.SphereGeometry(size, 6, 6);
        const mat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, size * 0.4, z);
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.obstacles.push({ mesh, position: mesh.position, radius: size + 0.3, type: 'boulder' });
    }

    checkCollision(carPosition) {
        for (const obs of this.obstacles) {
            const dx = carPosition.x - obs.position.x;
            const dz = carPosition.z - obs.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < obs.radius + 1.2) {
                return obs;
            }
        }
        return null;
    }

    getActiveObstacles() {
        return this.obstacles;
    }

    destroy() {
        this.obstacles.forEach(o => this.scene.remove(o.mesh));
        this.obstacles = [];
    }
}
