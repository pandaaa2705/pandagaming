import * as THREE from 'three';
import { Input } from './Input.js';
import { Car } from '../entities/Car.js';
import { Environment } from '../entities/Environment.js';
import { Obstacles } from '../entities/Obstacles.js';

export class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.input = new Input();

        this.playerCar = null;
        this.computerCar = null;
        this.environment = null;
        this.obstacles = null;

        this.running = false;
        this.paused = false;
        this.gameOver = false;

        this.distance = 0;
        this.score = 0;
        this.startZ = 0;

        this.eliminationResult = ''; // '', 'player', 'computer', 'both'

        this.initScene();
        this.createWorld();
        this.start();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 350);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.3;

        // Clear old canvases
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        this.container.appendChild(this.renderer.domElement);

        // Sun light
        const sun = new THREE.DirectionalLight(0xffffff, 1.8);
        sun.position.set(100, 250, -100);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 600;
        sun.shadow.camera.left = -150;
        sun.shadow.camera.right = 150;
        sun.shadow.camera.top = 150;
        sun.shadow.camera.bottom = -150;
        this.sun = sun;
        this.scene.add(sun);

        // Sun visual
        const sunGeo = new THREE.SphereGeometry(12, 12, 12);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
        this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
        this.sunMesh.position.set(100, 250, -300);
        this.scene.add(this.sunMesh);

        // Sky light
        const hemi = new THREE.HemisphereLight(0x87CEEB, 0x2d8a4e, 0.7);
        this.scene.add(hemi);

        const ambient = new THREE.AmbientLight(0x555555, 0.6);
        this.scene.add(ambient);

        window.addEventListener('resize', () => this.onResize());
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') this.togglePause();
        });

        this.clock = new THREE.Clock();
    }

    createWorld() {
        // Environment (green ground + trees + mountains — NO black track, NO red wall)
        this.environment = new Environment(this.scene);

        // Player car (RED, on the left)
        this.playerCar = new Car(this.scene, true);

        // Computer car (BLUE, on the right)
        this.computerCar = new Car(this.scene, false);

        // Obstacles manager
        this.obstacles = new Obstacles(this.scene);

        this.startZ = this.playerCar.position.z;
    }

    start() {
        this.running = true;
        this.clock.start();
        this.renderer.setAnimationLoop(() => this.update());
    }

    update() {
        if (!this.running) return;

        let dt = this.clock.getDelta();
        if (dt > 0.1) dt = 1 / 60;
        if (dt <= 0) return;

        if (!this.paused && !this.gameOver) {
            // Update cars
            this.playerCar.update(dt, this.input, null);
            this.computerCar.update(dt, null, this.obstacles.getActiveObstacles());

            // Distance & score
            this.distance = Math.abs(this.playerCar.position.z - this.startZ);
            this.score = Math.floor(this.distance / 10);

            // Update obstacles (spawn/despawn based on distance)
            this.obstacles.update(dt, this.playerCar.position.z, this.distance);

            // Update environment (scrolling trees, ground)
            this.environment.update(this.playerCar.position.z);

            // Move sun shadow with player
            this.sun.position.z = this.playerCar.position.z - 100;
            this.sun.target.position.z = this.playerCar.position.z;
            this.sun.target.updateMatrixWorld();
            this.sunMesh.position.z = this.playerCar.position.z - 300;

            // === COLLISION CHECKS ===
            let playerHit = false;
            let computerHit = false;

            if (!this.playerCar.eliminated) {
                const pHit = this.obstacles.checkCollision(this.playerCar.position);
                if (pHit) {
                    playerHit = true;
                }
            }

            if (!this.computerCar.eliminated) {
                const cHit = this.obstacles.checkCollision(this.computerCar.position);
                if (cHit) {
                    computerHit = true;
                }
            }

            // Car-to-car collision
            const carDist = this.playerCar.position.distanceTo(this.computerCar.position);
            if (carDist < 2.5 && !this.playerCar.eliminated && !this.computerCar.eliminated) {
                // Push both apart and slow the one behind
                const playerAhead = this.playerCar.position.z < this.computerCar.position.z;
                if (playerAhead) {
                    this.computerCar.speed *= 0.5;
                } else {
                    this.playerCar.speed *= 0.5;
                }
                // Push apart in X
                const pushDir = this.playerCar.position.x < this.computerCar.position.x ? -1 : 1;
                this.playerCar.laneX += pushDir * 3;
                this.computerCar.laneX -= pushDir * 3;
            }

            // Process eliminations
            if (playerHit && computerHit) {
                this.playerCar.eliminate();
                this.computerCar.eliminate();
                this.onElimination('both');
            } else if (playerHit) {
                this.playerCar.eliminate();
                this.onElimination('player');
            } else if (computerHit) {
                this.computerCar.eliminate();
                this.onElimination('computer');
            }
        }

        this.updateCamera();
        this.updateHUD();

        this.renderer.render(this.scene, this.camera);
    }

    onElimination(who) {
        this.gameOver = true;
        this.eliminationResult = who;

        const overlay = document.getElementById('elimination-overlay');
        const titleEl = document.getElementById('elimination-text');
        const statsEl = document.getElementById('elimination-stats');

        if (who === 'player') {
            titleEl.textContent = '💥 PLAYER ELIMINATED';
            titleEl.style.cssText = 'background: linear-gradient(135deg, #ff3355, #ff8800); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;';
        } else if (who === 'computer') {
            titleEl.textContent = '🏆 COMPUTER ELIMINATED — YOU WIN!';
            titleEl.style.cssText = 'background: linear-gradient(135deg, #00ff88, #00ccff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;';
        } else {
            titleEl.textContent = '💥 BOTH ELIMINATED';
            titleEl.style.cssText = 'background: linear-gradient(135deg, #ff6600, #ffcc00); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;';
        }

        statsEl.textContent = `Distance: ${Math.floor(this.distance)}m | Score: ${this.score}`;

        // Show overlay after small delay
        setTimeout(() => {
            if (overlay) overlay.classList.remove('hidden');
        }, 800);

        // Update status
        const statusEl = document.getElementById('status-display');
        if (statusEl) {
            statusEl.classList.remove('status-running');
            statusEl.classList.add('status-eliminated');
            if (who === 'player') {
                statusEl.textContent = 'STATUS: PLAYER ELIMINATED';
            } else if (who === 'computer') {
                statusEl.classList.remove('status-eliminated');
                statusEl.classList.add('status-winner');
                statusEl.textContent = 'STATUS: YOU WIN!';
            } else {
                statusEl.textContent = 'STATUS: BOTH ELIMINATED';
            }
        }
    }

    updateHUD() {
        const distEl = document.getElementById('distance-display');
        if (distEl) distEl.textContent = `DISTANCE: ${Math.floor(this.distance)}m`;

        const scoreEl = document.getElementById('score-display');
        if (scoreEl) scoreEl.textContent = `SCORE: ${this.score}`;

        const speedEl = document.getElementById('speed-display');
        if (speedEl) speedEl.textContent = `${this.playerCar.getSpeedKmh()} KM/H`;

        const nitroFill = document.getElementById('nitro-fill');
        if (nitroFill) nitroFill.style.width = `${this.playerCar.nitro}%`;

        if (!this.gameOver) {
            const statusEl = document.getElementById('status-display');
            if (statusEl) statusEl.textContent = 'STATUS: RACING';
        }
    }

    updateCamera() {
        if (!this.playerCar || !this.playerCar.mesh) return;

        const p = this.playerCar.position;
        const speed = Math.abs(this.playerCar.speed);

        // Third-person behind camera
        const camX = p.x * 0.3;
        const camY = 5 + speed * 0.04;
        const camZ = p.z + 14 + speed * 0.08;

        const target = new THREE.Vector3(camX, Math.max(camY, 4), camZ);
        this.camera.position.lerp(target, 0.06);
        this.camera.lookAt(p.x, p.y + 1, p.z - 15);
    }

    togglePause() {
        if (this.gameOver) return;
        this.paused = !this.paused;
        const pm = document.getElementById('pause-menu');
        if (pm) pm.classList.toggle('hidden', !this.paused);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    destroy() {
        this.running = false;
        this.renderer.setAnimationLoop(null);
        if (this.input) this.input.destroy();
        if (this.playerCar) this.playerCar.destroy();
        if (this.computerCar) this.computerCar.destroy();
        if (this.obstacles) this.obstacles.destroy();

        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
        this.renderer.dispose();
    }
}
