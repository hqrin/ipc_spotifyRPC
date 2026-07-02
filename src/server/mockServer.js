require('dotenv').config();
const WebSocket = require('ws');
const { loadConfig } = require('../server/configLoader');

let config = loadConfig();
let currentSong = null;
let updateInterval = null;
let ws = null;
let heartbeatInterval = null;

const DISCORD_GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';

function truncateString(str, maxLength = 127) {
  if (!str) return '';
  return str.length <= maxLength ? str : str.substring(0, maxLength - 3) + '...';
}

function createSpotifySong() {
  const elapsed = (Date.now() / 1000) % (config.spotify.duration || 180);
  return {
    title: config.spotify.title,
    artist: config.spotify.artist,
    album: config.spotify.album,
    albumArt: config.spotify.albumArt,
    icon: config.spotify.icon || config.spotify.albumArt,
    paused: false,
    currentTime: elapsed,
    duration: config.spotify.duration || 180,
    url: config.spotify.url,
    service: 'spotify'
  };
}

function displayPresenceUI(song) {
  if (!song) return;

  const timeStr = `${Math.floor(song.currentTime)}s`;
  const durationStr = `${Math.floor(song.duration)}s`;
  const urlText = song.url ? 'Open Spotify' : 'No URL';
  
  const ui = `
╔══════════════════════════════════════╗
║  🎧 Spotify                          ║
╠══════════════════════════════════════╣
║                                      ║
║  ${song.icon ? '[🖼️ Portada]' : '          '} │
║                                      ║
║  Title: ${truncateString(song.title, 23).padEnd(23)}  ║
║  Artist: ${truncateString(song.artist, 22).padEnd(22)}  ║
║  Album: ${truncateString(song.album, 23).padEnd(23)}  ║
║                                      ║
║  ⏱️  ${timeStr.padEnd(3)} / ${durationStr.padEnd(3)}${' '.repeat(17)}║
║  🔗 ${urlText.padEnd(26)}  ║
║                                      ║
╚══════════════════════════════════════╝
`;

  console.clear();
  console.log(ui);
}

function sendPresence() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log('❌ WebSocket no conectado');
    return;
  }

  currentSong = createSpotifySong();
  displayPresenceUI(currentSong);

  const presence = {
    op: 3,
    d: {
      since: null,
      activities: [
        {
          name: truncateString(currentSong.title, 127),
          type: 2, // LISTENING
          state: truncateString(currentSong.artist, 127),
          details: truncateString(currentSong.album, 127),
          assets: {
            large_image: currentSong.icon || 'https://i.pinimg.com/736x/6a/7d/64/6a7d64df939ba3ceed5886aa432daf0c.jpg',
            large_text: currentSong.album,
            small_text: 'Spotify'
          },
          timestamps: {
            start: Math.round((Date.now() - (currentSong.currentTime * 1000)) / 1000),
            end: Math.round((Date.now() + ((currentSong.duration - currentSong.currentTime) * 1000)) / 1000)
          }
        }
      ],
      status: 'online',
      afk: false
    }
  };

  ws.send(JSON.stringify(presence));
  console.log('\n✅ Actividad actualizada en Discord');
}

async function startRealServer() {
  const banner = `
╔════════════════════════════════════════╗
║   SPOTIFY DESIGN - MODO REAL CON TOKEN  ║
║      by Hqrin - Hellsaq                ║
╚════════════════════════════════════════╝
`;
  console.log(banner);

  const userToken = process.env.USER_TOKEN;
  
  if (!userToken) {
    console.log('⚠️  ADVERTENCIA: USER_TOKEN no está configurado en .env');
    console.log('📝 Por favor, configura tu token en .env:');
    console.log('   USER_TOKEN=tu_token_de_discord_aqui\n');
    console.log('📌 Nota: Debes usar un token de usuario válido de Discord\n');
    return;
  }

  console.log(`✅ Conectando con token: ${userToken.substring(0, 20)}...\n`);
  console.log('📡 Conectando a Discord Gateway...\n');

  let connected = false;

  // Conectar a Discord Gateway
  ws = new WebSocket(DISCORD_GATEWAY_URL);

  ws.on('open', () => {
    console.log('[Gateway] WebSocket abierto, esperando HELLO...');
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      if (message.op === 10) {
        // HELLO
        const heartbeat_interval = message.d.heartbeat_interval;
        console.log(`[Gateway] Heartbeat interval: ${heartbeat_interval}ms`);
        
        console.log('[Gateway] Enviando IDENTIFY...');
        ws.send(JSON.stringify({
          op: 2,
          d: {
            token: userToken,
            intents: 0,
            properties: {
              $os: 'windows',
              $browser: 'spotify-design',
              $device: 'spotify-design'
            }
          }
        }));

        // Heartbeat
        heartbeatInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              op: 1,
              d: null
            }));
          }
        }, heartbeat_interval);
      }

      if (message.t === 'READY') {
        console.log('✅ READY recibido - usuario autenticado\n');
        connected = true;
        
        setTimeout(() => {
          console.log('📡 Enviando presencia inicial...');
          sendPresence();
        }, 500);
      }

      if (message.op === 11) {
        // HEARTBEAT_ACK
        console.log('[Gateway] Heartbeat ACK recibido');
      }

      if (message.op === 4 || message.t === 'GUILD_CREATE') {
        // Guild create/update, también podemos enviar presencia aquí
        if (connected && !updateInterval) {
          console.log('[Gateway] Conectado correctamente, iniciando actualizaciones...');
          updateInterval = setInterval(() => {
            if (connected && ws && ws.readyState === WebSocket.OPEN) {
              sendPresence();
            }
          }, 15000);
        }
      }

      if (message.op === 9) {
        console.log('❌ INVALID_SESSION - Token inválido o expirado');
        console.log('Error:', message.d);
        process.exit(1);
      }

      if (message.op === 0 && message.t) {
        console.log(`[Gateway] Evento: ${message.t}`);
      }
    } catch (e) {
      console.log('[Gateway] Error procesando mensaje:', e.message);
    }
  });

  ws.on('error', (error) => {
    console.log(`❌ Error de WebSocket: ${error.message}`);
  });

  ws.on('close', () => {
    console.log('\n❌ Conexión cerrada');
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (updateInterval) clearInterval(updateInterval);
  });

  console.log('✨ Esperando conexión a Discord...\n');

  // Esperar a que se conecte antes de iniciar updates
  setTimeout(() => {
    if (connected && !updateInterval) {
      console.log('📡 Iniciando actualizaciones periódicas...\n');
      updateInterval = setInterval(() => {
        if (connected && ws && ws.readyState === WebSocket.OPEN) {
          sendPresence();
        }
      }, 15000);
    }
  }, 3000);

  // Manejo de Ctrl+C
  process.on('SIGINT', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (updateInterval) clearInterval(updateInterval);
    if (ws) ws.close();
    console.log('\n\n👋 Desconectado. ¡Adiós!');
    process.exit(0);
  });

  console.log('✨ Presiona Ctrl+C para salir.\n');
}

module.exports = { startRealServer, createSpotifySong, displayPresenceUI };
