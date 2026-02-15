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
        
        // Create canvas for 2D car drawing
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 200;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        const ctx = canvas.getContext('2d');
        
        // Set background
        const bgGradient = ctx.createLinearGradient(0, 0, 0, 200);
        bgGradient.addColorStop(0, '#1a1a2e');
        bgGradient.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, 320, 200);
        
        // Draw car based on type
        drawRealisticCar(ctx, carType, 0); // 0 rotation initially
        
        previewContainer.appendChild(canvas);
        
        // Animate rotation
        let rotation = 0;
        function animate() {
            rotation += 0.02;
            
            // Clear and redraw
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, 320, 200);
            
            // Draw car with rotation
            drawRealisticCar(ctx, carType, rotation);
            
            requestAnimationFrame(animate);
        }
        animate();
        
        console.log('Canvas car preview created for:', carType);
    }
    
    // Draw realistic car silhouette
    function drawRealisticCar(ctx, carType, rotation) {
        const centerX = 160;
        const centerY = 120;
        const scale = 0.8 + Math.cos(rotation) * 0.1; // Subtle breathing effect
        
        // Car colors
        let bodyColor, darkColor, windowColor;
        switch(carType) {
            case 'car_lamborghini':
                bodyColor = '#0047ab';
                darkColor = '#002855';
                windowColor = '#0a0a1a';
                break;
            case 'car_bugatti':
                bodyColor = '#1a1a1a';
                darkColor = '#000000';
                windowColor = '#050505';
                break;
            case 'car_supra':
                bodyColor = '#ff1493';
                darkColor = '#cc1077';
                windowColor = '#0a0a0a';
                break;
            case 'car_porsche':
                bodyColor = '#f5f5f5';
                darkColor = '#e0e0e0';
                windowColor = '#111111';
                break;
            case 'car_ferrari':
                bodyColor = '#ff0000';
                darkColor = '#cc0000';
                windowColor = '#0a0a0a';
                break;
            default:
                bodyColor = '#0047ab';
                darkColor = '#002855';
                windowColor = '#0a0a1a';
        }
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        
        // Add lighting effect
        const lightX = Math.sin(rotation) * 30;
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 55, 100, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        if (carType === 'car_lamborghini') {
            drawLamborghini2D(ctx, bodyColor, darkColor, windowColor, lightX);
        } else if (carType === 'car_bugatti') {
            drawBugatti2D(ctx, bodyColor, darkColor, windowColor, lightX);
        } else if (carType === 'car_supra') {
            drawSupra2D(ctx, bodyColor, darkColor, windowColor, lightX);
        } else if (carType === 'car_porsche') {
            drawPorsche2D(ctx, bodyColor, darkColor, windowColor, lightX);
        } else if (carType === 'car_ferrari') {
            drawFerrari2D(ctx, bodyColor, darkColor, windowColor, lightX);
        }
        
        ctx.restore();
    }
    
    // LAMBORGHINI - Sharp angular supercar
    function drawLamborghini2D(ctx, bodyColor, darkColor, windowColor, lightX) {
        // Body gradient for metallic effect
        const bodyGrad = ctx.createLinearGradient(-60, -20, 60, 30);
        bodyGrad.addColorStop(0, darkColor);
        bodyGrad.addColorStop(0.3, bodyColor);
        bodyGrad.addColorStop(0.7, bodyColor);
        bodyGrad.addColorStop(1, darkColor);
        
        // Lower body - wedge shape
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-80, 25);  // rear bottom
        ctx.lineTo(-70, -5);  // rear deck
        ctx.lineTo(-50, -25); // roof rear
        ctx.lineTo(0, -30);   // roof center
        ctx.lineTo(40, -25);  // roof front
        ctx.lineTo(70, -5);   // hood
        ctx.lineTo(85, 10);   // nose tip
        ctx.lineTo(80, 25);   // front bumper
        ctx.lineTo(55, 35);   // front wheel well
        ctx.lineTo(25, 35);   // between wheels
        ctx.lineTo(-25, 35);  // rear wheel well start
        ctx.lineTo(-55, 35); // rear wheel
        ctx.closePath();
        ctx.fill();
        
        // Upper cabin
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-45, -10);
        ctx.lineTo(-30, -30);
        ctx.lineTo(30, -30);
        ctx.lineTo(45, -15);
        ctx.lineTo(40, -5);
        ctx.lineTo(-40, -5);
        ctx.closePath();
        ctx.fill();
        
        // Windows - dark tinted
        ctx.fillStyle = windowColor;
        ctx.beginPath();
        ctx.moveTo(-35, -12);
        ctx.lineTo(-25, -28);
        ctx.lineTo(25, -28);
        ctx.lineTo(35, -15);
        ctx.lineTo(30, -8);
        ctx.lineTo(-30, -8);
        ctx.closePath();
        ctx.fill();
        
        // Side air intake
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(50, 5);
        ctx.lineTo(70, 0);
        ctx.lineTo(70, 15);
        ctx.lineTo(50, 15);
        ctx.closePath();
        ctx.fill();
        
        // Y-SHAPED HEADLIGHTS
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        
        // Left Y light
        ctx.beginPath();
        ctx.moveTo(72, 5);
        ctx.lineTo(78, 0);
        ctx.lineTo(78, 12);
        ctx.lineTo(75, 15);
        ctx.lineTo(70, 10);
        ctx.closePath();
        ctx.fill();
        
        // Right Y light
        ctx.beginPath();
        ctx.moveTo(78, 5);
        ctx.lineTo(84, 0);
        ctx.lineTo(84, 12);
        ctx.lineTo(81, 15);
        ctx.lineTo(76, 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Wheels
        drawWheel2D(ctx, -40, 35, 18);
        drawWheel2D(ctx, 40, 35, 18);
        
        // Rear spoiler
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(-75, -15);
        ctx.lineTo(-40, -15);
        ctx.lineTo(-40, -8);
        ctx.lineTo(-75, -8);
        ctx.closePath();
        ctx.fill();
        
        // Spoiler supports
        ctx.fillRect(-70, -8, 4, 8);
        ctx.fillRect(-50, -8, 4, 8);
        
        // Taillights
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.fillRect(-78, 5, 12, 4);
        ctx.fillRect(-62, 5, 12, 4);
        ctx.shadowBlur = 0;
    }
    
    // BUGATTI - Elegant teardrop
    function drawBugatti2D(ctx, bodyColor, darkColor, windowColor, lightX) {
        const bodyGrad = ctx.createLinearGradient(-70, -15, 70, 25);
        bodyGrad.addColorStop(0, darkColor);
        bodyGrad.addColorStop(0.4, bodyColor);
        bodyGrad.addColorStop(0.6, bodyColor);
        bodyGrad.addColorStop(1, darkColor);
        
        // Long elegant body
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-90, 30);   // rear
        ctx.lineTo(-85, 0);    // rear deck
        ctx.lineTo(-60, -20);  // cabin rear
        ctx.lineTo(-20, -25);  // roof
        ctx.lineTo(30, -25);   // roof front
        ctx.lineTo(70, -10);   // hood
        ctx.quadraticCurveTo(90, 5, 85, 20); // rounded nose
        ctx.lineTo(70, 30);    // front bumper
        ctx.lineTo(50, 38);    // wheel well
        ctx.lineTo(20, 38);    // between wheels
        ctx.lineTo(-30, 38);   // rear wheel well
        ctx.lineTo(-60, 38);   // rear wheel
        ctx.closePath();
        ctx.fill();
        
        // Windows
        ctx.fillStyle = windowColor;
        ctx.beginPath();
        ctx.moveTo(-55, -5);
        ctx.lineTo(-40, -22);
        ctx.lineTo(25, -22);
        ctx.lineTo(50, -10);
        ctx.lineTo(40, -3);
        ctx.lineTo(-45, -3);
        ctx.closePath();
        ctx.fill();
        
        // Horse collar grille
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.ellipse(82, 5, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Chrome line
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-85, 10);
        ctx.lineTo(80, 10);
        ctx.stroke();
        
        // Round headlights
        ctx.fillStyle = '#ffffcc';
        ctx.shadowColor = '#ffffcc';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(75, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(75, 15, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Wheels
        drawWheel2D(ctx, -45, 38, 18);
        drawWheel2D(ctx, 35, 38, 18);
        
        // Taillight bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-88, 5, 50, 4);
    }
    
    // SUPRA - Sporty compact
    function drawSupra2D(ctx, bodyColor, darkColor, windowColor, lightX) {
        const bodyGrad = ctx.createLinearGradient(-55, -15, 55, 20);
        bodyGrad.addColorStop(0, darkColor);
        bodyGrad.addColorStop(0.5, bodyColor);
        bodyGrad.addColorStop(1, darkColor);
        
        // Sporty body
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-60, 25);
        ctx.lineTo(-55, -5);
        ctx.lineTo(-40, -22);
        ctx.lineTo(0, -25);
        ctx.lineTo(35, -20);
        ctx.lineTo(60, 0);
        ctx.lineTo(65, 20);
        ctx.lineTo(55, 30);
        ctx.lineTo(35, 35);
        ctx.lineTo(10, 35);
        ctx.lineTo(-20, 35);
        ctx.lineTo(-45, 35);
        ctx.closePath();
        ctx.fill();
        
        // Windows
        ctx.fillStyle = windowColor;
        ctx.beginPath();
        ctx.moveTo(-35, -8);
        ctx.lineTo(-25, -20);
        ctx.lineTo(20, -20);
        ctx.lineTo(40, -10);
        ctx.lineTo(30, -3);
        ctx.lineTo(-30, -3);
        ctx.closePath();
        ctx.fill();
        
        // Racing stripe
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -8, 4, 20);
        
        // Big spoiler
        ctx.fillStyle = darkColor;
        ctx.fillRect(-65, -20, 50, 8);
        ctx.fillRect(-60, -12, 6, 10);
        ctx.fillRect(-35, -12, 6, 10);
        
        // Sport headlights
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.fillRect(58, 0, 10, 4);
        ctx.shadowBlur = 0;
        
        // Wheels
        drawWheel2D(ctx, -30, 35, 17);
        drawWheel2D(ctx, 25, 35, 17);
        
        // Taillights
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-58, 5, 10, 4);
    }
    
    // PORSCHE - Classic rounded 911
    function drawPorsche2D(ctx, bodyColor, darkColor, windowColor, lightX) {
        const bodyGrad = ctx.createLinearGradient(-60, -20, 60, 25);
        bodyGrad.addColorStop(0, '#e0e0e0');
        bodyGrad.addColorStop(0.4, bodyColor);
        bodyGrad.addColorStop(0.6, bodyColor);
        bodyGrad.addColorStop(1, '#e0e0e0');
        
        // Rounded body
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-70, 25);
        ctx.lineTo(-65, 0);
        ctx.quadraticCurveTo(-50, -15, -20, -20); // curved rear
        ctx.lineTo(20, -20);
        ctx.quadraticCurveTo(55, -15, 65, 5);     // curved front
        ctx.quadraticCurveTo(70, 15, 65, 25);
        ctx.lineTo(50, 32);
        ctx.lineTo(20, 32);
        ctx.lineTo(-20, 32);
        ctx.lineTo(-50, 32);
        ctx.closePath();
        ctx.fill();
        
        // Long sloping rear (911 signature)
        ctx.fillStyle = '#eeeeee';
        ctx.beginPath();
        ctx.moveTo(-70, 5);
        ctx.lineTo(-65, -15);
        ctx.lineTo(-50, -5);
        ctx.lineTo(-55, 10);
        ctx.closePath();
        ctx.fill();
        
        // Windows
        ctx.fillStyle = windowColor;
        ctx.beginPath();
        ctx.moveTo(-40, -8);
        ctx.lineTo(-25, -18);
        ctx.lineTo(25, -18);
        ctx.lineTo(45, -10);
        ctx.lineTo(35, -3);
        ctx.lineTo(-35, -3);
        ctx.closePath();
        ctx.fill();
        
        // Rear window
        ctx.beginPath();
        ctx.moveTo(-65, -5);
        ctx.lineTo(-40, -12);
        ctx.lineTo(-35, -5);
        ctx.lineTo(-60, 5);
        ctx.closePath();
        ctx.fill();
        
        // Round headlights
        ctx.fillStyle = '#ffffcc';
        ctx.shadowColor = '#ffffcc';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(58, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Wheels
        drawWheel2D(ctx, -35, 32, 16, '#333333', '#dddddd');
        drawWheel2D(ctx, 30, 32, 16, '#333333', '#dddddd');
        
        // Taillight bar
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(-65, 8, 40, 3);
    }
    
    // FERRARI - Sleek Italian
    function drawFerrari2D(ctx, bodyColor, darkColor, windowColor, lightX) {
        const bodyGrad = ctx.createLinearGradient(-60, -15, 60, 20);
        bodyGrad.addColorStop(0, darkColor);
        bodyGrad.addColorStop(0.5, bodyColor);
        bodyGrad.addColorStop(1, darkColor);
        
        // Sleek low body
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-65, 22);
        ctx.lineTo(-60, -3);
        ctx.lineTo(-45, -18);
        ctx.lineTo(0, -22);
        ctx.lineTo(40, -15);
        ctx.lineTo(65, 5);
        ctx.lineTo(68, 18);
        ctx.lineTo(58, 28);
        ctx.lineTo(38, 32);
        ctx.lineTo(10, 32);
        ctx.lineTo(-20, 32);
        ctx.lineTo(-48, 32);
        ctx.closePath();
        ctx.fill();
        
        // Windows
        ctx.fillStyle = windowColor;
        ctx.beginPath();
        ctx.moveTo(-38, -8);
        ctx.lineTo(-25, -18);
        ctx.lineTo(25, -18);
        ctx.lineTo(42, -8);
        ctx.lineTo(32, -2);
        ctx.lineTo(-30, -2);
        ctx.closePath();
        ctx.fill();
        
        // Front splitter
        ctx.fillStyle = darkColor;
        ctx.fillRect(55, 25, 20, 4);
        
        // Ferrari logo
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.ellipse(35, -5, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Sport headlights
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.fillRect(60, 0, 8, 3);
        ctx.shadowBlur = 0;
        
        // Small spoiler
        ctx.fillStyle = darkColor;
        ctx.fillRect(-60, -15, 40, 5);
        
        // Wheels
        drawWheel2D(ctx, -30, 32, 16);
        drawWheel2D(ctx, 25, 32, 16);
        
        // Taillights
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(-58, 5, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Helper: Draw wheel
    function drawWheel2D(ctx, x, y, radius, tireColor = '#111111', rimColor = '#666666') {
        // Tire
        ctx.fillStyle = tireColor;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Rim
        ctx.fillStyle = rimColor;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Spokes
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * radius * 0.5, y + Math.sin(angle) * radius * 0.5);
            ctx.stroke();
        }
    }
    
    // Remove old 3D model functions
    function createUniqueCarModel(carType) { return new THREE.Group(); }
    function createLamborghiniModel(group) {}
    function createBugattiModel(group) {}
    function createSupraModel(group) {}
    function createPorscheModel(group) {}
    function createFerrariModel(group) {}
    function addRealisticWheels(group, xPos, zPos) {}
    function addCarHeadlights(group, style) {}
    function addCarTaillights(group) {}

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
