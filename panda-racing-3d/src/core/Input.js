export class Input {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false,
            nitro: false,
            changeCamera: false
        };

        this._onKeyDown = (e) => this.onKeyDown(e);
        this._onKeyUp = (e) => this.onKeyUp(e);

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
    }

    onKeyDown(event) {
        let handled = true;
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
            case 'Space': this.keys.brake = true; break;
            case 'ShiftLeft': case 'ShiftRight': this.keys.nitro = true; break;
            case 'KeyC': this.keys.changeCamera = true; break;
            default: handled = false;
        }
        if (handled) event.preventDefault();
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
            case 'Space': this.keys.brake = false; break;
            case 'ShiftLeft': case 'ShiftRight': this.keys.nitro = false; break;
            case 'KeyC': this.keys.changeCamera = false; break;
        }
    }

    destroy() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
    }
}
