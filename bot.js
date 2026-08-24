const mineflayer = require('mineflayer');
const autoVersionForge = require('minecraft-protocol-forge').autoVersionForge;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;

function createBot() {
    console.log('[NPC] 🚀 Iniciando bot...');

    const bot = mineflayer.createBot({
        host: 'Fakekuromori.aternos.me',
        port: 31094, // ⚠️ ACTUALIZA ESTE PUERTO CON EL DE ATERNOS
        username: 'PokeFollador',
        auth: 'offline',
        version: false,
        hideErrors: true
    });

    // Cargar plugins
    bot.loadPlugin(pathfinder);

    // Variables de estado
    let actionInterval = null;
    let moveTimeout = null;

    // ==================== EVENTOS ====================

    bot.on('connect', () => console.log('[NPC] 🔗 Conectando...'));
    bot.on('login', () => console.log('[NPC] ✅ Conexión establecida'));

    bot.on('spawn', () => {
        console.log('[NPC] 🟢 Bot apareció en el mapa.');

        // Configurar pathfinder (movimiento)
        const mcData = require('minecraft-data')(bot.version);
        const defaultMove = new Movements(bot, mcData);
        bot.pathfinder.setMovements(defaultMove);

        // Iniciar acciones periódicas
        startActions();

        // Moverse aleatoriamente después de 5 segundos
        setTimeout(() => moveRandomly(), 5000);
    });

    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
            console.log('[NPC] ❌ Error de conexión. Reintentando...');
            stopActions();
            setTimeout(() => createBot(), 30000);
        } else if (err.name === 'PartialReadError' || err.message?.includes('PartialReadError')) {
            console.log('[NPC] ⚠️ Error de protocolo (mods), ignorando...');
        } else {
            console.log('[NPC] ❌ Error crítico:', err);
        }
    });

    bot.on('end', (reason) => {
        console.log(`[NPC] ❌ Desconectado: ${reason}. Reconectando en 30s...`);
        stopActions();
        setTimeout(() => createBot(), 30000);
    });

    // ==================== FUNCIONES DE ACCIÓN ====================

    function startActions() {
        if (actionInterval) clearInterval(actionInterval);

        actionInterval = setInterval(() => {
            if (!bot || !bot.entity) return;

            const rand = Math.random();

            if (rand < 0.3) {
                // Saltar
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 300);
                console.log('[NPC] 🦘 Saltó');
            } else if (rand < 0.6) {
                // Mirar alrededor
                const yaw = (Math.random() - 0.5) * Math.PI * 2;
                const pitch = (Math.random() - 0.5) * 0.5;
                bot.look(yaw, pitch, true);
                console.log('[NPC] 👀 Miró alrededor');
            } else if (rand < 0.8) {
                // Intentar comer si tiene hambre
                if (bot.food < 15) {
                    try {
                        const item = bot.inventory.items().find(i => 
                            i.name.includes('apple') || i.name.includes('bread') || i.name.includes('cooked')
                        );
                        if (item) {
                            bot.equip(item, 'hand');
                            bot.consume();
                            console.log('[NPC] 🍎 Comiendo');
                        }
                    } catch (e) {
                        // Ignorar
                    }
                }
            } else {
                // Hablar en chat
                const mensajes = ['¡Hola!', '¿Qué tal?', 'Estoy AFK', 'Cuidado con los creepers'];
                const msg = mensajes[Math.floor(Math.random() * mensajes.length)];
                bot.chat(msg);
                console.log(`[NPC] 💬 Dijo: "${msg}"`);
            }
        }, 15000 + Math.random() * 10000); // entre 15 y 25 segundos
    }

    function stopActions() {
        if (actionInterval) clearInterval(actionInterval);
        if (moveTimeout) clearTimeout(moveTimeout);
        if (bot) bot.pathfinder.stop();
    }

    function moveRandomly() {
        if (!bot || !bot.entity) return;

        const range = 15;
        const x = bot.entity.position.x + (Math.random() - 0.5) * range * 2;
        const z = bot.entity.position.z + (Math.random() - 0.5) * range * 2;
        const y = bot.entity.position.y;

        const target = { x, y, z };

        console.log(`[NPC] 🚶 Moviéndose a (${x.toFixed(1)}, ${z.toFixed(1)})`);

        bot.pathfinder.setGoal(new pathfinder.goals.GoalBlock(x, y, z));

        // Cuando llegue, esperar y moverse de nuevo
        const checkInterval = setInterval(() => {
            if (!bot || !bot.entity) {
                clearInterval(checkInterval);
                return;
            }
            const dist = bot.entity.position.distanceTo(target);
            if (dist < 1.5) {
                clearInterval(checkInterval);
                console.log('[NPC] 🟢 Llegó al destino');
                moveTimeout = setTimeout(() => moveRandomly(), 5000 + Math.random() * 10000);
            }
        }, 1000);
    }

    // ==================== SALUD Y HAMBRE ====================

    bot.on('health', () => {
        if (bot.health < 5) console.log(`[NPC] ❤️ Salud baja: ${bot.health}`);
        if (bot.food < 5) console.log(`[NPC] 🍖 Hambre baja: ${bot.food}`);
    });

    bot.on('damage', () => {
        console.log('[NPC] 💥 Recibió daño');
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
    });

    console.log('[NPC] 🤖 Bot listo y esperando eventos...');
}

createBot();
