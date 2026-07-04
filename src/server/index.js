const WebSocket = require('ws');
const DiscordIPC = require('../server/discord-ipc');
const { loadConfig } = require('../server/configLoader');
const { startRealServer, displayPresenceUI } = require('../server/mockServer');

let config = loadConfig();

let discord = null;
let reconnectTimer = null;
let updateInterval = null;
let currentSong = null;

function truncateString(str, maxLength = 127) {
  if (!str) return '';
  return str.length <= maxLength ? str : str.substring(0, maxLength - 3) + '...';
}

function updatePresence(song) {
  if (!song || !discord || !discord.connected) return;

  // Mostrar el bonito diseño
  displayPresenceUI(song);

  const iconUrl = song.icon || song.albumArt || config.spotify?.icon || config.spotify?.albumArt || '';
  const albumText = song.album || config.spotify?.album || 'Spotify';
  const imageKey = typeof config.spotify?.assetKey === 'string' ? config.spotify.assetKey.trim() : '';

  if (!imageKey && !iconUrl && config.debug) {
    console.log('[Warning] No hay `spotify.assetKey` ni imagen externa válida en config.json.');
  }

  if (config.debug) {
    console.log('[Debug] IPC presence config:', {
      clientId: config.clientId,
      assetKey: imageKey,
      iconUrl
    });
  }

  const assets = {
    large_text: albumText,
    small_text: 'Spotify'
  };

  if (iconUrl && (iconUrl.startsWith('https://i.scdn.co/image/') || iconUrl.startsWith('http://i.scdn.co/image/'))) {
    const hash = iconUrl.split('/').pop();
    assets.large_image = `spotify:${hash}`;
  } else if (iconUrl && iconUrl.startsWith('http')) {
    assets.large_image = iconUrl;
  } else if (imageKey) {
    assets.large_image = imageKey;
  }

  const activity = {
    details: truncateString(song.title, 127),
    state: truncateString(song.artist, 127),
    assets,
    timestamps: {
      start: Math.round((Date.now() - (song.currentTime * 1000)) / 1000),
      end: Math.round((Date.now() + ((song.duration - song.currentTime) * 1000)) / 1000)
    },
    buttons: [
      { label: 'Abrir Spotify', url: song.url || 'https://open.spotify.com/' }
    ]
  };

  discord.setActivity(activity);
}

function connectDiscord() {
  if (discord && discord.connected) return;

  discord = new DiscordIPC(config.clientId);

  discord.on('connect', () => {
    console.log('\n✨ 🎧 Conectado a Discord con modo IPC\n');
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
    if (currentSong) {
      updatePresence(currentSong);
    }
  });

  discord.on('disconnect', () => {
    console.log('\n❌ Discord desconectado. Reintentando en 5s...\n');
    if (!reconnectTimer) {
      reconnectTimer = setInterval(() => {
        console.log('🔄 Reintentando conexión...');
        connectDiscord();
      }, 5000);
    }
  });

  discord.connect().catch((err) => {
    console.log(`\n⚠️ No se pudo conectar: ${err.message}\n`);
    if (!reconnectTimer) {
      reconnectTimer = setInterval(() => {
        console.log('🔄 Reintentando conexión...');
        connectDiscord();
      }, 5000);
    }
  });
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

const banner = `
╔══════════════════════════════════════╗
║      SPOTIFY DESIGN - RICH PRESENCE   ║
║          by Hqrin - Hellsaq           ║
╚══════════════════════════════════════╝
`;

function shutdownIPC() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }

  if (discord) {
    try {
      discord.clearActivity();
    } catch (e) {
      // ignore
    }
    try {
      discord.close();
    } catch (e) {
      // ignore
    }
    discord = null;
  }
}

function startIPCMode() {
  console.log(banner);
  console.log('\n📡 Iniciando modo IPC Custom...\n');
  connectDiscord();
  
  // Solo en modo IPC actualizamos cada segundo
  updateInterval = setInterval(() => {
    currentSong = createSpotifySong();
    updatePresence(currentSong);
  }, 1000);
}

process.on('SIGINT', () => {
  console.log('\n\n👋 Deteniendo Spotify Design...');
  shutdownIPC();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdownIPC();
  process.exit(0);
});

function startServer(mode) {
  if (mode === 'ipc') {
    startIPCMode();
  } else {
    startRealServer();
  }
}

module.exports = { startServer, startIPCMode, startRealServer, createSpotifySong, displayPresenceUI };

// Si se ejecuta directamente desde este archivo, inicia en modo IPC por defecto
if (require.main === module) {
  startIPCMode();
}
