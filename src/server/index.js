const inquirer = require('inquirer');
const WebSocket = require('ws');
const DiscordIPC = require('../server/discord-ipc');
const { loadConfig } = require('../server/configLoader');
const { startRealServer, displayPresenceUI } = require('../server/mockServer');

let config = loadConfig();

let discord = null;
let reconnectTimer = null;
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
  
  const activity = {
    details: truncateString(song.title, 127),
    state: truncateString(song.artist, 127),
    assets: {
      large_image: iconUrl,
      large_text: albumText,
      small_text: 'Spotify'
    },
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

async function showMenu() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: '🎵 Selecciona el modo de funcionamiento:',
      choices: [
        { name: '🔗 Opción 1: Modo IPC Custom (Discord IPC - Local)', value: 'ipc' },
        { name: '🎧 Opción 2: Modo Real con Token (API Discord - Conexión Real)', value: 'token' }
      ]
    }
  ]);

  if (answers.mode === 'ipc') {
    console.log(banner);
    console.log('\n📡 Iniciando modo IPC Custom...\n');
    connectDiscord();
    
    // Solo en modo IPC actualizamos cada segundo
    setInterval(() => {
      currentSong = createSpotifySong();
      updatePresence(currentSong);
    }, 1000);
  } else {
    startRealServer();
  }
}

showMenu().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
