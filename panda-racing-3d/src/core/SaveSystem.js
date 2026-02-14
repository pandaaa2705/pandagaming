export class SaveSystem {
    static SAVE_KEY = 'panda_racing_save';

    static DEFAULT_DATA = {
        totalScore: 0,
        currentLevel: 1,
        selectedCarId: 'car_0',
        selectedPandaId: 'panda_0',
        unlockedCars: ['car_0'],
        carStats: {
            'car_0': { speed: 1, accel: 1, nitro: 1, handling: 1 }
        }
    };

    static load() {
        const raw = localStorage.getItem(this.SAVE_KEY);
        if (!raw) return { ...this.DEFAULT_DATA };
        try {
            return { ...this.DEFAULT_DATA, ...JSON.parse(raw) };
        } catch (e) {
            console.error("Failed to load save data", e);
            return { ...this.DEFAULT_DATA };
        }
    }

    static save(data) {
        localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    static addScore(amount) {
        const data = this.load();
        data.totalScore += amount;
        this.save(data);
    }

    static upgradeStat(carId, statName) {
        const data = this.load();
        if (!data.carStats[carId]) {
            data.carStats[carId] = { speed: 1, accel: 1, nitro: 1, handling: 1 };
        }

        const currentLevel = data.carStats[carId][statName];
        const cost = currentLevel * 500; // Scalable cost

        if (data.totalScore >= cost && currentLevel < 10) {
            data.totalScore -= cost;
            data.carStats[carId][statName]++;
            this.save(data);
            return true;
        }
        return false;
    }

    static getUpgradeCost(carId, statName) {
        const data = this.load();
        const level = data.carStats[carId] ? data.carStats[carId][statName] : 1;
        return level * 500;
    }
}
