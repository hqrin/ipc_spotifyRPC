const fs = require('fs');
const path = require('path');

const defaultConfig = {
  clientId: '1522028425206829186',
  port: 37281,
  service: 'spotify',
  spotify: {
    enabled: true,
    title: 'Spotify',
    artist: 'Escuchando tu música',
    album: 'Spotify',
    albumArt: '',
    icon: '',
    url: 'https://open.spotify.com/',
    duration: 180
  },
  showPausedStatus: true,
  activityTimeout: 10000,
  debug: false
};

function resolveConfigPath(customPath) {
  if (customPath) {
    return path.isAbsolute(customPath) ? customPath : path.resolve(customPath);
  }

  return path.join(__dirname, 'config.json');
}

function loadConfig(customPath) {
  const configPath = resolveConfigPath(customPath);
  let loadedConfig = {};

  if (fs.existsSync(configPath)) {
    try {
      loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('⚠️ Error cargando config de spotify-design:', error.message);
    }
  }

  const mergedConfig = {
    ...defaultConfig,
    ...loadedConfig,
    spotify: {
      ...defaultConfig.spotify,
      ...(loadedConfig.spotify || {})
    }
  };

  const iconValue = mergedConfig.spotify.icon || mergedConfig.spotify.albumArt || '';

  mergedConfig.spotify.icon = iconValue;
  mergedConfig.spotify.albumArt = iconValue;

  return mergedConfig;
}

function saveConfig(config, customPath) {
  const configPath = resolveConfigPath(customPath);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  return configPath;
}

module.exports = {
  defaultConfig,
  resolveConfigPath,
  loadConfig,
  saveConfig
};
