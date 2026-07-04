require('dotenv').config();
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../server/configLoader');
const { prepareAssetFromUrl } = require('./assetHelper');

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

  // Discord Rich Presence admite URLs externas para las imágenes.
  if (!imageKey && !hasLocalAsset && song.icon && song.icon.startsWith('http') && config.debug) {
    console.log('[Debug] Usando URL externa para la portada en large_image:', song.icon);
  }

  const assets = {
    large_text: song.album || '',
    small_text: 'Spotify'
  };

  if (song.icon && (song.icon.startsWith('https://i.scdn.co/image/') || song.icon.startsWith('http://i.scdn.co/image/'))) {
    const hash = song.icon.split('/').pop();
    assets.large_image = `spotify:${hash}`;
  } else if (song.icon && song.icon.startsWith('http')) {
    assets.large_image = song.icon;
  } else if (imageKey) {
    assets.large_image = imageKey;
  }

  if (config.debug) {
    console.log('[Debug] buildPresencePayload config:', {
      clientId: config.clientId,
      assetKey: imageKey,
      hasLocalAsset,
      iconUrl: song.icon
    });
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
    console.log('❌ WebSocket no conectado');
    return;
  }

  currentSong = createSpotifySong();
  displayPresenceUI(currentSong);

  // Si no hay assetKey y la imagen es una URL, intentamos descargarla localmente
  // y sugerir una assetKey. No subimos automáticamente al Developer Portal.
  const currentCfg = loadConfig();
  const assetKeyFromConfig = (typeof currentCfg.spotify?.assetKey === 'string' && currentCfg.spotify.assetKey.trim()) ? currentCfg.spotify.assetKey.trim() : '';
  // También permitir forzar el skip mediante variable de entorno
  const skipHelperEnv = (process.env.SKIP_ASSET_HELPER === '1' || process.env.SKIP_ASSET_HELPER === 'true');

  // Si ya hay assetKey en config o se pidió saltarlo, no intentamos descargar ni sugerir
  if (assetKeyFromConfig || skipHelperEnv) {
    // no-op: assetKey presente, usarlo directamente
  } else if (currentSong.icon && currentSong.icon.startsWith('http')) {
    const suggested = (currentSong.album || currentSong.title || 'asset').replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    const autoWrite = (process.env.AUTO_WRITE_ASSET === '1' || process.env.AUTO_WRITE_ASSET === 'true');
    console.log('[AssetHelper] Intentando descargar imagen para sugerir una assetKey...');
    const res = await prepareAssetFromUrl(currentSong.icon, suggested, !!autoWrite);
    if (res && res.error) {
      console.log('[AssetHelper] Error al descargar:', res.error);
    } else if (res && res.key) {
      console.log(`[AssetHelper] Imagen guardada en: ${res.filePath}`);
      console.log(`[AssetHelper] Key sugerida: ${res.key}`);
      if (!autoWrite) {
        console.log('            Para usarla en Rich Presence, sube el archivo a tu Application -> Art Assets y usa la key sugerida en `config.json` -> `spotify.assetKey`.');
      }
      // si autoWrite ya actualizó config.json, recargamos config en memoria
      if (autoWrite) {
        try {
          const newCfg = loadConfig();
          config = newCfg;
          console.log('[AssetHelper] config.json actualizado automáticamente con spotify.assetKey');
        } catch (e) {
          console.log('[AssetHelper] No se pudo recargar config:', e.message);
        }
      }
    }
  }

  const payload = buildPresencePayload(currentSong);

  // Log adicional para depuración: mostrar qué large_image se enviará
  try {
    const activityAssets = payload.d.activities[0].assets || {};
    console.log('[Debug] large_image enviado:', activityAssets.large_image);
    console.log('[Debug] activity enviado:', JSON.stringify(payload.d.activities[0], null, 2));
  } catch (e) {
    // ignore
  }

  // Log para depuración
  try {
    const ts = payload.d.activities[0].timestamps;
    console.log(`[Presence] start=${new Date(ts.start).toISOString()} end=${new Date(ts.end).toISOString()} current=${Math.floor(currentSong.currentTime)}s`);
  } catch (e) {
    console.log('[Presence] No se pudieron leer timestamps', e.message);
  }

  ws.send(JSON.stringify(payload));
  console.log('\n✅ Actividad enviada al Gateway (intentando actualizar Rich Presence)');
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
    return;
  }

  console.log(`✅ Conectando con token: ${userToken.substring(0, 20)}...\n`);
  console.log('📡 Conectando a Discord Gateway...\n');

  let connected = false;

  ws = new WebSocket(DISCORD_GATEWAY_URL);

  ws.on('open', () => {
    console.log('[Gateway] WebSocket abierto, esperando HELLO...');
  });

  ws.on('message', (data) => {
    let message = null;
    try {
      message = JSON.parse(data);
    } catch (e) {
      console.log('[Gateway] Mensaje no JSON:', data.toString());
      return;
    }

    console.log('[Gateway] Evento recibido:', message.t || `OP${message.op}`);

    if (message.op === 10) {
      const heartbeat_interval = message.d.heartbeat_interval;
      console.log(`[Gateway] Recibido HELLO, heartbeat: ${heartbeat_interval}ms`);

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

      heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ op: 1, d: null }));
        }
      }, heartbeat_interval);
    }

    if (message.t === 'READY') {
      console.log('✅ Autenticado en Discord\n');
      connected = true;

      setTimeout(() => {
        console.log('📡 Enviando primera presencia...\n');
        sendPresence();
      }, 500);
    }

    if (message.op === 9) {
      console.log('❌ Error de autenticación');
      console.log('Detalles:', message.d);
      process.exit(1);
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

  updateInterval = setInterval(() => {
    if (connected && ws && ws.readyState === WebSocket.OPEN) {
      sendPresence();
    }
  }, 15000);

  console.log('✨ Rich Presence en vivo. Presiona Ctrl+C para salir.\n');

  process.on('SIGINT', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (updateInterval) clearInterval(updateInterval);
    if (ws) ws.close();
    console.log('\n\n👋 Desconectado. ¡Adiós!');
    process.exit(0);
  });
}

module.exports = { startRealServer, createSpotifySong, displayPresenceUI };