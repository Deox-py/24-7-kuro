const mineflayer = require('mineflayer');
const autoVersionForge = require('minecraft-protocol-forge').autoVersionForge;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalBlock } = require('mineflayer-pathfinder').goals; // ✅ IMPORTACIÓN CORRECTA

function createBot() {
    console.log('[NPC] 🚀 Iniciando bot...');

    const bot = mineflayer.createBot({
        host: 'Fakekuromori.aternos.me',
        port: 31094, // ⚠️ ACTUALIZA ESTE PUERTO
        username: 'PokeFollador',
        auth: 'offline',
        version: false,
        hideErrors: true
    });

    bot.loadPlugin(pathfinder);

    let moveInterval = null;
    let actionInterval = null;
    let chestInterval = null;
    let bedInterval = null;

    // ==================== PARCH PARA CHAT ====================
    bot._client.on('packet', (data, meta) => {
        if (meta.name === 'chat_message' || meta.name === 'system_chat' || meta.name === 'player_chat') {
            try {
                const msg = data.message || data.plainMessage || JSON.stringify(data);
                console.log(`[CHAT] ${msg}`);
            } catch (e) {}
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
            startChestInteraction();
            startBedInteraction();
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
        }
    });

    bot.on('end', (reason) => {
        console.log(`[NPC] ❌ Desconectado: ${reason}. Reconectando en 30s...`);
        stopAll();
        setTimeout(() => createBot(), 30000);
    });

    // ==================== FUNCIONES ====================

    // Acciones variadas (saltar, mirar, descansar)
    function startActions() {
        if (actionInterval) clearInterval(actionInterval);
        actionInterval = setInterval(() => {
            if (!bot || !bot.entity) return;
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

    // Movimiento en radio de 5 bloques (casita)
    function moveRandomly() {
        if (!bot || !bot.entity || !bot.pathfinder) return;

        const range = 5;
        const pos = bot.entity.position;
        const x = pos.x + (Math.random() - 0.5) * range * 2;
        const z = pos.z + (Math.random() - 0.5) * range * 2;
        const y = pos.y;

        const target = { x, y, z };

        console.log(`[NPC] 🚶 Moviéndose a (${x.toFixed(1)}, ${z.toFixed(1)})`);

        try {
            bot.pathfinder.setGoal(new GoalBlock(x, y, z)); // ✅ USANDO GoalBlock CORRECTAMENTE

            if (moveInterval) clearInterval(moveInterval);
            moveInterval = setInterval(() => {
                if (!bot || !bot.entity) {
                    clearInterval(moveInterval);
                    return;
                }
                const dist = bot.entity.position.distanceTo(target);
                if (dist < 1.5) {
                    clearInterval(moveInterval);
                    console.log('[NPC] 🟢 Llegó al destino');
                    setTimeout(() => moveRandomly(), 10000 + Math.random() * 15000);
                }
            }, 2000);
        } catch (err) {
            console.log(`[NPC] ⚠️ Error moviéndose: ${err.message}`);
            setTimeout(() => moveRandomly(), 5000);
        }
    }

    // Interacción con cofres
    function startChestInteraction() {
        if (chestInterval) clearInterval(chestInterval);
        chestInterval = setInterval(async () => {
            if (!bot || !bot.entity) return;
            try {
                const chestBlock = bot.findBlock({
                    matching: (block) => block.name === 'chest' || block.name === 'trapped_chest' || block.name === 'barrel',
                    maxDistance: 5
                });
                if (chestBlock) {
                    console.log('[NPC] 📦 Abriendo cofre...');
                    const chest = await bot.openChest(chestBlock);
                    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
                    chest.close();
                    console.log('[NPC] 📦 Cofre cerrado.');
                } else {
                    console.log('[NPC] 📦 No hay cofre cerca.');
                }
            } catch (err) {
                console.log(`[NPC] ⚠️ Error con cofre: ${err.message}`);
            }
        }, 30000 + Math.random() * 20000);
    }

    // Interacción con cama
    function startBedInteraction() {
        if (bedInterval) clearInterval(bedInterval);
        bedInterval = setInterval(async () => {
            if (!bot || !bot.entity) return;
            try {
                const bedBlock = bot.findBlock({
                    matching: (block) => block.name === 'bed' || block.name.includes('bed'),
                    maxDistance: 5
                });
                if (bedBlock && !bot.isSleeping) {
                    console.log('[NPC] 🛏️ Usando la cama...');
                    await bot.sleep(bedBlock);
                    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 5000));
                    bot.wake();
                    console.log('[NPC] 🛏️ Se levantó de la cama.');
                } else if (bot.isSleeping) {
                    console.log('[NPC] 🛏️ Ya está durmiendo.');
                } else {
                    console.log('[NPC] 🛏️ No hay cama cerca.');
                }
            } catch (err) {
                console.log(`[NPC] ⚠️ Error con cama: ${err.message}`);
            }
        }, 60000 + Math.random() * 60000); // Cada 1-2 minutos
    }

    function stopAll() {
        if (actionInterval) clearInterval(actionInterval);
        if (moveInterval) clearInterval(moveInterval);
        if (chestInterval) clearInterval(chestInterval);
        if (bedInterval) clearInterval(bedInterval);
        if (bot) {
            try { bot.pathfinder.stop(); } catch (e) {}
            ['forward', 'back', 'left', 'right', 'jump', 'sneak'].forEach(key => {
                bot.setControlState(key, false);
            });
            if (bot.isSleeping) {
                try { bot.wake(); } catch (e) {}
            }
        }
    }

    console.log('[NPC] 🤖 Bot listo y esperando eventos...');
}

createBot();
