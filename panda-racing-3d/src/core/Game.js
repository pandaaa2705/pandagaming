import * as THREE from 'three';
import { Input } from './Input.js';
import { Car } from '../entities/Car.js';
import { Environment } from '../entities/Environment.js';
import { Obstacles } from '../entities/Obstacles.js';
import { Animals } from '../entities/Animals.js';
import { Collectibles } from '../entities/Collectibles.js';
import { SaveSystem } from './SaveSystem.js';
import { AssetLoader } from './AssetLoader.js';
import { SoundSystem } from './SoundSystem.js';

export class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.input = new Input();
        this.saveData = SaveSystem.load();

        // Load controls settings
        this.controlsSettings = this.loadControlsSettings();

        this.assetLoader = new AssetLoader();
        this.soundSystem = null;

        this.playerCar = null;
        this.cars = [];
        this.environment = null;
        this.obstacles = null;
        this.collectibles = null;

        this.running = false;
        this.paused = false;
        this.gameOver = false;

        this.distance = 0;
        this.score = 0;
        this.startZ = 0;
        this.levelTargetDistance = 1000;
        this.finishLineSpawned = false;

        this.eliminationResult = ''; // '', 'player', 'computer', 'both'
        this.cameraMode = this.controlsSettings.cameraMode; // Use saved setting
        this.camTogglePressed = false;
    }

    async init() {
        await this.initScene();
        this.createWorld();
        this.start();
    }

    async loadAllAssets() {
        // Try loading models (placeholders will be used if 404)
        await Promise.all([
            this.assetLoader.loadModel('./assets/models/cars/car_player.glb', 'car_player'),
            this.assetLoader.loadModel('./assets/models/cars/car_ai.glb', 'car_ai'),
            this.assetLoader.loadModel('./assets/models/avatars/panda_player.glb', 'panda_player'),
            // Audio
            this.assetLoader.loadAudio('./assets/sounds/engine.mp3', 'engine'),
            this.assetLoader.loadAudio('./assets/sounds/nitro.mp3', 'nitro'),
            this.assetLoader.loadAudio('./assets/sounds/crash.mp3', 'crash'),
            this.assetLoader.loadAudio('./assets/sounds/music.mp3', 'music')
        ]);
    }

    async initScene() {
        this.scene = new THREE.Scene();
        // Bright Daytime Atmosphere
        this.scene.background = new THREE.Color(0x87ceeb); // Sky Blue
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.002); // Tighter/Lighter fog

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0; // Slightly lower exposure for bright day

        // Clear old canvases
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        this.container.appendChild(this.renderer.domElement);

        // Sound System
        this.soundSystem = new SoundSystem(this.camera);

        // Load Essential Assets
        await this.loadAllAssets();
        this.soundSystem.init(this.assetLoader);
        this.soundSystem.play('music', true, 0.3);

        // Dynamic Sun (Bright White Light)
        const sun = new THREE.DirectionalLight(0xffffff, 3.2);
        sun.position.set(200, 600, -400);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 4096;
        sun.shadow.mapSize.height = 4096;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 1500;
        sun.shadow.camera.left = -300;
        sun.shadow.camera.right = 300;
        sun.shadow.camera.top = 300;
        sun.shadow.camera.bottom = -300;
        this.sun = sun;
        this.scene.add(sun);
        this.scene.add(sun.target);

        // Visual Sun Sphere (Vibrant Yellow)
        const sunGeo = new THREE.SphereGeometry(30, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(400, 800, -1200);
        this.scene.add(sunMesh);

        // Fill light for bright daylight
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
        this.scene.add(hemi);

        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);

        window.addEventListener('resize', () => this.onResize());
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') this.togglePause();
        });

        this.clock = new THREE.Clock();

        // Mouse camera controls
        this.mouseControls = {
            enabled: true,
            isRotating: false,
            mouseX: 0,
            mouseY: 0,
            targetRotationX: 0,
            targetRotationY: 0
        };

        // Mouse event listeners
        this.setupMouseControls();
    }

    setupMouseControls() {
        const canvas = this.renderer.domElement;
        
        canvas.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Left click
                this.mouseControls.isRotating = true;
                this.mouseControls.mouseX = event.clientX;
                this.mouseControls.mouseY = event.clientY;
            }
        });

        canvas.addEventListener('mousemove', (event) => {
            if (this.mouseControls.isRotating) {
                const deltaX = event.clientX - this.mouseControls.mouseX;
                const deltaY = event.clientY - this.mouseControls.mouseY;
                
                // Update target rotation based on mouse movement
                this.mouseControls.targetRotationY += deltaX * 0.005;
                this.mouseControls.targetRotationX += deltaY * 0.005;
                
                this.mouseControls.mouseX = event.clientX;
                this.mouseControls.mouseY = event.clientY;
            }
        });

        canvas.addEventListener('mouseup', () => {
            this.mouseControls.isRotating = false;
        });

        canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault(); // Prevent right-click menu
        });
    }

    createWorld() {
        // Environment (green ground + trees + mountains)
        this.environment = new Environment(this.scene);

        // Player car
        const playerStats = this.saveData.carStats[this.saveData.selectedCarId] || { speed: 1, accel: 1, nitro: 1, handling: 1 };
        const selectedCar = localStorage.getItem('selectedCar') || 'car_lamborghini';
        this.playerCar = new Car(this.scene, true, this.environment, playerStats, this.assetLoader, selectedCar);
        this.cars.push(this.playerCar);

        // Computer car
        this.computerCar = new Car(this.scene, false, this.environment, null, this.assetLoader);
        this.cars.push(this.computerCar);

        // Obstacles manager
        this.obstacles = new Obstacles(this.scene);

        // Animals manager
        this.animals = new Animals(this.scene);

        // Collectibles manager
        this.collectibles = new Collectibles(this.scene);

        this.startZ = this.playerCar.position.z;
        this.level = 1; // Start level
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
            // Camera toggle logic
            if (this.input.keys.changeCamera) {
                if (!this.camTogglePressed) {
                    this.cameraMode = this.cameraMode === 'TPP' ? 'FPP' : 'TPP';
                    this.camTogglePressed = true;
                }
            } else {
                this.camTogglePressed = false;
            }

            // Update cars
            this.playerCar.update(dt, this.input, null);
            // AI car now takes playerCar for competitive behaviors
            this.computerCar.update(dt, null, this.obstacles.getActiveObstacles(), this.playerCar);

            // Distance & score
            this.distance = Math.abs(this.playerCar.position.z - this.startZ);
            this.score = Math.floor(this.distance / 10);

            // Update systems
            this.obstacles.update(dt, this.playerCar.position.z, this.distance);
            this.animals.update(dt, this.playerCar.position.z, this.level);
            this.collectibles.update(dt, this.playerCar.position.z);
            this.environment.update(this.playerCar.position.z);

            // === COLLISION CHECKS ===
            let playerHit = false;
            let computerHit = false;
            let hitAnimal = false;
            let hitMountain = false;

            // Drivable road bounds from Environment
            const roadCurveX = this.environment.getCurveX(this.playerCar.position.z);
            const boundary = this.environment.mountainBoundary || 45;

            if (!this.playerCar.eliminated) {
                // Obstacles
                if (this.obstacles.checkCollision(this.playerCar.position)) playerHit = true;

                // Animals - 2 Hit Survival Rule
                const collidedAnimal = this.animals.checkCollision(this.playerCar.position);
                if (collidedAnimal) {
                    this.playerCar.animalHits++;
                    if (this.playerCar.animalHits <= 2) {
                        this.showAnimalWarning(`Animal Hits: ${this.playerCar.animalHits}/2`, false);
                        this.soundSystem.play('crash', false, 0.4);
                        // Brief slow down instead of death
                        this.playerCar.speed *= 0.6;
                        // Move animal out of way
                        collidedAnimal.mesh.position.x += 100;
                    } else {
                        playerHit = true;
                        hitAnimal = true;
                    }
                }

                // Collectibles
                const collected = this.collectibles.checkCollision(this.playerCar.position);
                if (collected === 'nitro') {
                    this.playerCar.nitro = Math.min(this.playerCar.maxNitro, this.playerCar.nitro + 35);
                }

                // Mountain boundaries
                if (Math.abs(this.playerCar.position.x - roadCurveX) > boundary) {
                    playerHit = true;
                    hitMountain = true;
                }
            }

            if (!this.computerCar.eliminated) {
                const compCurveX = this.environment.getCurveX(this.computerCar.position.z);
                if (this.obstacles.checkCollision(this.computerCar.position)) computerHit = true;

                // AI also follows animal hit rules
                const compCollidedAnimal = this.animals.checkCollision(this.computerCar.position);
                if (compCollidedAnimal) {
                    this.computerCar.animalHits++;
                    if (this.computerCar.animalHits <= 2) {
                        this.showAnimalWarning(`Animal Hits: ${this.computerCar.animalHits}/2`, true);
                        this.computerCar.speed *= 0.7;
                        compCollidedAnimal.mesh.position.x += 100;
                    } else {
                        computerHit = true;
                        hitAnimal = true;
                    }
                }

                if (Math.abs(this.computerCar.position.x - compCurveX) > boundary) {
                    computerHit = true;
                    hitMountain = true;
                }
            }

            // Car-to-car collision
            const carDist = this.playerCar.position.distanceTo(this.computerCar.position);
            if (carDist < 2.5 && !this.playerCar.eliminated && !this.computerCar.eliminated) {
                const playerAhead = this.playerCar.position.z < this.computerCar.position.z;
                if (playerAhead) this.computerCar.speed *= 0.5; else this.playerCar.speed *= 0.5;
                const pushDir = this.playerCar.position.x < this.computerCar.position.x ? -1 : 1;
                this.playerCar.laneX += pushDir * 3;
                this.computerCar.laneX -= pushDir * 3;
            }

            // Process eliminations
            if (playerHit && computerHit) {
                this.onElimination('both', hitAnimal, hitMountain);
            } else if (playerHit) {
                this.onElimination('player', hitAnimal, hitMountain);
            } else if (computerHit) {
                this.onElimination('computer', hitAnimal, hitMountain);
            }

            // Move sun shadow with player for infinite shadow coverage
            if (this.sun && this.playerCar) {
                this.sun.position.set(
                    this.playerCar.position.x + 100,
                    400,
                    this.playerCar.position.z - 100
                );
                this.sun.target.position.copy(this.playerCar.position);
                this.sun.target.updateMatrixWorld();
            }

            if (this.distance >= this.levelTargetDistance) {
                // Infinite progression: increase target for next "lap"
                this.levelTargetDistance += 1000;
                this.level++;
                this.soundSystem.play('nitro', false, 0.4); // Milestone sound
            }
        }

        this.updateCamera();
        this.updateHUD();

        this.renderer.render(this.scene, this.camera);
    }

    onElimination(who, hitAnimal = false, hitMountain = false) {
        this.gameOver = true;
        this.eliminationResult = who;
        this.playerCar.eliminate();
        this.computerCar.eliminate();

        // Save progress on death
        SaveSystem.addScore(this.score);
        this.saveData.totalScore += this.score;
        SaveSystem.save(this.saveData);

        const overlay = document.getElementById('elimination-overlay');
        const titleEl = document.getElementById('elimination-text');
        const statsEl = document.getElementById('elimination-stats');

        if (who === 'player') {
            if (hitMountain) titleEl.textContent = '💥 CRASHED INTO MOUNTAIN — ELIMINATED';
            else titleEl.textContent = hitAnimal ? 'You hit an animal — Eliminated' : '💥 PLAYER ELIMINATED';
            titleEl.style.cssText = 'background: linear-gradient(135deg, #ff3355, #ff8800); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;';
        } else if (who === 'computer') {
            if (hitMountain) titleEl.textContent = 'Computer hit mountain — YOU WIN!';
            else titleEl.textContent = hitAnimal ? 'Computer hit an animal — YOU WIN!' : '🏆 COMPUTER ELIMINATED — YOU WIN!';
            titleEl.style.cssText = 'background: linear-gradient(135deg, #00ff88, #00ccff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;';
        } else {
            titleEl.textContent = hitMountain ? '💥 BOTH CRASHED INTO MOUNTAINS' : (hitAnimal ? '💥 BOTH HIT ANIMALS' : '💥 BOTH ELIMINATED');
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

        let targetPos = new THREE.Vector3();
        let lookPos = new THREE.Vector3();

        // Camera smoothing factor based on settings
        const smoothingFactor = this.controlsSettings.cameraSmoothing / 100;

        // Apply mouse rotation if enabled
        if (this.mouseControls.enabled) {
            // Smooth mouse rotation
            this.mouseControls.targetRotationX *= 0.95; // Damping
            this.mouseControls.targetRotationY *= 0.95;
        }

        if (this.cameraMode === 'TPP') {
            // Third Person View with customizable settings
            const distance = this.controlsSettings.cameraDistance;
            const height = this.controlsSettings.cameraHeight;
            
            // Dynamic offset based on speed and settings
            const offsetZ = distance + speed * 0.15;
            const offsetY = height + speed * 0.05;
            
            if (this.controlsSettings.cameraMode === 'close') {
                // Close follow view
                targetPos.set(p.x * 0.3, offsetY * 0.7, p.z + offsetZ * 0.7);
                lookPos.set(p.x, p.y + 0.8, p.z - 15);
            } else {
                // Default outside view
                targetPos.set(p.x * 0.5, offsetY, p.z + offsetZ);
                lookPos.set(p.x, p.y + 1.2, p.z - 20);
            }

            // Apply mouse rotation to camera position
            const mouseOffsetX = Math.sin(this.mouseControls.targetRotationY) * 10;
            const mouseOffsetZ = -Math.cos(this.mouseControls.targetRotationY) * 10;
            const mouseOffsetY = Math.sin(this.mouseControls.targetRotationX) * 5;
            
            targetPos.x += mouseOffsetX;
            targetPos.y += mouseOffsetY;
            targetPos.z += mouseOffsetZ;

            this.camera.position.lerp(targetPos, smoothingFactor);
            this.camera.lookAt(lookPos);
        } else {
            // First Person View (In driver seat)
            targetPos.set(p.x, p.y + 1.1, p.z - 0.5);
            lookPos.set(p.x, p.y + 0.8, p.z - 40);

            // Apply mouse rotation to first person view
            const mouseRotationX = this.mouseControls.targetRotationX * 0.3;
            const mouseRotationY = this.mouseControls.targetRotationY * 0.5;
            
            this.camera.rotation.x = mouseRotationX;
            this.camera.rotation.y = mouseRotationY;

            // Fast jump to FPP, slow lerp back to TPP
            this.camera.position.lerp(targetPos, 0.4);
            this.camera.lookAt(lookPos);
        }

        // Dynamic FOV based on speed
        this.camera.fov = 70 + speed * 0.5;
        this.camera.updateProjectionMatrix();
    }

    onVictory() {
    }

    showAnimalWarning(message, isAI = false) {
        const warningEl = document.getElementById('animal-warning');
        if (warningEl) {
            // Large centered display
            const title = isAI ? "AI HIT AN ANIMAL!" : "YOU HIT AN ANIMAL!";
            warningEl.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">${title}</div>
                <div style="font-size: 32px;">${message}</div>
            `;

            warningEl.classList.remove('hidden');
            warningEl.classList.add('visible');

            if (this.warningTimeout) clearTimeout(this.warningTimeout);
            this.warningTimeout = setTimeout(() => {
                warningEl.classList.remove('visible');
                warningEl.classList.add('hidden');
            }, 3000);
        }
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

    // Controls Settings Methods
    loadControlsSettings() {
        const controls = localStorage.getItem('pandaRacingControls');
        const defaultControls = {
            cameraMode: 'outside',
            cameraDistance: 10,
            cameraHeight: 8,
            steeringSensitivity: 5,
            cameraSmoothing: 7
        };
        return controls ? JSON.parse(controls) : defaultControls;
    }

    setCameraMode(mode) {
        this.controlsSettings.cameraMode = mode;
        this.cameraMode = mode === 'inside' ? 'FPP' : 'TPP';
    }

    setCameraDistance(distance) {
        this.controlsSettings.cameraDistance = distance;
    }

    setCameraHeight(height) {
        this.controlsSettings.cameraHeight = height;
    }

    setSteeringSensitivity(sensitivity) {
        this.controlsSettings.steeringSensitivity = sensitivity;
        if (this.playerCar && this.playerCar.setSteeringSensitivity) {
            this.playerCar.setSteeringSensitivity(sensitivity);
        }
    }

    setCameraSmoothing(smoothing) {
        this.controlsSettings.cameraSmoothing = smoothing;
    }

    destroy() {
        this.running = false;
        this.renderer.setAnimationLoop(null);

        // Save current progress before destroying
        if (this.score > 0 && !this.gameOver) {
            SaveSystem.addScore(this.score);
            this.saveData.totalScore += this.score;
            SaveSystem.save(this.saveData);
        }

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
