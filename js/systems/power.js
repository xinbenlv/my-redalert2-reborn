// Power helpers for Red Alert 2: Reborn.
// Exposes POWER_SYSTEM globally for the no-bundler runtime.
window.POWER_SYSTEM = {
    calculate(player) {
        let produced = 0;
        let consumed = 0;
        for (const building of player.buildings || []) {
            if (building.hp <= 0 || !building.built) continue;
            const def = window.BUILD_TYPES?.[building.type];
            if (!def) continue;
            produced += def.powerSupply || 0;
            consumed += def.powerDrain || 0;
        }
        return {
            produced,
            consumed,
            net: produced - consumed,
            ratio: consumed > 0 ? produced / consumed : 1
        };
    },
    isLowPower(player) {
        const stats = this.calculate(player);
        return stats.consumed > 0 && stats.produced < stats.consumed;
    },
    getBuildSpeedMultiplier(player) {
        const stats = this.calculate(player);
        if (stats.consumed <= 0 || stats.produced >= stats.consumed) return 1;
        return Math.max(0.4, stats.produced / stats.consumed);
    },
    getStatusLabel(player) {
        const stats = this.calculate(player);
        if (stats.consumed === 0 && stats.produced === 0) {
            return { text: 'POWER STANDBY', lowPower: false, stats };
        }
        if (stats.produced < stats.consumed) {
            return { text: `LOW POWER ${stats.produced}/${stats.consumed}`, lowPower: true, stats };
        }
        return { text: `POWER ${stats.produced}/${stats.consumed}`, lowPower: false, stats };
    }
};
