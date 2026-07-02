require('dotenv').config();
const axios = require('axios');
const { loadConfig } = require('../server/configLoader');

let config = loadConfig();
let currentSong = null;
let updateInterval = null;

const DISCORD_API_URL = 'https://discord.com/api/v10';

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

async function setDiscordActivity() {
  const userToken = process.env.USER_TOKEN;
  
  if (!userToken) {
    console.log('❌ Error: USER_TOKEN no está configurado en .env');
    return;
  }

  try {
    currentSong = createSpotifySong();

    // Mostrar el bonito diseño
    displayPresenceUI(currentSong);

    const activity = {
      name: truncateString(currentSong.title, 127),
      type: 2,
      state: truncateString(currentSong.artist, 127),
      details: truncateString(currentSong.album, 127),
      assets: {
        large_image: currentSong.icon,
        large_text: currentSong.album,
        small_text: 'Spotify'
      },
      buttons: [
        { label: 'Abrir Spotify', url: currentSong.url || 'https://open.spotify.com/' }
      ],
      timestamps: {
        start: Math.round((Date.now() - (currentSong.currentTime * 1000)) / 1000),
        end: Math.round((Date.now() + ((currentSong.duration - currentSong.currentTime) * 1000)) / 1000)
      }
    };

    // Actualizar la actividad en Discord
    await axios.patch(
      `${DISCORD_API_URL}/users/@me/settings`,
      {
        custom_status: {
          text: `🎧 ${truncateString(currentSong.artist, 30)} - ${truncateString(currentSong.title, 30)}`,
          expires_at: null
        }
      },
      {
        headers: {
          'Authorization': userToken,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n✅ Actividad actualizada en Discord');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('\n❌ Error: Token de usuario inválido o expirado');
    } else if (error.response?.status === 429) {
      console.log('\n⏱️  Rate limited. Esperando...');
    } else {
      console.log(`\n❌ Error al actualizar Discord: ${error.message}`);
    }
  }
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
  console.log('📡 Actualizando Rich Presence en vivo...\n');

  // Primera actualización
  await setDiscordActivity();

  // Actualizar cada 15 segundos
  updateInterval = setInterval(async () => {
    await setDiscordActivity();
  }, 15000);

  console.log('\n✨ Rich Presence en vivo. Presiona Ctrl+C para salir.\n');

  // Manejo de Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(updateInterval);
    console.log('\n\n👋 Desconectado. ¡Adiós!');
    process.exit(0);
  });
}

module.exports = { startRealServer, createSpotifySong, displayPresenceUI };
