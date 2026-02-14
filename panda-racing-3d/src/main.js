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

    let saveData = SaveSystem.load();

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

    document.getElementById('btn-garage')?.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        garageScreen.classList.remove('hidden');
        updateGarageUI();
    });

    document.getElementById('btn-garage-back')?.addEventListener('click', () => {
        garageScreen.classList.add('hidden');
        mainMenu.classList.remove('hidden');
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
