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
        const navyBlue = 0x0047ab;
        const darkBlue = 0x002855;
        const glassBlack = 0x0a0a0a;
        
        const bodyMat = new THREE.MeshPhongMaterial({
            color: navyBlue,
            shininess: 120,
            metalness: 0.8,
            specular: 0x444444
        });
        
        // === CURVED BODY USING HALF-CYLINDER ===
        // Main chassis - curved half-cylinder for rounded shape
        const chassisGeo = new THREE.CylinderGeometry(1.8, 2.0, 6, 16, 1, false, 0, Math.PI);
        const chassis = new THREE.Mesh(chassisGeo, bodyMat);
        chassis.rotation.z = Math.PI / 2;
        chassis.rotation.x = Math.PI / 2;
        chassis.position.y = 0.7;
        chassis.scale.set(1, 0.5, 1);
        carGroup.add(chassis);
        
        // Pointed front nose - cone shape
        const noseGeo = new THREE.ConeGeometry(1.7, 1.5, 4);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.rotation.x = Math.PI / 2;
        nose.rotation.y = Math.PI / 4;
        nose.position.set(0, 0.6, 3.5);
        carGroup.add(nose);
        
        // Rounded cabin - sphere section
        const cabinGeo = new THREE.SphereGeometry(1.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const cabin = new THREE.Mesh(cabinGeo, bodyMat);
        cabin.scale.set(1.3, 0.7, 1.8);
        cabin.position.set(0, 1.1, -0.5);
        carGroup.add(cabin);
        
        // === WINDOWS ===
        const glassMat = new THREE.MeshPhongMaterial({
            color: glassBlack,
            shininess: 90,
            transparent: true,
            opacity: 0.9
        });
        
        // Windshield - steep angle
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.0), glassMat);
        windshield.position.set(0, 1.5, 0.8);
        windshield.rotation.x = -Math.PI / 3;
        carGroup.add(windshield);
        
        // Side windows
        const sideWinGeo = new THREE.PlaneGeometry(1.6, 0.7);
        const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
        leftWin.position.set(-1.35, 1.4, -0.5);
        leftWin.rotation.y = -Math.PI / 2;
        leftWin.rotation.z = 0.1;
        carGroup.add(leftWin);
        
        const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
        rightWin.position.set(1.35, 1.4, -0.5);
        rightWin.rotation.y = Math.PI / 2;
        rightWin.rotation.z = -0.1;
        carGroup.add(rightWin);
        
        // === Y-SHAPED LED HEADLIGHTS ===
        const lightMat = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 1.0
        });
        
        // Left Y-shaped headlight
        const leftLightStem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.08), lightMat);
        leftLightStem.position.set(-1.1, 0.9, 3.3);
        leftLightStem.rotation.z = -0.25;
        carGroup.add(leftLightStem);
        
        const leftLightBranch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.08), lightMat);
        leftLightBranch.position.set(-0.95, 0.8, 3.3);
        carGroup.add(leftLightBranch);
        
        // Right Y-shaped headlight
        const rightLightStem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.08), lightMat);
        rightLightStem.position.set(1.1, 0.9, 3.3);
        rightLightStem.rotation.z = 0.25;
        carGroup.add(rightLightStem);
        
        const rightLightBranch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.08), lightMat);
        rightLightBranch.position.set(0.95, 0.8, 3.3);
        carGroup.add(rightLightBranch);
        
        // === SIDE AIR INTAKES ===
        const intakeMat = new THREE.MeshPhongMaterial({ color: darkBlue });
        const intakeGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.0, 8);
        const leftIntake = new THREE.Mesh(intakeGeo, intakeMat);
        leftIntake.rotation.z = Math.PI / 2;
        leftIntake.position.set(-1.9, 0.8, 0.3);
        carGroup.add(leftIntake);
        
        const rightIntake = new THREE.Mesh(intakeGeo, intakeMat);
        rightIntake.rotation.z = Math.PI / 2;
        rightIntake.position.set(1.9, 0.8, 0.3);
        carGroup.add(rightIntake);
        
        // === REAR SPOILER ===
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 0.5), bodyMat);
        spoiler.position.set(0, 1.6, -2.8);
        carGroup.add(spoiler);
        
        // Spoiler supports
        const supportGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4);
        const leftSupport = new THREE.Mesh(supportGeo, bodyMat);
        leftSupport.position.set(-1.0, 1.4, -2.8);
        carGroup.add(leftSupport);
        
        const rightSupport = new THREE.Mesh(supportGeo, bodyMat);
        rightSupport.position.set(1.0, 1.4, -2.8);
        carGroup.add(rightSupport);
        
        // === TORUS WHEELS (Realistic tire shape) ===
        this.createTorusWheels(carGroup, 0.38, 1.6, 1.8, 0x111111);
        
        // === TAILLIGHTS ===
        const tailMat = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.7
        });
        
        const leftTail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.1), tailMat);
        leftTail.position.set(-1.0, 1.0, -3.1);
        carGroup.add(leftTail);
        
        const rightTail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.1), tailMat);
        rightTail.position.set(1.0, 1.0, -3.1);
        carGroup.add(rightTail);
    }

    createBugatti(carGroup) {
        const black = 0x1a1a1a;
        const chrome = 0xc0c0c0;
        const glassBlack = 0x050505;
        
        const bodyMat = new THREE.MeshPhongMaterial({
            color: black,
            shininess: 150,
            metalness: 0.6,
            specular: 0x666666
        });
        
        // === LONG ELEGANT TEARDROP BODY ===
        // Main body - elongated half-cylinder
        const bodyGeo = new THREE.CylinderGeometry(1.5, 1.7, 7, 16, 1, false, 0, Math.PI);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.z = Math.PI / 2;
        body.rotation.x = Math.PI / 2;
        body.position.y = 0.7;
        body.scale.set(1.2, 0.55, 1);
        carGroup.add(body);
        
        // Rounded front nose - sphere section
        const noseGeo = new THREE.SphereGeometry(1.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.scale.set(1, 0.5, 1.2);
        nose.position.set(0, 0.7, 3.8);
        carGroup.add(nose);
        
        // Cabin - bubble canopy (sphere)
        const cabinGeo = new THREE.SphereGeometry(1.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const cabin = new THREE.Mesh(cabinGeo, bodyMat);
        cabin.scale.set(1.2, 0.65, 1.6);
        cabin.position.set(0, 1.2, -0.3);
        carGroup.add(cabin);
        
        // === WINDOWS ===
        const glassMat = new THREE.MeshPhongMaterial({
            color: glassBlack,
            shininess: 90,
            transparent: true,
            opacity: 0.85
        });
        
        // Windshield
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.0), glassMat);
        windshield.position.set(0, 1.5, 0.5);
        windshield.rotation.x = -Math.PI / 4;
        carGroup.add(windshield);
        
        // Side windows
        const sideWinGeo = new THREE.PlaneGeometry(2.2, 0.6);
        const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
        leftWin.position.set(-1.4, 1.4, -0.3);
        leftWin.rotation.y = -Math.PI / 2;
        carGroup.add(leftWin);
        
        const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
        rightWin.position.set(1.4, 1.4, -0.3);
        rightWin.rotation.y = Math.PI / 2;
        carGroup.add(rightWin);
        
        // === HORSE COLLAR GRILLE ===
        const chromeMat = new THREE.MeshPhongMaterial({
            color: chrome,
            shininess: 200,
            metalness: 0.9
        });
        
        const grilleGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.15, 16);
        const grille = new THREE.Mesh(grilleGeo, chromeMat);
        grille.rotation.x = Math.PI / 2;
        grille.position.set(0, 0.8, 4.6);
        carGroup.add(grille);
        
        // Chrome side line
        const lineGeo = new THREE.BoxGeometry(0.05, 0.08, 6);
        const leftLine = new THREE.Mesh(lineGeo, chromeMat);
        leftLine.position.set(-1.75, 0.8, 0);
        carGroup.add(leftLine);
        
        const rightLine = new THREE.Mesh(lineGeo, chromeMat);
        rightLine.position.set(1.75, 0.8, 0);
        carGroup.add(rightLine);
        
        // === ROUND HEADLIGHTS ===
        const lightMat = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.9
        });
        
        const leftLight = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), lightMat);
        leftLight.position.set(-1.0, 0.95, 4.2);
        carGroup.add(leftLight);
        
        const rightLight = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), lightMat);
        rightLight.position.set(1.0, 0.95, 4.2);
        carGroup.add(rightLight);
        
        // === TORUS WHEELS ===
        this.createTorusWheels(carGroup, 0.38, 1.7, 2.1, 0x0a0a0a, chrome);
        
        // === TAILLIGHTS ===
        const tailMat = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.6
        });
        
        const tailBar = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 0.1), tailMat);
        tailBar.position.set(0, 1.0, -3.6);
        carGroup.add(tailBar);
    }

    createSupra(carGroup) {
        const pink = 0xff1493;
        const darkPink = 0xcc1077;
        const glassBlack = 0x0a0a0a;
        
        const bodyMat = new THREE.MeshPhongMaterial({
            color: pink,
            shininess: 80,
            metalness: 0.5
        });
        
        // === SPORTY COMPACT BODY ===
        // Main body - compact half-cylinder
        const bodyGeo = new THREE.CylinderGeometry(1.4, 1.6, 5.2, 14, 1, false, 0, Math.PI);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.z = Math.PI / 2;
        body.rotation.x = Math.PI / 2;
        body.position.y = 0.6;
        body.scale.set(1.1, 0.6, 1);
        carGroup.add(body);
        
        // Hood - pointed cone
        const hoodGeo = new THREE.ConeGeometry(1.4, 1.0, 4);
        const hood = new THREE.Mesh(hoodGeo, bodyMat);
        hood.rotation.x = Math.PI / 2;
        hood.rotation.y = Math.PI / 4;
        hood.position.set(0, 0.6, 2.9);
        carGroup.add(hood);
        
        // Cabin - sporty bubble
        const cabinGeo = new THREE.SphereGeometry(1.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        const cabin = new THREE.Mesh(cabinGeo, bodyMat);
        cabin.scale.set(1.1, 0.7, 1.4);
        cabin.position.set(0, 1.1, -0.2);
        carGroup.add(cabin);
        
        // === WINDOWS ===
        const glassMat = new THREE.MeshPhongMaterial({
            color: glassBlack,
            shininess: 90
        });
        
        // Windshield - steep
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.9), glassMat);
        windshield.position.set(0, 1.35, 0.5);
        windshield.rotation.x = -Math.PI / 3;
        carGroup.add(windshield);
        
        // Side windows
        const sideWinGeo = new THREE.PlaneGeometry(1.4, 0.6);
        const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
        leftWin.position.set(-1.15, 1.2, -0.2);
        leftWin.rotation.y = -Math.PI / 2;
        carGroup.add(leftWin);
        
        const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
        rightWin.position.set(1.15, 1.2, -0.2);
        rightWin.rotation.y = Math.PI / 2;
        carGroup.add(rightWin);
        
        // === RACING STRIPE ===
        const stripeMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 1.4), stripeMat);
        hoodStripe.position.set(0, 1.15, 2.0);
        carGroup.add(hoodStripe);
        
        // === BIG REAR SPOILER ===
        const spoilerMat = new THREE.MeshPhongMaterial({ color: darkPink });
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.6), spoilerMat);
        spoiler.position.set(0, 1.6, -2.5);
        carGroup.add(spoiler);
        
        // Spoiler legs
        const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4);
        const leftLeg = new THREE.Mesh(legGeo, spoilerMat);
        leftLeg.position.set(-0.8, 1.35, -2.5);
        carGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeo, spoilerMat);
        rightLeg.position.set(0.8, 1.35, -2.5);
        carGroup.add(rightLeg);
        
        // === SPORT HEADLIGHTS ===
        const lightMat = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.9
        });
        
        const leftLight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.08), lightMat);
        leftLight.position.set(-0.9, 0.75, 2.8);
        carGroup.add(leftLight);
        
        const rightLight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.08), lightMat);
        rightLight.position.set(0.9, 0.75, 2.8);
        carGroup.add(rightLight);
        
        // === TORUS WHEELS ===
        this.createTorusWheels(carGroup, 0.35, 1.4, 1.6, 0x222222);
        
        // === TAILLIGHTS ===
        const tailMat = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.6
        });
        
        const leftTail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), tailMat);
        leftTail.position.set(-0.8, 0.9, -2.7);
        carGroup.add(leftTail);
        
        const rightTail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), tailMat);
        rightTail.position.set(0.8, 0.9, -2.7);
        carGroup.add(rightTail);
    }

    createPorsche(carGroup) {
        const white = 0xf5f5f5;
        const glassBlack = 0x111111;
        
        const bodyMat = new THREE.MeshPhongMaterial({
            color: white,
            shininess: 90,
            metalness: 0.4
        });
        
        // === ROUNDED 911 BODY ===
        // Main rounded body - large sphere section
        const bodyGeo = new THREE.SphereGeometry(1.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.scale.set(1.2, 0.65, 2.2);
        body.position.set(0, 0.5, 0);
        carGroup.add(body);
        
        // Front slope - half cylinder
        const frontGeo = new THREE.CylinderGeometry(1.5, 1.6, 1.5, 16, 1, false, 0, Math.PI);
        const front = new THREE.Mesh(frontGeo, bodyMat);
        front.rotation.z = Math.PI / 2;
        front.rotation.x = Math.PI / 2;
        front.position.y = 0.5;
        front.position.z = 2.5;
        front.scale.set(1, 0.5, 1);
        carGroup.add(front);
        
        // Long sloping rear (911 fastback) - cone shape
        const rearGeo = new THREE.ConeGeometry(1.5, 2.0, 16);
        const rear = new THREE.Mesh(rearGeo, bodyMat);
        rear.rotation.x = -Math.PI / 2;
        rear.scale.set(1, 0.6, 1);
        rear.position.set(0, 0.8, -2.2);
        carGroup.add(rear);
        
        // Cabin - rounded
        const cabinGeo = new THREE.SphereGeometry(1.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        const cabin = new THREE.Mesh(cabinGeo, bodyMat);
        cabin.scale.set(1.15, 0.7, 1.3);
        cabin.position.set(0, 1.05, -0.3);
        carGroup.add(cabin);
        
        // === WINDOWS ===
        const glassMat = new THREE.MeshPhongMaterial({
            color: glassBlack,
            shininess: 90
        });
        
        // Windshield
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.8), glassMat);
        windshield.position.set(0, 1.25, 0.5);
        windshield.rotation.x = -Math.PI / 4;
        carGroup.add(windshield);
        
        // Side windows
        const sideWinGeo = new THREE.PlaneGeometry(1.5, 0.55);
        const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
        leftWin.position.set(-1.25, 1.15, -0.3);
        leftWin.rotation.y = -Math.PI / 2;
        carGroup.add(leftWin);
        
        const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
        rightWin.position.set(1.25, 1.15, -0.3);
        rightWin.rotation.y = Math.PI / 2;
        carGroup.add(rightWin);
        
        // Rear window (911 curved glass)
        const rearWin = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), glassMat);
        rearWin.position.set(0, 1.2, -1.5);
        rearWin.rotation.x = Math.PI / 5;
        carGroup.add(rearWin);
        
        // === ROUND HEADLIGHTS (911 Signature) ===
        const lightMat = new THREE.MeshPhongMaterial({
            color: 0xffffcc,
            emissive: 0xffffcc,
            emissiveIntensity: 0.8
        });
        
        const leftLight = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), lightMat);
        leftLight.position.set(-1.0, 0.75, 2.8);
        carGroup.add(leftLight);
        
        const rightLight = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), lightMat);
        rightLight.position.set(1.0, 0.75, 2.8);
        carGroup.add(rightLight);
        
        // === TORUS WHEELS ===
        this.createTorusWheels(carGroup, 0.33, 1.3, 1.7, 0x333333, 0xdddddd);
        
        // === TAILLIGHTS ===
        const tailMat = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        
        const tailBar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.08), tailMat);
        tailBar.position.set(0, 0.9, -3.0);
        carGroup.add(tailBar);
    }

    createFerrari(carGroup) {
        const red = 0xff0000;
        const darkRed = 0xcc0000;
        const glassBlack = 0x0a0a0a;
        
        const bodyMat = new THREE.MeshPhongMaterial({
            color: red,
            shininess: 110,
            metalness: 0.7,
            specular: 0x444444
        });
        
        // === SLEEK LOW BODY ===
        // Main body - tapered cylinder
        const bodyGeo = new THREE.CylinderGeometry(1.4, 1.6, 5.6, 14, 1, false, 0, Math.PI);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.z = Math.PI / 2;
        body.rotation.x = Math.PI / 2;
        body.position.y = 0.55;
        body.scale.set(1.1, 0.5, 1);
        carGroup.add(body);
        
        // Pointed front nose
        const noseGeo = new THREE.ConeGeometry(1.3, 0.9, 4);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.rotation.x = Math.PI / 2;
        nose.rotation.y = Math.PI / 4;
        nose.position.set(0, 0.55, 3.2);
        carGroup.add(nose);
        
        // Cabin - sleek bubble
        const cabinGeo = new THREE.SphereGeometry(1.25, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        const cabin = new THREE.Mesh(cabinGeo, bodyMat);
        cabin.scale.set(1.1, 0.65, 1.5);
        cabin.position.set(0, 1.0, -0.3);
        carGroup.add(cabin);
        
        // === WINDOWS ===
        const glassMat = new THREE.MeshPhongMaterial({
            color: glassBlack,
            shininess: 90
        });
        
        // Windshield
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.85), glassMat);
        windshield.position.set(0, 1.25, 0.5);
        windshield.rotation.x = -Math.PI / 3.5;
        carGroup.add(windshield);
        
        // Side windows
        const sideWinGeo = new THREE.PlaneGeometry(1.5, 0.55);
        const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
        leftWin.position.set(-1.15, 1.15, -0.3);
        leftWin.rotation.y = -Math.PI / 2;
        carGroup.add(leftWin);
        
        const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
        rightWin.position.set(1.15, 1.15, -0.3);
        rightWin.rotation.y = Math.PI / 2;
        carGroup.add(rightWin);
        
        // === FRONT SPLITTER ===
        const splitterMat = new THREE.MeshPhongMaterial({ color: darkRed });
        const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.4), splitterMat);
        splitter.position.set(0, 0.15, 3.6);
        carGroup.add(splitter);
        
        // === FERRARI LOGO ===
        const logoMat = new THREE.MeshPhongMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.3
        });
        const logo = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), logoMat);
        logo.rotation.x = Math.PI / 2;
        logo.position.set(0, 0.7, 2.6);
        carGroup.add(logo);
        
        // === SPORT HEADLIGHTS ===
        const lightMat = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.9
        });
        
        const leftLight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.06), lightMat);
        leftLight.position.set(-1.0, 0.7, 3.0);
        carGroup.add(leftLight);
        
        const rightLight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.06), lightMat);
        rightLight.position.set(1.0, 0.7, 3.0);
        carGroup.add(rightLight);
        
        // === SMALL SPOILER ===
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.4), splitterMat);
        spoiler.position.set(0, 1.4, -2.8);
        carGroup.add(spoiler);
        
        // === TORUS WHEELS ===
        this.createTorusWheels(carGroup, 0.33, 1.4, 1.7, 0x222222, 0x888888);
        
        // === TAILLIGHTS ===
        const tailMat = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.6
        });
        
        const leftTail = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 12), tailMat);
        leftTail.rotation.x = Math.PI / 2;
        leftTail.position.set(-0.9, 0.9, -2.9);
        carGroup.add(leftTail);
        
        const rightTail = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 12), tailMat);
        rightTail.rotation.x = Math.PI / 2;
        rightTail.position.set(0.9, 0.9, -2.9);
        carGroup.add(rightTail);
    }

    // === TORUS WHEELS - Realistic tire shape ===
    createTorusWheels(carGroup, radius, xPos, zPos, tireColor, rimColor = null) {
        this.wheels = [];
        
        const tireMat = new THREE.MeshPhongMaterial({ 
            color: tireColor,
            shininess: 30 
        });
        
        const rimMat = new THREE.MeshPhongMaterial({ 
            color: rimColor || 0x888888,
            shininess: 100 
        });
        
        const positions = [
            [-xPos, radius, zPos],
            [xPos, radius, zPos],
            [-xPos, radius, -zPos],
            [xPos, radius, -zPos]
        ];
        
        positions.forEach(pos => {
            const wheelGroup = new THREE.Group();
            
            // Torus tire (donut shape) - realistic!
            const tireGeo = new THREE.TorusGeometry(radius, radius * 0.22, 8, 24);
            const tire = new THREE.Mesh(tireGeo, tireMat);
            wheelGroup.add(tire);
            
            // Rim cylinder
            const rimGeo = new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, 0.12, 16);
            const rim = new THREE.Mesh(rimGeo, rimMat);
            rim.rotation.x = Math.PI / 2;
            wheelGroup.add(rim);
            
            // Spokes
            for (let i = 0; i < 5; i++) {
                const spokeGeo = new THREE.BoxGeometry(radius * 1.2, 0.04, 0.06);
                const spoke = new THREE.Mesh(spokeGeo, rimMat);
                spoke.rotation.z = (i / 5) * Math.PI;
                wheelGroup.add(spoke);
            }
            
            wheelGroup.position.set(...pos);
            wheelGroup.rotation.y = Math.PI / 2;
            wheelGroup.castShadow = true;
            carGroup.add(wheelGroup);
            this.wheels.push(wheelGroup);
        });
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
