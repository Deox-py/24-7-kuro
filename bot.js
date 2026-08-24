const mineflayer = require('mineflayer');

function createBot() {
    console.log('[NPC] 🚀 Iniciando bot...');
    
    const bot = mineflayer.createBot({
        host: 'Fakekuromori.aternos.me',
        port: 31094, // ¡ACTUALIZA ESTE PUERTO!
        username: 'PokeFollador',
        auth: 'offline',
        version: false,
        hideErrors: true
    });

    // Variables de estado del bot
    let isMoving = false;
    let currentAction = 'idle';
    let actionTimer = null;

    // --- Eventos principales ---
    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
            console.log('[NPC] ❌ Error de conexión. Reintentando en 30s...');
            setTimeout(createBot, 30000);
        } else if (err.name === 'PartialReadError') {
            console.log('[NPC] ⚠️ Error de protocolo (mods), ignorando...');
        } else {
            console.log('[NPC] ❌ Error:', err.message);
        }
    });

    bot.on('connect', () => console.log('[NPC] 🔗 Conectando...'));
    bot.on('login', () => console.log('[NPC] ✅ Conectado'));
    
    bot.on('spawn', () => {
        console.log('[NPC] 🟢 Bot apareció en el mundo!');
        // Iniciar el comportamiento humano
        startHumanBehavior(bot);
    });

    bot.on('end', (reason) => {
        console.log(`[NPC] ❌ Desconectado: ${reason}. Reconectando en 30s...`);
        clearTimeout(actionTimer);
        setTimeout(createBot, 30000);
    });

    // Manejar daño (para que el bot reaccione como humano)
    bot.on('health', () => {
        if (bot.health < 10) {
            console.log('[NPC] 😰 Salud baja! Buscando comida...');
            // Intentar comer si tiene comida en el inventario
            tryEat(bot);
        }
    });

    // Reaccionar al daño recibido
    bot.on('entityHurt', (entity) => {
        if (entity === bot.entity) {
            console.log('[NPC] 😵 ¡Me han golpeado!');
            // Huir o saltar en respuesta al daño
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
        }
    });
}

// --- Funciones de comportamiento humano ---

function startHumanBehavior(bot) {
    // Ejecutar acciones aleatorias cada 5-15 segundos
    scheduleNextAction(bot);
}

function scheduleNextAction(bot) {
    // Tiempo aleatorio entre 5 y 20 segundos
    const delay = 5000 + Math.random() * 15000;
    
    actionTimer = setTimeout(() => {
        if (!bot || !bot.entity) return;
        
        // Elegir una acción aleatoria
        const actions = [
            () => walkRandomly(bot),
            () => lookAround(bot),
            () => jumpAround(bot),
            () => chatRandomly(bot),
            () => checkInventory(bot),
            () => lookAtPlayer(bot),
            () => moveToRandomBlock(bot)
        ];
        
        const action = actions[Math.floor(Math.random() * actions.length)];
        action(bot);
        
        // Programar la siguiente acción
        scheduleNextAction(bot);
    }, delay);
}

// 1. Caminar aleatoriamente
function walkRandomly(bot) {
    if (isMoving) return;
    isMoving = true;
    
    console.log('[NPC] 🚶 Caminando aleatoriamente...');
    
    // Dirección aleatoria (forward/backward/left/right)
    const directions = ['forward', 'back', 'left', 'right'];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const duration = 2000 + Math.random() * 3000;
    
    bot.setControlState(dir, true);
    
    setTimeout(() => {
        bot.setControlState(dir, false);
        // Girar un poco al terminar
        const yaw = (Math.random() - 0.5) * Math.PI / 2;
        bot.look(yaw, 0, true);
        isMoving = false;
        console.log('[NPC] 🚶 Caminata terminada');
    }, duration);
}

// 2. Mirar alrededor (como si explorara)
function lookAround(bot) {
    console.log('[NPC] 👀 Mirando alrededor...');
    
    const yaw = (Math.random() - 0.5) * Math.PI * 2;
    const pitch = (Math.random() - 0.5) * Math.PI / 4;
    
    bot.look(yaw, pitch, true);
    
    // Mirar en otra dirección después de 1-3 segundos
    setTimeout(() => {
        const yaw2 = (Math.random() - 0.5) * Math.PI * 2;
        bot.look(yaw2, 0, true);
    }, 1000 + Math.random() * 2000);
}

// 3. Saltar varias veces
function jumpAround(bot) {
    console.log('[NPC] 🦘 Saltando...');
    
    let jumps = 2 + Math.floor(Math.random() * 3);
    let count = 0;
    
    const jumpInterval = setInterval(() => {
        if (count >= jumps || !bot || !bot.entity) {
            clearInterval(jumpInterval);
            return;
        }
        
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 200);
        count++;
    }, 500);
}

// 4. Hablar cosas aleatorias en el chat
function chatRandomly(bot) {
    const messages = [
        'Hola! :D',
        '¿Alguien aquí?',
        'Explorando el mundo...',
        'Bonito día para minar!',
        '¿Dónde hay un pueblo?',
        'Me gusta este servidor!',
        '¿Alguien quiere tradear?',
        'Pokémon! Gotta catch them all!',
        'Cobblemon es increíble!',
        '¿Dónde puedo encontrar un Eevee?'
    ];
    
    const msg = messages[Math.floor(Math.random() * messages.length)];
    console.log(`[NPC] 💬 Hablando: "${msg}"`);
    bot.chat(msg);
}

// 5. Revisar inventario
function checkInventory(bot) {
    console.log('[NPC] 🎒 Revisando inventario...');
    // Simplemente simula que está mirando su inventario
    // (en realidad no puede abrirlo con mods, pero parece humano)
}

// 6. Mirar a otro jugador (si hay alguno cerca)
function lookAtPlayer(bot) {
    const players = Object.values(bot.players);
    const realPlayers = players.filter(p => p !== bot.username && p.entity);
    
    if (realPlayers.length > 0) {
        const target = realPlayers[Math.floor(Math.random() * realPlayers.length)];
        if (target && target.entity) {
            console.log(`[NPC] 👀 Mirando a ${target.username}...`);
            bot.look(target.entity.position.x, target.entity.position.y + 1, true);
        }
    }
}

// 7. Moverse hacia un bloque aleatorio
function moveToRandomBlock(bot) {
    if (isMoving) return;
    
    // Buscar un bloque cercano para "inspeccionar"
    const blocks = bot.findBlocks({
        matching: (block) => {
            return block && block.name && 
                   ['stone', 'dirt', 'grass_block', 'oak_log', 'cobblestone'].includes(block.name);
        },
        maxDistance: 10,
        count: 5
    });
    
    if (blocks.length > 0) {
        const targetBlock = blocks[Math.floor(Math.random() * blocks.length)];
        if (targetBlock) {
            console.log(`[NPC] 🎯 Yendo hacia un bloque...`);
            isMoving = true;
            
            // Intentar moverse hacia el bloque
            bot.pathfinder.setGoal(new mineflayer.goals.GoalBlock(targetBlock.x, targetBlock.y, targetBlock.z));
            
            setTimeout(() => {
                bot.pathfinder.setGoal(null);
                isMoving = false;
                console.log('[NPC] 🎯 Llegó al destino');
            }, 3000 + Math.random() * 3000);
        }
    } else {
        // Si no hay bloques, solo mira alrededor
        lookAround(bot);
    }
}

// 8. Intentar comer (para recuperar salud)
function tryEat(bot) {
    const items = bot.inventory.items();
    const food = items.find(item => item.foodPoints && item.foodPoints > 0);
    
    if (food) {
        console.log('[NPC] 🍖 Comiendo...');
        bot.equip(food, 'hand', (err) => {
            if (!err) {
                bot.consume();
            }
        });
    }
}

// 9. Reacción a eventos del juego
function setupReactions(bot) {
    // Si oye un trueno (puede ser un mod)
    bot.on('soundEffect', (sound, pos) => {
        if (sound === 'entity.lightning_bolt.thunder') {
            console.log('[NPC] ⚡ ¡Trueno! Mejor me escondo...');
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 300);
        }
    });
}

// Iniciar el bot
createBot();
