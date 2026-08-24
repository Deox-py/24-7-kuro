const mineflayer = require('mineflayer');
const autoVersionForge = require('minecraft-protocol-forge').autoVersionForge;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

function createBot() {
    console.log('[NPC] 🚀 Iniciando bot...');

    const bot = mineflayer.createBot({
        host: 'Fakekuromori.aternos.me',
        port: 31094, // ⚠️ ACTUALIZA ESTE PUERTO CON EL DE ATERNOS
        username: 'PokeFollador',
        auth: 'offline',
        version: false,
        hideErrors: true,
        // Desactivar el procesamiento de chat para evitar el error de formato
        chat: false
    });

    // Cargar plugins
    bot.loadPlugin(pathfinder);

    // Variables de estado
    let moveInterval = null;
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
            console.log('[NPC] ✅ Pathfinder configurado');
        } catch (err) {
            console.log('[NPC] ⚠️ Error configurando pathfinder:', err.message);
        }

        // Iniciar acciones periódicas
        startActions();

        // Moverse aleatoriamente después de 5 segundos
        setTimeout(() => moveRandomly(), 5000);
    });

    // Manejar errores de chat
    bot.on('message', (message) => {
        // Ignorar mensajes de chat para evitar errores de formato
        // No hacemos nada con el mensaje
    });

    // Manejar errores sin desconectar
    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
            console.log('[NPC] ❌ Error de conexión. Reintentando...');
            stopActions();
            setTimeout(() => createBot(), 30000);
        } else if (err.name === 'PartialReadError' || err.message?.includes('PartialReadError')) {
            console.log('[NPC] ⚠️ Error de protocolo (mods), ignorando...');
        } else if (err.message?.includes('unknown chat format code')) {
            console.log('[NPC] ⚠️ Error de formato de chat, ignorando...');
        } else {
            console.log('[NPC] ❌ Error crítico:', err.message);
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
        
        // Acciones cada 12-18 segundos (aleatorio)
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
                // Intentar comer si tiene hambre
                if (bot.food && bot.food < 15) {
                    try {
                        // Buscar comida en el inventario
                        const item = bot.inventory.items().find(i => 
                            i.name.includes('apple') || 
                            i.name.includes('bread') || 
                            i.name.includes('cooked') ||
                            i.name.includes('berry')
                        );
                        if (item) {
                            bot.equip(item, 'hand');
                            bot.consume();
                            console.log('[NPC] 🍎 Comiendo');
                        }
                    } catch (e) {
                        // Si falla, ignorar
                    }
                }
            } else {
                // No hablar en chat para evitar errores de formato
                // En su lugar, saltar otra vez
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 300);
                console.log('[NPC] 🦘 Saltó (acción extra)');
            }
        }, 14000 + Math.random() * 8000); // entre 14 y 22 segundos
    }

    function stopActions() {
        if (actionInterval) clearInterval(actionInterval);
        if (moveInterval) clearInterval(moveInterval);
        try {
            if (bot && bot.pathfinder) bot.pathfinder.stop();
        } catch (e) {
            // Ignorar
        }
    }

    function moveRandomly() {
        if (!bot || !bot.entity || !bot.pathfinder) {
            console.log('[NPC] ⚠️ Bot no disponible para moverse');
            return;
        }

        try {
            // Elegir una posición aleatoria en un radio de 20 bloques
            const range = 20;
            const x = bot.entity.position.x + (Math.random() - 0.5) * range * 2;
            const z = bot.entity.position.z + (Math.random() - 0.5) * range * 2;
            
            // Obtener el bloque en esa posición (para evitar caerse)
            let y = bot.entity.position.y;
            try {
                const block = bot.blockAt({x: Math.floor(x), y: Math.floor(y) - 1, z: Math.floor(z)});
                if (block && block.name !== 'air') {
                    y = Math.floor(y);
                } else {
                    // Buscar el bloque más cercano sólido debajo
                    for (let i = 0; i < 5; i++) {
                        const checkBlock = bot.blockAt({x: Math.floor(x), y: Math.floor(y) - i, z: Math.floor(z)});
                        if (checkBlock && checkBlock.name !== 'air') {
                            y = Math.floor(y) - i + 1;
                            break;
                        }
                    }
                }
            } catch (e) {
                // Si falla, usar la y actual
            }

            console.log(`[NPC] 🚶 Moviéndose a (${x.toFixed(1)}, ${z.toFixed(1)})`);

            // Usar GoalNear en lugar de GoalBlock para mayor estabilidad
            bot.pathfinder.setGoal(new goals.GoalNear(x, y, z, 1.5));

            // Esperar a que llegue al destino
            const checkInterval = setInterval(() => {
                if (!bot || !bot.entity) {
                    clearInterval(checkInterval);
                    return;
                }
                const dist = bot.entity.position.distanceTo({x, y, z});
                if (dist < 2.5) {
                    clearInterval(checkInterval);
                    console.log('[NPC] 🟢 Llegó al destino');
                    // Esperar entre 5 y 15 segundos antes de moverse de nuevo
                    setTimeout(() => moveRandomly(), 5000 + Math.random() * 10000);
                }
            }, 1000);

        } catch (err) {
            console.log(`[NPC] ⚠️ Error moviéndose: ${err.message}`);
            // Reintentar después de un tiempo
            setTimeout(() => moveRandomly(), 8000 + Math.random() * 5000);
        }
    }

    // ==================== SALUD Y HAMBRE ====================

    bot.on('health', () => {
        if (bot.health && bot.health < 5) console.log(`[NPC] ❤️ Salud baja: ${bot.health}`);
        if (bot.food && bot.food < 5) console.log(`[NPC] 🍖 Hambre baja: ${bot.food}`);
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
