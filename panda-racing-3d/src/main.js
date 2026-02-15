import * as THREE from 'three';
import { Game } from './core/Game.js';
import { SaveSystem } from './core/SaveSystem.js';

let currentGame = null;

window.addEventListener('DOMContentLoaded', () => {
    // ... loading animation ...
    const loaderFill = document.getElementById('loader-fill');
    const loadingScreen = document.getElementById('loading-screen');
    const mainMenu = document.getElementById('main-menu');
    const hud = document.getElementById('hud');
    const garageScreen = document.getElementById('garage-screen');
    const controlsScreen = document.getElementById('controls-screen');
    const avatarScreen = document.getElementById('avatar-screen');
    const carScreen = document.getElementById('car-screen');

    let saveData = SaveSystem.load();

    // Controls Settings Management
    const defaultControls = {
        cameraMode: 'outside',
        cameraDistance: 10,
        cameraHeight: 8,
        steeringSensitivity: 5,
        cameraSmoothing: 7
    };

    function loadControlsSettings() {
        const controls = localStorage.getItem('pandaRacingControls');
        return controls ? JSON.parse(controls) : defaultControls;
    }

    function saveControlsSettings(settings) {
        localStorage.setItem('pandaRacingControls', JSON.stringify(settings));
    }

    function updateControlsUI() {
        const settings = loadControlsSettings();
        
        // Update camera mode radio buttons
        document.querySelectorAll('input[name="camera-mode"]').forEach(radio => {
            radio.checked = radio.value === settings.cameraMode;
        });
        
        // Update sliders
        document.getElementById('camera-distance').value = settings.cameraDistance;
        document.getElementById('camera-distance-value').textContent = settings.cameraDistance;
        
        document.getElementById('camera-height').value = settings.cameraHeight;
        document.getElementById('camera-height-value').textContent = settings.cameraHeight;
        
        document.getElementById('steering-sensitivity').value = settings.steeringSensitivity;
        document.getElementById('steering-sensitivity-value').textContent = settings.steeringSensitivity;
        
        document.getElementById('camera-smoothing').value = settings.cameraSmoothing;
        document.getElementById('camera-smoothing-value').textContent = settings.cameraSmoothing;
    }

    // Refresh UI with Save Data
    function updateGarageUI() {
        saveData = SaveSystem.load();
        const scoreEl = document.getElementById('garage-score');
        if (scoreEl) scoreEl.textContent = `Score: ${saveData.totalScore}`;

        const carId = saveData.selectedCarId;
        const stats = saveData.carStats[carId] || { speed: 1, accel: 1, nitro: 1, handling: 1 };

        // Update Stat Bars
        ['speed', 'accel', 'nitro', 'handling'].forEach(stat => {
            const bar = document.getElementById(`stat-${stat}-fill`);
            const levelEl = document.getElementById(`stat-${stat}-level`);
            const costBtn = document.getElementById(`btn-upgrade-${stat}`);

            if (bar) bar.style.width = `${stats[stat] * 10}%`;
            if (levelEl) levelEl.textContent = `Lvl ${stats[stat]}`;
            if (costBtn) {
                const cost = SaveSystem.getUpgradeCost(carId, stat);
                costBtn.textContent = stats[stat] < 10 ? `UPGRADE (${cost})` : 'MAXED';
                costBtn.disabled = saveData.totalScore < cost || stats[stat] >= 10;
            }
        });
    }

    async function startGame() {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        hud.classList.remove('hidden');

        if (currentGame) currentGame.destroy();
        currentGame = new Game();
        await currentGame.init();
        window.game = currentGame;
    }

    // Navigation
    document.getElementById('btn-play')?.addEventListener('click', () => startGame());

    document.getElementById('btn-avatar')?.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        avatarScreen.classList.remove('hidden');
        updateAvatarUI();
    });

    document.getElementById('btn-car')?.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        carScreen.classList.remove('hidden');
        updateCarUI();
    });

    document.getElementById('btn-garage')?.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        garageScreen.classList.remove('hidden');
        updateGarageUI();
    });

    document.getElementById('btn-garage-back')?.addEventListener('click', () => {
        garageScreen.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });

    document.getElementById('btn-avatar-back')?.addEventListener('click', () => {
        avatarScreen.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });

    document.getElementById('btn-car-back')?.addEventListener('click', () => {
        carScreen.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });

    // Avatar Selection Functions
    function updateAvatarUI() {
        const selectedAvatar = localStorage.getItem('selectedAvatar') || 'panda_classic';
        document.querySelectorAll('.selection-card').forEach(card => {
            card.classList.toggle('active', card.dataset.id === selectedAvatar);
        });
        
        // Update 3D preview
        console.log('Updating avatar preview for:', selectedAvatar);
        updateAvatarPreview(selectedAvatar);
    }

    function updateAvatarPreview(avatarType) {
        const previewContainer = document.getElementById('avatar-preview-3d');
        if (!previewContainer) {
            console.log('Avatar preview container not found');
            return;
        }
        
        // Clear existing preview
        previewContainer.innerHTML = '';
        
        try {
            // Create mini scene for preview
            const previewScene = new THREE.Scene();
            const previewCamera = new THREE.PerspectiveCamera(50, 300/200, 0.1, 1000);
            const previewRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            previewRenderer.setSize(300, 200);
            previewRenderer.setClearColor(0x000000, 0);
            previewContainer.appendChild(previewRenderer.domElement);
            
            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            previewScene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 10, 5);
            previewScene.add(directionalLight);
            
            // Create preview avatar based on type
            const avatarGroup = createPreviewAvatar(avatarType);
            previewScene.add(avatarGroup);
            
            // Position camera
            previewCamera.position.set(0, 2, 5);
            previewCamera.lookAt(0, 1, 0);
            
            // Animation loop
            function animatePreview() {
                requestAnimationFrame(animatePreview);
                avatarGroup.rotation.y += 0.01;
                previewRenderer.render(previewScene, previewCamera);
            }
            animatePreview();
            
            console.log('Avatar preview created for:', avatarType);
        } catch (error) {
            console.error('Error creating avatar preview:', error);
            previewContainer.innerHTML = '<div style="color: white; text-align: center; padding: 20px;">Preview Error</div>';
        }
    }

    function createPreviewAvatar(avatarType) {
        const group = new THREE.Group();
        
        // Base panda model
        const bodyGeometry = new THREE.SphereGeometry(0.7, 20, 20);
        let bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        
        switch(avatarType) {
            case 'panda_sport':
                bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff6b35 });
                break;
            case 'panda_pro':
                bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x4dabf7 });
                break;
            case 'panda_ninja':
                bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
                break;
            case 'panda_mystic':
                bodyMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x9b59b6,
                    emissive: 0x8e44ad,
                    emissiveIntensity: 0.2
                });
                break;
        }
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.scale.set(1, 1.3, 1);
        group.add(body);
        
        return group;
    }

    // Car Selection Functions
    function updateCarUI() {
        const selectedCar = localStorage.getItem('selectedCar') || 'car_lamborghini';
        document.querySelectorAll('#car-screen .selection-card').forEach(card => {
            card.classList.toggle('active', card.dataset.id === selectedCar);
        });
        
        // Update 3D preview
        console.log('Updating car preview for:', selectedCar);
        updateCarPreview(selectedCar);
    }

    function updateCarPreview(carType) {
        const previewContainer = document.getElementById('car-preview-3d');
        if (!previewContainer) {
            console.log('Car preview container not found');
            return;
        }
        
        // Clear existing preview
        previewContainer.innerHTML = '';
        
        // Create 3D scene for each car type with unique design
        const previewScene = new THREE.Scene();
        const previewCamera = new THREE.PerspectiveCamera(45, 300/200, 0.1, 100);
        const previewRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        previewRenderer.setSize(300, 200);
        previewRenderer.setClearColor(0x000000, 0);
        previewContainer.appendChild(previewRenderer.domElement);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        previewScene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        previewScene.add(dirLight);
        
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-5, 5, -10);
        previewScene.add(backLight);
        
        // Create unique 3D car model based on type
        const carGroup = createUniqueCarModel(carType);
        previewScene.add(carGroup);
        
        // Position camera based on car type for best view
        previewCamera.position.set(0, 2, 8);
        previewCamera.lookAt(0, 0.5, 0);
        
        // Animation loop with 360 rotation
        let rotationSpeed = 0.01;
        function animateCar() {
            requestAnimationFrame(animateCar);
            carGroup.rotation.y += rotationSpeed;
            previewRenderer.render(previewScene, previewCamera);
        }
        animateCar();
        
        console.log('3D car preview created for:', carType);
    }
    
    function createUniqueCarModel(carType) {
        const carGroup = new THREE.Group();
        
        switch(carType) {
            case 'car_lamborghini':
                createLamborghiniModel(carGroup);
                break;
            case 'car_bugatti':
                createBugattiModel(carGroup);
                break;
            case 'car_supra':
                createSupraModel(carGroup);
                break;
            case 'car_porsche':
                createPorscheModel(carGroup);
                break;
            case 'car_ferrari':
                createFerrariModel(carGroup);
                break;
            default:
                createLamborghiniModel(carGroup);
        }
        
        return carGroup;
    }
    
    // LAMBORGHINI - Sharp angular supercar
    function createLamborghiniModel(group) {
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x0047ab, shininess: 100, metalness: 0.6 });
        const glassMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 90 });
        
        // Lower body - main chassis
        const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 6), bodyMat);
        lowerBody.position.y = 0.6;
        group.add(lowerBody);
        
        // Upper body - cabin area
        const upperBody = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, 3), bodyMat);
        upperBody.position.set(0, 1.3, -0.5);
        group.add(upperBody);
        
        // Front hood
        const hood = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 2), bodyMat);
        hood.position.set(0, 1.15, 1.8);
        hood.rotation.x = -0.1;
        group.add(hood);
        
        // Rear deck
        const rear = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 2), bodyMat);
        rear.position.set(0, 1.2, -2.5);
        group.add(rear);
        
        // Windshield
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), glassMat);
        windshield.position.set(0, 1.5, 0.8);
        windshield.rotation.x = -Math.PI / 4;
        group.add(windshield);
        
        // Side windows
        const sideWindowGeo = new THREE.PlaneGeometry(1.5, 0.6);
        const leftWindow = new THREE.Mesh(sideWindowGeo, glassMat);
        leftWindow.position.set(-1.41, 1.4, -0.5);
        leftWindow.rotation.y = -Math.PI / 2;
        group.add(leftWindow);
        
        const rightWindow = new THREE.Mesh(sideWindowGeo, glassMat);
        rightWindow.position.set(1.41, 1.4, -0.5);
        rightWindow.rotation.y = Math.PI / 2;
        group.add(rightWindow);
        
        // Scissor doors (Lamborghini signature)
        const doorGeo = new THREE.BoxGeometry(0.1, 1, 2);
        const leftDoor = new THREE.Mesh(doorGeo, bodyMat);
        leftDoor.position.set(-1.8, 1.2, -0.3);
        leftDoor.rotation.z = Math.PI / 8;
        group.add(leftDoor);
        
        const rightDoor = new THREE.Mesh(doorGeo, bodyMat);
        rightDoor.position.set(1.8, 1.2, -0.3);
        rightDoor.rotation.z = -Math.PI / 8;
        group.add(rightDoor);
        
        // Rear spoiler
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 0.8), bodyMat);
        spoiler.position.set(0, 1.7, -3);
        group.add(spoiler);
        
        // Spoiler supports
        const supportGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);
        const leftSupport = new THREE.Mesh(supportGeo, bodyMat);
        leftSupport.position.set(-1, 1.55, -3);
        group.add(leftSupport);
        const rightSupport = new THREE.Mesh(supportGeo, bodyMat);
        rightSupport.position.set(1, 1.55, -3);
        group.add(rightSupport);
        
        // Wheels
        addRealisticWheels(group, 1.6, 1.8);
        
        // Angular headlights
        addCarHeadlights(group, 'angular');
        
        // Taillights
        addCarTaillights(group);
    }
    
    // BUGATTI - Elegant luxury hypercar
    function createBugattiModel(group) {
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 120, metalness: 0.5 });
        const chromeMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, shininess: 150 });
        const glassMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 90 });
        
        // Main body - longer and elegant
        const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.9, 6.5), bodyMat);
        body.position.y = 0.65;
        group.add(body);
        
        // Cabin - bubble shape
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(3, 0.7, 2.5), bodyMat);
        cabin.position.set(0, 1.45, -0.5);
        group.add(cabin);
        
        // Rounded front
        const front = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.5, 16, 1, false, 0, Math.PI), bodyMat);
        front.rotation.z = Math.PI / 2;
        front.position.set(0, 0.65, 3.25);
        group.add(front);
        
        // Windshield - curved
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), glassMat);
        windshield.position.set(0, 1.6, 0.6);
        windshield.rotation.x = -Math.PI / 5;
        group.add(windshield);
        
        // Side windows
        const sideWinGeo = new THREE.PlaneGeometry(2, 0.5);
        const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
        leftWin.position.set(-1.51, 1.5, -0.5);
        leftWin.rotation.y = -Math.PI / 2;
        group.add(leftWin);
        
        const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
        rightWin.position.set(1.51, 1.5, -0.5);
        rightWin.rotation.y = Math.PI / 2;
        group.add(rightWin);
        
        // Horse collar grille
        const grille = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.15, 16), chromeMat);
        grille.rotation.x = Math.PI / 2;
        grille.position.set(0, 0.7, 3.35);
        group.add(grille);
        
        // Chrome side accents
        const chromeSideGeo = new THREE.BoxGeometry(0.05, 0.1, 5);
        const leftChrome = new THREE.Mesh(chromeSideGeo, chromeMat);
        leftChrome.position.set(-1.91, 0.7, 0);
        group.add(leftChrome);
        
        const rightChrome = new THREE.Mesh(chromeSideGeo, chromeMat);
        rightChrome.position.set(1.91, 0.7, 0);
        group.add(rightChrome);
        
        // Wheels
        addRealisticWheels(group, 1.7, 2);
        
        // Round headlights
        addCarHeadlights(group, 'round');
        addCarTaillights(group);
    }
    
    // SUPRA - Japanese sports car
    function createSupraModel(group) {
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff1493, shininess: 80 });
        const darkMat = new THREE.MeshPhongMaterial({ color: 0xcc1077 });
        const glassMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 90 });
        const stripeMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
        
        // Main body
        const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.85, 5.5), bodyMat);
        body.position.y = 0.625;
        group.add(body);
        
        // Cabin
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 2.2), darkMat);
        cabin.position.set(0, 1.35, -0.3);
        group.add(cabin);
        
        // Hood
        const hood = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 1.8), bodyMat);
        hood.position.set(0, 1.125, 1.5);
        group.add(hood);
        
        // Trunk
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 1.5), bodyMat);
        trunk.position.set(0, 1.15, -2);
        group.add(trunk);
        
        // Windshield
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), glassMat);
        windshield.position.set(0, 1.55, 0.7);
        windshield.rotation.x = -Math.PI / 4;
        group.add(windshield);
        
        // Side windows
        const sideWinGeo = new THREE.PlaneGeometry(1.8, 0.5);
        const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
        leftWin.position.set(-1.31, 1.45, -0.3);
        leftWin.rotation.y = -Math.PI / 2;
        group.add(leftWin);
        
        const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
        rightWin.position.set(1.31, 1.45, -0.3);
        rightWin.rotation.y = Math.PI / 2;
        group.add(rightWin);
        
        // Big rear spoiler
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.6), darkMat);
        spoiler.position.set(0, 1.65, -2.5);
        group.add(spoiler);
        
        // Spoiler legs
        const legGeo = new THREE.BoxGeometry(0.08, 0.3, 0.15);
        const leftLeg = new THREE.Mesh(legGeo, darkMat);
        leftLeg.position.set(-0.8, 1.45, -2.5);
        group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, darkMat);
        rightLeg.position.set(0.8, 1.45, -2.5);
        group.add(rightLeg);
        
        // Racing stripe on hood
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 1.6), stripeMat);
        stripe.position.set(0, 1.26, 1.5);
        group.add(stripe);
        
        // Stripe on trunk
        const trunkStripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 1.4), stripeMat);
        trunkStripe.position.set(0, 1.31, -2);
        group.add(trunkStripe);
        
        // Wheels
        addRealisticWheels(group, 1.5, 1.7);
        
        // Sport headlights
        addCarHeadlights(group, 'sport');
        addCarTaillights(group);
    }
    
    // PORSCHE - Classic 911
    function createPorscheModel(group) {
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 90 });
        const glassMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 90 });
        
        // Main rounded body
        const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 5.2), bodyMat);
        body.position.y = 0.65;
        group.add(body);
        
        // Rounded front
        const front = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.4, 16, 1, false, 0, Math.PI), bodyMat);
        front.rotation.z = Math.PI / 2;
        front.position.set(0, 0.65, 2.6);
        group.add(front);
        
        // Long sloping rear (911 signature)
        const rear = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 2), bodyMat);
        rear.position.set(0, 1, -2.6);
        rear.rotation.x = -0.15;
        group.add(rear);
        
        // Cabin
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.55, 2), bodyMat);
        cabin.position.set(0, 1.4, -0.4);
        group.add(cabin);
        
        // Windshield
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.6), glassMat);
        windshield.position.set(0, 1.55, 0.5);
        windshield.rotation.x = -Math.PI / 4;
        group.add(windshield);
        
        // Side windows
        const sideWinGeo = new THREE.PlaneGeometry(1.6, 0.45);
        const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
        leftWin.position.set(-1.41, 1.45, -0.4);
        leftWin.rotation.y = -Math.PI / 2;
        group.add(leftWin);
        
        const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
        rightWin.position.set(1.41, 1.45, -0.4);
        rightWin.rotation.y = Math.PI / 2;
        group.add(rightWin);
        
        // Rear window
        const rearWindow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.4), glassMat);
        rearWindow.position.set(0, 1.5, -1.4);
        rearWindow.rotation.x = Math.PI / 6;
        group.add(rearWindow);
        
        // Wheels
        addRealisticWheels(group, 1.5, 1.8);
        
        // Round headlights (911 signature)
        addCarHeadlights(group, 'round');
        addCarTaillights(group);
    }
    
    // FERRARI - Italian supercar
    function createFerrariModel(group) {
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff0000, shininess: 100, metalness: 0.4 });
        const darkMat = new THREE.MeshPhongMaterial({ color: 0xcc0000 });
        const glassMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 90 });
        
        // Lower body
        const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.75, 6), bodyMat);
        lowerBody.position.y = 0.575;
        group.add(lowerBody);
        
        // Upper cabin
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 2.2), bodyMat);
        cabin.position.set(0, 1.275, -0.3);
        group.add(cabin);
        
        // Hood
        const hood = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 2), bodyMat);
        hood.position.set(0, 1.075, 1.8);
        group.add(hood);
        
        // Rear deck
        const rear = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 2), bodyMat);
        rear.position.set(0, 1.1, -2.3);
        group.add(rear);
        
        // Windshield
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), glassMat);
        windshield.position.set(0, 1.5, 0.7);
        windshield.rotation.x = -Math.PI / 3.5;
        group.add(windshield);
        
        // Side windows
        const sideWinGeo = new THREE.PlaneGeometry(1.7, 0.5);
        const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
        leftWin.position.set(-1.31, 1.4, -0.3);
        leftWin.rotation.y = -Math.PI / 2;
        group.add(leftWin);
        
        const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
        rightWin.position.set(1.31, 1.4, -0.3);
        rightWin.rotation.y = Math.PI / 2;
        group.add(rightWin);
        
        // Ferrari logo on hood
        const logo = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), new THREE.MeshPhongMaterial({ color: 0xffff00 }));
        logo.rotation.x = Math.PI / 2;
        logo.position.set(0, 1.18, 1.8);
        group.add(logo);
        
        // Front splitter
        const splitter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.3), darkMat);
        splitter.position.set(0, 0.25, 3.1);
        group.add(splitter);
        
        // Rear diffuser
        const diffuser = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 0.4), darkMat);
        diffuser.position.set(0, 0.25, -3.1);
        group.add(diffuser);
        
        // Small spoiler
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.4), darkMat);
        spoiler.position.set(0, 1.4, -2.6);
        group.add(spoiler);
        
        // Wheels
        addRealisticWheels(group, 1.5, 1.8);
        
        // Sport headlights
        addCarHeadlights(group, 'sport');
        addCarTaillights(group);
    }
    
    // Helper: Add realistic wheels
    function addRealisticWheels(group, xPos, zPos) {
        const tireMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 30 });
        const rimMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 80 });
        
        const positions = [
            [-xPos, 0.35, zPos],
            [xPos, 0.35, zPos],
            [-xPos, 0.35, -zPos],
            [xPos, 0.35, -zPos]
        ];
        
        positions.forEach(pos => {
            const wheelGroup = new THREE.Group();
            
            // Tire
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16), tireMat);
            tire.rotation.z = Math.PI / 2;
            wheelGroup.add(tire);
            
            // Rim
            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 16), rimMat);
            rim.rotation.z = Math.PI / 2;
            wheelGroup.add(rim);
            
            // Spokes
            for (let i = 0; i < 5; i++) {
                const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), rimMat);
                spoke.rotation.x = (i / 5) * Math.PI * 2;
                spoke.rotation.z = Math.PI / 2;
                wheelGroup.add(spoke);
            }
            
            wheelGroup.position.set(...pos);
            group.add(wheelGroup);
        });
    }
    
    // Helper: Add headlights
    function addCarHeadlights(group, style) {
        const lightMat = new THREE.MeshPhongMaterial({ 
            color: 0xffffcc, 
            emissive: 0xffffcc, 
            emissiveIntensity: 0.6 
        });
        
        if (style === 'angular') {
            // Lamborghini style - sharp angles
            const left = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), lightMat);
            left.position.set(-1.2, 0.85, 3.05);
            left.rotation.y = 0.1;
            group.add(left);
            
            const right = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), lightMat);
            right.position.set(1.2, 0.85, 3.05);
            right.rotation.y = -0.1;
            group.add(right);
        } else if (style === 'round') {
            // Bugatti/Porsche style - round
            const left = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 8), lightMat);
            left.position.set(-1.1, 0.85, 3);
            group.add(left);
            
            const right = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 8), lightMat);
            right.position.set(1.1, 0.85, 3);
            group.add(right);
        } else {
            // Sport style - slim rectangles
            const left = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.1), lightMat);
            left.position.set(-1, 0.85, 3);
            group.add(left);
            
            const right = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.1), lightMat);
            right.position.set(1, 0.85, 3);
            group.add(right);
        }
    }
    
    // Helper: Add taillights
    function addCarTaillights(group) {
        const tailMat = new THREE.MeshPhongMaterial({ 
            color: 0xff0000, 
            emissive: 0xff0000, 
            emissiveIntensity: 0.4 
        });
        
        const left = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.08), tailMat);
        left.position.set(-1, 1, -3.05);
        group.add(left);
        
        const right = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.08), tailMat);
        right.position.set(1, 1, -3.05);
        group.add(right);
    }

    function createFallbackCarPreview(carType) {
        const previewContainer = document.getElementById('car-preview-3d');
        if (!previewContainer) return;
        
        // Clear existing preview
        previewContainer.innerHTML = '';
        
        // Create CSS-based car preview
        const carPreview = document.createElement('div');
        carPreview.className = 'fallback-car-preview';
        
        // Car body
        const carBody = document.createElement('div');
        carBody.className = 'car-body';
        
        // Set car color based on type
        switch(carType) {
            case 'car_lamborghini':
                carBody.style.background = 'linear-gradient(135deg, #0047ab, #002855)';
                break;
            case 'car_bugatti':
                carBody.style.background = 'linear-gradient(135deg, #1a1a1a, #000000)';
                break;
            case 'car_supra':
                carBody.style.background = 'linear-gradient(135deg, #ff69b4, #ff1493)';
                break;
            case 'car_porsche':
                carBody.style.background = 'linear-gradient(135deg, #ffffff, #f0f0f0)';
                break;
            case 'car_ferrari':
                carBody.style.background = 'linear-gradient(135deg, #ff0000, #cc0000)';
                break;
            default:
                carBody.style.background = 'linear-gradient(135deg, #0047ab, #002855)';
        }
        
        carPreview.appendChild(carBody);
        previewContainer.appendChild(carPreview);
        
        console.log('Fallback car preview created for:', carType);
    }

    function createPreviewCar(carType) {
        const group = new THREE.Group();
        
        // Simple car body for preview
        const bodyGeometry = new THREE.BoxGeometry(3, 0.8, 5);
        let bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x0047ab });
        
        switch(carType) {
            case 'car_bugatti':
                bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
                break;
            case 'car_supra':
                bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff69b4 });
                break;
            case 'car_porsche':
                bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
                break;
            case 'car_ferrari':
                bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
                break;
        }
        
        const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        carBody.position.y = 0.5;
        group.add(carBody);
        
        // Add wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        
        const wheelPositions = [
            [-1.2, 0, 1.5], [1.2, 0, 1.5],
            [-1.2, 0, -1.5], [1.2, 0, -1.5]
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            group.add(wheel);
        });
        
        return group;
    }

    // Avatar Selection Event Listeners
    document.querySelectorAll('#avatar-screen .selection-card').forEach(card => {
        card.addEventListener('click', () => {
            localStorage.setItem('selectedAvatar', card.dataset.id);
            updateAvatarUI();
        });
    });

    // Car Selection Event Listeners
    document.querySelectorAll('#car-screen .selection-card').forEach(card => {
        card.addEventListener('click', () => {
            const carType = card.dataset.id;
            console.log('Car selected:', carType);
            localStorage.setItem('selectedCar', carType);
            updateCarUI();
        });
    });

    // Controls Screen Navigation
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        controlsScreen.classList.remove('hidden');
        updateControlsUI();
    });

    document.getElementById('btn-controls-back')?.addEventListener('click', () => {
        controlsScreen.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });

    document.getElementById('btn-reset-controls')?.addEventListener('click', () => {
        saveControlsSettings(defaultControls);
        updateControlsUI();
    });

    // Controls Settings Event Listeners
    document.querySelectorAll('input[name="camera-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const settings = loadControlsSettings();
            settings.cameraMode = e.target.value;
            saveControlsSettings(settings);
            
            // Apply camera mode to current game if running
            if (currentGame && currentGame.setCameraMode) {
                currentGame.setCameraMode(e.target.value);
            }
        });
    });

    // Slider Event Listeners
    document.getElementById('camera-distance')?.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        document.getElementById('camera-distance-value').textContent = value;
        const settings = loadControlsSettings();
        settings.cameraDistance = value;
        saveControlsSettings(settings);
        
        if (currentGame && currentGame.setCameraDistance) {
            currentGame.setCameraDistance(value);
        }
    });

    document.getElementById('camera-height')?.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        document.getElementById('camera-height-value').textContent = value;
        const settings = loadControlsSettings();
        settings.cameraHeight = value;
        saveControlsSettings(settings);
        
        if (currentGame && currentGame.setCameraHeight) {
            currentGame.setCameraHeight(value);
        }
    });

    document.getElementById('steering-sensitivity')?.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        document.getElementById('steering-sensitivity-value').textContent = value;
        const settings = loadControlsSettings();
        settings.steeringSensitivity = value;
        saveControlsSettings(settings);
        
        if (currentGame && currentGame.setSteeringSensitivity) {
            currentGame.setSteeringSensitivity(value);
        }
    });

    document.getElementById('camera-smoothing')?.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        document.getElementById('camera-smoothing-value').textContent = value;
        const settings = loadControlsSettings();
        settings.cameraSmoothing = value;
        saveControlsSettings(settings);
        
        if (currentGame && currentGame.setCameraSmoothing) {
            currentGame.setCameraSmoothing(value);
        }
    });

    // Upgrade Buttons
    ['speed', 'accel', 'nitro', 'handling'].forEach(stat => {
        document.getElementById(`btn-upgrade-${stat}`)?.addEventListener('click', () => {
            const carId = saveData.selectedCarId;
            if (SaveSystem.upgradeStat(carId, stat)) {
                updateGarageUI();
            }
        });
    });

    // Game Control Buttons
    document.getElementById('btn-retry')?.addEventListener('click', () => startGame());
    document.getElementById('btn-back-menu')?.addEventListener('click', () => {
        if (currentGame) currentGame.destroy();
        currentGame = null;
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        hud.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });

    document.getElementById('btn-resume')?.addEventListener('click', () => {
        if (currentGame) currentGame.togglePause();
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => startGame());

    document.getElementById('btn-quit')?.addEventListener('click', () => {
        if (currentGame) currentGame.destroy();
        currentGame = null;
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        hud.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });

    // In-game controls button
    document.getElementById('btn-ingame-controls')?.addEventListener('click', () => {
        if (currentGame) {
            currentGame.togglePause();
            controlsScreen.classList.remove('hidden');
            updateControlsUI();
        }
    });

    // Loading Simulation
    let progress = 0;
    const loadInterval = setInterval(() => {
        progress += 5;
        if (loaderFill) loaderFill.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(loadInterval);
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                mainMenu.classList.remove('hidden');
            }, 600);
        }
    }, 50);
});
