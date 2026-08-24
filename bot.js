const mineflayer = require('mineflayer');
const autoVersionForge = require('minecraft-protocol-forge').autoVersionForge;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;

function createBot() {
    console.log('[NPC] 🚀 Iniciando bot...');

    const bot = mineflayer.createBot({
        host: 'Fakekuromori.aternos.me',
        port: 31094, // ⚠️ ACTUALIZA EL PUERTO
        username: 'PokeFollador',
        auth: 'offline',
        version: false,
        hideErrors: true
    });

    bot.loadPlugin(pathfinder);

    let moveInterval = null;
    let actionInterval = null;
    let chestInterval = null;

    // Parch para chat (evita el error unknown chat format)
    bot._client.on('packet', (data, meta) => {
        if (meta.name === 'chat_message' || meta.name === 'system_chat' || meta.name === 'player_chat') {
            try {
                const msg = data.message || data.plainMessage || JSON.stringify(data);
                console.log(`[CHAT] ${msg}`);
            } catch (e) {}
        }
    });
    bot.on('message', () => {}); // silenciar el evento message

    // Eventos
    bot.on('connect', () => console.log('[NPC] 🔗 Conectando...'));
    bot.on('login', () => console.log('[NPC] ✅ Conexión establecida'));

    bot.on('spawn', () => {
        console.log('[NPC] 🟢 Bot apareció en el mapa.');

        // Configurar pathfinder (sin romper bloques por defecto)
        try {
            const mcData = require('minecraft-data')(bot.version);
            const defaultMove = new Movements(bot, mcData);
            defaultMove.canDig = false; // no romper bloques en movimiento
            defaultMove.scafoldingBlocks = [];
            bot.pathfinder.setMovements(defaultMove);
            console.log('[NPC] ✅ Pathfinder configurado');
        } catch (err) {
            console.log('[NPC] ⚠️ Error configurando pathfinder:', err.message);
        }

        // Iniciar rutinas
        setTimeout(() => {
            startActions();
            moveRandomly();
            startChestInteraction();
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

    function startActions() {
        if (actionInterval) clearInterval(actionInterval);
        actionInterval = setInterval(() => {
            if (!bot || !bot.entity) return;
            const rand = Math.random();
            if (rand < 0.25) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 300);
                console.log('[NPC] 🦘 Saltó');
            } else if (rand < 0.5) {
                const yaw = (Math.random() - 0.5) * Math.PI * 2;
                const pitch = (Math.random() - 0.5) * 0.5;
                bot.look(yaw, pitch, true);
                console.log('[NPC] 👀 Miró alrededor');
            } else if (rand < 0.7) {
                // Romper un bloque aleatorio cercano (solo si tiene pico o similar)
                // Lo haremos solo cada cierto tiempo con otro interval
                console.log('[NPC] ⛏️ Buscando bloque para romper...');
                breakBlockRandomly();
            } else {
                console.log('[NPC] 💤 Descansando...');
            }
        }, 15000 + Math.random() * 10000);
    }

    // Romper un bloque aleatorio (solo uno, y solo si está cerca y es rompible)
    function breakBlockRandomly() {
        if (!bot || !bot.entity) return;
        // Buscar un bloque en un radio de 4 bloques que sea rompible (no bedrock, no obsidiana, etc.)
        const range = 4;
        const pos = bot.entity.position;
        // Buscar bloques alrededor
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                for (let dz = -range; dz <= range; dz++) {
                    if (Math.random() > 0.05) continue; // solo probar unos pocos
                    const block = bot.blockAt(pos.offset(dx, dy, dz));
                    if (block && block.name !== 'air' && block.diggable && block.hardness !== undefined && block.hardness < 10) {
                        // Intentar romperlo (si tenemos herramienta, mejor)
                        try {
                            bot.dig(block, (err) => {
                                if (err) {
                                    console.log(`[NPC] ⚠️ No se pudo romper ${block.name}: ${err.message}`);
                                } else {
                                    console.log(`[NPC] ⛏️ Rompió ${block.name}`);
                                }
                            });
                            return; // solo uno
                        } catch (e) {
                            // ignorar
                        }
                    }
                }
            }
        }
        console.log('[NPC] ⚠️ No encontró bloque rompible cerca.');
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
                    // Esperar 1-2 segundos y cerrar
                    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
                    chest.close();
                    console.log('[NPC] 📦 Cofre cerrado.');
                }
            } catch (err) {
                console.log(`[NPC] ⚠️ Error con cofre: ${err.message}`);
            }
        }, 30000 + Math.random() * 20000); // cada 30-50 segundos
    }

    function stopAll() {
        if (actionInterval) clearInterval(actionInterval);
        if (moveInterval) clearInterval(moveInterval);
        if (chestInterval) clearInterval(chestInterval);
        if (bot) {
            try { bot.pathfinder.stop(); } catch (e) {}
            ['forward', 'back', 'left', 'right', 'jump', 'sneak'].forEach(key => {
                bot.setControlState(key, false);
            });
        }
    }

    function moveRandomly() {
        if (!bot || !bot.entity || !bot.pathfinder) return;

        // Radio de movimiento: 15 bloques desde la posición actual
        const range = 15;
        const pos = bot.entity.position;
        const x = pos.x + (Math.random() - 0.5) * range * 2;
        const z = pos.z + (Math.random() - 0.5) * range * 2;
        const y = pos.y;

        const target = { x, y, z };

        // Evitar destinos con desnivel alto
        const floorY = Math.floor(y);
        if (Math.abs(y - floorY) > 2) {
            console.log('[NPC] ⏭️ Desnivel alto, buscando otro destino...');
            setTimeout(() => moveRandomly(), 2000);
            return;
        }

        console.log(`[NPC] 🚶 Moviéndose a (${x.toFixed(1)}, ${z.toFixed(1)})`);

        try {
            bot.pathfinder.setGoal(new pathfinder.goals.GoalBlock(x, y, z));

            if (moveInterval) clearInterval(moveInterval);
            moveInterval = setInterval(() => {
                if (!bot || !bot.entity) {
                    clearInterval(moveInterval);
                    return;
                }
                const dist = bot.entity.position.distanceTo(target);
                if (dist < 2) {
                    clearInterval(moveInterval);
                    console.log('[NPC] 🟢 Llegó al destino');
                    // Esperar 10-20 segundos antes de moverse de nuevo
                    setTimeout(() => moveRandomly(), 10000 + Math.random() * 10000);
                }
            }, 2000);
        } catch (err) {
            console.log(`[NPC] ⚠️ Error moviéndose: ${err.message}`);
            setTimeout(() => moveRandomly(), 5000);
        }
    }

    console.log('[NPC] 🤖 Bot listo y esperando eventos...');
}

createBot();
