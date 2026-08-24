const mineflayer = require('mineflayer');
// Importamos la función para añadir soporte Forge
const autoVersionForge = require('minecraft-protocol-forge').autoVersionForge;

function createBot() {
    console.log('[NPC] 🚀 Intentando conectar a Fakekuromori.aternos.me...');

    // 1. Creamos el bot. Es CRÍTICO que 'version' esté en 'false'.
    const bot = mineflayer.createBot({
        host: 'Fakekuromori.aternos.me',
        port: 31094, // ¡ACTUALIZA ESTE PUERTO CON EL DE ATERNOS!
        username: 'PokeFollador',
        auth: 'offline',
        version: false, // ¡NUNCA cambies esto a un número! Debe ser 'false'.
        hideErrors: true
    });

    // 2. ¡ESTA ES LA LÍNEA MÁGICA! Añade el soporte para Forge/NeoForge.
    // Le decimos que intente auto-detectar los mods del servidor.
    autoVersionForge(bot._client);

    // --- Eventos del bot (sin cambios) ---
    bot.on('error', (err) => {
        // ... (tu manejador de errores existente) ...
        if (err.code === 'ECONNRESET') {
            console.log('[NPC] ❌ Error de conexión. El puerto o la IP pueden haber cambiado.');
            console.log('[NPC] 🔄 Reintentando en 30 segundos...');
            setTimeout(createBot, 30000);
        } else if (err.name === 'PartialReadError') {
            console.log('[NPC] ⚠️ Error de protocolo (mods), ignorando...');
        } else {
            console.log('[NPC] ❌ Error crítico:', err);
        }
    });

    bot.on('connect', () => console.log('[NPC] 🔗 Conectando al servidor...'));
    bot.on('login', () => console.log('[NPC] ✅ Conexión establecida'));
    bot.on('spawn', () => {
        console.log('[NPC] 🟢 El bot ha aparecido en el mapa.');
        // Anti-AFK: saltar cada 30 segundos
        setInterval(() => {
            if (bot && bot.entity) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 300);
                console.log('[NPC] 🔄 Anti-AFK: salto');
            }
        }, 30000);
    });

    bot.on('end', (reason) => {
        console.log(`[NPC] ❌ Desconectado: ${reason}. Reconectando en 30s...`);
        setTimeout(createBot, 30000);
    });
}

createBot();
