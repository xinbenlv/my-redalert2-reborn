// Static building definitions for Red Alert 2: Reborn.
// Exposes BUILD_TYPES globally so the no-bundler runtime can consume them.
window.BUILD_TYPES = {
    powerPlant: {
        name: 'Power Plant',
        cost: 800,
        buildTime: 6000,
        hp: 600,
        sight: 5,
        size: 2,
        powerSupply: 100,
        powerDrain: 0,
        description: 'Provides base power.',
        prerequisites: []
    },
    refinery: {
        name: 'Refinery',
        cost: 1500,
        buildTime: 8000,
        hp: 800,
        sight: 5,
        size: 2,
        powerSupply: 0,
        powerDrain: 20,
        acceptsOre: true,
        description: 'Accepts ore from harvesters.',
        prerequisites: ['powerPlant']
    },
    barracks: {
        name: 'Barracks',
        cost: 600,
        buildTime: 5000,
        hp: 500,
        sight: 4,
        size: 2,
        powerSupply: 0,
        powerDrain: 25,
        production: ['soldier', 'rocketInfantry', 'flakTrooper', 'engineer'],
        description: 'Trains infantry and engineers.',
        prerequisites: ['powerPlant']
    },
    radarDome: {
        name: 'Radar Dome',
        cost: 1000,
        buildTime: 7000,
        hp: 650,
        sight: 7,
        size: 2,
        powerSupply: 0,
        powerDrain: 35,
        providesRadar: true,
        description: 'Restores minimap radar coverage when powered.',
        prerequisites: ['powerPlant', 'barracks']
    },
    warFactory: {
        name: 'War Factory',
        cost: 2000,
        buildTime: 11000,
        hp: 1000,
        sight: 5,
        size: 3,
        powerSupply: 0,
        powerDrain: 45,
        production: ['harvester', 'tank'],
        description: 'Produces vehicles.',
        prerequisites: ['powerPlant', 'refinery', 'barracks']
    }
};
