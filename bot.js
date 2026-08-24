const mineflayer = require('mineflayer');
const autoVersionForge = require('minecraft-protocol-forge').autoVersionForge;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalBlock } = require('mineflayer-pathfinder').goals;

const CONFIG = {
    host: 'Fakekuromori.aternos.me',
    port: 31094, // ⚠️ ACTUALIZA ESTE PUERTO CADA VEZ QUE CAMBIE
    username: 'PokeFollador',
    auth: 'offline',
    version: false,
    hideErrors: true,
    homeRadius: 5
};

function createBot() {
    console.log('[NPC] 🚀 Iniciando bot humano...');
    const bot = mineflayer.createBot(CONFIG);
    bot.loadPlugin(pathfinder);

    let moveInterval = null;
    let actionInterval = null;
    let sleepInterval = null;
    let isSleeping = false;

    // ---- Parche para chat (evita errores de mods) ----
    bot._client.on('packet', (data, meta) => {
        if (meta.name === 'chat_message' || meta.name === 'system_chat' || meta.name === 'player_chat') {
            try { console.log(`[CHAT] ${data.message || data.plainMessage || JSON.stringify(data)}`); } catch (_) {}
        }
    });
    bot.on('message', () => {});

    // ---- Eventos ----
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
        } catch (_) {}

        setTimeout(() => {
            startActions();
            moveRandomly();
            startSleepRoutine();
        }, 3000);
    });

    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
            console.log('[NPC] ❌ Error de conexión. Reintentando...');
            setTimeout(() => createBot(), 30000);
        } else if (err.message?.includes('PartialReadError') || err.message?.includes('unknown chat format')) {
            console.log('[NPC] ⚠️ Error de mods, ignorando.');
        } else {
            console.log('[NPC] ❌ Error crítico:', err);
            setTimeout(() => createBot(), 30000);
        }
    });

    bot.on('end', (reason) => {
        console.log(`[NPC] ❌ Desconectado: ${reason}. Reconectando en 30s...`);
        stopAll();
        setTimeout(() => createBot(), 30000);
    });

    // ---- Funciones ----
    function startActions() {
        if (actionInterval) clearInterval(actionInterval);
        actionInterval = setInterval(() => {
            if (!bot || !bot.entity || isSleeping) return;
            const rand = Math.random();
            if (rand < 0.3) {
                bot.setControlState('jump', true);
                setTimeout(() => { if (bot && bot.setControlState) bot.setControlState('jump', false); }, 300);
                console.log('[NPC] 🦘 Saltó');
            } else if (rand < 0.6) {
                const yaw = (Math.random() - 0.5) * Math.PI * 2;
                const pitch = (Math.random() - 0.5) * 0.5;
                if (bot && bot.look) bot.look(yaw, pitch, true);
                console.log('[NPC] 👀 Miró alrededor');
            } else {
                console.log('[NPC] 💤 Descansando...');
            }
        }, 15000 + Math.random() * 10000);
    }

    function moveRandomly() {
        if (!bot || !bot.entity || !bot.pathfinder || isSleeping) {
            setTimeout(() => moveRandomly(), 5000);
            return;
        }
        const range = CONFIG.homeRadius;
        const pos = bot.entity.position;
        const x = pos.x + (Math.random() - 0.5) * range * 2;
        const z = pos.z + (Math.random() - 0.5) * range * 2;
        const target = { x, y: pos.y, z };

        try {
            bot.pathfinder.setGoal(new GoalBlock(target.x, target.y, target.z));
            if (moveInterval) clearInterval(moveInterval);
            moveInterval = setInterval(() => {
                if (!bot || !bot.entity || isSleeping) {
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
        } catch (_) {
            setTimeout(() => moveRandomly(), 5000);
        }
    }

    function startSleepRoutine() {
        if (sleepInterval) clearInterval(sleepInterval);
        sleepInterval = setInterval(async () => {
            if (!bot || !bot.entity || isSleeping) return;
            const time = bot.time?.timeOfDay || 0;
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
                                try { if (bot && bot.wake) bot.wake(); } catch (_) {}
                                isSleeping = false;
                                console.log('[NPC] 🌅 Despertado');
                                setTimeout(() => moveRandomly(), 2000);
                            }
                        };
                        const checkTime = setInterval(() => {
                            if (!bot) { clearInterval(checkTime); return; }
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
                } catch (_) {}
            }
        }, 30000);
    }

    function stopAll() {
        if (actionInterval) clearInterval(actionInterval);
        if (moveInterval) clearInterval(moveInterval);
        if (sleepInterval) clearInterval(sleepInterval);
        if (bot) {
            try { bot.pathfinder.stop(); } catch (_) {}
            ['forward', 'back', 'left', 'right', 'jump', 'sneak'].forEach(key => {
                if (bot.setControlState) bot.setControlState(key, false);
            });
            if (isSleeping) {
                try { if (bot.wake) bot.wake(); } catch (_) {}
                isSleeping = false;
            }
        }
    }

    console.log('[NPC] 🤖 Bot humano listo.');
}

createBot();
