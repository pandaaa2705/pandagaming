import * as THREE from 'three';

export class SoundSystem {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
        this.sounds = new Map();
        this.enabled = true;
    }

    init(assetLoader) {
        // Names should match asset names in AssetLoader
        const soundNames = ['engine', 'nitro', 'crash', 'music'];

        soundNames.forEach(name => {
            const buffer = assetLoader.getAsset(name);
            if (buffer) {
                const sound = new THREE.Audio(this.listener);
                sound.setBuffer(buffer);
                this.sounds.set(name, sound);
            }
        });

        // Config music
        const music = this.sounds.get('music');
        if (music) {
            music.setLoop(true);
            music.setVolume(0.4);
        }

        // Config engine
        const engine = this.sounds.get('engine');
        if (engine) {
            engine.setLoop(true);
            engine.setVolume(0.5);
        }
    }

    play(name, loop = false, volume = 1.0) {
        if (!this.enabled) return;
        const sound = this.sounds.get(name);
        if (sound) {
            if (sound.isPlaying && !loop) sound.stop();
            sound.setLoop(loop);
            sound.setVolume(volume);
            sound.play();
        }
    }

    stop(name) {
        const sound = this.sounds.get(name);
        if (sound && sound.isPlaying) {
            sound.stop();
        }
    }

    updateEngine(speedRatio) {
        const engine = this.sounds.get('engine');
        if (engine && engine.isPlaying) {
            // Shift pitch based on speed
            engine.playbackRate = 0.8 + speedRatio * 1.2;
            engine.setVolume(0.3 + speedRatio * 0.4);
        }
    }
}
