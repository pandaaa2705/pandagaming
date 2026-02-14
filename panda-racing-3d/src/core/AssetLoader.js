import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AssetLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.audioLoader = new THREE.AudioLoader();
        this.cache = new Map();
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    async loadModel(url, name) {
        this.totalAssets++;
        return new Promise((resolve) => {
            this.loader.load(
                url,
                (gltf) => {
                    this.cache.set(name, gltf.scene);
                    this.loadedAssets++;
                    resolve(gltf.scene);
                },
                undefined,
                (error) => {
                    console.warn(`Failed to load model ${name} from ${url}, using placeholder.`, error);
                    this.loadedAssets++;
                    resolve(null);
                }
            );
        });
    }

    async loadAudio(url, name) {
        this.totalAssets++;
        return new Promise((resolve) => {
            this.audioLoader.load(
                url,
                (buffer) => {
                    this.cache.set(name, buffer);
                    this.loadedAssets++;
                    resolve(buffer);
                },
                undefined,
                (error) => {
                    console.warn(`Failed to load audio ${name} from ${url}`, error);
                    this.loadedAssets++;
                    resolve(null);
                }
            );
        });
    }

    getAsset(name) {
        return this.cache.get(name);
    }

    getProgress() {
        return this.totalAssets === 0 ? 1 : this.loadedAssets / this.totalAssets;
    }
}
