const mineflayer = require('mineflayer');

function createBot() {
    const host = 'Fakekuromori.aternos.me';
    const port = 31094; // CAMBIA ESTE PUERTO POR EL QUE APAREZCA EN ATERNOS AHORA
    const username = 'PokeFollador';

    console.log(`[NPC] 🚀 Intentando conectar a ${host}:${port}...`);

    const bot = mineflayer.createBot({
        host: host,
        port: port,
        username: username,
        auth: 'offline',
        version: '1.21.1',
        hideErrors: true
    });

    // Manejo de errores de conexión
    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
            console.log('[NPC] ❌ El servidor rechazó la conexión (ECONNRESET).');
            console.log('[NPC] ⚠️ Verifica:');
            console.log(`  - Que el puerto ${port} sea el correcto (actualízalo si cambió).`);
            console.log('  - Que el servidor esté ENCENDIDO (verde en Aternos).');
            console.log('  - Que el modo offline esté ACTIVADO en Aternos.');
            console.log('[NPC] Reintentando en 30 segundos...');
            setTimeout(createBot, 30000);
        } else if (err.name === 'PartialReadError' || err.toString().includes('PartialReadError')) {
            console.log('[NPC] ⚠️ Error de protocolo (mods), ignorando...');
        } else {
            console.log('[NPC] ❌ Error crítico:', err);
        }
    });

    bot.on('connect', () => {
        console.log('[NPC] 🔗 Conectando al servidor...');
    });

    bot.on('login', () => {
        console.log('[NPC] ✅ Conexión establecida con el servidor de Minecraft.');
    });

    bot.on('spawn', () => {
        console.log('[NPC] 🟢 El bot ha aparecido correctamente en el mapa.');
        // Acción anti-AFK simple
        setInterval(() => {
            if (bot && bot.entity) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 300);
                console.log('[NPC] 🔄 Acción anti-AFK (salto)');
            }
        }, 30000);
    });

    bot.on('end', (reason) => {
        console.log(`[NPC] ❌ Desconectado: ${reason}. Reconectando en 30 segundos...`);
        setTimeout(createBot, 30000);
    });
}

// Iniciar el bot
createBot();
