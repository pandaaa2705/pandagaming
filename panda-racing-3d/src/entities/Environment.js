import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.trees = [];
        this.treePool = [];
        this.lastSpawnZ = 0;
        this.spawnAhead = 300;
        this.cleanBehind = 80;

        this.createGround();
        this.createMountainsAndClouds();
    }

    createGround() {
        // Large green ground — NO BLACK TRACK
        const geo = new THREE.PlaneGeometry(8000, 8000);
        const mat = new THREE.MeshStandardMaterial({ color: 0x2d8a4e, roughness: 0.95 });
        const ground = new THREE.Mesh(geo, mat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.ground = ground;
    }

    createMountainsAndClouds() {
        // Distant mountains (static, far away)
        for (let i = 0; i < 30; i++) {
            const h = 50 + Math.random() * 100;
            const r = 30 + Math.random() * 50;
            const geo = new THREE.ConeGeometry(r, h, 8);
            const shade = 0x3a5a3a + Math.floor(Math.random() * 0x222222);
            const mat = new THREE.MeshStandardMaterial({ color: shade, roughness: 0.9 });
            const mesh = new THREE.Mesh(geo, mat);

            const angle = Math.random() * Math.PI * 2;
            const dist = 400 + Math.random() * 300;
            mesh.position.set(Math.cos(angle) * dist, h / 2 - 15, Math.sin(angle) * dist - 500);
            this.scene.add(mesh);

            // Snow caps
            if (h > 80) {
                const sg = new THREE.ConeGeometry(r * 0.25, h * 0.15, 8);
                const sm = new THREE.MeshStandardMaterial({ color: 0xeeeeff });
                const snow = new THREE.Mesh(sg, sm);
                snow.position.copy(mesh.position);
                snow.position.y += h * 0.42;
                this.scene.add(snow);
            }
        }

        // Clouds
        const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
        for (let i = 0; i < 15; i++) {
            const group = new THREE.Group();
            for (let j = 0; j < 3 + Math.floor(Math.random() * 3); j++) {
                const r = 6 + Math.random() * 10;
                const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 7), cloudMat);
                puff.position.set((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 10);
                group.add(puff);
            }
            const angle = Math.random() * Math.PI * 2;
            const dist = 200 + Math.random() * 400;
            group.position.set(Math.cos(angle) * dist, 90 + Math.random() * 50, Math.sin(angle) * dist - 300);
            this.scene.add(group);
        }
    }

    update(playerZ) {
        // Move ground with player so it never ends
        if (this.ground) {
            this.ground.position.z = playerZ;
        }

        // Spawn trees ahead
        while (this.lastSpawnZ > playerZ - this.spawnAhead) {
            this.spawnTreeRow(this.lastSpawnZ);
            this.lastSpawnZ -= 15; // Every 15 units
        }

        // Clean trees behind
        for (let i = this.trees.length - 1; i >= 0; i--) {
            if (this.trees[i].position.z > playerZ + this.cleanBehind) {
                this.scene.remove(this.trees[i]);
                this.trees.splice(i, 1);
            }
        }
    }

    spawnTreeRow(z) {
        // Trees on both sides of the "road" (road is ~ -14 to 14)
        const count = 3 + Math.floor(Math.random() * 4);

        for (let i = 0; i < count; i++) {
            // Left side
            const lx = -16 - Math.random() * 50;
            this.createTree(lx, z + (Math.random() - 0.5) * 10);

            // Right side
            const rx = 16 + Math.random() * 50;
            this.createTree(rx, z + (Math.random() - 0.5) * 10);
        }
    }

    createTree(x, z) {
        const group = new THREE.Group();

        const trunkH = 3 + Math.random() * 4;
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, trunkH, 5);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        group.add(trunk);

        const leavesH = 5 + Math.random() * 4;
        const leavesR = 2.5 + Math.random() * 2;
        const green = 0x1a6b3a + Math.floor(Math.random() * 0x103010);
        const leavesGeo = new THREE.ConeGeometry(leavesR, leavesH, 7);
        const leavesMat = new THREE.MeshStandardMaterial({ color: green });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = trunkH + leavesH / 2 - 1;
        leaves.castShadow = true;
        group.add(leaves);

        // Second cone layer
        const leaves2 = new THREE.Mesh(
            new THREE.ConeGeometry(leavesR * 0.65, leavesH * 0.6, 7),
            leavesMat
        );
        leaves2.position.y = trunkH + leavesH - 0.5;
        group.add(leaves2);

        const s = 0.7 + Math.random() * 0.5;
        group.scale.set(s, s, s);
        group.position.set(x, 0, z);

        this.scene.add(group);
        this.trees.push(group);
    }
}
