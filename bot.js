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

    // Cargar el plugin pathfinder INMEDIATAMENTE después de crear el bot
    bot.loadPlugin(pathfinder);

    // Añadir soporte Forge
    autoVersionForge(bot._client);

    // Variables de estado
    let moveTimeout = null;
    let actionInterval = null;
    let isMoving = false;

    // ==================== EVENTOS ====================

    bot.on('connect', () => console.log('[NPC] 🔗 Conectando...'));

    bot.on('login', () => console.log('[NPC] ✅ Conexión establecida'));

    bot.on('spawn', () => {
        console.log('[NPC] 🟢 Bot apareció en el mapa.');
        
        // Configurar pathfinder (movimiento)
        try {
            const mcData = require('minecraft-data')(bot.version);
            const defaultMove = new Movements(bot, mcData);
            bot.pathfinder.setMovements(defaultMove);
        } catch (err) {
            console.log('[NPC] ⚠️ Error configurando pathfinder:', err.message);
        }

        // Iniciar acciones periódicas
        startActions();

        // Moverse aleatoriamente después de 5 segundos
        setTimeout(() => moveRandomly(), 5000);
    });

    // Manejar errores sin desconectar
    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
            console.log('[NPC] ❌ Error de conexión. Reintentando...');
            stopActions();
            setTimeout(() => createBot(), 30000);
        } else if (err.name === 'PartialReadError' || err.message?.includes('PartialReadError')) {
            console.log('[NPC] ⚠️ Error de protocolo (mods), ignorando...');
            // No hacer nada, el bot sigue
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
        
        // Acciones cada 10-15 segundos (aleatorio)
        actionInterval = setInterval(() => {
            if (!bot || !bot.entity) return;

            const rand = Math.random();

            if (rand < 0.3) {
                // Saltar
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 300);
                console.log('[NPC] 🦘 Saltó');
            } else if (rand < 0.6) {
                // Mirar alrededor (cambiar orientación)
                const yaw = (Math.random() - 0.5) * Math.PI * 2;
                const pitch = (Math.random() - 0.5) * 0.5;
                bot.look(yaw, pitch, true);
                console.log('[NPC] 👀 Miró alrededor');
            } else if (rand < 0.8) {
                // Comer (simular, si tiene hambre)
                if (bot.food < 15) {
                    try {
                        const item = bot.inventory.items().find(i => 
                            i.name.includes('apple') || i.name.includes('bread') || 
                            i.name.includes('cooked') || i.name.includes('berry')
                        );
                        if (item) {
                            bot.equip(item, 'hand');
                            bot.consume();
                            console.log('[NPC] 🍎 Comiendo');
                        }
                    } catch (e) {
                        // Si falla, simplemente no hace nada
                    }
                }
            } else {
                // Decir algo en chat (rara vez)
                const mensajes = ['¡Hola!', '¿Qué tal?', 'Estoy AFK', 'Cuidado con los creepers', 'Bonito día'];
                const msg = mensajes[Math.floor(Math.random() * mensajes.length)];
                bot.chat(msg);
                console.log(`[NPC] 💬 Dijo: "${msg}"`);
            }
        }, 12000 + Math.random() * 8000); // entre 12 y 20 segundos
    }

    function stopActions() {
        if (actionInterval) {
            clearInterval(actionInterval);
            actionInterval = null;
        }
        if (moveTimeout) {
            clearTimeout(moveTimeout);
            moveTimeout = null;
        }
        // Detener pathfinder solo si existe
        if (bot && bot.pathfinder && typeof bot.pathfinder.stop === 'function') {
            bot.pathfinder.stop();
        }
        isMoving = false;
    }

    function moveRandomly() {
        if (!bot || !bot.entity) return;
        if (isMoving) return;

        isMoving = true;

        // Elegir una posición aleatoria en un radio de 20 bloques
        const range = 20;
        const x = bot.entity.position.x + (Math.random() - 0.5) * range * 2;
        const z = bot.entity.position.z + (Math.random() - 0.5) * range * 2;
        const y = bot.entity.position.y; // mantener altura

        const target = { x, y, z };

        console.log(`[NPC] 🚶 Moviéndose a (${x.toFixed(1)}, ${z.toFixed(1)})`);

        try {
            bot.pathfinder.setGoal(new pathfinder.goals.GoalBlock(x, y, z));

            // Esperar a que llegue al destino
            const checkInterval = setInterval(() => {
                if (!bot || !bot.entity) {
                    clearInterval(checkInterval);
                    isMoving = false;
                    return;
                }
                const dist = bot.entity.position.distanceTo(target);
                if (dist < 1.5) {
                    clearInterval(checkInterval);
                    console.log('[NPC] 🟢 Llegó al destino');
                    isMoving = false;
                    // Esperar entre 5 y 15 segundos antes de moverse de nuevo
                    moveTimeout = setTimeout(() => moveRandomly(), 5000 + Math.random() * 10000);
                }
            }, 1000);
        } catch (err) {
            console.log('[NPC] ⚠️ Error moviéndose:', err.message);
            isMoving = false;
            // Reintentar después de un tiempo
            moveTimeout = setTimeout(() => moveRandomly(), 10000);
        }
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

// Iniciar el bot
createBot();
