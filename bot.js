const mineflayer = require('mineflayer');
const autoVersionForge = require('minecraft-protocol-forge').autoVersionForge;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalBlock } = require('mineflayer-pathfinder').goals;

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    host: 'Fakekuromori.aternos.me',
    port: 31094, // ⚠️ ACTUALIZA ESTE PUERTO CON EL DE ATERNOS
    username: 'PokeFollador',
    auth: 'offline',
    version: false,
    hideErrors: true,
    // Items que se pueden cocinar (nombres en Minecraft)
    cookableItems: [
        'raw_iron', 'raw_gold', 'raw_copper', 'raw_beef', 'raw_chicken',
        'raw_porkchop', 'raw_mutton', 'raw_rabbit', 'cod', 'salmon',
        'tropical_fish', 'pufferfish', 'potato', 'wet_sponge',
        'cobblestone', 'sand', 'clay_ball', 'netherrack'
    ],
    // Combustibles
    fuelItems: [
        'coal', 'charcoal', 'wood', 'oak_log', 'birch_log', 'spruce_log',
        'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log',
        'crimson_stem', 'warped_stem', 'coal_block', 'dried_kelp_block',
        'blaze_rod', 'lava_bucket'
    ],
    // Distancia máxima para buscar cofres/hornos
    searchRadius: 8,
    // Cofre donde guardar los resultados (opcional, si no se especifica usa el mismo)
    outputChestPosition: null // Ej: {x: 10, y: 64, z: 20}
};

function createBot() {
    console.log('[NPC] 🚀 Iniciando bot cocinero...');

    const bot = mineflayer.createBot({
        host: CONFIG.host,
        port: CONFIG.port,
        username: CONFIG.username,
        auth: CONFIG.auth,
        version: CONFIG.version,
        hideErrors: CONFIG.hideErrors
    });

    bot.loadPlugin(pathfinder);

    let isProcessing = false;
    let checkInterval = null;

    // ==================== PARCH PARA CHAT ====================
    bot._client.on('packet', (data, meta) => {
        if (meta.name === 'chat_message' || meta.name === 'system_chat' || meta.name === 'player_chat') {
            try {
                const msg = data.message || data.plainMessage || JSON.stringify(data);
                console.log(`[CHAT] ${msg}`);
            } catch (e) { /* ignorar */ }
        }
    });
    bot.on('message', () => {});

    // ==================== EVENTOS ====================
    bot.on('connect', () => console.log('[NPC] 🔗 Conectando...'));
    bot.on('login', () => console.log('[NPC] ✅ Conexión establecida'));

    bot.on('spawn', () => {
        console.log('[NPC] 🟢 Bot apareció en el mapa.');

        // Configurar pathfinder (sin romper bloques)
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

        // Iniciar el ciclo de cocina después de 5 segundos
        setTimeout(() => {
            startCookingCycle();
        }, 5000);
    });

    // Manejar errores
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
        }
    });

    bot.on('end', (reason) => {
        console.log(`[NPC] ❌ Desconectado: ${reason}. Reconectando en 30s...`);
        if (checkInterval) clearInterval(checkInterval);
        setTimeout(() => createBot(), 30000);
    });

    // ==================== FUNCIONES DE COCINA ====================

    function startCookingCycle() {
        if (checkInterval) clearInterval(checkInterval);
        // Verificar cada 30 segundos si hay trabajo pendiente
        checkInterval = setInterval(async () => {
            if (isProcessing || !bot || !bot.entity) return;
            await processCooking();
        }, 30000);
        // Ejecutar inmediatamente la primera vez
        setTimeout(async () => {
            if (!isProcessing) await processCooking();
        }, 3000);
    }

    async function processCooking() {
        if (isProcessing) return;
        isProcessing = true;

        try {
            console.log('[NPC] 🔍 Buscando materiales para cocinar...');

            // 1. Buscar un cofre con materiales para cocinar o combustible
            const chest = await findChestWithItems();
            if (!chest) {
                console.log('[NPC] ⚠️ No encontró cofre con materiales para cocinar.');
                isProcessing = false;
                return;
            }

            // 2. Buscar un horno cercano
            const furnace = await findFurnace();
            if (!furnace) {
                console.log('[NPC] ⚠️ No encontró horno cercano.');
                isProcessing = false;
                return;
            }

            // 3. Buscar materiales en el cofre
            const itemsToCook = await getCookableItemsFromChest(chest);
            const fuel = await getFuelFromChest(chest);

            if (itemsToCook.length === 0) {
                console.log('[NPC] ⚠️ No hay materiales para cocinar en el cofre.');
                isProcessing = false;
                return;
            }

            if (!fuel) {
                console.log('[NPC] ⚠️ No hay combustible en el cofre.');
                isProcessing = false;
                return;
            }

            console.log(`[NPC] 📦 Encontrados ${itemsToCook.length} items para cocinar y combustible (${fuel.name})`);

            // 4. Tomar los materiales y combustible del cofre
            for (const item of itemsToCook) {
                await bot.moveSlotItem(item.slot, 0, 36);
                console.log(`[NPC] 📥 Tomado ${item.count}x ${item.name}`);
            }
            await bot.moveSlotItem(fuel.slot, 0, 36);
            console.log(`[NPC] 📥 Tomado ${fuel.count}x ${fuel.name} como combustible`);

            // 5. Cerrar el cofre
            chest.close();

            // 6. Abrir el horno y cocinar
            const furnaceBlock = furnace.block;
            const furnaceWindow = await bot.openFurnace(furnaceBlock);

            // Cocinar cada item
            for (const item of itemsToCook) {
                // Verificar si hay espacio en el horno
                if (furnaceWindow.outputSlot().count >= furnaceWindow.outputSlot().maxStack) {
                    console.log('[NPC] 📦 Horno lleno, extrayendo...');
                    await bot.moveSlotItem(furnaceWindow.outputSlot().slot, 0, 36);
                    console.log(`[NPC] ✅ Extraído del horno`);
                }

                // Verificar combustible
                if (furnaceWindow.fuelSlot().count === 0) {
                    const fuelItem = bot.inventory.find(i => CONFIG.fuelItems.includes(i.name));
                    if (fuelItem) {
                        await bot.putItem(furnaceWindow, 'fuel', fuelItem.slot, 1);
                    } else {
                        console.log('[NPC] ⚠️ Sin combustible, deteniendo cocción');
                        break;
                    }
                }

                // Poner material a cocinar
                await bot.putItem(furnaceWindow, 'input', item.slot, 1);
                console.log(`[NPC] 🔥 Cocinando ${item.name}...`);

                // Esperar a que se cocine (10-15 segundos)
                await new Promise(resolve => setTimeout(resolve, 12000 + Math.random() * 3000));

                // Extraer resultado
                const result = furnaceWindow.outputSlot();
                if (result && result.count > 0) {
                    await bot.moveSlotItem(result.slot, 0, 36);
                    console.log(`[NPC] ✅ Cocido ${result.count}x ${result.name}`);
                }
            }

            // 7. Cerrar el horno
            furnaceWindow.close();
            console.log('[NPC] 🔥 Horno cerrado');

            // 8. Guardar los resultados en un cofre
            await saveItemsToChest();

            console.log('[NPC] ✅ Ciclo de cocina completado');

        } catch (err) {
            console.log(`[NPC] ❌ Error en proceso de cocina: ${err.message}`);
        } finally {
            isProcessing = false;
        }
    }

    // ==================== FUNCIONES DE BÚSQUEDA ====================

    async function findChestWithItems() {
        const chests = bot.findBlocks({
            matching: (block) => block.name === 'chest' || block.name === 'trapped_chest' || block.name === 'barrel',
            maxDistance: CONFIG.searchRadius,
            count: 10
        });

        for (const chestPos of chests) {
            try {
                const chest = await bot.openChest(chestPos);
                // Verificar si tiene items cocinables o combustible
                let hasItems = false;
                for (let i = 0; i < chest.containerItems().length; i++) {
                    const item = chest.containerItems()[i];
                    if (item && (CONFIG.cookableItems.includes(item.name) || CONFIG.fuelItems.includes(item.name))) {
                        hasItems = true;
                        break;
                    }
                }
                if (hasItems) {
                    return chest;
                }
                chest.close();
            } catch (e) {
                // Si no se puede abrir, continuar
            }
        }
        return null;
    }

    async function findFurnace() {
        const furnacePos = bot.findBlock({
            matching: (block) => block.name === 'furnace' || block.name === 'blast_furnace' || block.name === 'smoker',
            maxDistance: CONFIG.searchRadius
        });
        if (furnacePos) {
            return { block: furnacePos };
        }
        return null;
    }

    async function getCookableItemsFromChest(chest) {
        const items = [];
        for (let i = 0; i < chest.containerItems().length; i++) {
            const item = chest.containerItems()[i];
            if (item && CONFIG.cookableItems.includes(item.name)) {
                items.push({ ...item, slot: i });
            }
        }
        return items;
    }

    async function getFuelFromChest(chest) {
        for (let i = 0; i < chest.containerItems().length; i++) {
            const item = chest.containerItems()[i];
            if (item && CONFIG.fuelItems.includes(item.name)) {
                return { ...item, slot: i };
            }
        }
        return null;
    }

    async function saveItemsToChest() {
        // Buscar items cocinados en el inventario
        const cookedItems = [];
        for (let i = 0; i < bot.inventory.length; i++) {
            const item = bot.inventory[i];
            if (item && !CONFIG.cookableItems.includes(item.name) && !CONFIG.fuelItems.includes(item.name)) {
                // Es probable que sea un item cocinado
                cookedItems.push({ ...item, slot: i });
            }
        }

        if (cookedItems.length === 0) {
            console.log('[NPC] 📭 No hay items cocinados para guardar');
            return;
        }

        // Buscar un cofre para guardar
        const chestPos = CONFIG.outputChestPosition || bot.findBlock({
            matching: (block) => block.name === 'chest' || block.name === 'trapped_chest' || block.name === 'barrel',
            maxDistance: CONFIG.searchRadius
        });

        if (!chestPos) {
            console.log('[NPC] ⚠️ No encontró cofre para guardar los resultados');
            return;
        }

        try {
            const chest = await bot.openChest(chestPos);
            for (const item of cookedItems) {
                await bot.moveSlotItem(item.slot, 0, 36);
                console.log(`[NPC] 📤 Guardado ${item.count}x ${item.name} en cofre`);
            }
            chest.close();
            console.log('[NPC] 📦 Items guardados en cofre');
        } catch (err) {
            console.log(`[NPC] ❌ Error guardando en cofre: ${err.message}`);
        }
    }

    console.log('[NPC] 🤖 Bot cocinero listo!');
}

// Iniciar el bot
createBot();
