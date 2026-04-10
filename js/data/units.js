// Static unit definitions for Red Alert 2: Reborn.
// Exposes UNIT_TYPES globally so the no-bundler runtime can consume them.
window.UNIT_TYPES = {
    soldier: {
        name: 'Soldier',
        cost: 200,
        trainTime: 3000,
        hp: 50,
        speed: 1.2,
        damage: 8,
        range: 4,
        fireRate: 800,
        sight: 6,
        armorType: 'light',
        role: 'infantry',
        producedBy: 'barracks',
        prerequisites: ['barracks']
    },
    harvester: {
        name: 'Harvester',
        cost: 1400,
        trainTime: 9000,
        hp: 260,
        speed: 0.72,
        damage: 0,
        range: 0,
        fireRate: 0,
        sight: 6,
        armorType: 'heavy',
        role: 'harvester',
        cargoCapacity: 700,
        harvestRate: 140,
        harvestInterval: 900,
        unloadRate: 175,
        unloadInterval: 300,
        producedBy: 'warFactory',
        prerequisites: ['warFactory', 'refinery']
    },
    tank: {
        name: 'Rhino Tank',
        cost: 900,
        trainTime: 7000,
        hp: 180,
        speed: 0.92,
        damage: 34,
        range: 5,
        fireRate: 1450,
        sight: 7,
        armorType: 'heavy',
        role: 'vehicle',
        projectileSpeed: 10,
        producedBy: 'warFactory',
        prerequisites: ['warFactory']
    }
};
