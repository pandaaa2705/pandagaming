import * as THREE from 'three';

export class Animals {
    constructor(scene) {
        this.scene = scene;
        this.animals = [];
        this.spawnTimer = 0;
        this.spawnInterval = 3; // Seconds between spawns
        this.animalTypes = ['rhino', 'lion', 'tiger', 'deer', 'dinosaur', 'horse', 'zebra', 'giraffe'];
    }

    update(dt, playerZ, levelDifficulty) {
        this.spawnTimer += dt;

        const dynamicInterval = Math.max(1.5, this.spawnInterval - (levelDifficulty * 0.2));

        if (this.spawnTimer >= dynamicInterval) {
            this.spawnTimer = 0;
            this.spawnAnimalBesideRoad(playerZ);
        }

        for (let i = this.animals.length - 1; i >= 0; i--) {
            const animal = this.animals[i];

            // Animals move beside the road (not crossing)
            // They walk parallel to the road direction
            animal.mesh.position.z += animal.speed * dt * 0.3; // Move forward slowly
            
            // Side-to-side idle movement
            animal.idleTime += dt;
            animal.mesh.position.x += Math.sin(animal.idleTime * 0.5) * 0.02;

            // Animation - legs/body
            if (animal.legs) {
                animal.legs.forEach((leg, idx) => {
                    leg.rotation.x = Math.sin(animal.idleTime * 2 + (idx % 2) * Math.PI) * 0.3;
                });
            }
            
            // Breathing animation
            animal.mesh.position.y = animal.baseY + Math.sin(animal.idleTime) * 0.1;

            // Remove if too far behind or ahead
            if (animal.mesh.position.z > playerZ + 100 || animal.mesh.position.z < playerZ - 300) {
                this.scene.remove(animal.mesh);
                this.animals.splice(i, 1);
            }
        }
    }

    spawnAnimalBesideRoad(playerZ) {
        const type = this.animalTypes[Math.floor(Math.random() * this.animalTypes.length)];
        const group = this.createAnimalMesh(type);
        
        // Spawn beside the road (not on it)
        // Road is roughly at x = curveX, width ~35
        const roadCurveX = 0; // Approximate - could get from environment
        const side = Math.random() > 0.5 ? 1 : -1;
        const distanceFromRoad = 25 + Math.random() * 30; // 25-55 units from road center
        
        const spawnX = roadCurveX + side * distanceFromRoad;
        const spawnZ = playerZ - 150 - Math.random() * 100;
        const baseY = this.getAnimalHeight(type);

        group.position.set(spawnX, baseY, spawnZ);
        
        // Face along the road (z direction)
        group.rotation.y = side > 0 ? Math.PI : 0;
        group.castShadow = true;

        this.scene.add(group);
        this.animals.push({
            mesh: group,
            legs: group.userData.legs || [],
            type,
            speed: 5 + Math.random() * 8,
            idleTime: Math.random() * Math.PI * 2,
            baseY: baseY,
            radius: this.getAnimalRadius(type)
        });
    }

    createAnimalMesh(type) {
        const group = new THREE.Group();
        group.userData.legs = [];
        
        const colors = {
            rhino: 0x808080,
            lion: 0xdaa520,
            tiger: 0xff8c00,
            deer: 0x8b4513,
            dinosaur: 0x2e8b57,
            horse: 0x8b4513,
            zebra: 0xffffff,
            giraffe: 0xffd700
        };
        
        const color = colors[type] || 0x888888;
        const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        // Size multipliers
        const sizes = {
            rhino: { body: [2.5, 1.8, 4], head: [1.2, 1.2, 1.5] },
            lion: { body: [1.8, 1.4, 3], head: [1, 1, 1.2] },
            tiger: { body: [1.8, 1.4, 3.2], head: [1, 1, 1.2] },
            deer: { body: [1.2, 1.2, 2.2], head: [0.5, 0.6, 0.8] },
            dinosaur: { body: [3, 2.5, 6], head: [1.5, 1.2, 2] },
            horse: { body: [1.5, 1.6, 2.8], head: [0.6, 0.7, 1] },
            zebra: { body: [1.5, 1.5, 2.6], head: [0.6, 0.7, 1] },
            giraffe: { body: [1.8, 2, 3], head: [0.5, 1.2, 0.8] }
        };
        
        const size = sizes[type] || sizes.deer;
        
        // Body
        const bodyGeo = new THREE.BoxGeometry(...size.body);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = size.body[1] / 2;
        group.add(body);
        
        // Head
        const headGeo = new THREE.BoxGeometry(...size.head);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.set(size.body[0] / 2 + size.head[0] / 3, size.body[1] * 0.8, 0);
        group.add(head);
        
        // Special features for different animals
        if (type === 'giraffe') {
            // Long neck
            const neckGeo = new THREE.BoxGeometry(0.6, 2.5, 0.6);
            const neck = new THREE.Mesh(neckGeo, bodyMat);
            neck.position.set(size.body[0] / 2, size.body[1] + 1, 0);
            group.add(neck);
            head.position.set(size.body[0] / 2 + 0.3, size.body[1] + 2.2, 0);
            
            // Spots
            for (let i = 0; i < 6; i++) {
                const spot = new THREE.Mesh(
                    new THREE.CircleGeometry(0.3, 8),
                    new THREE.MeshBasicMaterial({ color: 0x8b4513 })
                );
                spot.position.set(size.body[0] / 2 - 0.1, 0.5 + i * 0.4, size.body[2] / 2 + 0.01);
                spot.rotation.y = Math.PI / 2;
                body.add(spot);
            }
        }
        
        if (type === 'zebra') {
            // Black stripes
            for (let i = 0; i < 5; i++) {
                const stripe = new THREE.Mesh(
                    new THREE.BoxGeometry(size.body[0] + 0.1, size.body[1], 0.1),
                    darkMat
                );
                stripe.position.set(0, 0, -size.body[2] / 2 + (i + 0.5) * (size.body[2] / 5));
                body.add(stripe);
            }
        }
        
        if (type === 'rhino') {
            // Horn
            const horn = new THREE.Mesh(
                new THREE.ConeGeometry(0.15, 0.8, 8),
                new THREE.MeshStandardMaterial({ color: 0x444444 })
            );
            horn.position.set(0, 0.6, 0);
            head.add(horn);
        }
        
        if (type === 'lion' || type === 'tiger') {
            // Mane for lion
            if (type === 'lion') {
                const mane = new THREE.Mesh(
                    new THREE.SphereGeometry(0.8, 8, 6),
                    new THREE.MeshStandardMaterial({ color: 0xb8860b })
                );
                mane.position.set(-0.3, 0, 0);
                head.add(mane);
            }
            // Stripes for tiger
            if (type === 'tiger') {
                for (let i = 0; i < 4; i++) {
                    const stripe = new THREE.Mesh(
                        new THREE.BoxGeometry(0.1, size.body[1], 0.2),
                        darkMat
                    );
                    stripe.position.set(0, 0, -size.body[2] / 2 + (i + 1) * (size.body[2] / 5));
                    body.add(stripe);
                }
            }
        }
        
        // Legs
        const legCount = type === 'dinosaur' ? 4 : 4;
        const legHeight = size.body[1] * 0.6;
        const legGeo = new THREE.BoxGeometry(0.25, legHeight, 0.25);
        
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(legGeo, bodyMat);
            const xOffset = i < 2 ? size.body[0] / 3 : -size.body[0] / 3;
            const zOffset = i % 2 === 0 ? size.body[2] / 4 : -size.body[2] / 4;
            leg.position.set(xOffset, -size.body[1] / 2 + legHeight / 2, zOffset);
            body.add(leg);
            group.userData.legs.push(leg);
        }
        
        // Tail
        const tailGeo = new THREE.CylinderGeometry(0.1, 0.05, 1.5);
        const tail = new THREE.Mesh(tailGeo, bodyMat);
        tail.rotation.z = Math.PI / 3;
        tail.position.set(-size.body[0] / 2 - 0.3, size.body[1] / 3, 0);
        body.add(tail);
        
        return group;
    }

    getAnimalHeight(type) {
        const heights = {
            rhino: 1.5,
            lion: 1.2,
            tiger: 1.2,
            deer: 1.0,
            dinosaur: 2.0,
            horse: 1.4,
            zebra: 1.4,
            giraffe: 3.5
        };
        return heights[type] || 1.0;
    }

    getAnimalRadius(type) {
        const radii = {
            rhino: 4,
            lion: 2.5,
            tiger: 2.5,
            deer: 2,
            dinosaur: 5,
            horse: 2.5,
            zebra: 2.5,
            giraffe: 3
        };
        return radii[type] || 2;
    }

    checkCollision(carPos) {
        // Animals are beside the road, so collision is unlikely
        // But check anyway for safety
        for (const animal of this.animals) {
            const dx = carPos.x - animal.mesh.position.x;
            const dz = carPos.z - animal.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            // Animals are far from road, so only count if very close
            if (dist < animal.radius + 1.5) {
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
