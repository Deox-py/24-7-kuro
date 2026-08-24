const mineflayer = require('mineflayer');

function createBot() {
    const bot = mineflayer.createBot({
        host: 'Fakekuromori.aternos.me',   // IP de tu servidor
        port: 31094,                       // Puerto de Aternos
        username: 'PokeFollador',          // Nombre del bot
        auth: 'offline',                   // Para servidores no-premium
        version: false,                    // Autodetecta la versión (mejor para mods)
        hideErrors: true                   // Ignora errores de protocolo (mods)
    });

    // ✅ Captura errores de protocolo (mods) para no crashear
    bot.on('error', (err) => {
        if (err.name === 'PartialReadError' || err.toString().includes('PartialReadError')) {
            console.log('[NPC] ⚠️ Error de protocolo (mods), ignorando...');
            return;
        }
        console.log('[NPC] ❌ Error crítico:', err);
    });

    // ✅ Cuando el bot aparece en el mundo
    bot.on('spawn', () => {
        console.log('[NPC] 🟢 El bot ha aparecido correctamente en el servidor.');
        console.log('[NPC] 📌 Modo: Coblemon (solo anti-AFK)');
    });

    // ✅ Conexión establecida
    bot.on('login', () => {
        console.log('[NPC] 🔗 Conexión establecida con el servidor.');
    });

    // ✅ Rutina anti-AFK (solo saltar, sin interactuar con objetos del mod)
    setInterval(() => {
        if (!bot || !bot.entity) return;

        try {
            // 1. Salto (evita inactividad)
            bot.setControlState('jump', true);
            setTimeout(() => {
                if (bot && bot.setControlState) {
                    bot.setControlState('jump', false);
                }
            }, 400);

            // 2. Movimiento aleatorio (opcional, mejor para simular actividad)
            const move = Math.random() > 0.5 ? 'forward' : 'back';
            bot.setControlState(move, true);
            setTimeout(() => {
                if (bot && bot.setControlState) {
                    bot.setControlState(move, false);
                }
            }, 600);

            console.log('[NPC] 🔄 Anti-AFK ejecutado');

        } catch (err) {
            console.log(`[NPC] ⚠️ Error en rutina: ${err.message}`);
        }
    }, 30000); // Cada 30 segundos

    // ✅ Reconexión automática si se cae
    bot.on('end', (reason) => {
        console.log(`[NPC] ❌ Desconectado: ${reason}. Reconectando en 30 segundos...`);
        setTimeout(createBot, 30000);
    });

    // ✅ Evento de error en la red (evita crashes)
    bot.on('error', (err) => {
        console.log('[NPC] 🌐 Error de red:', err.message);
    });

    console.log('[NPC] 🚀 Bot iniciado, esperando conexión...');
}

// Arrancar el bot
createBot();
