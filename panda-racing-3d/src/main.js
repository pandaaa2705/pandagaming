import { Game } from './core/Game.js';

console.log("🐼 Panda Racing 3D — Initializing...");

let currentGame = null;

window.addEventListener('DOMContentLoaded', () => {
    const loaderFill = document.getElementById('loader-fill');
    const loadingScreen = document.getElementById('loading-screen');
    const mainMenu = document.getElementById('main-menu');
    const hud = document.getElementById('hud');

    // Loading progress
    let progress = 0;
    const loadInterval = setInterval(() => {
        progress += 8;
        if (loaderFill) loaderFill.style.width = progress + '%';

        const lt = document.getElementById('loading-text');
        if (lt) {
            if (progress < 40) lt.textContent = 'Loading Engine...';
            else if (progress < 70) lt.textContent = 'Growing Forest...';
            else if (progress < 95) lt.textContent = 'Waking Pandas...';
            else lt.textContent = 'Ready!';
        }

        if (progress >= 100) {
            clearInterval(loadInterval);
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                mainMenu.classList.remove('hidden');
            }, 400);
        }
    }, 60);

    function hideAll() {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    }

    function startGame() {
        hideAll();
        hud.classList.remove('hidden');

        // Reset status
        const statusEl = document.getElementById('status-display');
        if (statusEl) {
            statusEl.textContent = 'STATUS: RACING';
            statusEl.className = 'hud-item status-running';
        }

        if (currentGame) currentGame.destroy();
        currentGame = new Game();
        window.game = currentGame;
    }

    // Play button
    document.getElementById('btn-play')?.addEventListener('click', () => {
        startGame();
    });

    // Controls info
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        alert("CONTROLS:\n\nW / ↑  = Speed Up\nS / ↓  = Slow Down\nA / ←  = Steer Left\nD / →  = Steer Right\nSHIFT  = Nitro Boost\nESC    = Pause\n\nAvoid obstacles! First to crash is eliminated.");
    });

    // Retry
    document.getElementById('btn-retry')?.addEventListener('click', () => {
        startGame();
    });

    // Back to menu
    document.getElementById('btn-back-menu')?.addEventListener('click', () => {
        if (currentGame) currentGame.destroy();
        currentGame = null;
        hideAll();
        hud.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });

    // Pause buttons
    document.getElementById('btn-resume')?.addEventListener('click', () => {
        if (currentGame) currentGame.togglePause();
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
        startGame();
    });

    document.getElementById('btn-quit')?.addEventListener('click', () => {
        if (currentGame) currentGame.destroy();
        currentGame = null;
        hideAll();
        hud.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });
});

console.log("🐼 Panda Racing 3D — Ready!");
