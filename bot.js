const mineflayer = require('mineflayer');
const autoVersionForge = require('minecraft-protocol-forge').autoVersionForge;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalBlock } = require('mineflayer-pathfinder').goals;

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    host: 'Fakekuromori.aternos.me',
    port: 31094, // ⚠️ ACTUALIZA ESTE PUERTO
    username: 'PokeFollador',
    auth: 'offline',
    version: false,
    hideErrors: true,
    homeRadius: 5,
};

// ==================== LISTA COMPLETA DE ÍTEMS COCINABLES ====================
const COOKABLE_ITEMS = [
    'raw_beef', 'raw_porkchop', 'raw_chicken', 'raw_rabbit', 'raw_mutton',
    'cod', 'salmon',
    'raw_iron', 'raw_gold', 'raw_copper',
    'potato'
];

const FUEL_ITEM = 'coal';

const COOK_RESULT = {
    'raw_beef': 'cooked_beef',
    'raw_porkchop': 'cooked_porkchop',
    'raw_chicken': 'cooked_chicken',
    'raw_rabbit': 'cooked_rabbit',
    'raw_mutton': 'cooked_mutton',
    'cod': 'cooked_cod',
    'salmon': 'cooked_salmon',
    'raw_iron': 'iron_ingot',
    'raw_gold': 'gold_ingot',
    'raw_copper': 'copper_ingot',
    'potato': 'baked_potato'
};

// ==================== CREACIÓN DEL BOT ====================
function createBot() {
    console.log('[NPC] 🚀 Iniciando bot cocinero (completo)...');

    const bot = mineflayer.createBot({
        host: CONFIG.host,
        port: CONFIG.port,
        username: CONFIG.username,
        auth: CONFIG.auth,
        version: CONFIG.version,
        hideErrors: CONFIG.hideErrors
    });

    bot.loadPlugin(pathfinder);

    let moveInterval = null;
    let actionInterval = null;
    let sleepInterval = null;
    let cookingInterval = null;
    let isSleeping = false;
    let isCooking = false;

    // ==================== PARCH PARA CHAT ====================
    bot._client.on('packet', (data, meta) => {
        if (meta.name === 'chat_message' || meta.name === 'system_chat' || meta.name === 'player_chat') {
            try { console.log(`[CHAT] ${data.message || data.plainMessage || JSON.stringify(data)}`); } catch (e) {}
        }
    });
    bot.on('message', () => {});

    // ==================== EVENTOS ====================
    bot.on('connect', () => console.log('[NPC] 🔗 Conectando...'));
    bot.on('login', () => console.log('[NPC] ✅ Conexión establecida'));

    bot.on('spawn', () => {
        console.log('[NPC] 🟢 Bot apareció en el mapa.');
        try {
            const mcData = require('minecraft-data')(bot.version);
            const defaultMove = new Movements(bot, mcData);
            defaultMove.canDig = false;
            defaultMove.scafoldingBlocks = [];
            bot.pathfinder.setMovements(defaultMove);
            console.log('[NPC] ✅ Pathfinder configurado');
        } catch (err) {
            console.log('[NPC] ⚠️ Error configurando pathfinder:', err.message);
        }

        setTimeout(() => {
            startActions();
            moveRandomly();
            startSleepRoutine();
            startCookingRoutine();
        }, 3000);
    });

    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
            console.log('[NPC] ❌ Error de conexión. Reintentando...');
            setTimeout(() => createBot(), 30000);
        } else if (err.name === 'PartialReadError' || err.message?.includes('PartialReadError')) {
            console.log('[NPC] ⚠️ Error de protocolo (mods), ignorando...');
        } else if (err.message?.includes('unknown chat format')) {
            console.log('[NPC] ⚠️ Error de formato de chat (mods), ignorando...');
        } else {
            console.log('[NPC] ❌ Error crítico:', err);
            // En lugar de crashear, intentamos reconectar
            setTimeout(() => createBot(), 30000);
        }
    });

    bot.on('end', (reason) => {
        console.log(`[NPC] ❌ Desconectado: ${reason}. Reconectando en 30s...`);
        stopAll();
        setTimeout(() => createBot(), 30000);
    });

    // ==================== FUNCIONES BÁSICAS ====================
    function startActions() {
        if (actionInterval) clearInterval(actionInterval);
        actionInterval = setInterval(() => {
            if (!bot || !bot.entity || isSleeping || isCooking) return;
            const rand = Math.random();
            if (rand < 0.3) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 300);
                console.log('[NPC] 🦘 Saltó');
            } else if (rand < 0.6) {
                const yaw = (Math.random() - 0.5) * Math.PI * 2;
                const pitch = (Math.random() - 0.5) * 0.5;
                bot.look(yaw, pitch, true);
                console.log('[NPC] 👀 Miró alrededor');
            } else {
                console.log('[NPC] 💤 Descansando...');
            }
        }, 15000 + Math.random() * 10000);
    }

    function moveRandomly() {
        if (!bot || !bot.entity || !bot.pathfinder || isSleeping || isCooking) {
            // Si no se puede mover ahora, intentar de nuevo en unos segundos
            setTimeout(() => moveRandomly(), 5000);
            return;
        }
        const range = CONFIG.homeRadius;
        const pos = bot.entity.position;
        const x = pos.x + (Math.random() - 0.5) * range * 2;
        const z = pos.z + (Math.random() - 0.5) * range * 2;
        // Usamos la y actual, el pathfinder se encargará de encontrar el suelo
        const target = { x, y: pos.y, z };
        moveToTarget(target);
    }

    function moveToTarget(target) {
        try {
            bot.pathfinder.setGoal(new GoalBlock(target.x, target.y, target.z));
            if (moveInterval) clearInterval(moveInterval);
            moveInterval = setInterval(() => {
                if (!bot || !bot.entity || isSleeping || isCooking) {
                    clearInterval(moveInterval);
                    return;
                }
                const dist = bot.entity.position.distanceTo(target);
                if (dist < 2) {
                    clearInterval(moveInterval);
                    console.log('[NPC] 🟢 Llegó al destino');
                    setTimeout(() => moveRandomly(), 10000 + Math.random() * 10000);
                }
            }, 2000);
        } catch (err) {
            console.log(`[NPC] ⚠️ Error moviéndose: ${err.message}`);
            setTimeout(() => moveRandomly(), 5000);
        }
    }

    // ==================== DORMIR ====================
    function startSleepRoutine() {
        if (sleepInterval) clearInterval(sleepInterval);
        sleepInterval = setInterval(async () => {
            if (!bot || !bot.entity || isSleeping || isCooking) return;
            const time = bot.time.timeOfDay || 0;
            if (time > 13000 && time < 23000) {
                console.log('[NPC] 🌙 Es de noche, buscando cama...');
                try {
                    const bedBlock = bot.findBlock({
                        matching: (block) => block.name.includes('bed'),
                        maxDistance: 5
                    });
                    if (bedBlock) {
                        await bot.sleep(bedBlock);
                        isSleeping = true;
                        console.log('[NPC] 😴 Durmiendo...');
                        const wakeUp = () => {
                            if (isSleeping) {
                                try { bot.wake(); } catch (e) {}
                                isSleeping = false;
                                console.log('[NPC] 🌅 Despertado');
                                setTimeout(() => moveRandomly(), 2000);
                            }
                        };
                        const checkTime = setInterval(() => {
                            const t = bot.time?.timeOfDay || 0;
                            if (t > 0 && t < 12000) {
                                clearInterval(checkTime);
                                wakeUp();
                            }
                        }, 5000);
                        setTimeout(() => {
                            clearInterval(checkTime);
                            wakeUp();
                        }, 60000);
                    } else {
                        console.log('[NPC] ⚠️ No encontró cama.');
                    }
                } catch (err) {
                    console.log(`[NPC] ❌ Error al dormir: ${err.message}`);
                }
            }
        }, 30000);
    }

    // ==================== RUTINA DE COCINA ====================
    async function startCookingRoutine() {
        if (cookingInterval) clearInterval(cookingInterval);
        cookingInterval = setInterval(async () => {
            if (!bot || !bot.entity || isSleeping || isCooking) return;
            isCooking = true;
            console.log('[NPC] 🔥 Iniciando rutina de cocina...');

            try {
                // 1. Buscar horno
                const furnaceBlock = bot.findBlock({
                    matching: (block) => block.name === 'furnace' || block.name === 'blast_furnace' || block.name === 'smoker',
                    maxDistance: 5
                });
                if (!furnaceBlock) {
                    console.log('[NPC] ⚠️ No hay horno cerca.');
                    isCooking = false;
                    return;
                }

                // 2. Buscar cofres
                const chestBlocks = bot.findBlocks({
                    matching: (block) => block.name === 'chest' || block.name === 'trapped_chest' || block.name === 'barrel',
                    maxDistance: 5,
                    count: 10
                });

                if (chestBlocks.length === 0) {
                    console.log('[NPC] ⚠️ No hay cofres cerca.');
                    isCooking = false;
                    return;
                }

                // 3. Escanear cofres
                let cookItems = [];
                let fuelItems = [];
                let totalCook = 0;
                let totalFuel = 0;

                for (const chestBlock of chestBlocks) {
                    try {
                        const chest = await bot.openChest(chestBlock);
                        for (let i = 0; i < chest.inventory.length; i++) {
                            const item = chest.inventory[i];
                            if (!item) continue;
                            if (COOKABLE_ITEMS.includes(item.name)) {
                                cookItems.push({ slot: i, item, chestBlock });
                                totalCook += item.count;
                            }
                            if (item.name === FUEL_ITEM) {
                                fuelItems.push({ slot: i, item, chestBlock });
                                totalFuel += item.count;
                            }
                        }
                        chest.close();
                    } catch (err) {
                        console.log(`[NPC] ⚠️ Error abriendo cofre: ${err.message}`);
                    }
                }

                if (cookItems.length === 0) {
                    console.log('[NPC] ⚠️ No hay materiales para cocinar.');
                    isCooking = false;
                    return;
                }

                if (fuelItems.length === 0) {
                    console.log('[NPC] ⚠️ No hay carbón disponible.');
                    isCooking = false;
                    return;
                }

                console.log(`[NPC] 📊 Encontrados ${totalCook} materiales y ${totalFuel} carbón`);

                // 4. Tomar materiales y carbón (máximo 8 de cada uno)
                const MAX_AMOUNT = 8;
                let takenCook = 0;
                let takenFuel = 0;

                for (const data of cookItems) {
                    if (takenCook >= MAX_AMOUNT) break;
                    const toTake = Math.min(data.item.count, MAX_AMOUNT - takenCook);
                    try {
                        const chest = await bot.openChest(data.chestBlock);
                        await bot.moveSlotItem(data.slot, 0, 36, toTake);
                        chest.close();
                        takenCook += toTake;
                        console.log(`[NPC] 📦 Tomados ${toTake}x ${data.item.name} del cofre`);
                    } catch (err) {
                        console.log(`[NPC] ⚠️ Error tomando ${data.item.name}: ${err.message}`);
                    }
                }

                for (const data of fuelItems) {
                    if (takenFuel >= MAX_AMOUNT) break;
                    const toTake = Math.min(data.item.count, MAX_AMOUNT - takenFuel);
                    try {
                        const chest = await bot.openChest(data.chestBlock);
                        await bot.moveSlotItem(data.slot, 0, 36, toTake);
                        chest.close();
                        takenFuel += toTake;
                        console.log(`[NPC] 📦 Tomados ${toTake}x ${data.item.name} del cofre`);
                    } catch (err) {
                        console.log(`[NPC] ⚠️ Error tomando carbón: ${err.message}`);
                    }
                }

                if (takenCook === 0 || takenFuel === 0) {
                    console.log('[NPC] ⚠️ No se pudo obtener materiales o carbón.');
                    isCooking = false;
                    return;
                }

                // 5. Abrir horno y cocinar
                const furnace = await bot.openFurnace(furnaceBlock);

                if (furnace.outputSlot().count > 0) {
                    await bot.moveSlotItem(furnace.outputSlot().slot, 0, 36);
                    console.log(`[NPC] ✅ Extraído ${furnace.outputSlot().name} del horno`);
                }

                const fuelInInventory = bot.inventory.find(item => item.name === FUEL_ITEM);
                if (fuelInInventory) {
                    const fuelSlot = bot.inventory.indexOf(fuelInInventory);
                    await bot.putItem(furnace, 'fuel', fuelSlot, fuelInInventory.count);
                    console.log(`[NPC] 🔥 Puestos ${fuelInInventory.count}x carbón`);
                }

                let cookedCount = 0;
                let cookedName = '';
                for (const itemName of COOKABLE_ITEMS) {
                    const cookItem = bot.inventory.find(item => item.name === itemName);
                    if (cookItem) {
                        const slot = bot.inventory.indexOf(cookItem);
                        await bot.putItem(furnace, 'input', slot, cookItem.count);
                        cookedCount = cookItem.count;
                        cookedName = cookItem.name;
                        console.log(`[NPC] 🔥 Puestos ${cookItem.count}x ${cookItem.name} a cocinar`);
                        break;
                    }
                }

                furnace.close();

                const waitTime = Math.max(5000, cookedCount * 3000);
                console.log(`[NPC] ⏳ Esperando ${Math.round(waitTime/1000)} segundos...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));

                const furnace2 = await bot.openFurnace(furnaceBlock);
                const result = furnace2.outputSlot();
                if (result && result.count > 0) {
                    await bot.moveSlotItem(result.slot, 0, 36);
                    console.log(`[NPC] ✅ Cocido ${result.count}x ${result.name}`);
                }
                furnace2.close();

                const depositChest = bot.findBlock({
                    matching: (block) => block.name === 'chest' || block.name === 'trapped_chest' || block.name === 'barrel',
                    maxDistance: 5
                });
                if (depositChest) {
                    const chestDeposit = await bot.openChest(depositChest);
                    const cookedItem = bot.inventory.find(item =>
                        Object.values(COOK_RESULT).includes(item.name)
                    );
                    if (cookedItem) {
                        const slot = bot.inventory.indexOf(cookedItem);
                        await bot.moveSlotItem(slot, 0, chestDeposit.inventory.length);
                        console.log(`[NPC] 📦 Guardado ${cookedItem.count}x ${cookedItem.name} en cofre`);
                    }
                    chestDeposit.close();
                } else {
                    console.log('[NPC] ⚠️ No hay cofre para guardar.');
                }

                console.log('[NPC] ✅ Rutina de cocina completada.');

            } catch (err) {
                console.log(`[NPC] ❌ Error en rutina de cocina: ${err.message}`);
            }

            isCooking = false;
            setTimeout(() => moveRandomly(), 2000);

        }, 30000 + Math.random() * 30000);
    }

    function stopAll() {
        if (actionInterval) clearInterval(actionInterval);
        if (moveInterval) clearInterval(moveInterval);
        if (sleepInterval) clearInterval(sleepInterval);
        if (cookingInterval) clearInterval(cookingInterval);
        if (bot) {
            try { bot.pathfinder.stop(); } catch (e) {}
            ['forward', 'back', 'left', 'right', 'jump', 'sneak'].forEach(key => {
                bot.setControlState(key, false);
            });
            if (isSleeping) {
                try { bot.wake(); } catch (e) {}
                isSleeping = false;
            }
        }
        isCooking = false;
    }

    console.log('[NPC] 🤖 Bot cocinero completo listo!');
}

createBot();
