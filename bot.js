const mineflayer = require('mineflayer');
const { autoVersionForge } = require('minecraft-protocol-forge');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;

const CONFIG = {
    host: 'Fakekuromori.aternos.me',
    port: 31094, // ⚠️ Revisa que coincida con el puerto activo de Aternos
    username: 'PokeFollador',
    auth: 'offline',
    version: false,
    hideErrors: true,
    homeRadius: 5,
    checkTimeoutInterval: 60000
};

let currentBot = null;
let isReconnecting = false;

function createBot() {
    if (isReconnecting) return;
    isReconnecting = true;

    console.log('[NPC] 🚀 Iniciando bot...');

    const bot = mineflayer.createBot(CONFIG);
    currentBot = bot;

    try {
        autoVersionForge(bot);
    } catch (err) {
        console.log('[NPC] ⚠️ No se pudo aplicar autoVersionForge:', err.message);
    }

    bot.loadPlugin(pathfinder);

    let moveInterval = null;
    let actionInterval = null;
    let sleepInterval = null;
    let isSleeping = false;

    // Filtro de paquetes de chat para prevenir cierres
    bot._client.on('packet', (data, meta) => {
        if (['chat_message', 'system_chat', 'player_chat'].includes(meta.name)) {
            try {
                const msg = data.message || data.plainMessage || (data.unsignedContent ? JSON.parse(data.unsignedContent) : null);
                if (msg) console.log(`[CHAT] ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`);
            } catch (_) {}
        }
    });

    bot.on('message', () => {});

    bot.on('connect', () => {
        console.log('[NPC] 🔗 Conectando al servidor...');
        isReconnecting = false;
    });

    bot.on('login', () => console.log('[NPC] ✅ Autenticado y dentro del servidor.'));

    bot.on('spawn', () => {
        console.log('[NPC] 🟢 Bot reapareció en el mapa.');

        try {
            const mcData = require('minecraft-data')(bot.version);
            const defaultMove = new Movements(bot, mcData);
            defaultMove.canDig = false;
            defaultMove.scafoldingBlocks = [];
            bot.pathfinder.setMovements(defaultMove);
            console.log('[NPC] ✅ Pathfinder configurado correctamente.');
        } catch (e) {
            console.log('[NPC] ⚠️ No se pudo inicializar minecraft-data:', e.message);
        }

        setTimeout(() => {
            startActions();
            moveRandomly();
            startSleepRoutine();
        }, 3000);
    });

    bot.on('wake', () => {
        isSleeping = false;
        console.log('[NPC] 🌅 El bot se ha despertado.');
        setTimeout(() => moveRandomly(), 2000);
    });

    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
            console.log('[NPC] ❌ Error de red / conexión.');
        } else if (err.message?.includes('PartialReadError') || err.message?.includes('unknown chat format')) {
            console.log('[NPC] ⚠️ Paquete no reconocido (mod/custom payload), ignorando...');
        } else {
            console.log('[NPC] ❌ Error no controlado:', err.message);
        }
    });

    bot.on('end', (reason) => {
        console.log(`[NPC] ❌ Desconectado (${reason}). Reintentando en 60s...`);
        cleanup();
        scheduleReconnect();
    });

    // ---- Lógica Anti-AFK Segura ----

    function startActions() {
        if (actionInterval) clearInterval(actionInterval);
        actionInterval = setInterval(async () => {
            if (!bot || !bot.entity || isSleeping) return;

            const rand = Math.random();

            if (rand < 0.35) {
                // Salto aleatorio
                bot.setControlState('jump', true);
                setTimeout(() => {
                    if (bot && bot.setControlState) bot.setControlState('jump', false);
                }, 300);
                console.log('[NPC] 🦘 Salto aleatorio.');
            } else if (rand < 0.70) {
                // Mirar alrededor
                const yaw = (Math.random() - 0.5) * Math.PI * 2;
                const pitch = (Math.random() - 0.5) * 0.5;
                bot.look(yaw, pitch, true).catch(() => {});
                console.log('[NPC] 👀 Miró a su alrededor.');
            } else {
                // Inspeccionar bloques cercanos de forma segura (sin abrir inventarios)
                inspectNearbyBlock();
            }
        }, 20000 + Math.random() * 10000);
    }

    function inspectNearbyBlock() {
        const targetBlock = bot.findBlock({
            matching: (block) => block.name.includes('chest') || block.name.includes('furnace') || block.name.endsWith('_bed'),
            maxDistance: 5
        });

        if (targetBlock) {
            console.log(`[NPC] 🔍 Inspeccionando ${targetBlock.name}...`);
            bot.lookAt(targetBlock.position.offset(0.5, 0.5, 0.5)).catch(() => {});
        }
    }

    function moveRandomly() {
        if (!bot || !bot.entity || !bot.pathfinder || isSleeping) {
            setTimeout(() => moveRandomly(), 5000);
            return;
        }

        const range = CONFIG.homeRadius;
        const pos = bot.entity.position;
        const targetX = Math.floor(pos.x + (Math.random() - 0.5) * range * 2);
        const targetZ = Math.floor(pos.z + (Math.random() - 0.5) * range * 2);

        try {
            bot.pathfinder.setGoal(new GoalBlock(targetX, pos.y, targetZ));

            if (moveInterval) clearInterval(moveInterval);
            moveInterval = setInterval(() => {
                if (!bot || !bot.entity || isSleeping) {
                    clearInterval(moveInterval);
                    return;
                }
                const dist = bot.entity.position.distanceTo({ x: targetX, y: pos.y, z: targetZ });
                if (dist < 2) {
                    clearInterval(moveInterval);
                    console.log('[NPC] 🟢 Destino alcanzado.');
                    setTimeout(() => moveRandomly(), 12000 + Math.random() * 10000);
                }
            }, 2000);
        } catch (_) {
            setTimeout(() => moveRandomly(), 5000);
        }
    }

    function startSleepRoutine() {
        if (sleepInterval) clearInterval(sleepInterval);
        sleepInterval = setInterval(async () => {
            if (!bot || !bot.entity || isSleeping) return;

            const time = bot.time?.timeOfDay || 0;
            if (time >= 13000 && time <= 23000) {
                const bedBlock = bot.findBlock({
                    matching: (block) => block.name.endsWith('_bed'),
                    maxDistance: 4
                });

                if (bedBlock) {
                    try {
                        console.log('[NPC] 🌙 Intentando dormir...');
                        await bot.sleep(bedBlock);
                        isSleeping = true;
                        console.log('[NPC] 😴 Durmiendo.');
                    } catch (err) {
                        console.log('[NPC] ⚠️ No se pudo dormir:', err.message);
                    }
                }
            }
        }, 30000);
    }

    function cleanup() {
        if (actionInterval) clearInterval(actionInterval);
        if (moveInterval) clearInterval(moveInterval);
        if (sleepInterval) clearInterval(sleepInterval);

        if (bot) {
            try { bot.pathfinder.stop(); } catch (_) {}
            ['forward', 'back', 'left', 'right', 'jump', 'sneak'].forEach((key) => {
                try { bot.setControlState(key, false); } catch (_) {}
            });
        }
    }

    function scheduleReconnect() {
        if (isReconnecting) return;
        isReconnecting = true;
        setTimeout(() => {
            isReconnecting = false;
            createBot();
        }, 60000); // Reconecta cada 60s para no saturar Aternos
    }
}

createBot();
