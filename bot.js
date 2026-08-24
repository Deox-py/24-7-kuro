const mineflayer = require('mineflayer');

// Variables de configuración del servidor
const SERVER_HOST = 'Fakekuromori.aternos.me';
const SERVER_PORT = 31094; // Puerto que te dio Aternos
const BOT_USERNAME = 'PokeFollador';
const SERVER_VERSION = '1.21.1'; // Cambia a la versión exacta de tu servidor

function createBot() {
    console.log(`[NPC] Intentando conectar a ${SERVER_HOST}:${SERVER_PORT}...`);
    
    const bot = mineflayer.createBot({
        host: SERVER_HOST,
        port: SERVER_PORT,
        username: BOT_USERNAME,
        auth: 'offline', // IMPRESCINDIBLE para servidores no-premium
        version: SERVER_VERSION, // Usa la versión exacta
        // Opciones adicionales para mejorar la conexión
        log: false, // Reduce logs innecesarios
        checkTimeoutInterval: 0, // Evita timeouts por inactividad
    });

    // --- Eventos de conexión ---
    bot.on('connect', () => {
        console.log('[NPC] Conectando al servidor...');
    });

    bot.on('login', () => {
        console.log('[NPC] ✅ Conexión establecida con el servidor de Minecraft.');
    });

    bot.on('spawn', () => {
        console.log(`[NPC] ✅ El bot ha aparecido correctamente en el mapa.`);
        // Tu servidor NO usa /login, así que no descomentes nada
    });

    // --- Manejo de errores ---
    bot.on('error', (err) => {
        console.log(`[NPC] ❌ Error: ${err.message}`);
        if (err.code === 'ECONNRESET') {
            console.log('[NPC] El servidor rechazó la conexión. Verifica:');
            console.log('  - Que el servidor Aternos esté ENCENDIDO (verde)');
            console.log('  - Que el puerto sea exactamente 31094');
            console.log('  - Que el modo offline esté ACTIVADO en Aternos');
            console.log('  - Que la IP sea la correcta');
        }
    });

    bot.on('end', (reason) => {
        console.log(`[NPC] Conexión finalizada por: ${reason}. Reintentando en 30 segundos...`);
        setTimeout(createBot, 30000);
    });

    // --- Rutina Anti-AFK (cada 45 segundos) ---
    setInterval(async () => {
        if (!bot || !bot.entity) return;

        try {
            // Buscar un cofre cerca
            const chestBlock = bot.findBlock({
                matching: bot.registry.blocksByName.chest?.id || bot.registry.blocksByName.trapped_chest?.id,
                maxDistance: 5
            });

            if (chestBlock) {
                console.log('[NPC] 📦 Interactuando con contenedor cercano...');
                const chest = await bot.openChest(chestBlock);
                console.log('[NPC] Contenedor abierto.');
                await new Promise(resolve => setTimeout(resolve, 2000));
                chest.close();
                console.log('[NPC] Contenedor cerrado.');
            } else {
                console.log('[NPC] ℹ️ No hay cofre cerca. Solo salto anti-AFK.');
            }

            // Acción anti-AFK: saltar
            await new Promise(resolve => setTimeout(resolve, 1000));
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
            console.log('[NPC] 🦘 Anti-AFK ejecutado.');

        } catch (err) {
            console.log(`[NPC] Error en ciclo: ${err.message}`);
        }
    }, 45000);
}

// Iniciar el bot
createBot();
