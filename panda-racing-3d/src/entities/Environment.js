import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.trees = [];
        this.scenery = [];
        this.lastSpawnZ = 0;
        this.spawnAhead = 500; // Furthest visibility
        this.cleanBehind = 150;
        this.roadWidth = 35;
        this.mountainBoundary = 55;

        this.createGround();
        this.createBackgroundMountains();
    }

    createGround() {
        // Massive ground plane with repeat texture feeling
        const geo = new THREE.PlaneGeometry(12000, 12000);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x3d8c40, // More vibrant green
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(geo, mat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.ground = ground;
    }

    createBackgroundMountains() {
        // Static distant mountains
        for (let i = 0; i < 40; i++) {
            const h = 100 + Math.random() * 200;
            const r = 80 + Math.random() * 120;
            const geo = new THREE.ConeGeometry(r, h, 6);
            const shade = 0x2d4d2d + Math.floor(Math.random() * 0x111111);
            const mat = new THREE.MeshStandardMaterial({ color: shade });
            const mesh = new THREE.Mesh(geo, mat);

            const angle = Math.random() * Math.PI * 2;
            const dist = 1200 + Math.random() * 800;
            mesh.position.set(Math.cos(angle) * dist, h * 0.4, Math.sin(angle) * dist - 800);
            this.scene.add(mesh);
        }
    }

    update(playerZ) {
        if (this.ground) {
            this.ground.position.z = playerZ;
            this.ground.position.x = this.getCurveX(playerZ);
        }

        // Spawn trees and forest elements ahead
        while (this.lastSpawnZ > playerZ - this.spawnAhead) {
            this.spawnForestRow(this.lastSpawnZ);
            this.lastSpawnZ -= 20;
        }

        // Clean up
        this.cleanUp(playerZ);
    }

    cleanUp(playerZ) {
        for (let i = this.trees.length - 1; i >= 0; i--) {
            if (this.trees[i].position.z > playerZ + this.cleanBehind) {
                this.scene.remove(this.trees[i]);
                this.trees.splice(i, 1);
            }
        }
        for (let i = this.scenery.length - 1; i >= 0; i--) {
            if (this.scenery[i].position.z > playerZ + this.cleanBehind) {
                this.scene.remove(this.scenery[i]);
                this.scenery.splice(i, 1);
            }
        }
    }

    getCurveX(z) {
        return Math.sin(z * 0.01) * 25 + Math.cos(z * 0.004) * 50;
    }

    spawnForestRow(z) {
        const curveX = this.getCurveX(z);
        const dist = Math.abs(z);
        // Difficulty scaling formula: starts normal, grows denser over 10km
        const densityMultiplier = 1 + Math.min(2, dist / 5000);

        // 1. Road Trees (close to path)
        const roadTreeCount = Math.floor((6 + Math.floor(Math.random() * 8)) * densityMultiplier);
        for (let i = 0; i < roadTreeCount; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = curveX + side * (this.roadWidth * 0.5 + 5 + Math.random() * 30);
            this.createTree(x, z + (Math.random() - 0.5) * 15);
        }

        // 2. Deep Forest Filler (filling the blank space)
        const fillerCount = Math.floor((10 + Math.floor(Math.random() * 10)) * densityMultiplier);
        for (let i = 0; i < fillerCount; i++) {
            const x = curveX + (Math.random() - 0.5) * 1000;
            if (Math.abs(x - curveX) > 60) {
                this.createTree(x, z + (Math.random() - 0.5) * 20, true);
            }
        }

        // 3. Grass/Boulders scenery
        const sceneryCount = 15;
        for (let i = 0; i < sceneryCount; i++) {
            const x = curveX + (Math.random() - 0.5) * 200;
            if (Math.abs(x - curveX) > 20) {
                this.createScenery(x, z + (Math.random() - 0.5) * 20);
            }
        }
    }

    createTree(x, z, isFiller = false) {
        const group = new THREE.Group();
        const baseH = isFiller ? 15 + Math.random() * 20 : 8 + Math.random() * 10;

        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, baseH, 5);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4d2d1e });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = baseH * 0.5;
        group.add(trunk);

        const leavesMat = new THREE.MeshStandardMaterial({
            color: 0x1a4a1a + Math.floor(Math.random() * 0x103010),
            roughness: 0.8
        });

        for (let i = 0; i < 3; i++) {
            const lyrH = baseH * (0.8 - i * 0.2);
            const lyrR = (isFiller ? 5 : 3.5) * (1 - i * 0.2);
            const lyr = new THREE.Mesh(new THREE.ConeGeometry(lyrR, lyrH, 6), leavesMat);
            lyr.position.y = baseH * 0.6 + i * (lyrH * 0.3);
            lyr.castShadow = !isFiller; // Shadows only for close trees for perf
            group.add(lyr);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.trees.push(group);
    }

    createScenery(x, z) {
        const isRock = Math.random() > 0.7;
        let mesh;
        if (isRock) {
            const s = 1 + Math.random() * 3;
            mesh = new THREE.Mesh(
                new THREE.DodecahedronGeometry(s, 0),
                new THREE.MeshStandardMaterial({ color: 0x666666 })
            );
            mesh.position.y = s * 0.5;
        } else {
            // Grass tuft
            const s = 0.5 + Math.random() * 1.5;
            mesh = new THREE.Mesh(
                new THREE.SphereGeometry(s, 5, 5),
                new THREE.MeshStandardMaterial({ color: 0x3d8c40 })
            );
            mesh.scale.y = 0.2;
            mesh.position.y = 0.1;
        }
        mesh.position.x = x;
        mesh.position.z = z;
        this.scene.add(mesh);
        this.scenery.push(mesh);
    }
}
