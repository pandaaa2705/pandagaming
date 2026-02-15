import * as THREE from 'three';

export class Car {
    constructor(scene, isPlayer, environment, stats = null, assetLoader = null, carType = 'car_lamborghini') {
        this.scene = scene;
        this.isPlayer = isPlayer;
        this.environment = environment;
        this.mesh = null;
        this.stats = stats || { speed: 1, accel: 1, nitro: 1, handling: 1 };
        this.assetLoader = assetLoader;
        this.carType = carType;

        // State
        const startZ = 0;
        const startCurveX = environment ? environment.getCurveX(startZ) : 0;
        this.position = new THREE.Vector3(startCurveX + (isPlayer ? -3 : 3), 0.5, startZ);

        this.speed = 0;
        this.velocity = new THREE.Vector3();
        this.laneX = isPlayer ? -3 : 3;
        this.rotationY = 0;
        this.eliminated = false;
        this.animalHits = 0;

        // Wheel tracks system
        this.wheelTracks = [];
        this.lastTrackPosition = new THREE.Vector3();
        this.trackTimer = 0;

        // Realistic Physics Stats based on Upgrades
        this.accelPower = 18 + (this.stats.accel * 4);
        this.breakingPower = 65;
        this.drag = 0.982 + (this.stats.handling * 0.001);
        this.maxSpeedBase = 45 + (this.stats.speed * 5);
        this.steerPower = 1.6 + (this.stats.handling * 0.2);
        this.driftFactor = 0.45 + (this.stats.handling * 0.05);

        this.nitro = 50 + (this.stats.nitro * 5);
        this.maxNitro = 100 + (this.stats.nitro * 10);
        this.nitroPower = 40 + (this.stats.nitro * 5);

        // Steering sensitivity (default 5, can be adjusted via controls)
        this.steeringSensitivity = 5;

        this.init();
    }

    init() {
        const modelName = this.isPlayer ? 'car_player' : 'car_ai';
        const customModel = this.assetLoader ? this.assetLoader.getAsset(modelName) : null;

        if (customModel) {
            this.mesh = customModel.clone();
            this.wheels = [];
            this.mesh.traverse(n => {
                if (n.name.toLowerCase().includes('wheel')) this.wheels.push(n);
            });
        } else {
            // Create detailed 3D sport car
            this.createSportCar();
        }

        // Add Panda Driver
        this.addPandaDriver();

        this.scene.add(this.mesh);
    }

    createSportCar() {
        const carGroup = new THREE.Group();

        switch(this.carType) {
            case 'car_lamborghini':
                this.createLamborghini(carGroup);
                break;
            case 'car_bugatti':
                this.createBugatti(carGroup);
                break;
            case 'car_supra':
                this.createSupra(carGroup);
                break;
            case 'car_porsche':
                this.createPorsche(carGroup);
                break;
            case 'car_ferrari':
                this.createFerrari(carGroup);
                break;
            default:
                this.createLamborghini(carGroup);
        }

        this.mesh = carGroup;
    }

    createLamborghini(carGroup) {
        // Navy Blue Lamborghini - Realistic angular supercar design
        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0x0047ab,
            emissive: 0x002855,
            emissiveIntensity: 0.1,
            shininess: 100,
            metalness: 0.8
        });
        const darkMat = new THREE.MeshPhongMaterial({ color: 0x003366 });
        const glassMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 90 });
        
        // Main lower body - low and wide
        const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.6, 5.8), bodyMat);
        lowerBody.position.y = 0.5;
        carGroup.add(lowerBody);
        
        // Front bumper - aggressive angular design
        const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 0.8), bodyMat);
        frontBumper.position.set(0, 0.4, 3.2);
        carGroup.add(frontBumper);
        
        // Front splitter
        const splitter = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 0.3), darkMat);
        splitter.position.set(0, 0.15, 3.6);
        carGroup.add(splitter);
        
        // Upper cabin - swept back
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 2.8), bodyMat);
        cabin.position.set(0, 1.05, -0.3);
        carGroup.add(cabin);
        
        // Windshield - steep angle
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), glassMat);
        windshield.position.set(0, 1.25, 0.9);
        windshield.rotation.x = -Math.PI / 3;
        carGroup.add(windshield);
        
        // Side windows
        const sideWinGeo = new THREE.PlaneGeometry(1.8, 0.5);
        const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
        leftWin.position.set(-1.41, 1.15, -0.3);
        leftWin.rotation.y = -Math.PI / 2;
        carGroup.add(leftWin);
        
        const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
        rightWin.position.set(1.41, 1.15, -0.3);
        rightWin.rotation.y = Math.PI / 2;
        carGroup.add(rightWin);
        
        // Hood slope
        const hood = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 1.8), bodyMat);
        hood.position.set(0, 0.9, 1.6);
        hood.rotation.x = -0.15;
        carGroup.add(hood);
        
        // Rear deck
        const rear = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 1.8), bodyMat);
        rear.position.set(0, 0.925, -2.2);
        carGroup.add(rear);
        
        // Y-SHAPED HEADLIGHTS (Lamborghini signature)
        const lightMat = new THREE.MeshPhongMaterial({ 
            color: 0xffffff, 
            emissive: 0xffffff, 
            emissiveIntensity: 0.9 
        });
        
        // Left Y-shaped headlight
        const leftLightV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.05), lightMat);
        leftLightV.position.set(-1.2, 0.75, 3.05);
        leftLightV.rotation.z = -0.3;
        carGroup.add(leftLightV);
        
        const leftLightH = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.05), lightMat);
        leftLightH.position.set(-1.1, 0.65, 3.05);
        carGroup.add(leftLightH);
        
        // Right Y-shaped headlight
        const rightLightV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.05), lightMat);
        rightLightV.position.set(1.2, 0.75, 3.05);
        rightLightV.rotation.z = 0.3;
        carGroup.add(rightLightV);
        
        const rightLightH = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.05), lightMat);
        rightLightH.position.set(1.1, 0.65, 3.05);
        carGroup.add(rightLightH);
        
        // Side air intakes
        const intakeGeo = new THREE.BoxGeometry(0.2, 0.4, 0.8);
        const leftIntake = new THREE.Mesh(intakeGeo, darkMat);
        leftIntake.position.set(-1.9, 0.7, 0.5);
        carGroup.add(leftIntake);
        
        const rightIntake = new THREE.Mesh(intakeGeo, darkMat);
        rightIntake.position.set(1.9, 0.7, 0.5);
        carGroup.add(rightIntake);
        
        // Rear spoiler
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.6), bodyMat);
        spoiler.position.set(0, 1.35, -2.8);
        carGroup.add(spoiler);
        
        // Spoiler supports
        const supportGeo = new THREE.BoxGeometry(0.08, 0.25, 0.08);
        const leftSupport = new THREE.Mesh(supportGeo, bodyMat);
        leftSupport.position.set(-1, 1.2, -2.8);
        carGroup.add(leftSupport);
        const rightSupport = new THREE.Mesh(supportGeo, bodyMat);
        rightSupport.position.set(1, 1.2, -2.8);
        carGroup.add(rightSupport);
        
        // Wheels with rims
        this.addLuxuryWheels(carGroup, 0x111111);
        
        // Taillights
        const tailMat = new THREE.MeshPhongMaterial({ 
            color: 0xff0000, 
            emissive: 0xff0000, 
            emissiveIntensity: 0.6 
        });
        const leftTail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.05), tailMat);
        leftTail.position.set(-1, 0.9, -3);
        carGroup.add(leftTail);
        const rightTail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.05), tailMat);
        rightTail.position.set(1, 0.9, -3);
        carGroup.add(rightTail);
    }

    createBugatti(carGroup) {
        // Black Bugatti
        const bodyGeometry = new THREE.BoxGeometry(4.0, 1.1, 6.5);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x1a1a1a,
            emissive: 0x000000,
            emissiveIntensity: 0.1,
            shininess: 120,
            metalness: 0.9
        });
        const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        carBody.position.y = 0.5;
        carBody.castShadow = true;
        carGroup.add(carBody);

        // Horse collar grille
        const grilleGeometry = new THREE.BoxGeometry(2.5, 0.8, 0.2);
        const grilleMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const grille = new THREE.Mesh(grilleGeometry, grilleMaterial);
        grille.position.set(0, 0.9, 3.8);
        carGroup.add(grille);

        // Smooth curves
        const curveGeometry = new THREE.CylinderGeometry(2, 2, 4, 16);
        const curve = new THREE.Mesh(curveGeometry, bodyMaterial);
        curve.rotation.z = Math.PI / 2;
        curve.position.set(0, 1.2, 0);
        carGroup.add(curve);

        this.addLuxuryWheels(carGroup, 0x222222);
        this.addLuxuryLights(carGroup, 0x1a1a1a);
    }

    createSupra(carGroup) {
        // Pink Supra
        const bodyGeometry = new THREE.BoxGeometry(3.6, 0.9, 5.8);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xff69b4,
            emissive: 0xff1493,
            emissiveIntensity: 0.15,
            shininess: 80
        });
        const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        carBody.position.y = 0.5;
        carBody.castShadow = true;
        carGroup.add(carBody);

        // Spoiler
        const spoilerGeometry = new THREE.BoxGeometry(3.2, 0.15, 1.0);
        const spoilerMaterial = new THREE.MeshPhongMaterial({ color: 0xff1493 });
        const spoiler = new THREE.Mesh(spoilerGeometry, spoilerMaterial);
        spoiler.position.set(0, 1.5, -3.0);
        carGroup.add(spoiler);

        // Racing stripes
        const stripeGeometry = new THREE.BoxGeometry(0.3, 0.01, 5.5);
        const stripeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const centerStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        centerStripe.position.set(0, 0.51, 0);
        carGroup.add(centerStripe);

        this.addLuxuryWheels(carGroup, 0x444444);
        this.addLuxuryLights(carGroup, 0xff69b4);
    }

    createPorsche(carGroup) {
        // White Porsche
        const bodyGeometry = new THREE.BoxGeometry(3.7, 1.0, 5.5);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xf0f0f0,
            emissiveIntensity: 0.05,
            shininess: 90
        });
        const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        carBody.position.y = 0.5;
        carBody.castShadow = true;
        carGroup.add(carBody);

        // Round headlights
        const headlightGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headlightMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffcc,
            emissive: 0xffffcc,
            emissiveIntensity: 1
        });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-1.2, 0.7, 3.0);
        carGroup.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(1.2, 0.7, 3.0);
        carGroup.add(rightHeadlight);

        this.addLuxuryWheels(carGroup, 0x555555);
        this.addLuxuryLights(carGroup, 0xffffff);
    }

    createFerrari(carGroup) {
        // Red Ferrari
        const bodyGeometry = new THREE.BoxGeometry(3.9, 1.0, 6.0);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xcc0000,
            emissiveIntensity: 0.2,
            shininess: 100
        });
        const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        carBody.position.y = 0.5;
        carBody.castShadow = true;
        carGroup.add(carBody);

        // Ferrari prancing horse logo area
        const logoGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1);
        const logoMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });
        const logo = new THREE.Mesh(logoGeometry, logoMaterial);
        logo.position.set(0, 1.2, 1.5);
        carGroup.add(logo);

        // Large rear spoiler
        const spoilerGeometry = new THREE.BoxGeometry(3.5, 0.2, 1.2);
        const spoilerMaterial = new THREE.MeshPhongMaterial({ color: 0xcc0000 });
        const spoiler = new THREE.Mesh(spoilerGeometry, spoilerMaterial);
        spoiler.position.set(0, 1.8, -3.2);
        carGroup.add(spoiler);

        this.addLuxuryWheels(carGroup, 0x333333);
        this.addLuxuryLights(carGroup, 0xff0000);
    }

    addLuxuryWheels(carGroup, wheelColor) {
        this.wheels = [];
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 24);
        const wheelMaterial = new THREE.MeshPhongMaterial({ 
            color: wheelColor,
            shininess: 50,
            metalness: 0.7
        });
        
        const wheelPositions = [
            [-1.4, -0.2, 1.9],  // Front left
            [1.4, -0.2, 1.9],   // Front right
            [-1.4, -0.2, -1.9], // Rear left
            [1.4, -0.2, -1.9]   // Rear right
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            wheel.castShadow = true;
            carGroup.add(wheel);
            this.wheels.push(wheel);
        });
    }

    addLuxuryLights(carGroup, carColor) {
        // Headlights
        const headlightGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.2);
        const headlightMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffcc,
            emissive: 0xffffcc,
            emissiveIntensity: 1
        });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-1.3, 0.6, 3.3);
        carGroup.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(1.3, 0.6, 3.3);
        carGroup.add(rightHeadlight);

        // Taillights
        const taillightGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.1);
        const taillightMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.8
        });
        
        const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        leftTaillight.position.set(-1.3, 0.6, -3.3);
        carGroup.add(leftTaillight);
        
        const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        rightTaillight.position.set(1.3, 0.6, -3.3);
        carGroup.add(rightTaillight);
    }

    addRealisticWheels(carGroup, wheelColor) {
        this.wheels = [];
        
        // High-performance wheel with tire and rim
        const tireGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
        const tireMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1a1a1a,
            roughness: 0.8
        });
        
        const rimGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.26, 16);
        const rimMaterial = new THREE.MeshPhongMaterial({ 
            color: wheelColor,
            shininess: 80,
            metalness: 0.7
        });
        
        const spokeGeometry = new THREE.BoxGeometry(0.35, 0.05, 0.05);
        
        const wheelPositions = [
            [-1.6, 0, 1.8],   // Front left
            [1.6, 0, 1.8],    // Front right
            [-1.6, 0, -1.8],  // Rear left
            [1.6, 0, -1.8]    // Rear right
        ];
        
        wheelPositions.forEach(pos => {
            const wheelGroup = new THREE.Group();
            
            // Tire
            const tire = new THREE.Mesh(tireGeometry, tireMaterial);
            tire.rotation.z = Math.PI / 2;
            wheelGroup.add(tire);
            
            // Rim
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.rotation.z = Math.PI / 2;
            wheelGroup.add(rim);
            
            // Spokes
            for (let i = 0; i < 5; i++) {
                const spoke = new THREE.Mesh(spokeGeometry, rimMaterial);
                spoke.rotation.x = (i / 5) * Math.PI * 2;
                spoke.rotation.z = Math.PI / 2;
                wheelGroup.add(spoke);
            }
            
            wheelGroup.position.set(...pos);
            wheelGroup.castShadow = true;
            carGroup.add(wheelGroup);
            this.wheels.push(wheelGroup);
        });
    }

    addRealisticLights(carGroup) {
        // Modern LED headlights
        const headlightGeometry = new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI);
        const headlightMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9
        });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-1.2, 0.8, 3.5);
        leftHeadlight.rotation.y = -0.3;
        carGroup.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(1.2, 0.8, 3.5);
        rightHeadlight.rotation.y = 0.3;
        carGroup.add(rightHeadlight);

        // LED taillights - slim modern design
        const taillightGeometry = new THREE.BoxGeometry(0.6, 0.08, 0.05);
        const taillightMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.6
        });
        
        const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        leftTaillight.position.set(-1.0, 1.0, -3.6);
        carGroup.add(leftTaillight);
        
        const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        rightTaillight.position.set(1.0, 1.0, -3.6);
        carGroup.add(rightTaillight);
        
        // Light glow effect
        const glowGeometry = new THREE.SphereGeometry(0.3, 16, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1
        });
        
        const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        leftGlow.position.set(-1.2, 0.8, 3.7);
        carGroup.add(leftGlow);
        
        const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        rightGlow.position.set(1.2, 0.8, 3.7);
        carGroup.add(rightGlow);
    }

    addPandaDriver() {
        const pandaGroup = new THREE.Group();

        // Main body - more detailed
        const bodyGeometry = new THREE.SphereGeometry(0.7, 20, 20);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            shininess: 30
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.scale.set(1, 1.3, 1);
        pandaGroup.add(body);

        // Head - separate from body
        const headGeometry = new THREE.SphereGeometry(0.5, 20, 20);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 1.0, 0.3);
        pandaGroup.add(head);

        // Snout
        const snoutGeometry = new THREE.SphereGeometry(0.25, 12, 12);
        const snoutMaterial = new THREE.MeshPhongMaterial({ color: 0xf0f0f0 });
        const snout = new THREE.Mesh(snoutGeometry, snoutMaterial);
        snout.scale.set(1.2, 0.8, 1.5);
        snout.position.set(0, 0.9, 0.6);
        pandaGroup.add(snout);

        // Black ears - more detailed
        const earGeometry = new THREE.SphereGeometry(0.2, 12, 12);
        const blackMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x000000,
            shininess: 10
        });
        
        const leftEar = new THREE.Mesh(earGeometry, blackMaterial);
        leftEar.scale.set(1, 1.5, 0.8);
        leftEar.position.set(0.3, 1.5, 0.1);
        pandaGroup.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeometry, blackMaterial);
        rightEar.scale.set(1, 1.5, 0.8);
        rightEar.position.set(-0.3, 1.5, 0.1);
        pandaGroup.add(rightEar);

        // Eye patches - more realistic
        const eyePatchGeometry = new THREE.SphereGeometry(0.15, 12, 12);
        const leftEyePatch = new THREE.Mesh(eyePatchGeometry, blackMaterial);
        leftEyePatch.scale.set(1.5, 1.8, 0.6);
        leftEyePatch.position.set(0.2, 1.1, 0.5);
        pandaGroup.add(leftEyePatch);
        
        const rightEyePatch = new THREE.Mesh(eyePatchGeometry, blackMaterial);
        rightEyePatch.scale.set(1.5, 1.8, 0.6);
        rightEyePatch.position.set(-0.2, 1.1, 0.5);
        pandaGroup.add(rightEyePatch);

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            emissive: 0x111111,
            emissiveIntensity: 0.2
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.15, 1.05, 0.6);
        pandaGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(-0.15, 1.05, 0.6);
        pandaGroup.add(rightEye);

        // Nose
        const noseGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const noseMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 0.95, 0.75);
        pandaGroup.add(nose);

        // Arms
        const armGeometry = new THREE.SphereGeometry(0.2, 12, 12);
        const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        leftArm.scale.set(1, 2, 1);
        leftArm.position.set(0.6, 0.5, 0.2);
        pandaGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        rightArm.scale.set(1, 2, 1);
        rightArm.position.set(-0.6, 0.5, 0.2);
        pandaGroup.add(rightArm);

        // Steering wheel interaction
        const wheelGeometry = new THREE.TorusGeometry(0.3, 0.05, 8, 20);
        const wheelMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 50
        });
        const steeringWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        steeringWheel.rotation.x = Math.PI / 2;
        steeringWheel.position.set(0.8, 1.2, 0);
        pandaGroup.add(steeringWheel);

        // Position panda in driver seat
        pandaGroup.position.set(0.4, 0.3, 0);
        pandaGroup.rotation.y = Math.PI; // Face forward
        this.mesh.add(pandaGroup);
        this.pandaDriver = pandaGroup;
    }

    update(dt, input, obstacles, playerCar = null) {
        if (this.eliminated) return;
        if (dt <= 0 || dt > 0.1) dt = 1 / 60;

        if (this.isPlayer) {
            this.handlePlayerInput(dt, input);
        } else {
            this.handleAI(dt, obstacles, playerCar);
        }

        // Apply Friction/Drag
        this.speed *= this.drag;
        if (Math.abs(this.speed) < 0.1) this.speed = 0;

        // Move forward relative to road curve
        this.position.z -= this.speed * dt;

        // Steer relative to curve center
        const curveX = this.environment ? this.environment.getCurveX(this.position.z) : 0;
        const targetX = curveX + this.laneX;
        const xErr = targetX - this.position.x;

        // Smoother steer interpolation
        this.position.x += xErr * 4 * dt;
        this.laneX = Math.max(-15, Math.min(15, this.laneX));

        // Rotation and Orientation
        const lookAheadZ = this.position.z - 5;
        const lookAheadX = this.environment ? this.environment.getCurveX(lookAheadZ) + this.laneX : targetX;

        // Tilt mesh slightly when steering (visual polish)
        const tilt = -xErr * 0.15;
        this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, tilt, 0.1);

        this.mesh.lookAt(lookAheadX, 0.5, lookAheadZ);
        this.mesh.position.copy(this.position);

        // Wheel spin
        const spinAmt = this.speed * dt * 4;
        this.wheels.forEach(w => { w.rotation.x += spinAmt; });

        // Create wheel tracks
        this.createWheelTracks(dt);
    }

    createWheelTracks(dt) {
        if (!this.isPlayer || Math.abs(this.speed) < 1) return;

        this.trackTimer += dt;
        
        // Create track every 0.1 seconds
        if (this.trackTimer > 0.1) {
            this.trackTimer = 0;
            
            // Check if moved enough distance
            const distance = this.position.distanceTo(this.lastTrackPosition);
            if (distance > 2) {
                this.lastTrackPosition.copy(this.position);
                
                // Create track marks for each wheel
                this.wheels.forEach((wheel, index) => {
                    const trackGeometry = new THREE.RingGeometry(0.35, 0.05, 8);
                    const trackMaterial = new THREE.MeshBasicMaterial({
                        color: 0x333333,
                        transparent: true,
                        opacity: 0.6,
                        side: THREE.DoubleSide
                    });
                    
                    const track = new THREE.Mesh(trackGeometry, trackMaterial);
                    track.position.copy(wheel.getWorldPosition(new THREE.Vector3()));
                    track.position.y -= 0.25; // Slightly below ground
                    track.rotation.x = Math.PI / 2;
                    
                    this.scene.add(track);
                    this.wheelTracks.push(track);
                    
                    // Remove old tracks (keep only last 50)
                    if (this.wheelTracks.length > 200) {
                        const oldTrack = this.wheelTracks.shift();
                        if (oldTrack) this.scene.remove(oldTrack);
                    }
                });
            }
        }
    }

    handlePlayerInput(dt, input) {
        if (!input) return;

        // Acceleration
        if (input.keys.forward) {
            this.speed += this.accelPower * dt;
        } else if (input.keys.backward) {
            this.speed -= this.breakingPower * dt;
        }

        // Handbrake
        if (input.keys.brake) {
            this.speed *= 0.95;
        }

        // Nitro
        let currentMax = this.maxSpeedBase;
        if (input.keys.nitro && this.nitro > 0) {
            this.speed += this.accelPower * 2 * dt;
            currentMax *= 1.6;
            this.nitro -= 30 * dt;
        }

        // Clamp speed
        this.speed = Math.max(-10, Math.min(currentMax, this.speed));

        // Steering
        let steerFactor = input.keys.brake ? 1.5 : 1.0;
        const sensitivityMultiplier = this.steeringSensitivity / 5;
        
        if (input.keys.left) {
            this.laneX -= this.steerPower * (this.speed / 20 + 0.5) * steerFactor * 15 * dt * sensitivityMultiplier;
        }
        if (input.keys.right) {
            this.laneX += this.steerPower * (this.speed / 20 + 0.5) * steerFactor * 15 * dt * sensitivityMultiplier;
        }
    }

    handleAI(dt, obstacles, playerCar) {
        if (!this.aiState) {
            this.aiState = {
                targetLane: this.laneX,
                pathScanDist: 150,
                lastDecisionZ: 0
            };
        }

        let baseMax = 58 + (this.stats.speed * 3);

        if (playerCar && !playerCar.eliminated) {
            const zDiff = playerCar.position.z - this.position.z;
            if (zDiff < -40) baseMax += 25;
            if (zDiff > 100) baseMax -= 10;
        }

        const roadLanes = [-15, -10, -5, 0, 5, 10, 15];
        let bestLane = this.laneX;
        let bestScore = -Infinity;

        roadLanes.forEach(lx => {
            let score = 0;
            score -= Math.abs(lx) * 0.1;
            score -= Math.abs(lx - this.laneX) * 0.5;

            obstacles?.forEach(obs => {
                const dz = obs.position.z - this.position.z;
                if (dz < -1 && dz > -this.aiState.pathScanDist) {
                    const roadXAtObs = this.environment.getCurveX(obs.position.z);
                    const absoluteTargetX = roadXAtObs + lx;
                    const dx = Math.abs(obs.position.x - absoluteTargetX);

                    if (dx < 6) {
                        const proximityWeight = (this.aiState.pathScanDist - Math.abs(dz)) / this.aiState.pathScanDist;
                        score -= 5000 * (1.0 - dx / 6) * proximityWeight;
                    }
                }
            });

            if (score > bestScore) {
                bestScore = score;
                bestLane = lx;
            }
        });

        this.aiState.targetLane = bestLane;

        const laneDiff = this.aiState.targetLane - this.laneX;
        const steerSpeed = Math.abs(laneDiff) > 5 ? 45 : 25;
        this.laneX += Math.sign(laneDiff) * Math.min(Math.abs(laneDiff), steerSpeed * dt);

        if (this.nitro > 10) {
            const isPathClear = !obstacles?.some(obs => {
                const dz = obs.position.z - this.position.z;
                if (dz < -5 && dz > -100) {
                    const dx = Math.abs(obs.position.x - (this.environment.getCurveX(obs.position.z) + this.laneX));
                    return dx < 5;
                }
                return false;
            });

            if (isPathClear && (this.speed < baseMax || Math.random() < 0.05)) {
                this.speed += this.accelPower * 2.5 * dt;
                baseMax *= 1.5;
                this.nitro -= 20 * dt;
            }
        }

        if (this.speed < baseMax) {
            this.speed += this.accelPower * 1.5 * dt;
        } else {
            this.speed *= 0.995;
        }

        if (playerCar && !playerCar.eliminated) {
            const dz = playerCar.position.z - this.position.z;
            const dx = playerCar.position.x - this.position.x;
            if (Math.abs(dz) < 10 && Math.abs(dx) < 6) {
                this.laneX += Math.sign(dx) * 8 * dt;
            }
        }

        this.laneX = Math.max(-15, Math.min(15, this.laneX));
    }

    setSteeringSensitivity(sensitivity) {
        this.steeringSensitivity = sensitivity;
    }

    eliminate() {
        this.eliminated = true;
        this.speed = 0;
        this.nitro = 0;
    }

    getSpeedKmh() {
        return Math.floor(this.speed * 3.6);
    }

    destroy() {
        if (this.mesh) this.scene.remove(this.mesh);
        
        // Clean up wheel tracks
        this.wheelTracks.forEach(track => {
            if (track) this.scene.remove(track);
        });
        this.wheelTracks = [];
    }
}
