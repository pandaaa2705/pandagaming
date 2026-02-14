import * as THREE from 'three';

export class Animals {
    constructor(scene) {
        this.scene = scene;
        this.animals = [];
        this.spawnTimer = 0;
        this.spawnInterval = 2.5; // Seconds between spawns
    }

    update(dt, playerZ, levelDifficulty) {
        this.spawnTimer += dt;

        const dynamicInterval = Math.max(0.5, this.spawnInterval - (levelDifficulty * 0.3));

        if (this.spawnTimer >= dynamicInterval) {
            this.spawnTimer = 0;
            this.spawnAnimal(playerZ);
        }

        for (let i = this.animals.length - 1; i >= 0; i--) {
            const animal = this.animals[i];

            // Movement logic: Cross the road
            animal.mesh.position.x += animal.dir * animal.speed * dt;

            // Walking / Hop animation
            animal.hopTime += dt * 10;

            // Visual oscillation for legs/body
            if (animal.legs) {
                animal.legs.forEach((leg, idx) => {
                    leg.rotation.x = Math.sin(animal.hopTime + (idx % 2) * Math.PI) * 0.5;
                });
            }
            animal.mesh.position.y = (animal.type === 'deer' ? 1.5 : 0.8) + Math.abs(Math.sin(animal.hopTime * 0.5)) * 0.2;

            // Startled stops
            if (Math.random() < 0.01) animal.speed *= 0.5;
            if (animal.speed < 10) animal.speed += 5 * dt;

            if (animal.mesh.position.z > playerZ + 50) {
                this.scene.remove(animal.mesh);
                this.animals.splice(i, 1);
            }
        }
    }

    spawnAnimal(playerZ) {
        const type = Math.random() > 0.5 ? 'deer' : 'rabbit';
        const group = new THREE.Group();

        // Colors
        const color = type === 'deer' ? 0x6b4226 : 0x888888;
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });

        // Body
        const bodyGeo = new THREE.BoxGeometry(type === 'deer' ? 1.5 : 0.8, type === 'deer' ? 1.0 : 0.6, type === 'deer' ? 1.0 : 0.6);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = type === 'deer' ? 0.8 : 0.4;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(type === 'deer' ? 0.6 : 0.4, type === 'deer' ? 0.6 : 0.4, type === 'deer' ? 0.6 : 0.4);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.set(type === 'deer' ? 1.0 : 0.5, type === 'deer' ? 1.3 : 0.7, 0);
        group.add(head);

        // Ears
        const earGeo = new THREE.BoxGeometry(type === 'deer' ? 0.1 : 0.1, type === 'deer' ? 0.5 : 0.4, 0.2);
        const lEar = new THREE.Mesh(earGeo, bodyMat);
        lEar.position.set(0, 0.4, 0.15);
        head.add(lEar);
        const rEar = new THREE.Mesh(earGeo, bodyMat);
        rEar.position.set(0, 0.4, -0.15);
        head.add(rEar);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.15, type === 'deer' ? 1.0 : 0.4, 0.15);
        const legs = [];
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(legGeo, bodyMat);
            leg.position.set(
                (i < 2 ? 0.4 : -0.4) * (type === 'deer' ? 1 : 0.6),
                -(type === 'deer' ? 0.5 : 0.3),
                (i % 2 === 0 ? 0.3 : -0.3) * (type === 'deer' ? 1 : 0.6)
            );
            body.add(leg);
            legs.push(leg);
        }

        const fromLeft = Math.random() > 0.5;
        const startX = fromLeft ? -50 : 50;
        const dir = fromLeft ? 1 : -1;
        const spawnZ = playerZ - 200 - Math.random() * 80;

        group.position.set(startX, 1.0, spawnZ);
        group.rotation.y = fromLeft ? -Math.PI / 2 : Math.PI / 2;
        group.castShadow = true;

        this.scene.add(group);
        this.animals.push({
            mesh: group,
            legs: legs,
            type,
            dir,
            speed: 12 + Math.random() * 15,
            hopTime: Math.random() * Math.PI,
            radius: type === 'deer' ? 2.5 : 1.2
        });
    }

    checkCollision(carPos) {
        for (const animal of this.animals) {
            const dx = carPos.x - animal.mesh.position.x;
            const dz = carPos.z - animal.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < animal.radius + 1.2) {
                return animal;
            }
        }
        return null;
    }

    destroy() {
        this.animals.forEach(a => this.scene.remove(a.mesh));
        this.animals = [];
    }
}
