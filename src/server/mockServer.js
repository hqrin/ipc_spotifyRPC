require('dotenv').config();
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
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

function resolveLargeImage(imageUrl, imageKey = '') {
  if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
    if (imageUrl.includes('i.scdn.co/image/')) {
      const hash = imageUrl.split('/').pop().split('?')[0];
      return `spotify:${hash}`;
    }
    return imageUrl;
  }
  return imageKey || undefined;
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

function buildPresencePayload(song) {
  // Cargar config actualizada en cada build para respetar cambios hechos en disco
  config = loadConfig();
  const startMs = Date.now() - Math.round(song.currentTime * 1000);
  const endMs = Date.now() + Math.round((song.duration - song.currentTime) * 1000);

  let imageKey = (typeof config.spotify?.assetKey === 'string' && config.spotify.assetKey.trim()) ? config.spotify.assetKey.trim() : '';

  // Además de assetKey en config, si existe un archivo local en assets/<assetKey>.(png|jpg)
  // consideramos que la asset está presente y no mostramos la advertencia.
  let hasLocalAsset = false;
  if (imageKey) {
    const assetsDir = path.resolve(__dirname, '..', '..', 'assets');
    try {
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        hasLocalAsset = files.some(f => f.startsWith(imageKey));
      }
    } catch (e) {
      hasLocalAsset = false;
    }
  }

  const assets = {
    large_text: song.album || '',
    small_text: 'Spotify'
  };

  const largeImage = resolveLargeImage(song.icon || song.albumArt || config.spotify?.icon || config.spotify?.albumArt || '', imageKey);
  if (largeImage) {
    assets.large_image = largeImage;
  }

  return {
    op: 3,
    d: {
      since: null,
      activities: [
        {
          name: 'Spotify',
          application_id: config.clientId,
          type: 2, // LISTENING
          state: truncateString(song.artist, 127),
          details: truncateString(song.album, 127),
          id: 'spotify:1',
          flags: 48,
          party: {
            id: `spotify:${Date.now()}`
          },
          sync_id: `spotify:track:${Date.now()}`,
          metadata: {
            album_id: '1',
            artist_ids: [truncateString(song.artist, 127) || '1'],
            context_uri: `spotify:track:${Date.now()}`
          },
          assets,
          timestamps: {
            start: startMs,
            end: endMs
          }
        }
      ],
      status: 'online',
      afk: false
    }
  };
}

async function sendPresence() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  currentSong = createSpotifySong();
  displayPresenceUI(currentSong);

  const payload = buildPresencePayload(currentSong);

  // Log adicional para depuración: mostrar qué large_image se enviará
  ws.send(JSON.stringify(payload));
}

async function startRealServer() {
  const banner = `
╔════════════════════════════════════════╗
║   SPOTIFY DESIGN - MODO REAL CON TOKEN  ║
║      by Hqrin - Hellsaq                ║
╚════════════════════════════════════════╝
`;
  const userToken = process.env.USER_TOKEN;
  if (!userToken) {
    console.error('⚠️  ADVERTENCIA: USER_TOKEN no está configurado en .env');
    return;
  }

  let connected = false;

  ws = new WebSocket(DISCORD_GATEWAY_URL);

  ws.on('open', () => {
  });

  ws.on('message', (data) => {
    let message = null;
    try {
      message = JSON.parse(data);
    } catch (e) {
      console.error('Error parsing gateway message:', e.message);
      return;
    }

    if (message.op === 10) {
      const heartbeat_interval = message.d.heartbeat_interval;
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

      heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ op: 1, d: null }));
        }
      }, heartbeat_interval);
    }

    if (message.t === 'READY') {
      connected = true;

      setTimeout(() => {
        sendPresence();
      }, 500);
    }

    if (message.op === 9) {
      process.exit(1);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ Error de WebSocket:', error.message);
  });

  ws.on('close', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (updateInterval) clearInterval(updateInterval);
  });

  updateInterval = setInterval(() => {
    if (connected && ws && ws.readyState === WebSocket.OPEN) {
      sendPresence();
    }
  }, 15000);

  process.on('SIGINT', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (updateInterval) clearInterval(updateInterval);
    if (ws) ws.close();
    process.exit(0);
  });
}

module.exports = { startRealServer, createSpotifySong, displayPresenceUI };